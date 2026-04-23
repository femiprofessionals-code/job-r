# Job Radar

Production scaffold for a job-matching SaaS: scrapes company boards hourly,
classifies and scores roles against user-defined career tracks, and produces
tailored resume + cover-letter drafts that premium users can route to a human
reviewer. Inngest orchestrates the pipeline; Supabase holds data, auth, and
storage; Stripe handles subscriptions and reviewer payouts via Connect.

## Stack

- Next.js 14 (App Router, Server Components, Route Handlers)
- TypeScript strict mode, Zod at every API boundary
- Drizzle ORM on Supabase Postgres
- Supabase Auth (email/password + Google OAuth) + Storage
- Inngest for background jobs (scrape, classify, match, draft, digest, payout)
- Anthropic Claude: Sonnet for classification + fallback scraping, Opus for drafts
- Stripe subscriptions + Stripe Connect transfers
- Resend + JSX email templates
- Tailwind + a minimal shadcn-style component kit

## Layout

```
src/
  app/                 # App Router: pages + API route handlers
    api/               # jobs, tracks, matches, drafts, profile, reviewers,
                       # notifications, billing (checkout/portal/connect),
                       # stripe/webhook, inngest, auth/callback+signout, admin
    dashboard/ jobs/ tracks/ drafts/ reviewer/ admin/ onboarding/
  db/
    schema/            # Drizzle schemas (enums, users, companies, jobs,
                       # careerTracks, matches, drafts, reviews, notifications)
    client.ts
  inngest/
    client.ts          # typed event schemas
    functions/         # scrape-all (hourly cron), scrape-company,
                       # classify-jobs, match-users, generate-drafts,
                       # send-digests, review-reminder, review-accepted,
                       # process-payout, users-signed-up
  lib/                 # env, utils, api helpers, stripe, supabase clients
  services/
    scraper/           # greenhouse / lever / ashby / workday / fallback (Claude)
                       # normalizer + differ (upsert + close stale)
    classifier/        # Claude Sonnet function/seniority/skills/location
    matcher/           # weighted scoring (function 25 / seniority 20 / skills 25
                       # / location 15 / company 10 / experience 5)
    resume-engine/     # Opus generator, pdf-lib, docx, Supabase Storage
    notifications/     # Resend + JSX templates, per-notification DB log
    reviews/           # tier SLAs, payouts in cents, assign least-loaded
drizzle/rls.sql        # RLS policies (apply after db:push)
scripts/seed.ts        # 31 seed companies across ATS sources
```

## Setup

```bash
cd job-radar
cp .env.example .env.local   # fill in Supabase, Stripe, Anthropic, Resend, Inngest
npm install
npm run db:generate
npm run db:push              # creates tables
# Apply RLS (run drizzle/rls.sql against your Supabase project via SQL editor)
npm run seed                 # inserts 31 companies
npm run dev                  # Next.js
npm run inngest:dev          # Inngest dev server (separate terminal)
```

You also need to:

1. In Supabase Auth, enable Google OAuth and set the redirect URL to
   `${APP_URL}/api/auth/callback`.
2. In Stripe, create two recurring prices (pro, premium) and paste the ids into
   env. Register a webhook for `customer.subscription.*` and `account.updated`
   pointing at `${APP_URL}/api/stripe/webhook` (copy the signing secret).
3. Enable Stripe Connect Express accounts and paste the client id into env.
4. In Resend, verify the sending domain and set `EMAIL_FROM`.
5. In Inngest, create an app and paste the signing + event keys.

## Data pipeline

```
cron (hourly)  →  scrape/all.requested
                → for each due company: scrape/company.requested
                  → scrapeCompany() uses the right ATS adapter, diffs vs the
                    previous run, closes stale rows, emits `jobs/created`
                    with the new ids
jobs/created   →  classify-jobs (Claude Sonnet)
                  → writes function/seniority/skills/locationType
                  → emits jobs/classified
jobs/classified →  match-users
                  → scores each new job against every active track,
                    persists matches above each track's min score
                  → emits matches/ready per user
user requests  →  drafts/generate.requested → generate-drafts
                  → Claude Opus tailored draft, pdf-lib + docx render,
                    Supabase Storage upload, emits drafts/ready
                  → premium users: auto-assigns a gold-or-better reviewer
cron (daily)   →  send-digests
cron (hourly)  →  review-reminder
reviews/accepted → process-payout → Stripe transfer → notifies reviewer
```

## Deployment (Vercel)

1. Push this repo; import in Vercel.
2. Set all env vars from `.env.example`. Make `NEXT_PUBLIC_APP_URL` the
   production URL.
3. Add the Inngest integration; it will sync functions from
   `/api/inngest` on each deploy.
4. Configure Stripe webhook at `${APP_URL}/api/stripe/webhook`.
5. Set up a Vercel Cron or rely on Inngest's cron trigger (`0 * * * *` on
   `scrape-all`, `0 13 * * *` on `send-digests`, `15 * * * *` on
   `review-reminder`).

## Notes / caveats

- Workday adapters require tenant-specific ids. Seed entries using Workday
  should set `sourceBoardId` as `tenant|site` (e.g. `nvidia|NVIDIAExternalCareerSite`).
- RLS policies in `drizzle/rls.sql` must be applied manually after the first
  `db:push` because Drizzle does not emit RLS. Storage-bucket policies at the
  bottom of that file scope artifact access to `<userId>/...` paths only.
- The classifier and resume engine use live Anthropic calls. In CI, stub
  `ANTHROPIC_API_KEY` and mock these services.
