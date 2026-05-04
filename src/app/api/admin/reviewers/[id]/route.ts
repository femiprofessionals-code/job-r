export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { profiles, reviewers } from '@/db/schema/users';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk, parseJson } from '@/lib/api';

const schema = z.object({
  isActive: z.boolean().optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  remove: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const [me] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  if (me?.role !== 'admin') return apiFail('Forbidden', 403);

  const { id } = await params;
  const body = await parseJson(req, schema);
  if (body instanceof NextResponse) return body;

  if (body.remove) {
    await db.delete(reviewers).where(eq(reviewers.id, id));
    return apiOk({ removed: true });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.isActive === 'boolean') patch.isActive = body.isActive;
  if (body.tier) patch.tier = body.tier;

  const [updated] = await db.update(reviewers).set(patch).where(eq(reviewers.id, id)).returning();

  // Bump profiles.role to 'reviewer' on first approval (so future role-gated UI sees them).
  if (body.isActive === true && updated) {
    await db.update(profiles).set({ role: 'reviewer' }).where(eq(profiles.id, updated.userId));
  }
  return apiOk({ reviewer: updated });
}
