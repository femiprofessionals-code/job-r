import type { AdapterContext, ScrapeResult, SourceAdapter } from '../types';
import { normalizeJob } from '../normalizer';

// Workday uses tenant-specific CXS endpoints. The public pattern is:
//   POST https://<tenant>.wd1.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs
// We encode tenant/site in sourceBoardId as "tenant|site" (e.g. "nvidia|NVIDIAExternalCareerSite").
// Job detail pages are fetched one by one for full descriptions.

type WdJobStub = {
  title: string;
  externalPath: string;
  locationsText: string;
  postedOn: string;
  bulletFields?: string[];
};

type WdJobDetail = {
  jobPostingInfo?: {
    id?: string;
    title?: string;
    externalUrl?: string;
    jobDescription?: string;
    jobReqId?: string;
    location?: string;
    postedOn?: string;
    timeType?: string;
  };
};

export const workdayAdapter: SourceAdapter = {
  source: 'workday',
  async scrape(ctx: AdapterContext): Promise<ScrapeResult> {
    if (!ctx.sourceBoardId || !ctx.sourceBoardId.includes('|')) {
      return { ok: false, jobs: [], error: 'Workday sourceBoardId must be "tenant|site"' };
    }
    const [tenant, site] = ctx.sourceBoardId.split('|');
    const fetchImpl = ctx.fetchImpl ?? fetch;

    const u = new URL(ctx.careersUrl);
    const base = `https://${u.host}/wday/cxs/${tenant}/${site}`;

    try {
      const listRes = await fetchImpl(`${base}/jobs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ appliedFacets: {}, limit: 50, offset: 0, searchText: '' }),
        cache: 'no-store',
      });
      if (!listRes.ok) return { ok: false, jobs: [], error: `HTTP ${listRes.status}` };
      const listData = (await listRes.json()) as { jobPostings?: WdJobStub[] };
      const stubs = listData.jobPostings ?? [];

      const details = await Promise.all(
        stubs.map(async (stub) => {
          try {
            const d = await fetchImpl(`${base}${stub.externalPath}`, {
              headers: { accept: 'application/json' },
              cache: 'no-store',
            });
            if (!d.ok) return null;
            const detail = (await d.json()) as WdJobDetail;
            return { stub, detail };
          } catch {
            return null;
          }
        }),
      );

      const jobs = details
        .filter((x): x is NonNullable<typeof x> => !!x)
        .map(({ stub, detail }) => {
          const info = detail.jobPostingInfo ?? {};
          const externalId = info.jobReqId ?? info.id ?? stub.externalPath;
          const applyUrl = info.externalUrl ?? `https://${u.host}${stub.externalPath}`;
          return normalizeJob({
            externalId,
            title: info.title ?? stub.title,
            description: info.jobDescription ?? '',
            locationRaw: info.location ?? stub.locationsText,
            employmentType: info.timeType ?? null,
            applyUrl,
            postedAt: info.postedOn ? new Date(info.postedOn) : null,
            raw: { stub, detail },
          });
        });
      return { ok: true, jobs };
    } catch (err) {
      return { ok: false, jobs: [], error: (err as Error).message };
    }
  },
};
