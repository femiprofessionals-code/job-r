import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [row] = await db
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(eq(jobs.id, id))
    .limit(1);

  if (!row) notFound();
  const { job, company } = row;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/jobs" className="text-sm text-muted-foreground hover:underline">
          ← Back to jobs
        </Link>
      </div>
      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-2xl">{job.title}</CardTitle>
          <div className="text-sm text-muted-foreground">
            {company.name}
            {job.locationRaw ? ` · ${job.locationRaw}` : ''}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {job.function && <Badge variant="secondary">{job.function}</Badge>}
            {job.seniority && <Badge variant="secondary">{job.seniority}</Badge>}
            {job.locationType && <Badge variant="outline">{job.locationType}</Badge>}
            {(job.skills ?? []).slice(0, 6).map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{job.description}</div>
          <div className="flex gap-3">
            <Button asChild>
              <a href={job.applyUrl} target="_blank" rel="noreferrer">
                Apply on company site
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            To generate a tailored draft for this role, add a matching career track under{' '}
            <Link href="/tracks" className="underline">
              Career tracks
            </Link>
            . Drafts are produced from the match view once your track matches this job.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
