import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { jobs } from '@/db/schema/jobs';
import { inngest } from '../client';

/**
 * One-shot backfill: find every job where classified=false (i.e. the original
 * classify-jobs run failed or never ran) and emit jobs/created so the
 * pipeline picks them up. Invoke manually from the Inngest dashboard.
 *
 * Triggered only by the explicit event 'backfill/classify.requested' — has no
 * cron, no auto-trigger.
 */
export const backfillClassifyFn = inngest.createFunction(
  { id: 'backfill-classify', name: 'Backfill: classify unclassified jobs' },
  { event: 'backfill/classify.requested' },
  async ({ step }) => {
    const unclassified = await step.run('load-unclassified', async () => {
      const rows = await db
        .select({ id: jobs.id, companyId: jobs.companyId })
        .from(jobs)
        .where(eq(jobs.classified, false))
        .limit(2000);
      return rows;
    });

    if (unclassified.length === 0) {
      return { triggered: 0, message: 'No unclassified jobs.' };
    }

    // Group by company so the receiving classify-jobs functions get reasonable
    // batches. Inngest fan-out is cheap so we could also send one event per
    // job, but batching reduces overhead.
    const byCompany = new Map<string, string[]>();
    for (const r of unclassified) {
      const arr = byCompany.get(r.companyId) ?? [];
      arr.push(r.id);
      byCompany.set(r.companyId, arr);
    }

    const events = Array.from(byCompany.entries()).map(([companyId, jobIds]) => ({
      name: 'jobs/created' as const,
      data: { jobIds, companyId },
    }));

    await step.sendEvent('emit-jobs-created', events);

    return { triggered: unclassified.length, batches: events.length };
  },
);
