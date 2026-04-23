import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { profiles } from '@/db/schema/users';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk, parseJson } from '@/lib/api';
import { resumeJsonSchema } from '@/services/resume-engine/schema';

const updateSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  headline: z.string().max(160).optional(),
  bio: z.string().max(2000).optional(),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  locationCity: z.string().optional(),
  locationCountry: z.string().optional(),
  currentTitle: z.string().optional(),
  currentCompany: z.string().optional(),
  skills: z.array(z.string()).optional(),
  resumeJson: resumeJsonSchema.optional(),
  onboardingComplete: z.boolean().optional(),
});

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const [row] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  if (!row) {
    const [created] = await db
      .insert(profiles)
      .values({ id: user.id, email: user.email ?? '', fullName: user.user_metadata?.full_name ?? null })
      .returning();
    return apiOk({ profile: created });
  }
  return apiOk({ profile: row });
}

export async function PATCH(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const body = await parseJson(req, updateSchema);
  if (body instanceof NextResponse) return body;
  const [row] = await db
    .update(profiles)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(profiles.id, user.id))
    .returning();
  return apiOk({ profile: row });
}
