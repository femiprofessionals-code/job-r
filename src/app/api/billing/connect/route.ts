import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reviewers } from '@/db/schema/users';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk } from '@/lib/api';
import { stripe } from '@/lib/stripe';

export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const [reviewer] = await db.select().from(reviewers).where(eq(reviewers.userId, user.id)).limit(1);
  if (!reviewer) return apiFail('Not a reviewer', 403);

  let accountId = reviewer.stripeAccountId;
  if (!accountId) {
    const account = await stripe().accounts.create({
      type: 'express',
      metadata: { reviewerId: reviewer.id, userId: user.id },
      capabilities: { transfers: { requested: true } },
    });
    accountId = account.id;
    await db
      .update(reviewers)
      .set({ stripeAccountId: accountId, updatedAt: new Date() })
      .where(eq(reviewers.id, reviewer.id));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const link = await stripe().accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/reviewer?onboarding=refresh`,
    return_url: `${appUrl}/reviewer?onboarding=done`,
    type: 'account_onboarding',
  });
  return apiOk({ url: link.url });
}
