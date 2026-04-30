export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { reviewers, profiles } from '@/db/schema/users';
import { reviews } from '@/db/schema/reviews';
import { drafts } from '@/db/schema/drafts';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk } from '@/lib/api';

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const [reviewer] = await db.select().from(reviewers).where(eq(reviewers.userId, user.id)).limit(1);
  if (!reviewer) return apiFail('Not a reviewer', 403);

  const queue = await db
    .select({
      review: reviews,
      draft: drafts,
      job: { id: jobs.id, title: jobs.title },
      company: { id: companies.id, name: companies.name },
      candidate: { id: profiles.id, name: profiles.fullName },
    })
    .from(reviews)
    .innerJoin(drafts, eq(drafts.id, reviews.draftId))
    .innerJoin(jobs, eq(jobs.id, drafts.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .innerJoin(profiles, eq(profiles.id, reviews.userId))
    .where(and(eq(reviews.reviewerId, reviewer.id), inArray(reviews.status, ['assigned', 'in_progress'])))
    .orderBy(desc(reviews.dueAt));

  return apiOk({ reviewer, queue });
}