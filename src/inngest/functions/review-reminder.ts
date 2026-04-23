import { and, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { reviews } from '@/db/schema/reviews';
import { reviewers } from '@/db/schema/users';
import { profiles } from '@/db/schema/users';
import { sendReviewReminder } from '@/services/notifications';
import { inngest } from '../client';

export const reviewReminderFn = inngest.createFunction(
  { id: 'review-reminder', name: 'Remind reviewers of pending work' },
  [{ cron: '15 * * * *' }, { event: 'reviews/reminder.requested' }],
  async ({ step }) => {
    const now = new Date();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const soon = await step.run('load-due-soon', async () =>
      db
        .select({
          reviewId: reviews.id,
          reviewerUserId: reviewers.userId,
          dueAt: reviews.dueAt,
          reviewerEmail: profiles.email,
          reviewerName: profiles.fullName,
        })
        .from(reviews)
        .innerJoin(reviewers, eq(reviewers.id, reviews.reviewerId))
        .innerJoin(profiles, eq(profiles.id, reviewers.userId))
        .where(
          and(
            inArray(reviews.status, ['assigned', 'in_progress']),
            gt(reviews.dueAt, now),
            lt(reviews.dueAt, sql`now() + interval '6 hours'`),
          ),
        ),
    );

    for (const r of soon) {
      await sendReviewReminder(
        r.reviewerUserId,
        r.reviewerEmail,
        r.reviewerName ?? 'Reviewer',
        'candidate',
        r.dueAt.toISOString(),
        r.reviewId,
        appUrl,
      );
    }
    return { reminded: soon.length };
  },
);
