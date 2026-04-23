import type { NormalizedJob } from './types';

const REMOTE_PATTERNS = [/remote/i, /anywhere/i, /distributed/i, /work from home/i];
const HYBRID_PATTERNS = [/hybrid/i, /flex(ible)?/i];

export function detectLocationType(raw: string | null | undefined): NormalizedJob['locationType'] {
  if (!raw) return null;
  if (REMOTE_PATTERNS.some((r) => r.test(raw))) return 'remote';
  if (HYBRID_PATTERNS.some((r) => r.test(raw))) return 'hybrid';
  return 'onsite';
}

export function parseLocation(raw: string | null | undefined): {
  city: string | null;
  country: string | null;
} {
  if (!raw) return { city: null, country: null };
  const clean = raw.replace(/remote|hybrid|onsite/gi, '').replace(/[()]/g, '').trim();
  const parts = clean
    .split(/[,·|/]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { city: null, country: null };
  if (parts.length === 1) return { city: parts[0], country: null };
  return { city: parts[0], country: parts[parts.length - 1] };
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseSalary(text: string | null | undefined): {
  min: number | null;
  max: number | null;
  currency: string | null;
} {
  if (!text) return { min: null, max: null, currency: null };
  const rangeMatch = text.match(
    /([$£€])\s?(\d{2,3}(?:[,.]\d{3})*(?:k)?)\s?[-–to]{1,3}\s?([$£€])?\s?(\d{2,3}(?:[,.]\d{3})*(?:k)?)/i,
  );
  if (!rangeMatch) return { min: null, max: null, currency: null };
  const symbol = rangeMatch[1];
  const currency = symbol === '£' ? 'GBP' : symbol === '€' ? 'EUR' : 'USD';
  const parse = (v: string) => {
    const isK = /k$/i.test(v);
    const n = Number(v.replace(/[,k]/gi, ''));
    return Number.isFinite(n) ? (isK ? n * 1000 : n) : null;
  };
  return {
    min: parse(rangeMatch[2]),
    max: parse(rangeMatch[4]),
    currency,
  };
}

export function normalizeJob(input: NormalizedJob): NormalizedJob {
  const cleanDesc = stripHtml(input.description).slice(0, 30_000);
  const locationType = input.locationType ?? detectLocationType(input.locationRaw);
  const parsedLoc =
    input.locationCity || input.locationCountry
      ? { city: input.locationCity ?? null, country: input.locationCountry ?? null }
      : parseLocation(input.locationRaw);
  const salary =
    input.salaryMin || input.salaryMax
      ? { min: input.salaryMin ?? null, max: input.salaryMax ?? null, currency: input.salaryCurrency ?? null }
      : parseSalary(cleanDesc);

  return {
    ...input,
    description: cleanDesc,
    locationType,
    locationCity: parsedLoc.city,
    locationCountry: parsedLoc.country,
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
  };
}
