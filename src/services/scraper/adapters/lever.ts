import type { AdapterContext, ScrapeResult, SourceAdapter } from '../types';
import { normalizeJob } from '../normalizer';

type LeverJob = {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number;
  categories?: { team?: string; department?: string; location?: string; commitment?: string };
  description?: string;
  descriptionPlain?: string;
  lists?: { text: string; content: string }[];
  workplaceType?: string;
};

export const leverAdapter: SourceAdapter = {
  source: 'lever',
  async scrape(ctx: AdapterContext): Promise<ScrapeResult> {
    if (!ctx.sourceBoardId) {
      return { ok: false, jobs: [], error: 'Missing Lever board id' };
    }
    const fetchImpl = ctx.fetchImpl ?? fetch;
    const url = `https://api.lever.co/v0/postings/${ctx.sourceBoardId}?mode=json`;
    try {
      const res = await fetchImpl(url, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) return { ok: false, jobs: [], error: `HTTP ${res.status}` };
      const data = (await res.json()) as LeverJob[];
      const jobs = data.map((j) => {
        const sections = (j.lists ?? [])
          .map((l) => `${l.text}\n${l.content}`)
          .join('\n\n');
        const description = [j.descriptionPlain ?? j.description ?? '', sections]
          .filter(Boolean)
          .join('\n\n');
        const locationType: 'remote' | 'hybrid' | 'onsite' | null =
          j.workplaceType === 'remote'
            ? 'remote'
            : j.workplaceType === 'hybrid'
              ? 'hybrid'
              : j.workplaceType === 'on-site'
                ? 'onsite'
                : null;
        return normalizeJob({
          externalId: j.id,
          title: j.text,
          department: j.categories?.department ?? null,
          team: j.categories?.team ?? null,
          description,
          locationRaw: j.categories?.location ?? null,
          locationType,
          employmentType: j.categories?.commitment ?? null,
          applyUrl: j.applyUrl ?? j.hostedUrl,
          postedAt: j.createdAt ? new Date(j.createdAt) : null,
          raw: j,
        });
      });
      return { ok: true, jobs };
    } catch (err) {
      return { ok: false, jobs: [], error: (err as Error).message };
    }
  },
};
