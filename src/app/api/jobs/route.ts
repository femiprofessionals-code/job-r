import { NextResponse } from 'next/server';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { apiOk, parseQuery } from '@/lib/api';

const queryShape = z.object({
  q: z.string().optional(),
  function: z.string().optional(),
  seniority: z.string().optional(),
  locationType: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  companyId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = parseQuery(url, queryShape);
  if (query instanceof NextResponse) return query;

  const filters = [eq(jobs.status, 'open' as const)];
  if (query.function) filters.push(eq(jobs.function, query.function as never));
  if (query.seniority) filters.push(eq(jobs.seniority, query.seniority as never));
  if (query.locationType) filters.push(eq(jobs.locationType, query.locationType));
  if (query.companyId) filters.push(eq(jobs.companyId, query.companyId));
  if (query.q) {
    filters.push(
      or(
        ilike(jobs.title, `%${query.q}%`),
        ilike(jobs.description, `%${query.q}%`),
      ) ?? sql`true`,
    );
  }
  if (query.cursor) filters.push(sql`${jobs.id}::text < ${query.cursor}`);

  const rows = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      locationRaw: jobs.locationRaw,
      locationType: jobs.locationType,
      function: jobs.function,
      seniority: jobs.seniority,
      skills: jobs.skills,
      postedAt: jobs.postedAt,
      applyUrl: jobs.applyUrl,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      salaryCurrency: jobs.salaryCurrency,
      company: { id: companies.id, name: companies.name, logoUrl: companies.logoUrl },
    })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(and(...filters))
    .orderBy(desc(jobs.postedAt), desc(jobs.createdAt))
    .limit(query.limit);

  const nextCursor = rows.length === query.limit ? rows[rows.length - 1].id : null;
  return apiOk({ jobs: rows, nextCursor });
}
