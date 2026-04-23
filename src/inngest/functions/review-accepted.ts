import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reviews } from '@/db/schema/reviews';
import { inngest } from '../client';

export const reviewAcceptedFn = inngest.createFunction(
  { id: 'review-accepted', name: 'Trigger payout when a review is accepted' },
  { event: 'reviews/accepted' },
  async ({ event, step }) => {
    const { reviewId } = event.data;
    await step.run('mark-accepted', async () => {
      await db
        .update(reviews)
        .set({ status: 'accepted', acceptedAt: new Date(), updatedAt: new Date() })
        .where(eq(reviews.id, reviewId));
    });
    await step.sendEvent('emit-payout', { name: 'payouts/process', data: { reviewId } });
    return { reviewId };
  },
);
