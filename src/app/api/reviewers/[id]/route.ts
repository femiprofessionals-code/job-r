export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { reviewers } from '@/db/schema/users';
import { reviews } from '@/db/schema/reviews';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk, parseJson } from '@/lib/api';
import { inngest } from '@/inngest/client';

const patchSchema = z.object({
  editedResumeJson: z.unknown().optional(),
  editedCoverLetter: z.string().optional(),
  reviewerNotes: z.string().max(4000).optional(),
  submit: z.boolean().optional(),
  accept: z.boolean().optional(),
  requestRevision: z.boolean().optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const { id } = await context.params;
  const body = await parseJson(req, patchSchema);
  if (body instanceof NextResponse) return body;

  const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
  if (!review) return apiFail('Not found', 404);

  const isCandidate = review.userId === user.id;
  const [reviewerRow] = await db
    .select()
    .from(reviewers)
    .where(and(eq(reviewers.id, review.reviewerId), eq(reviewers.userId, user.id)))
    .limit(1);
  const isReviewer = Boolean(reviewerRow);

  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (isReviewer) {
    if (body.editedResumeJson) patch.editedResumeJson = body.editedResumeJson;
    if (typeof body.editedCoverLetter === 'string') patch.editedCoverLetter = body.editedCoverLetter;
    if (typeof body.reviewerNotes === 'string') patch.reviewerNotes = body.reviewerNotes;
    if (body.submit) {
      patch.status = 'submitted';
      patch.submittedAt = new Date();
    }
  }

  if (isCandidate) {
    if (body.accept) {
      patch.status = 'accepted';
      patch.acceptedAt = new Date();
      if (typeof body.rating === 'number') patch.rating = body.rating;
    }
    if (body.requestRevision) {
      patch.status = 'revision_requested';
    }
  }

  if (!isReviewer && !isCandidate) return apiFail('Forbidden', 403);

  const [updated] = await db.update(reviews).set(patch).where(eq(reviews.id, id)).returning();

  if (patch.status === 'accepted') {
    await inngest.send({ name: 'reviews/accepted', data: { reviewId: id } });
  }

  return apiOk({ review: updated });
}