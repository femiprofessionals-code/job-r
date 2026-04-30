export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { drafts } from '@/db/schema/drafts';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { matches } from '@/db/schema/matches';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk, parseJson } from '@/lib/api';
import { inngest } from '@/inngest/client';

const createSchema = z.object({
  matchId: z.string().uuid(),
});

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const rows = await db
    .select({
      draft: drafts,
      job: { id: jobs.id, title: jobs.title },
      company: { id: companies.id, name: companies.name },
    })
    .from(drafts)
    .innerJoin(jobs, eq(jobs.id, drafts.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(eq(drafts.userId, user.id))
    .orderBy(desc(drafts.createdAt))
    .limit(50);
  return apiOk({ drafts: rows });
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const body = await parseJson(req, createSchema);
  if (body instanceof NextResponse) return body;

  const [match] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.id, body.matchId), eq(matches.userId, user.id)))
    .limit(1);
  if (!match) return apiFail('Match not found', 404);

  await inngest.send({
    name: 'drafts/generate.requested',
    data: { userId: user.id, matchId: match.id },
  });
  return apiOk({ queued: true });
}