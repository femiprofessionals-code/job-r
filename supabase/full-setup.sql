-- ============================================================================
-- Job Radar — full database setup
-- Run this entire script in Supabase SQL Editor.
-- Idempotent (safe to re-run on a fresh DB).
-- ============================================================================

-- Required extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================================
-- Enums
-- ============================================================================

do $$ begin
  create type subscription_plan as enum ('free', 'pro', 'premium');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'incomplete');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_function as enum (
    'engineering','product','design','data','marketing','sales',
    'operations','finance','legal','people','support','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type seniority_level as enum (
    'intern','junior','mid','senior','staff','principal',
    'manager','director','vp','executive'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type location_type as enum ('remote','hybrid','onsite');
exception when duplicate_object then null; end $$;

do $$ begin
  create type scrape_source as enum ('greenhouse','lever','ashby','workday','fallback');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('open','closed','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type draft_status as enum (
    'pending','generating','ready','in_review','approved','rejected','delivered'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type reviewer_tier as enum ('bronze','silver','gold','platinum');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_status as enum (
    'assigned','in_progress','submitted','accepted','revision_requested','expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payout_status as enum ('pending','processing','paid','failed','canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum (
    'welcome','digest','new_match','draft_ready',
    'review_assigned','review_reminder','payout_sent','subscription_changed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_status as enum ('queued','sent','failed','bounced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type company_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('user','reviewer','admin');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- profiles
-- `id` matches the Supabase auth.users.id for each user.
-- ============================================================================
create table if not exists profiles (
  id uuid primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role user_role not null default 'user',
  headline text,
  bio text,
  years_experience integer,
  location_city text,
  location_country text,
  current_title text,
  current_company text,
  skills jsonb not null default '[]'::jsonb,
  resume_json jsonb,
  resume_storage_path text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_idx on profiles(email);
create index if not exists profiles_role_idx on profiles(role);

-- ============================================================================
-- subscriptions
-- ============================================================================
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan subscription_plan not null default 'free',
  status subscription_status not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_user_idx on subscriptions(user_id);
create unique index if not exists subscriptions_stripe_sub_idx on subscriptions(stripe_subscription_id);
create index if not exists subscriptions_customer_idx on subscriptions(stripe_customer_id);

-- ============================================================================
-- reviewers
-- ============================================================================
create table if not exists reviewers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  tier reviewer_tier not null default 'bronze',
  specialty text,
  bio text,
  stripe_account_id text,
  payouts_enabled boolean not null default false,
  is_active boolean not null default true,
  completed_reviews integer not null default 0,
  average_rating integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists reviewers_user_idx on reviewers(user_id);
create index if not exists reviewers_tier_idx on reviewers(tier);
create index if not exists reviewers_active_idx on reviewers(is_active);

-- ============================================================================
-- companies
-- ============================================================================
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  website text,
  logo_url text,
  description text,
  industry text,
  size_bucket text,
  hq_city text,
  hq_country text,
  careers_url text not null,
  source scrape_source not null,
  source_board_id text,
  tags jsonb not null default '[]'::jsonb,
  status company_status not null default 'approved',
  scrape_interval_minutes integer not null default 60,
  last_scraped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists companies_slug_idx on companies(slug);
create index if not exists companies_source_idx on companies(source);
create index if not exists companies_status_idx on companies(status);
create index if not exists companies_last_scraped_idx on companies(last_scraped_at);

-- ============================================================================
-- scrape_logs
-- ============================================================================
create table if not exists scrape_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  source scrape_source not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  jobs_found integer not null default 0,
  jobs_new integer not null default 0,
  jobs_closed integer not null default 0,
  success integer not null default 0,
  error text
);

create index if not exists scrape_logs_company_idx on scrape_logs(company_id);
create index if not exists scrape_logs_started_idx on scrape_logs(started_at);

-- ============================================================================
-- jobs
-- ============================================================================
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  external_id text not null,
  title text not null,
  department text,
  team text,
  description text not null,
  location_raw text,
  location_city text,
  location_country text,
  location_type location_type,
  salary_min integer,
  salary_max integer,
  salary_currency text,
  employment_type text,
  apply_url text not null,
  status job_status not null default 'open',
  posted_at timestamptz,
  closed_at timestamptz,
  classified boolean not null default false,
  classified_at timestamptz,
  function job_function,
  seniority seniority_level,
  skills jsonb not null default '[]'::jsonb,
  classifier_meta jsonb,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists jobs_company_external_idx on jobs(company_id, external_id);
create index if not exists jobs_status_idx on jobs(status);
create index if not exists jobs_classified_idx on jobs(classified);
create index if not exists jobs_function_idx on jobs(function);
create index if not exists jobs_seniority_idx on jobs(seniority);
create index if not exists jobs_posted_idx on jobs(posted_at);

-- ============================================================================
-- career_tracks
-- ============================================================================
create table if not exists career_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  target_function job_function not null,
  target_seniority seniority_level not null,
  target_location_type location_type,
  preferred_cities jsonb not null default '[]'::jsonb,
  preferred_countries jsonb not null default '[]'::jsonb,
  must_have_skills jsonb not null default '[]'::jsonb,
  nice_to_have_skills jsonb not null default '[]'::jsonb,
  excluded_companies jsonb not null default '[]'::jsonb,
  target_companies jsonb not null default '[]'::jsonb,
  min_salary integer,
  salary_currency text default 'USD',
  min_match_score integer not null default 60,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists career_tracks_user_idx on career_tracks(user_id);
create index if not exists career_tracks_active_idx on career_tracks(is_active);

-- ============================================================================
-- matches
-- ============================================================================
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  career_track_id uuid not null references career_tracks(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  overall_score integer not null,
  breakdown jsonb not null,
  hidden boolean not null default false,
  saved boolean not null default false,
  viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists matches_user_job_track_idx on matches(user_id, job_id, career_track_id);
create index if not exists matches_user_idx on matches(user_id);
create index if not exists matches_job_idx on matches(job_id);
create index if not exists matches_score_idx on matches(overall_score);
create index if not exists matches_created_idx on matches(created_at);

-- ============================================================================
-- drafts
-- ============================================================================
create table if not exists drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  match_id uuid references matches(id) on delete set null,
  job_id uuid not null references jobs(id) on delete cascade,
  status draft_status not null default 'pending',
  resume_json jsonb,
  cover_letter_text text,
  resume_pdf_path text,
  resume_docx_path text,
  cover_letter_pdf_path text,
  model text,
  tokens_used jsonb,
  generated_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists drafts_user_idx on drafts(user_id);
create index if not exists drafts_job_idx on drafts(job_id);
create index if not exists drafts_status_idx on drafts(status);

-- ============================================================================
-- reviews
-- ============================================================================
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references drafts(id) on delete cascade,
  reviewer_id uuid not null references reviewers(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status review_status not null default 'assigned',
  tier_at_assignment reviewer_tier not null,
  edited_resume_json jsonb,
  edited_cover_letter text,
  reviewer_notes text,
  payout_cents integer not null,
  due_at timestamptz not null,
  assigned_at timestamptz not null default now(),
  submitted_at timestamptz,
  accepted_at timestamptz,
  rating integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_reviewer_idx on reviews(reviewer_id);
create index if not exists reviews_draft_idx on reviews(draft_id);
create index if not exists reviews_status_idx on reviews(status);
create index if not exists reviews_due_idx on reviews(due_at);

-- ============================================================================
-- payouts
-- ============================================================================
create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references reviewers(id) on delete cascade,
  review_id uuid not null references reviews(id) on delete cascade,
  amount_cents integer not null,
  currency text not null default 'usd',
  status payout_status not null default 'pending',
  stripe_transfer_id text,
  error text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payouts_reviewer_idx on payouts(reviewer_id);
create index if not exists payouts_status_idx on payouts(status);
create index if not exists payouts_transfer_idx on payouts(stripe_transfer_id);

-- ============================================================================
-- notifications
-- ============================================================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  status notification_status not null default 'queued',
  subject text not null,
  payload jsonb,
  resend_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications(user_id);
create index if not exists notifications_type_idx on notifications(type);
create index if not exists notifications_status_idx on notifications(status);
create index if not exists notifications_created_idx on notifications(created_at);

-- ============================================================================
-- Auto-create a profile row whenever a new Supabase auth user signs up
-- This keeps profiles in sync with auth.users even if the app-side
-- callback doesn't run (e.g. OAuth first-time flows).
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- Storage buckets (resumes, cover letters)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('cover-letters', 'cover-letters', false)
on conflict (id) do nothing;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table reviewers enable row level security;
alter table career_tracks enable row level security;
alter table matches enable row level security;
alter table drafts enable row level security;
alter table reviews enable row level security;
alter table payouts enable row level security;
alter table notifications enable row level security;
alter table companies enable row level security;
alter table jobs enable row level security;
alter table scrape_logs enable row level security;

-- profiles
drop policy if exists profiles_self_select on profiles;
create policy profiles_self_select on profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles
  for update using (auth.uid() = id);

-- subscriptions
drop policy if exists subs_self_select on subscriptions;
create policy subs_self_select on subscriptions
  for select using (auth.uid() = user_id);

-- reviewers
drop policy if exists reviewers_self_select on reviewers;
create policy reviewers_self_select on reviewers
  for select using (auth.uid() = user_id);

-- career_tracks
drop policy if exists tracks_owner_all on career_tracks;
create policy tracks_owner_all on career_tracks
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- matches
drop policy if exists matches_owner_all on matches;
create policy matches_owner_all on matches
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- drafts
drop policy if exists drafts_owner_all on drafts;
create policy drafts_owner_all on drafts
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists drafts_reviewer_select on drafts;
create policy drafts_reviewer_select on drafts
  for select using (
    exists (
      select 1 from reviews r
      join reviewers rv on rv.id = r.reviewer_id
      where r.draft_id = drafts.id and rv.user_id = auth.uid()
    )
  );

-- reviews
drop policy if exists reviews_participant_select on reviews;
create policy reviews_participant_select on reviews
  for select using (
    auth.uid() = user_id
    or exists (select 1 from reviewers rv where rv.id = reviews.reviewer_id and rv.user_id = auth.uid())
  );

drop policy if exists reviews_participant_update on reviews;
create policy reviews_participant_update on reviews
  for update using (
    auth.uid() = user_id
    or exists (select 1 from reviewers rv where rv.id = reviews.reviewer_id and rv.user_id = auth.uid())
  );

-- payouts
drop policy if exists payouts_reviewer_select on payouts;
create policy payouts_reviewer_select on payouts
  for select using (
    exists (select 1 from reviewers rv where rv.id = payouts.reviewer_id and rv.user_id = auth.uid())
  );

-- notifications
drop policy if exists notifications_owner_select on notifications;
create policy notifications_owner_select on notifications
  for select using (auth.uid() = user_id);

-- companies + jobs: readable by anyone (anon or authed)
drop policy if exists companies_public_select on companies;
create policy companies_public_select on companies
  for select using (true);

drop policy if exists jobs_public_select on jobs;
create policy jobs_public_select on jobs
  for select using (true);

-- scrape_logs: service-role only (no policy needed since RLS denies by default)

-- ============================================================================
-- Storage RLS: each user only reads/writes their own prefix
-- ============================================================================
drop policy if exists resume_bucket_user_rw on storage.objects;
create policy resume_bucket_user_rw on storage.objects
  for all using (
    bucket_id in ('resumes','cover-letters')
    and auth.uid()::text = split_part(name, '/', 1)
  ) with check (
    bucket_id in ('resumes','cover-letters')
    and auth.uid()::text = split_part(name, '/', 1)
  );

-- ============================================================================
-- Done.
-- ============================================================================
select 'Job Radar schema ready.' as status;
