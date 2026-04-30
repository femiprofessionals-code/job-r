import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reviews } from '@/db/schema/reviews';
import { reviewers, profiles } from '@/db/schema/users';
import { drafts } from '@/db/schema/drafts';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { requireUser } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReviewEditor } from './review-editor';

export const dynamic = 'force-dynamic';

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [reviewer] = await db.select().from(reviewers).where(eq(reviewers.userId, user.id)).limit(1);
  if (!reviewer) notFound();

  const [row] = await db
    .select({
      review: reviews,
      draft: drafts,
      job: jobs,
      company: companies,
      candidate: profiles,
    })
    .from(reviews)
    .innerJoin(drafts, eq(drafts.id, reviews.draftId))
    .innerJoin(jobs, eq(jobs.id, drafts.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .innerJoin(profiles, eq(profiles.id, reviews.userId))
    .where(and(eq(reviews.id, id), eq(reviews.reviewerId, reviewer.id)))
    .limit(1);
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/reviewer" className="text-sm text-muted-foreground hover:underline">
        ← Back to queue
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{row.job.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Candidate: {row.candidate.fullName ?? row.candidate.email} · {row.company.name}
          </p>
        </CardHeader>
        <CardContent>
          <ReviewEditor
            reviewId={row.review.id}
            initialCoverLetter={row.review.editedCoverLetter ?? row.draft.coverLetterText ?? ''}
            initialNotes={row.review.reviewerNotes ?? ''}
          />
        </CardContent>
      </Card>
    </div>
  );
}
