import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { jobs } from '@/db/schema/jobs';
import { classifyJob } from '@/services/classifier';
import { inngest } from '../client';

export const classifyJobsFn = inngest.createFunction(
  {
    id: 'classify-jobs',
    name: 'Classify newly scraped jobs',
    concurrency: { limit: 4 },
    retries: 3,
  },
  { event: 'jobs/created' },
  async ({ event, step }) => {
    const { jobIds } = event.data;
    if (jobIds.length === 0) return { classified: 0 };

    const rows = await step.run('load-jobs', async () =>
      db
        .select({
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          locationRaw: jobs.locationRaw,
        })
        .from(jobs)
        .where(inArray(jobs.id, jobIds)),
    );

    const classifiedIds: string[] = [];
    for (const job of rows) {
      await step.run(`classify-${job.id}`, async () => {
        try {
          const out = await classifyJob({
            title: job.title,
            description: job.description,
            locationRaw: job.locationRaw,
          });
          await db
            .update(jobs)
            .set({
              function: out.function,
              seniority: out.seniority,
              skills: out.skills,
              locationType: out.location_type ?? undefined,
              classified: true,
              classifiedAt: new Date(),
              classifierMeta: { confidence: out.confidence, rationale: out.rationale ?? null },
            })
            .where(eq(jobs.id, job.id));
          classifiedIds.push(job.id);
        } catch (err) {
          console.error('classify error', job.id, err);
        }
      });
    }

    if (classifiedIds.length > 0) {
      await step.sendEvent('emit-classified', {
        name: 'jobs/classified',
        data: { jobIds: classifiedIds },
      });
    }

    return { classified: classifiedIds.length };
  },
);
