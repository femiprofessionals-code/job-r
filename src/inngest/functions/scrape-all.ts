import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { companies } from '@/db/schema/companies';
import { inngest } from '../client';

export const scrapeAll = inngest.createFunction(
  { id: 'scrape-all', name: 'Scrape all approved companies', concurrency: { limit: 1 } },
  [{ cron: '0 * * * *' }, { event: 'scrape/all.requested' }],
  async ({ step }) => {
    const due = await step.run('select-due-companies', async () => {
      return db
        .select({ id: companies.id, name: companies.name, interval: companies.scrapeIntervalMinutes })
        .from(companies)
        .where(
          and(
            eq(companies.status, 'approved'),
            or(
              isNull(companies.lastScrapedAt),
              lte(
                companies.lastScrapedAt,
                sql`now() - (companies.scrape_interval_minutes || ' minutes')::interval`,
              ),
            ),
          ),
        );
    });

    if (due.length === 0) return { dispatched: 0 };

    await step.sendEvent(
      'dispatch-scrapes',
      due.map((c) => ({ name: 'scrape/company.requested' as const, data: { companyId: c.id } })),
    );

    return { dispatched: due.length };
  },
);
