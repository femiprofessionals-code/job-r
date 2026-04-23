import { inngest } from '../client';
import { scrapeCompany } from '@/services/scraper';

export const scrapeCompanyFn = inngest.createFunction(
  {
    id: 'scrape-company',
    name: 'Scrape a single company',
    concurrency: { limit: 8, key: 'event.data.companyId' },
    retries: 2,
  },
  { event: 'scrape/company.requested' },
  async ({ event, step }) => {
    const { companyId } = event.data;

    const result = await step.run('run-scrape', () => scrapeCompany(companyId));

    if (result.ok && result.newJobIds && result.newJobIds.length > 0) {
      await step.sendEvent('emit-jobs-created', {
        name: 'jobs/created',
        data: { jobIds: result.newJobIds, companyId },
      });
    }

    return result;
  },
);
