export type NormalizedJob = {
  externalId: string;
  title: string;
  department?: string | null;
  team?: string | null;
  description: string;
  locationRaw?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  locationType?: 'remote' | 'hybrid' | 'onsite' | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  employmentType?: string | null;
  applyUrl: string;
  postedAt?: Date | null;
  raw?: unknown;
};

export type ScrapeResult = {
  ok: boolean;
  jobs: NormalizedJob[];
  error?: string;
};

export type AdapterContext = {
  companyName: string;
  sourceBoardId: string | null;
  careersUrl: string;
  fetchImpl?: typeof fetch;
};

export interface SourceAdapter {
  readonly source: 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'fallback';
  scrape(ctx: AdapterContext): Promise<ScrapeResult>;
}
