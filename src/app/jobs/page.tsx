import Link from 'next/link';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JobFilters } from './filters';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

type SearchParams = Promise<{
  q?: string;
  function?: string;
  seniority?: string;
  locationType?: string;
}>;

export default async function JobsFeedPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filters = [eq(jobs.status, 'open' as const)];
  if (sp.function) filters.push(eq(jobs.function, sp.function as never));
  if (sp.seniority) filters.push(eq(jobs.seniority, sp.seniority as never));
  if (sp.locationType === 'remote' || sp.locationType === 'hybrid' || sp.locationType === 'onsite') {
    filters.push(eq(jobs.locationType, sp.locationType));
  }
  if (sp.q) {
    filters.push(
      or(ilike(jobs.title, `%${sp.q}%`), ilike(jobs.description, `%${sp.q}%`)) ?? sql`true`,
    );
  }

  const [rows, totalRow] = await Promise.all([
    (async () => {
      try {
        return await db
          .select({
            id: jobs.id,
            title: jobs.title,
            locationRaw: jobs.locationRaw,
            locationType: jobs.locationType,
            function: jobs.function,
            seniority: jobs.seniority,
            skills: jobs.skills,
            company: companies.name,
            companyLogo: companies.logoUrl,
          })
          .from(jobs)
          .innerJoin(companies, eq(companies.id, jobs.companyId))
          .where(and(...filters))
          .orderBy(desc(jobs.postedAt), desc(jobs.createdAt))
          .limit(PAGE_SIZE);
      } catch (err) {
        console.error('[jobs page] query failed:', err);
        return [];
      }
    })(),
    (async () => {
      try {
        const [r] = await db
          .select({ n: count() })
          .from(jobs)
          .where(and(...filters));
        return r;
      } catch (err) {
        console.error('[jobs page] count failed:', err);
        return { n: 0 };
      }
    })(),
  ]);

  const total = totalRow?.n ?? rows.length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            {total === 0
              ? 'No open jobs match your filters yet.'
              : `Showing ${rows.length} of ${total} open ${total === 1 ? 'role' : 'roles'}.`}
          </p>
        </div>
        <JobFilters />
      </header>

      <div className="grid gap-3">
        {rows.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No matches. Try clearing filters or wait for the next scrape (runs hourly).
            </CardContent>
          </Card>
        )}
        {rows.map((j) => (
          <Link key={j.id} href={`/jobs/${j.id}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-muted" aria-hidden />
                  <div>
                    <div className="font-medium">{j.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {j.company}
                      {j.locationRaw ? ` · ${j.locationRaw}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {j.function && <Badge variant="secondary">{j.function}</Badge>}
                  {j.seniority && <Badge variant="secondary">{j.seniority}</Badge>}
                  {j.locationType && <Badge variant="outline">{j.locationType}</Badge>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {total > rows.length && (
        <p className="text-center text-sm text-muted-foreground">
          Showing first {rows.length} results. Refine with filters or search to narrow down.
        </p>
      )}
    </div>
  );
}
