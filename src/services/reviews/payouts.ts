import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { payouts, reviews } from '@/db/schema/reviews';
import { reviewers } from '@/db/schema/users';
import { stripe } from '@/lib/stripe';

export async function createPayoutForReview(reviewId: string) {
  const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
  if (!review) throw new Error(`Review ${reviewId} not found`);
  if (review.status !== 'accepted') throw new Error(`Review ${reviewId} not accepted`);

  const [reviewer] = await db.select().from(reviewers).where(eq(reviewers.id, review.reviewerId));
  if (!reviewer) throw new Error(`Reviewer missing`);
  if (!reviewer.stripeAccountId || !reviewer.payoutsEnabled) {
    throw new Error(`Reviewer ${reviewer.id} has no connected Stripe account`);
  }

  const [payout] = await db
    .insert(payouts)
    .values({
      reviewerId: reviewer.id,
      reviewId: review.id,
      amountCents: review.payoutCents,
      currency: 'usd',
      status: 'processing',
    })
    .returning({ id: payouts.id });

  try {
    const transfer = await stripe().transfers.create(
      {
        amount: review.payoutCents,
        currency: 'usd',
        destination: reviewer.stripeAccountId,
        description: `Job Radar review ${review.id}`,
        metadata: { reviewId: review.id, reviewerId: reviewer.id, payoutId: payout.id },
      },
      { idempotencyKey: `payout_${payout.id}` },
    );

    await db
      .update(payouts)
      .set({ status: 'paid', paidAt: new Date(), stripeTransferId: transfer.id })
      .where(eq(payouts.id, payout.id));

    await db
      .update(reviewers)
      .set({ completedReviews: (reviewer.completedReviews ?? 0) + 1, updatedAt: new Date() })
      .where(eq(reviewers.id, reviewer.id));

    return { ok: true as const, payoutId: payout.id, transferId: transfer.id };
  } catch (err) {
    await db
      .update(payouts)
      .set({ status: 'failed', error: (err as Error).message })
      .where(eq(payouts.id, payout.id));
    return { ok: false as const, error: (err as Error).message };
  }
}
