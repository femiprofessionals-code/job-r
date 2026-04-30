import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { jobs } from '@/db/schema/jobs';
import type { NormalizedJob } from './types';

export type DiffOutcome = {
  inserted: number;
  updated: number;
  closed: number;
  newJobIds: string[];
};

/**
 * Upsert scraped jobs for a company and mark any previously-open job not in the
 * incoming set as closed. Returns counts + the job ids that were newly inserted.
 */
export async function diffAndPersistJobs(
  companyId: string,
  incoming: NormalizedJob[],
): Promise<DiffOutcome> {
  if (incoming.length === 0) {
    const toClose = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.companyId, companyId), eq(jobs.status, 'open')));
    if (toClose.length === 0) return { inserted: 0, updated: 0, closed: 0, newJobIds: [] };
    await db
      .update(jobs)
      .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
      .where(
        inArray(
          jobs.id,
          toClose.map((j) => j.id),
        ),
      );
    return { inserted: 0, updated: 0, closed: toClose.length, newJobIds: [] };
  }

  const existing = await db
    .select({ id: jobs.id, externalId: jobs.externalId, status: jobs.status })
    .from(jobs)
    .where(eq(jobs.companyId, companyId));

  const byExternal = new Map(existing.map((e) => [e.externalId, e]));
  const incomingExternalIds = new Set(incoming.map((j) => j.externalId));

  const newJobIds: string[] = [];
  let inserted = 0;
  let updated = 0;

  for (const job of incoming) {
    const existingRow = byExternal.get(job.externalId);
    if (!existingRow) {
      const [row] = await db
        .insert(jobs)
        .values({
          companyId,
          externalId: job.externalId,
          title: job.title,
          department: job.department ?? null,
          team: job.team ?? null,
          description: job.description,
          locationRaw: job.locationRaw ?? null,
          locationCity: job.locationCity ?? null,
          locationCountry: job.locationCountry ?? null,
          locationType: job.locationType ?? null,
          salaryMin: job.salaryMin ?? null,
          salaryMax: job.salaryMax ?? null,
          salaryCurrency: job.salaryCurrency ?? null,
          employmentType: job.employmentType ?? null,
          applyUrl: job.applyUrl,
          postedAt: job.postedAt ?? null,
          raw: job.raw ?? null,
          status: 'open',
        })
        .returning({ id: jobs.id });
      inserted++;
      if (row) newJobIds.push(row.id);
    } else {
      await db
        .update(jobs)
        .set({
          title: job.title,
          department: job.department ?? null,
          team: job.team ?? null,
          description: job.description,
          locationRaw: job.locationRaw ?? null,
          locationCity: job.locationCity ?? null,
          locationCountry: job.locationCountry ?? null,
          locationType: job.locationType ?? null,
          salaryMin: job.salaryMin ?? null,
          salaryMax: job.salaryMax ?? null,
          salaryCurrency: job.salaryCurrency ?? null,
          employmentType: job.employmentType ?? null,
          applyUrl: job.applyUrl,
          status: 'open',
          closedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, existingRow.id));
      updated++;
    }
  }

  const toClose = existing.filter(
    (e) => e.status === 'open' && !incomingExternalIds.has(e.externalId),
  );
  if (toClose.length > 0) {
    await db
      .update(jobs)
      .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
      .where(
        inArray(
          jobs.id,
          toClose.map((j) => j.id),
        ),
      );
  }

  // Bump company last_scraped_at atomically so cron can pick stale companies.
  await db.execute(sql`UPDATE companies SET last_scraped_at = now() WHERE id = ${companyId}`);

  return { inserted, updated, closed: toClose.length, newJobIds };
}
