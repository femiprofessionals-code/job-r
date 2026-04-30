type DigestMatch = {
  jobTitle: string;
  company: string;
  score: number;
  url: string;
};

const wrap = (inner: string) => `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#111">
    <div style="padding:24px">
      <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px">
        ${inner}
      </div>
    </div>
  </body>
</html>`;

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#111;color:#fff;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px">${label}</a>`;

const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function renderWelcomeEmail({ name, appUrl }: { name: string; appUrl: string }): string {
  return wrap(`
    <h1 style="font-size:22px;margin:0 0 8px">Welcome to Job Radar, ${escape(name)}</h1>
    <p style="font-size:14px;line-height:1.55;color:#333">
      Finish setting up your first career track so we can start matching you to roles.
    </p>
    ${btn(`${appUrl}/tracks/new`, 'Create a career track')}
  `);
}

export function renderDigestEmail({
  name,
  matches,
  appUrl,
}: {
  name: string;
  matches: DigestMatch[];
  appUrl: string;
}): string {
  const rows = matches
    .map(
      (m) => `
    <div style="padding:12px 0;border-bottom:1px solid #eee">
      <div style="font-weight:600;font-size:15px">${escape(m.jobTitle)}</div>
      <div style="font-size:13px;color:#666">${escape(m.company)}</div>
      <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#eef;color:#224;font-size:12px;font-weight:600;margin-top:4px">${m.score}% match</span>
      <div style="margin-top:6px"><a href="${m.url}" style="color:#1146c7;font-size:13px">View role →</a></div>
    </div>`,
    )
    .join('');

  return wrap(`
    <h1 style="font-size:22px;margin:0 0 8px">Your Job Radar digest, ${escape(name)}</h1>
    <p style="font-size:14px;color:#333">
      ${matches.length} new match${matches.length === 1 ? '' : 'es'} since your last digest.
    </p>
    ${rows}
    ${btn(`${appUrl}/dashboard`, 'Open dashboard')}
  `);
}

export function renderDraftReadyEmail({
  name,
  jobTitle,
  company,
  appUrl,
  draftId,
}: {
  name: string;
  jobTitle: string;
  company: string;
  appUrl: string;
  draftId: string;
}): string {
  return wrap(`
    <h1 style="font-size:22px;margin:0 0 8px">Draft ready, ${escape(name)}</h1>
    <p style="font-size:14px;color:#333">
      Your tailored resume and cover letter for <strong>${escape(jobTitle)}</strong> at <strong>${escape(company)}</strong> are ready to review.
    </p>
    ${btn(`${appUrl}/drafts/${draftId}`, 'Review draft')}
  `);
}

export function renderReviewAssignedEmail({
  reviewerName,
  candidateName,
  dueAt,
  appUrl,
  reviewId,
}: {
  reviewerName: string;
  candidateName: string;
  dueAt: string;
  appUrl: string;
  reviewId: string;
}): string {
  return wrap(`
    <h1 style="font-size:22px;margin:0 0 8px">New review assigned</h1>
    <p style="font-size:14px">
      Hi ${escape(reviewerName)}, you have a new draft from ${escape(candidateName)} to review. Due ${escape(dueAt)}.
    </p>
    ${btn(`${appUrl}/reviewer/${reviewId}`, 'Open review')}
  `);
}

export function renderPayoutSentEmail({
  reviewerName,
  amount,
}: {
  reviewerName: string;
  amount: string;
}): string {
  return wrap(`
    <h1 style="font-size:22px;margin:0 0 8px">Payout sent</h1>
    <p style="font-size:14px">
      Hi ${escape(reviewerName)}, we've just sent ${escape(amount)} to your connected Stripe account.
    </p>
  `);
}
