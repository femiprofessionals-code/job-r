export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { matches } from '@/db/schema/matches';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { careerTracks } from '@/db/schema/careerTracks';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk, parseQuery } from '@/lib/api';

const queryShape = z.object({
  trackId: z.string().uuid().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  saved: z.enum(['0', '1']).optional(),
});

export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const url = new URL(req.url);
  const query = parseQuery(url, queryShape);
  if (query instanceof NextResponse) return query;

  const filters = [eq(matches.userId, user.id), eq(matches.hidden, false)];
  if (query.trackId) filters.push(eq(matches.careerTrackId, query.trackId));
  if (query.saved === '1') filters.push(eq(matches.saved, true));

  const rows = await db
    .select({
      id: matches.id,
      overallScore: matches.overallScore,
      breakdown: matches.breakdown,
      createdAt: matches.createdAt,
      saved: matches.saved,
      track: { id: careerTracks.id, name: careerTracks.name },
      job: {
        id: jobs.id,
        title: jobs.title,
        locationRaw: jobs.locationRaw,
        locationType: jobs.locationType,
        postedAt: jobs.postedAt,
        applyUrl: jobs.applyUrl,
      },
      company: { id: companies.id, name: companies.name, logoUrl: companies.logoUrl },
    })
    .from(matches)
    .innerJoin(jobs, eq(jobs.id, matches.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .innerJoin(careerTracks, eq(careerTracks.id, matches.careerTrackId))
    .where(and(...filters))
    .orderBy(desc(matches.overallScore), desc(matches.createdAt))
    .limit(query.limit);

  const filtered = query.minScore ? rows.filter((r) => r.overallScore >= query.minScore!) : rows;
  return apiOk({ matches: filtered });
}