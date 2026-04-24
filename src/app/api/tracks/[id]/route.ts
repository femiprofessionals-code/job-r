export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { careerTracks } from '@/db/schema/careerTracks';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk, parseJson } from '@/lib/api';

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  preferredCities: z.array(z.string()).optional(),
  preferredCountries: z.array(z.string()).optional(),
  mustHaveSkills: z.array(z.string()).optional(),
  niceToHaveSkills: z.array(z.string()).optional(),
  excludedCompanies: z.array(z.string()).optional(),
  targetCompanies: z.array(z.string()).optional(),
  minSalary: z.number().int().nullable().optional(),
  minMatchScore: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const { id } = await context.params;
  const body = await parseJson(req, updateSchema);
  if (body instanceof NextResponse) return body;
  const [row] = await db
    .update(careerTracks)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(careerTracks.id, id), eq(careerTracks.userId, user.id)))
    .returning();
  if (!row) return apiFail('Not found', 404);
  return apiOk({ track: row });
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const { id } = await context.params;
  const result = await db
    .delete(careerTracks)
    .where(and(eq(careerTracks.id, id), eq(careerTracks.userId, user.id)))
    .returning({ id: careerTracks.id });
  if (result.length === 0) return apiFail('Not found', 404);
  return apiOk({ ok: true });
}