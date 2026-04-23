import type { ReactElement } from 'react';

type Match = {
  jobTitle: string;
  company: string;
  score: number;
  url: string;
};

const baseStyles = {
  body: 'margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#111',
  container: 'max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px',
  h1: 'font-size:22px;margin:0 0 8px',
  h2: 'font-size:16px;margin:24px 0 8px;color:#222',
  p: 'font-size:14px;line-height:1.55;color:#333;margin:8px 0',
  btn: 'display:inline-block;padding:10px 16px;border-radius:8px;background:#111;color:#fff;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px',
  score: 'display:inline-block;padding:2px 8px;border-radius:999px;background:#eef;color:#224;font-size:12px;font-weight:600',
};

export function WelcomeEmail({ name, appUrl }: { name: string; appUrl: string }): ReactElement {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: '#f5f5f7' }}>
        <div style={{ padding: 24 }}>
          <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px', background: '#fff', borderRadius: 12 }}>
            <h1 style={{ fontSize: 22, margin: 0 }}>Welcome to Job Radar, {name}</h1>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: '#333' }}>
              Finish setting up your first career track so we can start matching you to roles.
            </p>
            <a href={`${appUrl}/tracks/new`} style={{ display: 'inline-block', padding: '10px 16px', borderRadius: 8, background: '#111', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
              Create a career track
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}

export function DigestEmail({
  name,
  matches,
  appUrl,
}: {
  name: string;
  matches: Match[];
  appUrl: string;
}): ReactElement {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: '#f5f5f7', fontFamily: 'system-ui' }}>
        <div style={{ padding: 24 }}>
          <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px', background: '#fff', borderRadius: 12 }}>
            <h1 style={{ fontSize: 22, margin: 0 }}>Your Job Radar digest, {name}</h1>
            <p style={{ fontSize: 14, color: '#333' }}>
              {matches.length} new match{matches.length === 1 ? '' : 'es'} since your last digest.
            </p>
            {matches.map((m) => (
              <div key={m.url} style={{ padding: '12px 0', borderBottom: '1px solid #eee' }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{m.jobTitle}</div>
                <div style={{ fontSize: 13, color: '#666' }}>{m.company}</div>
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#eef', color: '#224', fontSize: 12, fontWeight: 600, marginTop: 4 }}>
                  {m.score}% match
                </span>
                <div style={{ marginTop: 6 }}>
                  <a href={m.url} style={{ color: '#1146c7', fontSize: 13 }}>
                    View role →
                  </a>
                </div>
              </div>
            ))}
            <a
              href={`${appUrl}/dashboard`}
              style={{ display: 'inline-block', marginTop: 16, padding: '10px 16px', borderRadius: 8, background: '#111', color: '#fff', textDecoration: 'none', fontWeight: 600 }}
            >
              Open dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}

export function DraftReadyEmail({
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
}): ReactElement {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: '#f5f5f7' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px', background: '#fff', borderRadius: 12 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Draft ready, {name}</h1>
          <p style={{ fontSize: 14, color: '#333' }}>
            Your tailored resume and cover letter for <strong>{jobTitle}</strong> at <strong>{company}</strong> are ready to review.
          </p>
          <a
            href={`${appUrl}/drafts/${draftId}`}
            style={{ display: 'inline-block', padding: '10px 16px', borderRadius: 8, background: '#111', color: '#fff', textDecoration: 'none', fontWeight: 600 }}
          >
            Review draft
          </a>
        </div>
      </body>
    </html>
  );
}

export function ReviewAssignedEmail({
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
}): ReactElement {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: '#f5f5f7' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px', background: '#fff', borderRadius: 12 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>New review assigned</h1>
          <p style={{ fontSize: 14 }}>
            Hi {reviewerName}, you have a new draft from {candidateName} to review. Due {dueAt}.
          </p>
          <a
            href={`${appUrl}/reviewer/${reviewId}`}
            style={{ display: 'inline-block', padding: '10px 16px', borderRadius: 8, background: '#111', color: '#fff', textDecoration: 'none', fontWeight: 600 }}
          >
            Open review
          </a>
        </div>
      </body>
    </html>
  );
}

export function PayoutSentEmail({
  reviewerName,
  amount,
}: {
  reviewerName: string;
  amount: string;
}): ReactElement {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: '#f5f5f7' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px', background: '#fff', borderRadius: 12 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Payout sent</h1>
          <p style={{ fontSize: 14 }}>
            Hi {reviewerName}, we've just sent {amount} to your connected Stripe account.
          </p>
        </div>
      </body>
    </html>
  );
}
