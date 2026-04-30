import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { reviewers } from '@/db/schema/users';
import { reviews } from '@/db/schema/reviews';
import { drafts } from '@/db/schema/drafts';
import { TIER_PAYOUT_CENTS, TIER_SLA_HOURS } from './tiers';

/**
 * Pick the least-loaded active reviewer matching a minimum tier. Platinum-only
 * routes pick platinum-only; otherwise we prefer higher tiers but fall back.
 */
export async function pickReviewer(minTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze') {
  const tierOrder = ['platinum', 'gold', 'silver', 'bronze'] as const;
  const starting = tierOrder.indexOf(minTier) === -1 ? 0 : tierOrder.indexOf(minTier);

  for (let i = 0; i <= starting; i++) {
    const tier = tierOrder[i];
    const rows = await db
      .select({
        id: reviewers.id,
        userId: reviewers.userId,
        tier: reviewers.tier,
        pending: sql<number>`COALESCE(SUM(CASE WHEN ${reviews.status} IN ('assigned','in_progress') THEN 1 ELSE 0 END),0)`,
      })
      .from(reviewers)
      .leftJoin(reviews, eq(reviews.reviewerId, reviewers.id))
      .where(and(eq(reviewers.tier, tier), eq(reviewers.isActive, true), eq(reviewers.payoutsEnabled, true)))
      .groupBy(reviewers.id, reviewers.userId, reviewers.tier)
      .orderBy(asc(sql`pending`))
      .limit(1);
    if (rows.length > 0) return rows[0];
  }
  return null;
}

export async function assignReviewForDraft(draftId: string, minTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze') {
  const [draft] = await db.select().from(drafts).where(eq(drafts.id, draftId));
  if (!draft) throw new Error(`Draft ${draftId} not found`);
  const picked = await pickReviewer(minTier);
  if (!picked) return null;

  const dueAt = new Date(Date.now() + TIER_SLA_HOURS[picked.tier] * 3600 * 1000);
  const [row] = await db
    .insert(reviews)
    .values({
      draftId: draft.id,
      reviewerId: picked.id,
      userId: draft.userId,
      tierAtAssignment: picked.tier,
      payoutCents: TIER_PAYOUT_CENTS[picked.tier],
      dueAt,
    })
    .returning({ id: reviews.id });

  await db.update(drafts).set({ status: 'in_review', updatedAt: new Date() }).where(eq(drafts.id, draftId));
  return { reviewId: row.id, reviewerUserId: picked.userId, tier: picked.tier, dueAt };
}
