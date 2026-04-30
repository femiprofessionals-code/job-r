import { count, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { companies, scrapeLogs } from '@/db/schema/companies';
import { jobs } from '@/db/schema/jobs';
import { matches } from '@/db/schema/matches';
import { drafts } from '@/db/schema/drafts';
import { profiles } from '@/db/schema/users';
import { requireUser } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await requireUser();
  const [me] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  if (me?.role !== 'admin') {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="text-2xl font-semibold">Admins only</h1>
      </div>
    );
  }

  const [[jobsCount], [matchCount], [draftCount], [pendingCompanies]] = await Promise.all([
    db.select({ n: count() }).from(jobs).where(eq(jobs.status, 'open' as const)),
    db.select({ n: count() }).from(matches),
    db.select({ n: count() }).from(drafts),
    db.select({ n: count() }).from(companies).where(eq(companies.status, 'pending')),
  ]);

  const recentLogs = await db
    .select({
      id: scrapeLogs.id,
      companyId: scrapeLogs.companyId,
      companyName: companies.name,
      source: scrapeLogs.source,
      startedAt: scrapeLogs.startedAt,
      finishedAt: scrapeLogs.finishedAt,
      jobsFound: scrapeLogs.jobsFound,
      jobsNew: scrapeLogs.jobsNew,
      jobsClosed: scrapeLogs.jobsClosed,
      success: scrapeLogs.success,
      error: scrapeLogs.error,
    })
    .from(scrapeLogs)
    .innerJoin(companies, eq(companies.id, scrapeLogs.companyId))
    .orderBy(desc(scrapeLogs.startedAt))
    .limit(15);

  const pending = await db
    .select()
    .from(companies)
    .where(eq(companies.status, 'pending'))
    .orderBy(desc(companies.createdAt));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Open jobs" value={jobsCount?.n ?? 0} />
        <Stat label="Matches" value={matchCount?.n ?? 0} />
        <Stat label="Drafts" value={draftCount?.n ?? 0} />
        <Stat label="Pending companies" value={pendingCompanies?.n ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending company approvals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
          {pending.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.source} · {c.careersUrl}
                </div>
              </div>
              <div className="flex gap-2">
                <form action="/api/admin/companies" method="post">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="status" value="approved" />
                  <button className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                    Approve
                  </button>
                </form>
                <form action="/api/admin/companies" method="post">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <button className="rounded-md border px-3 py-1.5 text-xs">Reject</button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent scrape runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recentLogs.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-md border p-2">
              <div>
                <div className="font-medium">{l.companyName}</div>
                <div className="text-xs text-muted-foreground">
                  {l.source} · {new Date(l.startedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">{l.jobsNew} new</Badge>
                <Badge variant="outline">{l.jobsClosed} closed</Badge>
                {l.success ? (
                  <Badge variant="default">ok</Badge>
                ) : (
                  <Badge variant="destructive">{l.error ?? 'fail'}</Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
