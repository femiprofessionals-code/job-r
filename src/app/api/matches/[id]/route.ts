import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { matches } from '@/db/schema/matches';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk, parseJson } from '@/lib/api';

const updateSchema = z.object({
  hidden: z.boolean().optional(),
  saved: z.boolean().optional(),
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
    .update(matches)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(matches.id, id), eq(matches.userId, user.id)))
    .returning();
  if (!row) return apiFail('Not found', 404);
  return apiOk({ match: row });
}
