export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { reviewers } from '@/db/schema/users';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk, parseJson } from '@/lib/api';

const schema = z.object({
  specialty: z.string().min(2).max(120),
  bio: z.string().min(20).max(2000),
});

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const [reviewer] = await db.select().from(reviewers).where(eq(reviewers.userId, user.id));
  return apiOk({ reviewer: reviewer ?? null });
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const body = await parseJson(req, schema);
  if (body instanceof NextResponse) return body;

  const [existing] = await db.select().from(reviewers).where(eq(reviewers.userId, user.id));
  if (existing) {
    if (existing.isActive) return apiFail('You are already an active reviewer', 400);
    return apiFail('Application already submitted; pending review', 400);
  }

  const [created] = await db
    .insert(reviewers)
    .values({
      userId: user.id,
      tier: 'bronze',
      specialty: body.specialty,
      bio: body.bio,
      isActive: false,
    })
    .returning();
  return apiOk({ reviewer: created });
}
