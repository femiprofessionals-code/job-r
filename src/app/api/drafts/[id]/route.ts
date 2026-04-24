export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { drafts } from '@/db/schema/drafts';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk, parseJson } from '@/lib/api';
import { RESUME_BUCKET, COVER_LETTER_BUCKET } from '@/lib/supabase/admin';
import { signedArtifactUrl } from '@/services/resume-engine';

const patchSchema = z.object({
  approve: z.boolean().optional(),
  reject: z.boolean().optional(),
});

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const { id } = await context.params;
  const [row] = await db
    .select({
      draft: drafts,
      job: jobs,
      company: companies,
    })
    .from(drafts)
    .innerJoin(jobs, eq(jobs.id, drafts.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(and(eq(drafts.id, id), eq(drafts.userId, user.id)))
    .limit(1);
  if (!row) return apiFail('Not found', 404);

  const [pdfUrl, docxUrl, coverUrl] = await Promise.all([
    row.draft.resumePdfPath ? signedArtifactUrl(RESUME_BUCKET, row.draft.resumePdfPath) : null,
    row.draft.resumeDocxPath ? signedArtifactUrl(RESUME_BUCKET, row.draft.resumeDocxPath) : null,
    row.draft.coverLetterPdfPath
      ? signedArtifactUrl(COVER_LETTER_BUCKET, row.draft.coverLetterPdfPath)
      : null,
  ]);

  return apiOk({ ...row, urls: { pdf: pdfUrl, docx: docxUrl, cover: coverUrl } });
}

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

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.approve) {
    patch.status = 'approved';
    patch.deliveredAt = new Date();
  } else if (body.reject) {
    patch.status = 'rejected';
  }

  const [row] = await db
    .update(drafts)
    .set(patch)
    .where(and(eq(drafts.id, id), eq(drafts.userId, user.id)))
    .returning();
  if (!row) return apiFail('Not found', 404);
  return apiOk({ draft: row });
}