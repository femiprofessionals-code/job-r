import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { drafts } from '@/db/schema/drafts';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { requireUser } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { COVER_LETTER_BUCKET, RESUME_BUCKET } from '@/lib/supabase/admin';
import { signedArtifactUrl } from '@/services/resume-engine';
import { DraftActions } from './actions';

export const dynamic = 'force-dynamic';

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [row] = await db
    .select({ draft: drafts, job: jobs, company: companies })
    .from(drafts)
    .innerJoin(jobs, eq(jobs.id, drafts.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(and(eq(drafts.id, id), eq(drafts.userId, user.id)))
    .limit(1);
  if (!row) notFound();

  const { draft, job, company } = row;
  const [pdfUrl, docxUrl, coverUrl] = await Promise.all([
    draft.resumePdfPath ? signedArtifactUrl(RESUME_BUCKET, draft.resumePdfPath) : null,
    draft.resumeDocxPath ? signedArtifactUrl(RESUME_BUCKET, draft.resumeDocxPath) : null,
    draft.coverLetterPdfPath ? signedArtifactUrl(COVER_LETTER_BUCKET, draft.coverLetterPdfPath) : null,
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/drafts" className="text-sm text-muted-foreground hover:underline">
          ← Back to drafts
        </Link>
      </div>
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>{job.title}</CardTitle>
          <div className="text-sm text-muted-foreground">{company.name}</div>
          <Badge variant="outline" className="w-fit capitalize">
            {draft.status.replace('_', ' ')}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          {draft.status === 'generating' && (
            <p className="text-sm text-muted-foreground">
              Generating resume and cover letter… this usually takes under a minute.
            </p>
          )}
          {draft.coverLetterText && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Cover letter</h3>
              <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-4 text-sm leading-relaxed">
                {draft.coverLetterText}
              </pre>
            </section>
          )}
          <div className="flex flex-wrap gap-3">
            {pdfUrl && (
              <Button asChild>
                <a href={pdfUrl} target="_blank" rel="noreferrer">
                  Download resume (PDF)
                </a>
              </Button>
            )}
            {docxUrl && (
              <Button asChild variant="outline">
                <a href={docxUrl} target="_blank" rel="noreferrer">
                  Download resume (DOCX)
                </a>
              </Button>
            )}
            {coverUrl && (
              <Button asChild variant="outline">
                <a href={coverUrl} target="_blank" rel="noreferrer">
                  Download cover letter
                </a>
              </Button>
            )}
          </div>
          {draft.status === 'ready' && <DraftActions draftId={draft.id} />}
        </CardContent>
      </Card>
    </div>
  );
}
