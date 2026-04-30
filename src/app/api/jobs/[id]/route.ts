export const dynamic = 'force-dynamic';

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { apiFail, apiOk } from '@/lib/api';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const [row] = await db
    .select({
      job: jobs,
      company: companies,
    })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(eq(jobs.id, id))
    .limit(1);
  if (!row) return apiFail('Not found', 404);
  return apiOk(row);
}