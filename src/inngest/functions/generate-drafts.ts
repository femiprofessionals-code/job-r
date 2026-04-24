import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { drafts } from '@/db/schema/drafts';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { matches } from '@/db/schema/matches';
import { profiles, subscriptions } from '@/db/schema/users';
import {
  generateTailoredDraft,
  renderCoverLetterPdf,
  renderResumeDocx,
  renderResumePdf,
  resumeJsonSchema,
  uploadCoverLetterArtifact,
  uploadResumeArtifact,
} from '@/services/resume-engine';
import { sendDraftReady } from '@/services/notifications';
import { assignReviewForDraft } from '@/services/reviews';
import { sendReviewAssigned } from '@/services/notifications';
import { inngest } from '../client';

export const generateDraftsFn = inngest.createFunction(
  {
    id: 'generate-drafts',
    name: 'Generate tailored resume + cover letter draft',
    concurrency: { limit: 3, key: 'event.data.userId' },
    retries: 2,
  },
  { event: 'drafts/generate.requested' },
  async ({ event, step }) => {
    const { userId, matchId } = event.data;

    const ctx = await step.run('load-context', async () => {
      const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
      if (!match) throw new Error(`Match ${matchId} not found`);
      const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
      if (!profile) throw new Error(`Profile ${userId} not found`);
      const [job] = await db.select().from(jobs).where(eq(jobs.id, match.jobId));
      if (!job) throw new Error(`Job ${match.jobId} not found`);
      const [company] = await db.select().from(companies).where(eq(companies.id, job.companyId));
      if (!company) throw new Error(`Company ${job.companyId} not found`);
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
      return { match, profile, job, company, plan: sub?.plan ?? 'free' };
    });

    const [draft] = await db
      .insert(drafts)
      .values({
        userId,
        matchId,
        jobId: ctx.job.id,
        status: 'generating',
      })
      .returning({ id: drafts.id });

    try {
      const baseResume = ctx.profile.resumeJson
        ? resumeJsonSchema.parse(ctx.profile.resumeJson)
        : null;
      if (!baseResume) throw new Error('Profile has no base resume JSON');

      // Generate content + render + upload in one step. Bytes stay in-process;
      // the step return is only JSON-safe strings (storage paths).
      const artifacts = await step.run('generate-render-upload', async () => {
        const generated = await generateTailoredDraft({
          profileResume: baseResume,
          job: {
            title: ctx.job.title,
            companyName: ctx.company.name,
            description: ctx.job.description,
            skills: ctx.job.skills,
          },
        });

        const pdfBytes = await renderResumePdf(generated.resume);
        const docxBytes = await renderResumeDocx(generated.resume);
        const coverBytes = await renderCoverLetterPdf(
          generated.coverLetter,
          generated.resume.fullName,
        );

        const [pdfPath, docxPath, coverPath] = await Promise.all([
          uploadResumeArtifact(userId, draft.id, 'pdf', pdfBytes),
          uploadResumeArtifact(userId, draft.id, 'docx', docxBytes),
          uploadCoverLetterArtifact(userId, draft.id, coverBytes),
        ]);

        return {
          resume: generated.resume,
          coverLetter: generated.coverLetter,
          pdfPath,
          docxPath,
          coverPath,
          inputTokens: generated.usage.input_tokens,
          outputTokens: generated.usage.output_tokens,
        };
      });

      await db
        .update(drafts)
        .set({
          status: 'ready',
          resumeJson: artifacts.resume,
          coverLetterText: [
            artifacts.coverLetter.greeting,
            artifacts.coverLetter.opening,
            ...artifacts.coverLetter.body,
            artifacts.coverLetter.closing,
            artifacts.coverLetter.signature,
          ].join('\n\n'),
          resumePdfPath: artifacts.pdfPath,
          resumeDocxPath: artifacts.docxPath,
          coverLetterPdfPath: artifacts.coverPath,
          model: 'claude-opus-4-7',
          tokensUsed: {
            input_tokens: artifacts.inputTokens,
            output_tokens: artifacts.outputTokens,
          },
          generatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(drafts.id, draft.id));

      await sendDraftReady(
        userId,
        ctx.profile.email,
        ctx.profile.fullName ?? 'there',
        ctx.job.title,
        ctx.company.name,
        draft.id,
        process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      );

      // Premium users automatically get a human review.
      if (ctx.plan === 'premium') {
        const assignment = await assignReviewForDraft(draft.id, 'gold');
        if (assignment) {
          const reviewerProfile = await db
            .select({ email: profiles.email, name: profiles.fullName })
            .from(profiles)
            .where(eq(profiles.id, assignment.reviewerUserId))
            .limit(1);
          const [rev] = reviewerProfile;
          if (rev) {
            await sendReviewAssigned(
              assignment.reviewerUserId,
              rev.email,
              rev.name ?? 'Reviewer',
              ctx.profile.fullName ?? 'Candidate',
              assignment.dueAt.toISOString(),
              assignment.reviewId,
              process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
            );
          }
        }
      }

      await step.sendEvent('emit-draft-ready', {
        name: 'drafts/ready',
        data: { draftId: draft.id },
      });

      return { ok: true, draftId: draft.id };
    } catch (err) {
      await db
        .update(drafts)
        .set({ status: 'rejected', updatedAt: new Date() })
        .where(eq(drafts.id, draft.id));
      throw err;
    }
  },
);
