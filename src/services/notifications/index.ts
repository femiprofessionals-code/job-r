import { Resend } from 'resend';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { notifications } from '@/db/schema/notifications';
import {
  renderDigestEmail,
  renderDraftReadyEmail,
  renderPayoutSentEmail,
  renderReviewAssignedEmail,
  renderWelcomeEmail,
} from './templates';

let resendClient: Resend | null = null;

function client() {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY missing');
  resendClient = new Resend(key);
  return resendClient;
}

export type NotificationType =
  | 'welcome'
  | 'digest'
  | 'new_match'
  | 'draft_ready'
  | 'review_assigned'
  | 'review_reminder'
  | 'payout_sent'
  | 'subscription_changed';

async function sendAndLog(args: {
  userId: string;
  to: string;
  subject: string;
  html: string;
  type: NotificationType;
  payload?: Record<string, unknown>;
}) {
  const from = process.env.EMAIL_FROM ?? 'Job Radar <no-reply@jobradar.app>';
  const [row] = await db
    .insert(notifications)
    .values({
      userId: args.userId,
      type: args.type,
      subject: args.subject,
      payload: args.payload ?? null,
    })
    .returning({ id: notifications.id });

  try {
    const resp = await client().emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    await db
      .update(notifications)
      .set({ status: 'sent', sentAt: new Date(), resendId: resp.data?.id ?? null })
      .where(eq(notifications.id, row.id));
    return { ok: true as const, id: row.id };
  } catch (err) {
    await db
      .update(notifications)
      .set({ status: 'failed', error: (err as Error).message })
      .where(eq(notifications.id, row.id));
    return { ok: false as const, error: (err as Error).message };
  }
}

export async function sendWelcome(userId: string, to: string, name: string, appUrl: string) {
  return sendAndLog({
    userId,
    to,
    subject: 'Welcome to Job Radar',
    type: 'welcome',
    html: renderWelcomeEmail({ name, appUrl }),
  });
}

export async function sendDigest(
  userId: string,
  to: string,
  name: string,
  matches: { jobTitle: string; company: string; score: number; url: string }[],
  appUrl: string,
) {
  return sendAndLog({
    userId,
    to,
    subject: `${matches.length} new job matches`,
    type: 'digest',
    payload: { count: matches.length },
    html: renderDigestEmail({ name, matches, appUrl }),
  });
}

export async function sendDraftReady(
  userId: string,
  to: string,
  name: string,
  jobTitle: string,
  company: string,
  draftId: string,
  appUrl: string,
) {
  return sendAndLog({
    userId,
    to,
    subject: `Draft ready: ${jobTitle} at ${company}`,
    type: 'draft_ready',
    html: renderDraftReadyEmail({ name, jobTitle, company, appUrl, draftId }),
  });
}

export async function sendReviewAssigned(
  userId: string,
  to: string,
  reviewerName: string,
  candidateName: string,
  dueAt: string,
  reviewId: string,
  appUrl: string,
) {
  return sendAndLog({
    userId,
    to,
    subject: 'New review assigned',
    type: 'review_assigned',
    html: renderReviewAssignedEmail({ reviewerName, candidateName, dueAt, appUrl, reviewId }),
  });
}

export async function sendReviewReminder(
  userId: string,
  to: string,
  reviewerName: string,
  candidateName: string,
  dueAt: string,
  reviewId: string,
  appUrl: string,
) {
  return sendAndLog({
    userId,
    to,
    subject: 'Review reminder',
    type: 'review_reminder',
    html: renderReviewAssignedEmail({ reviewerName, candidateName, dueAt, appUrl, reviewId }),
  });
}

export async function sendPayoutSent(
  userId: string,
  to: string,
  reviewerName: string,
  amount: string,
) {
  return sendAndLog({
    userId,
    to,
    subject: 'Payout sent',
    type: 'payout_sent',
    html: renderPayoutSentEmail({ reviewerName, amount }),
  });
}
