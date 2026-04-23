-- Job Radar Row Level Security policies.
-- Apply after `drizzle-kit push` so all tables exist.

-- Enable RLS on user-owned tables
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table reviewers enable row level security;
alter table career_tracks enable row level security;
alter table matches enable row level security;
alter table drafts enable row level security;
alter table reviews enable row level security;
alter table payouts enable row level security;
alter table notifications enable row level security;

-- Reference tables are readable by authenticated users but only writable by service role.
alter table companies enable row level security;
alter table jobs enable row level security;
alter table scrape_logs enable row level security;

-- PROFILES: each user sees/updates only their own row.
create policy if not exists "profiles_self_select" on profiles
  for select using (auth.uid() = id);
create policy if not exists "profiles_self_update" on profiles
  for update using (auth.uid() = id);
create policy if not exists "profiles_admin_all" on profiles
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- SUBSCRIPTIONS: owner read only; writes go through service role.
create policy if not exists "subs_self_select" on subscriptions
  for select using (auth.uid() = user_id);

-- REVIEWERS: reviewer reads their own row; admin reads all.
create policy if not exists "reviewers_self_select" on reviewers
  for select using (auth.uid() = user_id);
create policy if not exists "reviewers_admin_all" on reviewers
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- CAREER TRACKS: owner CRUD.
create policy if not exists "tracks_owner_all" on career_tracks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- MATCHES: owner CRUD.
create policy if not exists "matches_owner_all" on matches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- DRAFTS: owner CRUD, plus reviewer can read drafts assigned to them.
create policy if not exists "drafts_owner_all" on drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "drafts_reviewer_select" on drafts
  for select using (
    exists (
      select 1 from reviews r
      join reviewers rv on rv.id = r.reviewer_id
      where r.draft_id = drafts.id and rv.user_id = auth.uid()
    )
  );

-- REVIEWS: candidate and assigned reviewer can see; only assigned reviewer or candidate can update.
create policy if not exists "reviews_participant_select" on reviews
  for select using (
    auth.uid() = user_id
    or exists (select 1 from reviewers rv where rv.id = reviews.reviewer_id and rv.user_id = auth.uid())
  );
create policy if not exists "reviews_participant_update" on reviews
  for update using (
    auth.uid() = user_id
    or exists (select 1 from reviewers rv where rv.id = reviews.reviewer_id and rv.user_id = auth.uid())
  );

-- PAYOUTS: reviewer reads own; admin all.
create policy if not exists "payouts_reviewer_select" on payouts
  for select using (
    exists (select 1 from reviewers rv where rv.id = payouts.reviewer_id and rv.user_id = auth.uid())
  );
create policy if not exists "payouts_admin_all" on payouts
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- NOTIFICATIONS: owner read.
create policy if not exists "notifications_owner_select" on notifications
  for select using (auth.uid() = user_id);

-- COMPANIES / JOBS: readable by any authenticated user. No public writes.
create policy if not exists "companies_authed_select" on companies
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');
create policy if not exists "jobs_authed_select" on jobs
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');
create policy if not exists "scrape_logs_admin_all" on scrape_logs
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Storage bucket policies (resumes / cover-letters):
-- Users can read/write only objects in their own prefix `<userId>/…`.
create policy if not exists "resume_bucket_user_rw" on storage.objects
  for all using (
    bucket_id in ('resumes', 'cover-letters')
    and auth.uid()::text = split_part(name, '/', 1)
  ) with check (
    bucket_id in ('resumes', 'cover-letters')
    and auth.uid()::text = split_part(name, '/', 1)
  );
