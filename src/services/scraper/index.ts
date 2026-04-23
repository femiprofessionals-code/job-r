import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { companies, scrapeLogs } from '@/db/schema/companies';
import { getAdapter } from './adapters';
import { diffAndPersistJobs } from './differ';

export { getAdapter } from './adapters';
export { diffAndPersistJobs } from './differ';
export * from './types';

export async function scrapeCompany(companyId: string) {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company) throw new Error(`Company ${companyId} not found`);

  const [log] = await db
    .insert(scrapeLogs)
    .values({ companyId, source: company.source })
    .returning({ id: scrapeLogs.id });

  const adapter = getAdapter(company.source);
  const result = await adapter.scrape({
    companyName: company.name,
    sourceBoardId: company.sourceBoardId,
    careersUrl: company.careersUrl,
  });

  if (!result.ok) {
    await db
      .update(scrapeLogs)
      .set({ finishedAt: new Date(), success: 0, error: result.error ?? 'unknown' })
      .where(eq(scrapeLogs.id, log.id));
    return { ok: false, error: result.error, newJobIds: [] as string[] };
  }

  const diff = await diffAndPersistJobs(companyId, result.jobs);

  await db
    .update(scrapeLogs)
    .set({
      finishedAt: new Date(),
      success: 1,
      jobsFound: result.jobs.length,
      jobsNew: diff.inserted,
      jobsClosed: diff.closed,
    })
    .where(eq(scrapeLogs.id, log.id));

  return { ok: true, ...diff };
}
