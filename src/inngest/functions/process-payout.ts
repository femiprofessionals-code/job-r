import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reviewers } from '@/db/schema/users';
import { profiles } from '@/db/schema/users';
import { createPayoutForReview } from '@/services/reviews';
import { reviews } from '@/db/schema/reviews';
import { sendPayoutSent } from '@/services/notifications';
import { inngest } from '../client';

export const processPayoutFn = inngest.createFunction(
  {
    id: 'process-payout',
    name: 'Process reviewer payout',
    concurrency: { limit: 2, key: 'event.data.reviewId' },
    retries: 3,
  },
  { event: 'payouts/process' },
  async ({ event, step }) => {
    const { reviewId } = event.data;

    const result = await step.run('create-transfer', () => createPayoutForReview(reviewId));
    if (!result.ok) return result;

    await step.run('notify-reviewer', async () => {
      const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
      if (!review) return;
      const [reviewer] = await db.select().from(reviewers).where(eq(reviewers.id, review.reviewerId));
      if (!reviewer) return;
      const [profile] = await db.select().from(profiles).where(eq(profiles.id, reviewer.userId));
      if (!profile) return;
      const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
        review.payoutCents / 100,
      );
      await sendPayoutSent(profile.id, profile.email, profile.fullName ?? 'Reviewer', amount);
    });

    return result;
  },
);
