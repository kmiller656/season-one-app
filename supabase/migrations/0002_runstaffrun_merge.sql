-- =====================================================================
-- RunStaffRun merge — adds RunStaffRun's product tables into Season One
-- Healthcare's Supabase project, plus the "recruiter" role and the
-- opt-in bridge that lets a Season One PA choose to also appear in
-- RunStaffRun's recruiter-facing search/export.
--
-- Table shapes for pa_contacts / subscriptions / credit_ledger /
-- export_log / removal_requests / waitlist below are verified against
-- RunStaffRun's live Supabase project (via its Schema Visualizer "Copy as
-- SQL" output). The two views (credit_balance, admin_subscriber_summary)
-- are still my own reconstruction from frontend usage, not the verified
-- source — they must exist for real (Search.jsx/AdminSubscribers.jsx query
-- them), just not yet confirmed against the live definitions. Re-check
-- these once you can pull them from Database → Views in the dashboard.
--
-- Idempotent: safe to run more than once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Recruiter role + opt-in bridge on the existing public.users table
-- ---------------------------------------------------------------------

-- public.users.role is free text ('pa' | 'admin' today) — 'recruiter' is
-- just a new value, no enum migration needed.

-- company_name has no equivalent in RunStaffRun's real `profiles` table
-- (verified live schema: just id/email/is_admin/created_at) — it's a new,
-- optional field for the recruiter signup flow in this merged app, not a
-- migrated column. Harmless if unused.
alter table public.users
  add column if not exists company_name text,
  add column if not exists open_to_recruiter_outreach boolean not null default false;

-- handle_new_user() previously ignored any `role` in signup metadata and
-- always left the column at its default ('pa'). Recreate it so a
-- recruiter signup (metadata.role = 'recruiter') actually lands with the
-- right role — guarded the same way the credential cast already is, so a
-- bad/missing value never blocks signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cred public.credential_enum;
  new_role text;
