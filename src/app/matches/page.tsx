import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { matches } from '@/db/schema/matches';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { careerTracks } from '@/db/schema/careerTracks';
import { requireUser } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { MatchScore } from '@/components/match-score';
import { MatchRowActions } from './row-actions';

export const dynamic = 'force-dynamic';

export default async function MatchesPage() {
  const user = await requireUser();
  const rows = await db
    .select({
      id: matches.id,
      score: matches.overallScore,
      saved: matches.saved,
      jobId: jobs.id,
      title: jobs.title,
      locationRaw: jobs.locationRaw,
      company: companies.name,
      trackName: careerTracks.name,
    })
    .from(matches)
    .innerJoin(jobs, eq(jobs.id, matches.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .innerJoin(careerTracks, eq(careerTracks.id, matches.careerTrackId))
    .where(and(eq(matches.userId, user.id), eq(matches.hidden, false)))
    .orderBy(desc(matches.overallScore), desc(matches.createdAt))
    .limit(60);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Matches</h1>
      <div className="grid gap-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No matches yet.</p>}
        {rows.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <div className="font-medium">
                  <Link href={`/jobs/${m.jobId}`} className="hover:underline">
                    {m.title}
                  </Link>
                </div>
                <div className="text-sm text-muted-foreground">
                  {m.company} · track: {m.trackName}
                  {m.locationRaw ? ` · ${m.locationRaw}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MatchScore score={m.score} />
                <MatchRowActions matchId={m.id} saved={m.saved} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
