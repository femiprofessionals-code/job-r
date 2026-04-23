import type { AdapterContext, ScrapeResult, SourceAdapter } from '../types';
import { normalizeJob } from '../normalizer';

type GhJob = {
  id: number | string;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
  departments?: { name: string }[];
  content?: string;
  metadata?: { name: string; value: string | null }[];
};

export const greenhouseAdapter: SourceAdapter = {
  source: 'greenhouse',
  async scrape(ctx: AdapterContext): Promise<ScrapeResult> {
    if (!ctx.sourceBoardId) {
      return { ok: false, jobs: [], error: 'Missing Greenhouse board id' };
    }
    const fetchImpl = ctx.fetchImpl ?? fetch;
    const url = `https://boards-api.greenhouse.io/v1/boards/${ctx.sourceBoardId}/jobs?content=true`;
    try {
      const res = await fetchImpl(url, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) return { ok: false, jobs: [], error: `HTTP ${res.status}` };
      const data = (await res.json()) as { jobs: GhJob[] };
      const jobs = (data.jobs ?? []).map((j) =>
        normalizeJob({
          externalId: String(j.id),
          title: j.title,
          department: j.departments?.[0]?.name ?? null,
          description: j.content ?? '',
          locationRaw: j.location?.name ?? null,
          applyUrl: j.absolute_url,
          postedAt: j.updated_at ? new Date(j.updated_at) : null,
          raw: j,
        }),
      );
      return { ok: true, jobs };
    } catch (err) {
      return { ok: false, jobs: [], error: (err as Error).message };
    }
  },
};
