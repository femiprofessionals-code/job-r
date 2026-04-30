import Link from 'next/link';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { reviewers, profiles } from '@/db/schema/users';
import { reviews } from '@/db/schema/reviews';
import { drafts } from '@/db/schema/drafts';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { requireUser } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConnectStripeButton } from './connect-button';

export const dynamic = 'force-dynamic';

export default async function ReviewerHomePage() {
  const user = await requireUser();
  const [reviewer] = await db
    .select()
    .from(reviewers)
    .where(eq(reviewers.userId, user.id))
    .limit(1);

  if (!reviewer) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="text-2xl font-semibold">Reviewer access only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have an active reviewer profile. Reach out to the Job Radar team to join.
        </p>
      </div>
    );
  }

  const queue = await db
    .select({
      reviewId: reviews.id,
      status: reviews.status,
      dueAt: reviews.dueAt,
      payoutCents: reviews.payoutCents,
      jobTitle: jobs.title,
      company: companies.name,
      candidate: profiles.fullName,
    })
    .from(reviews)
    .innerJoin(drafts, eq(drafts.id, reviews.draftId))
    .innerJoin(jobs, eq(jobs.id, drafts.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .innerJoin(profiles, eq(profiles.id, reviews.userId))
    .where(and(eq(reviews.reviewerId, reviewer.id), inArray(reviews.status, ['assigned', 'in_progress'])))
    .orderBy(desc(reviews.dueAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reviewer panel</h1>
          <p className="text-sm text-muted-foreground capitalize">Tier: {reviewer.tier}</p>
        </div>
        {!reviewer.payoutsEnabled && <ConnectStripeButton />}
      </div>

      <div className="grid gap-3">
        {queue.length === 0 && <p className="text-sm text-muted-foreground">No pending reviews.</p>}
        {queue.map((r) => (
          <Link key={r.reviewId} href={`/reviewer/${r.reviewId}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{r.jobTitle}</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {r.candidate ?? 'Candidate'} · {r.company}
                  </div>
                </div>
                <Badge variant="outline">${(r.payoutCents / 100).toFixed(2)}</Badge>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Due {new Date(r.dueAt).toLocaleString()}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