begin
  begin
    cred := (new.raw_user_meta_data ->> 'credential')::public.credential_enum;
  exception when others then
    cred := null;
  end;

  new_role := new.raw_user_meta_data ->> 'role';
  if new_role not in ('pa', 'recruiter') then
    new_role := 'pa';
  end if;

  insert into public.users (
    id, email, full_name, role, credential, specialty, current_location,
    preferred_location, availability, compensation_goal, phone, bio,
    company_name
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new_role,
    cred,
    new.raw_user_meta_data ->> 'specialty',
    new.raw_user_meta_data ->> 'current_location',
    new.raw_user_meta_data ->> 'preferred_location',
    new.raw_user_meta_data ->> 'availability',
    new.raw_user_meta_data ->> 'compensation_goal',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'bio',
    new.raw_user_meta_data ->> 'company_name'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. RunStaffRun tables (verified against the live project's schema)
-- ---------------------------------------------------------------------

-- pg_trgm powers the trigram indexes below (gin_trgm_ops) — must be
-- created before anything references that operator class, not after.
create extension if not exists pg_trgm;

-- pa_contacts: matches the live RunStaffRun schema exactly, except
-- aapa_id is relaxed from NOT NULL UNIQUE to nullable — a Postgres unique
-- constraint permits any number of NULLs, so this doesn't weaken the
-- constraint for imported AAPA rows, it just allows the new
-- season_one_optin rows (below) to have no aapa_id at all.
create table if not exists public.pa_contacts (
  id                    bigserial primary key,
  aapa_id               text unique,
  full_name             text not null,
  email                 text unique not null,
  email_domain          text,
  membership_tier       text,
  is_student            boolean default false,
  verified              boolean default false,
  verification_result   text,
  verification_reason   text,
  is_role_email         text,
  is_free_email         text,
  aapa_profile_url      text,
  city                  text,
  state                 text,
  postal_code           text,
  organization          text,
  specialty             text,
  npi                   text,
  -- Where this row came from: the original AAPA import, or a Season One
  -- PA who opted in to recruiter outreach (see trigger below).
  source                text not null default 'aapa_import',
  source_user_id        uuid references public.users (id) on delete set null,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists idx_pa_contacts_email        on public.pa_contacts (email);
create index if not exists idx_pa_contacts_verified      on public.pa_contacts (verified);
create index if not exists idx_pa_contacts_is_student    on public.pa_contacts (is_student);
create index if not exists idx_pa_contacts_state         on public.pa_contacts (state);
create index if not exists idx_pa_contacts_source_user   on public.pa_contacts (source_user_id);
create index if not exists idx_pa_contacts_name_trgm     on public.pa_contacts using gin (full_name gin_trgm_ops);
create index if not exists idx_pa_contacts_email_trgm    on public.pa_contacts using gin (email gin_trgm_ops);

-- subscriptions: the live project's "Copy as SQL" dump (table DDL only,
-- no indexes/policies) didn't show a unique constraint on user_id, but
-- AdminSubscribers.jsx's handlePlanChange() and the ported Stripe webhook
-- both upsert with onConflict: 'user_id' — Postgres requires a matching
-- unique constraint/index for that to work at all, so one almost
-- certainly exists as a plain index rather than a named constraint.
-- Keeping it here rather than dropping it, to match what the app actually
-- depends on. A missing row means "trial" — that default lives in the
-- app (Search.jsx), not the DB.
create table if not exists public.subscriptions (
  id                  bigserial primary key,
  user_id             uuid references public.users (id) on delete cascade,
  stripe_customer_id  text unique,
  stripe_sub_id       text unique,
  plan                text, -- trial (no row) | starter | professional | agency | enterprise
  status              text,
  current_period_end  timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (user_id)
);

-- credit_ledger: append-only log of credit grants/spends. Balance is the
-- running sum, exposed via the credit_balance view below.
create table if not exists public.credit_ledger (
  id            bigserial primary key,
  user_id       uuid not null references public.users (id) on delete cascade,
  amount        integer not null, -- positive = grant, negative = spend
  action        text not null,    -- plan_grant | monthly_renewal | reveal | export | verification
  contact_id    bigint references public.pa_contacts (id) on delete set null,
  stripe_event  text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_credit_ledger_user on public.credit_ledger (user_id);

-- Matches the live definition exactly (no coalesce needed here — sum()
-- over an existing group is never null; a user with zero credit_ledger
-- rows simply has no row in this view, which the outer join handles).
create or replace view public.credit_balance as
  select user_id, sum(amount) as balance
  from public.credit_ledger
  group by user_id;

-- export_log: one row per contact exported (not one row per export
-- action/batch, which is what I originally guessed) — matches the live
-- schema, which logs a user_id + contact_id pair per exported record.
create table if not exists public.export_log (
  id          bigserial primary key,
  user_id     uuid references public.users (id) on delete set null,
  contact_id  bigint references public.pa_contacts (id) on delete set null,
  exported_at timestamptz default now()
);

-- removal_requests: opt-out submissions (also honored by the Season One
-- opt-in bridge below — a removal request suppresses a PA from
-- pa_contacts regardless of source).
create table if not exists public.removal_requests (
  id             bigserial primary key,
  full_name      text not null,
  email          text not null,
  credential     text,
  reason         text,
  status         text default 'pending', -- pending | processed
  submitted_at   timestamptz default now(),
  processed_at   timestamptz
);

create index if not exists idx_removal_requests_email on public.removal_requests (email);

-- waitlist: "request full database access" leads from the marketing site.
-- Column set (full_name/company/role/budget/source) matches the live
-- schema — my first draft only had id/email/created_at, which was wrong.
create table if not exists public.waitlist (
  id           bigserial primary key,
  full_name    text not null,
  email        text unique not null,
  company      text,
  role         text,
  budget       text,
  source       text default 'waitlist_page',
  signed_up_at timestamptz default now()
);

-- admin_subscriber_summary: verified live definition joined `profiles`
-- (recruiters/admins only, by construction) against subscriptions,
-- credit_balance, and a per-user export count from export_log — 9
-- columns including current_period_end, which my first draft missed.
-- Adapted here to select from public.users instead of a standalone
-- profiles table, with an explicit role filter doing the job that a
-- separate profiles table did implicitly (profiles never contained PAs).
create or replace view public.admin_subscriber_summary as
  select
    u.id,
    u.email,
    u.role = 'admin' as is_admin,
    u.created_at as joined_at,
    s.plan,
    s.status,
    s.current_period_end,
    coalesce(cb.balance, 0) as credit_balance,
    coalesce(ex.total_exports, 0) as total_exports
  from public.users u
  left join public.subscriptions s   on s.user_id = u.id
  left join public.credit_balance cb on cb.user_id = u.id
  left join (
    select user_id, count(*) as total_exports
    from public.export_log
    group by user_id
  ) ex on ex.user_id = u.id
  where u.role in ('recruiter', 'admin');

-- ---------------------------------------------------------------------
-- 3. Opt-in bridge: Season One PA -> pa_contacts
-- ---------------------------------------------------------------------
-- When a PA flips users.open_to_recruiter_outreach on, mirror them into
-- pa_contacts (tagged source = 'season_one_optin') so RunStaffRun's
-- search/export can see them. Flipping it off (or an existing removal
-- request on file for their email) retracts the row. This is the only
-- path by which a Season One-registered PA becomes visible to
-- RunStaffRun recruiters — nothing else feeds PA job-seeker data into
-- pa_contacts.
create or replace function public.sync_recruiter_outreach_optin()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_removed boolean;
begin
  select exists (
    select 1 from public.removal_requests
    where email = new.email and status = 'pending'
  ) into is_removed;

  if new.open_to_recruiter_outreach and not is_removed then
    insert into public.pa_contacts (
      full_name, email, is_student, verified, city, state, specialty,
      source, source_user_id
    )
    values (
      new.full_name, new.email, new.credential = 'PA Student', true,
      new.current_location, null, new.specialty,
      'season_one_optin', new.id
    )
    on conflict (email) do update set
      full_name  = excluded.full_name,
      is_student = excluded.is_student,
      specialty  = excluded.specialty,
      city       = excluded.city,
      source     = 'season_one_optin',
      source_user_id = excluded.source_user_id,
      updated_at = now()
    where public.pa_contacts.source = 'season_one_optin'
       or public.pa_contacts.source_user_id is null;
  else
    delete from public.pa_contacts
    where source = 'season_one_optin' and source_user_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_user_outreach_opt_in on public.users;
create trigger on_user_outreach_opt_in
  after insert or update of open_to_recruiter_outreach on public.users
  for each row execute function public.sync_recruiter_outreach_optin();

-- ---------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------
alter table public.pa_contacts      enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.credit_ledger    enable row level security;
alter table public.export_log       enable row level security;
alter table public.removal_requests enable row level security;
alter table public.waitlist         enable row level security;

-- pa_contacts: any authenticated recruiter (or admin) can search; only
-- admins can write directly (the opt-in trigger runs as SECURITY DEFINER
-- so it bypasses this for the bridge).
drop policy if exists "pa_contacts_select" on public.pa_contacts;
create policy "pa_contacts_select" on public.pa_contacts
  for select to authenticated using (true);

drop policy if exists "pa_contacts_admin_write" on public.pa_contacts;
create policy "pa_contacts_admin_write" on public.pa_contacts
  for all using (public.is_admin()) with check (public.is_admin());

-- subscriptions / credit_ledger / export_log: a recruiter sees their own
-- rows; admins see everything.
drop policy if exists "subscriptions_select" on public.subscriptions;
create policy "subscriptions_select" on public.subscriptions
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "subscriptions_admin_write" on public.subscriptions;
create policy "subscriptions_admin_write" on public.subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "credit_ledger_select" on public.credit_ledger;
create policy "credit_ledger_select" on public.credit_ledger
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "credit_ledger_insert" on public.credit_ledger;
create policy "credit_ledger_insert" on public.credit_ledger
  for insert with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "export_log_select" on public.export_log;
create policy "export_log_select" on public.export_log
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "export_log_insert" on public.export_log;
create policy "export_log_insert" on public.export_log
  for insert with check (auth.uid() = user_id or public.is_admin());

-- removal_requests: anyone can submit (public opt-out form), only admins
-- can read/process.
drop policy if exists "removal_requests_insert" on public.removal_requests;
create policy "removal_requests_insert" on public.removal_requests
  for insert to anon, authenticated with check (true);

drop policy if exists "removal_requests_admin_all" on public.removal_requests;
create policy "removal_requests_admin_all" on public.removal_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- waitlist: anyone can join, only admins can read.
drop policy if exists "waitlist_insert" on public.waitlist;
create policy "waitlist_insert" on public.waitlist
  for insert to anon, authenticated with check (true);

drop policy if exists "waitlist_admin_select" on public.waitlist;
create policy "waitlist_admin_select" on public.waitlist
  for select using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.pa_contacts to authenticated;
grant all on public.subscriptions to authenticated;
grant all on public.credit_ledger to authenticated;
grant all on public.export_log to authenticated;
grant insert on public.removal_requests to anon, authenticated;
grant select, update on public.removal_requests to authenticated;
grant insert on public.waitlist to anon, authenticated;
grant select on public.credit_balance to authenticated;
grant select on public.admin_subscriber_summary to authenticated;
