import Anthropic from '@anthropic-ai/sdk';
import type { AdapterContext, ScrapeResult, SourceAdapter } from '../types';
import { normalizeJob } from '../normalizer';
import { stripHtml } from '../normalizer';

const SYSTEM_PROMPT = `You extract job listings from raw HTML of a careers page.
Return JSON matching this shape exactly:
{"jobs":[{"externalId":"string","title":"string","department":"string|null","description":"string","locationRaw":"string|null","applyUrl":"string","postedAt":"ISO8601|null"}]}
Rules:
- externalId must be a stable slug derived from the title + location if no explicit id exists.
- applyUrl must be absolute.
- description should be at most 6000 characters of human-readable text.
- Only return currently-open roles.
- No prose, no markdown, JSON only.`;

export const fallbackAdapter: SourceAdapter = {
  source: 'fallback',
  async scrape(ctx: AdapterContext): Promise<ScrapeResult> {
    const fetchImpl = ctx.fetchImpl ?? fetch;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { ok: false, jobs: [], error: 'ANTHROPIC_API_KEY missing' };

    let html: string;
    try {
      const res = await fetchImpl(ctx.careersUrl, {
        headers: { 'user-agent': 'JobRadarBot/1.0 (+https://jobradar.app)' },
        cache: 'no-store',
      });
      if (!res.ok) return { ok: false, jobs: [], error: `HTTP ${res.status}` };
      html = await res.text();
    } catch (err) {
      return { ok: false, jobs: [], error: (err as Error).message };
    }

    const trimmed = stripHtml(html).slice(0, 60_000);
    const anthropic = new Anthropic({ apiKey });

    try {
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Company: ${ctx.companyName}\nCareers URL: ${ctx.careersUrl}\n\nPage content:\n${trimmed}`,
          },
        ],
      });
      const text = resp.content
        .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('');
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) return { ok: false, jobs: [], error: 'No JSON returned' };
      const parsed = JSON.parse(text.slice(start, end + 1)) as {
        jobs: Array<{
          externalId: string;
          title: string;
          department: string | null;
          description: string;
          locationRaw: string | null;
          applyUrl: string;
          postedAt: string | null;
        }>;
      };
      const jobs = (parsed.jobs ?? []).map((j) =>
        normalizeJob({
          externalId: j.externalId,
          title: j.title,
          department: j.department,
          description: j.description,
          locationRaw: j.locationRaw,
          applyUrl: j.applyUrl,
          postedAt: j.postedAt ? new Date(j.postedAt) : null,
          raw: j,
        }),
      );
      return { ok: true, jobs };
    } catch (err) {
      return { ok: false, jobs: [], error: (err as Error).message };
    }
  },
};
