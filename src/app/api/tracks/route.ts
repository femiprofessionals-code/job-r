import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { careerTracks } from '@/db/schema/careerTracks';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk, parseJson } from '@/lib/api';

const functionEnum = z.enum([
  'engineering',
  'product',
  'design',
  'data',
  'marketing',
  'sales',
  'operations',
  'finance',
  'legal',
  'people',
  'support',
  'other',
]);
const seniorityEnum = z.enum([
  'intern',
  'junior',
  'mid',
  'senior',
  'staff',
  'principal',
  'manager',
  'director',
  'vp',
  'executive',
]);

const createSchema = z.object({
  name: z.string().min(1).max(80),
  targetFunction: functionEnum,
  targetSeniority: seniorityEnum,
  targetLocationType: z.enum(['remote', 'hybrid', 'onsite']).nullable().optional(),
  preferredCities: z.array(z.string()).default([]),
  preferredCountries: z.array(z.string()).default([]),
  mustHaveSkills: z.array(z.string()).default([]),
  niceToHaveSkills: z.array(z.string()).default([]),
  excludedCompanies: z.array(z.string()).default([]),
  targetCompanies: z.array(z.string()).default([]),
  minSalary: z.number().int().nullable().optional(),
  salaryCurrency: z.string().optional(),
  minMatchScore: z.number().int().min(0).max(100).default(60),
});

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(careerTracks)
      .where(eq(careerTracks.userId, user.id))
      .orderBy(desc(careerTracks.createdAt));
    return apiOk({ tracks: rows });
  } catch {
    return apiFail('Unauthorized', 401);
  }
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
  const [row] = await db
    .insert(careerTracks)
    .values({
      userId: user.id,
      name: body.name,
      targetFunction: body.targetFunction,
      targetSeniority: body.targetSeniority,
      targetLocationType: body.targetLocationType ?? null,
      preferredCities: body.preferredCities,
      preferredCountries: body.preferredCountries,
      mustHaveSkills: body.mustHaveSkills,
      niceToHaveSkills: body.niceToHaveSkills,
      excludedCompanies: body.excludedCompanies,
      targetCompanies: body.targetCompanies,
      minSalary: body.minSalary ?? null,
      salaryCurrency: body.salaryCurrency ?? 'USD',
      minMatchScore: body.minMatchScore,
    })
    .returning();
  return apiOk({ track: row });
}
