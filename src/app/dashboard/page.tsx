import Link from 'next/link';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import { db } from '@/db/client';
import { matches } from '@/db/schema/matches';
import { drafts } from '@/db/schema/drafts';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { careerTracks } from '@/db/schema/careerTracks';
import { requireUser } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MatchScore } from '@/components/match-score';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [[matchCount], [draftCount], [trackCount]] = await Promise.all([
    db
      .select({ n: count() })
      .from(matches)
      .where(and(eq(matches.userId, user.id), gte(matches.createdAt, since))),
    db
      .select({ n: count() })
      .from(drafts)
      .where(and(eq(drafts.userId, user.id), gte(drafts.createdAt, since))),
    db
      .select({ n: count() })
      .from(careerTracks)
      .where(and(eq(careerTracks.userId, user.id), eq(careerTracks.isActive, true))),
  ]);

  const topMatches = await db
    .select({
      id: matches.id,
      score: matches.overallScore,
      createdAt: matches.createdAt,
      jobId: jobs.id,
      title: jobs.title,
      company: companies.name,
    })
    .from(matches)
    .innerJoin(jobs, eq(jobs.id, matches.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(eq(matches.userId, user.id))
    .orderBy(desc(matches.overallScore), desc(matches.createdAt))
    .limit(8);

  const recentDrafts = await db
    .select({
      id: drafts.id,
      status: drafts.status,
      createdAt: drafts.createdAt,
      title: jobs.title,
      company: companies.name,
    })
    .from(drafts)
    .innerJoin(jobs, eq(jobs.id, drafts.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(eq(drafts.userId, user.id))
    .orderBy(desc(drafts.createdAt))
    .limit(5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back. Here&apos;s what moved this week.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="New matches (7d)" value={matchCount?.n ?? 0} />
        <StatCard label="Drafts (7d)" value={draftCount?.n ?? 0} />
        <StatCard label="Active tracks" value={trackCount?.n ?? 0} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top matches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topMatches.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No matches yet.{' '}
                <Link href="/tracks/new" className="underline">
                  Create a career track
                </Link>{' '}
                to start.
              </p>
            )}
            {topMatches.map((m) => (
              <Link
                key={m.id}
                href={`/jobs/${m.jobId}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">{m.company}</div>
                </div>
                <MatchScore score={m.score} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent drafts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDrafts.length === 0 && (
              <p className="text-sm text-muted-foreground">No drafts yet.</p>
            )}
            {recentDrafts.map((d) => (
              <Link
                key={d.id}
                href={`/drafts/${d.id}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{d.title}</div>
                  <div className="text-xs text-muted-foreground">{d.company}</div>
                </div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {d.status}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
