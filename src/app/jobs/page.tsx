import Link from 'next/link';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ q?: string; function?: string; locationType?: string }>;

export default async function JobsFeedPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filters = [eq(jobs.status, 'open' as const)];
  if (sp.function) filters.push(eq(jobs.function, sp.function as never));
  if (sp.locationType === 'remote' || sp.locationType === 'hybrid' || sp.locationType === 'onsite') {
    filters.push(eq(jobs.locationType, sp.locationType));
  }
  if (sp.q) {
    filters.push(
      or(ilike(jobs.title, `%${sp.q}%`), ilike(jobs.description, `%${sp.q}%`)) ?? sql`true`,
    );
  }

  const rows = await (async () => {
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
        .limit(40);
    } catch (err) {
      console.error('[jobs page] query failed:', err);
      return [];
    }
  })();

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted-foreground">Live feed across {rows.length} roles.</p>
        </div>
        <form className="flex gap-2">
          <Input name="q" placeholder="Search titles + descriptions" defaultValue={sp.q ?? ''} className="w-64" />
          <select
            name="function"
            className="h-10 rounded-md border bg-background px-3 text-sm"
            defaultValue={sp.function ?? ''}
          >
            <option value="">All functions</option>
            {['engineering', 'product', 'design', 'data', 'marketing', 'sales', 'operations'].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            name="locationType"
            className="h-10 rounded-md border bg-background px-3 text-sm"
            defaultValue={sp.locationType ?? ''}
          >
            <option value="">All locations</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </form>
      </header>

      <div className="grid gap-3">
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
    </div>
  );
}
