import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { drafts } from '@/db/schema/drafts';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { requireUser } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function DraftsPage() {
  const user = await requireUser();
  const rows = await db
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
    .limit(40);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Draft queue</h1>
      <div className="grid gap-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No drafts yet.</p>}
        {rows.map((d) => (
          <Link key={d.id} href={`/drafts/${d.id}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{d.title}</CardTitle>
                  <div className="text-xs text-muted-foreground">{d.company}</div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {d.status.replace('_', ' ')}
                </Badge>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Created {new Date(d.createdAt).toLocaleString()}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
