import type { AdapterContext, ScrapeResult, SourceAdapter } from '../types';
import { normalizeJob } from '../normalizer';

type AshbyJob = {
  id: string;
  title: string;
  jobUrl: string;
  applicationUrl?: string;
  updatedAt?: string;
  publishedAt?: string;
  location?: string;
  locationIds?: string[];
  secondaryLocations?: { location?: string }[];
  department?: string;
  team?: string;
  employmentType?: string;
  shouldDisplayCompensationOnJobBoard?: boolean;
  compensation?: {
    compensationTierSummary?: string;
  };
  descriptionHtml?: string;
  descriptionPlain?: string;
  isRemote?: boolean;
};

export const ashbyAdapter: SourceAdapter = {
  source: 'ashby',
  async scrape(ctx: AdapterContext): Promise<ScrapeResult> {
    if (!ctx.sourceBoardId) {
      return { ok: false, jobs: [], error: 'Missing Ashby board id' };
    }
    const fetchImpl = ctx.fetchImpl ?? fetch;
    const url = `https://api.ashbyhq.com/posting-api/job-board/${ctx.sourceBoardId}?includeCompensation=true`;
    try {
      const res = await fetchImpl(url, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) return { ok: false, jobs: [], error: `HTTP ${res.status}` };
      const data = (await res.json()) as { jobs: AshbyJob[] };
      const jobs = (data.jobs ?? []).map((j) =>
        normalizeJob({
          externalId: j.id,
          title: j.title,
          department: j.department ?? null,
          team: j.team ?? null,
          description: j.descriptionPlain ?? j.descriptionHtml ?? '',
          locationRaw: j.location ?? null,
          locationType: j.isRemote ? 'remote' : null,
          employmentType: j.employmentType ?? null,
          applyUrl: j.applicationUrl ?? j.jobUrl,
          postedAt: j.publishedAt ? new Date(j.publishedAt) : j.updatedAt ? new Date(j.updatedAt) : null,
          raw: j,
        }),
      );
      return { ok: true, jobs };
    } catch (err) {
      return { ok: false, jobs: [], error: (err as Error).message };
    }
  },
};
