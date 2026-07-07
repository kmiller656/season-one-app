-- =====================================================================
-- Season One Healthcare — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- The script is idempotent: it is safe to run more than once.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type public.credential_enum as enum ('PA-C', 'PA Student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.facility_type_enum as enum
    ('Hospital', 'CAH', 'FQHC', 'RHC', 'Tribal Health', 'Specialty Clinic', 'Other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.position_type_enum as enum ('Permanent', 'Locum', 'Contract');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.compensation_type_enum as enum ('hourly', 'annual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.match_status_enum as enum
    ('new', 'viewed', 'interested', 'not_interested', 'in_progress', 'placed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.facility_status_enum as enum ('new', 'in_progress', 'placed', 'closed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- users: extends auth.users with the PA profile (+ role for admins)
create table if not exists public.users (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text,
  email              text,
  role               text not null default 'pa',          -- 'pa' | 'admin'
  credential         public.credential_enum,
  specialty          text,
  current_location   text,
  preferred_location text,
  availability       text,
  compensation_goal  text,
  phone              text,
  bio                text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- opportunities: jobs posted by admins
create table if not exists public.opportunities (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  facility_name     text,
  facility_type     public.facility_type_enum,
  location          text,
  specialty         text,
  position_type     public.position_type_enum,
  compensation      text,
  compensation_type public.compensation_type_enum,
  description       text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  posted_by         uuid references auth.users (id) on delete set null
);

-- matches: which PA was matched to which opportunity, and the funnel status
create table if not exists public.matches (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  status         public.match_status_enum not null default 'new',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

-- facilities: employer/contact submissions from the marketing site (admin-only)
create table if not exists public.facilities (
  id                 uuid primary key default gen_random_uuid(),
  facility_name      text,
  facility_type      text,
  location           text,
  contact_name       text,
  contact_title      text,
  contact_email      text,
  contact_phone      text,
  roles_needed       text,
  position_type      text,
  timeline           text,
  compensation_range text,
  notes              text,
  status             public.facility_status_enum not null default 'new',
  created_at         timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_opportunities_active     on public.opportunities (is_active);
create index if not exists idx_opportunities_specialty  on public.opportunities (lower(specialty));
create index if not exists idx_matches_user             on public.matches (user_id);
create index if not exists idx_matches_opportunity      on public.matches (opportunity_id);
create index if not exists idx_users_specialty          on public.users (lower(specialty));
create index if not exists idx_facilities_status        on public.facilities (status);

-- ---------------------------------------------------------------------
-- Helper: is_admin()
-- SECURITY DEFINER so it can read public.users *without* triggering the
-- users RLS policies (prevents infinite recursion in those policies).
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_matches_updated_at on public.matches;
create trigger trg_matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Provision a public.users row whenever an auth user is created.
-- Copies any profile fields passed via signUp options.data (metadata),
-- with a guarded cast so a bad credential value never blocks signup.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cred public.credential_enum;
begin
  begin
    cred := (new.raw_user_meta_data ->> 'credential')::public.credential_enum;
  exception when others then
    cred := null;
  end;

  insert into public.users (
    id, email, full_name, credential, specialty, current_location,
    preferred_location, availability, compensation_goal, phone, bio
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    cred,
    new.raw_user_meta_data ->> 'specialty',
    new.raw_user_meta_data ->> 'current_location',
    new.raw_user_meta_data ->> 'preferred_location',
    new.raw_user_meta_data ->> 'availability',
    new.raw_user_meta_data ->> 'compensation_goal',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'bio'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Auto-matching (both directions), case-insensitive on specialty.
-- SECURITY DEFINER so the fan-out insert bypasses matches RLS.
-- ---------------------------------------------------------------------

-- New opportunity  ->  match every PA with the same specialty.
create or replace function public.create_matches_for_opportunity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_active and new.specialty is not null then
    insert into public.matches (user_id, opportunity_id, status)
    select u.id, new.id, 'new'
    from public.users u
    where u.role = 'pa'
      and u.specialty is not null
      and lower(btrim(u.specialty)) = lower(btrim(new.specialty))
    on conflict (user_id, opportunity_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_opportunity_created on public.opportunities;
create trigger on_opportunity_created
  after insert on public.opportunities
  for each row execute function public.create_matches_for_opportunity();

-- New / updated PA specialty  ->  match every active opportunity.
-- (Ensures a freshly-registered PA isn't staring at an empty dashboard.)
create or replace function public.create_matches_for_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'pa' and new.specialty is not null then
    insert into public.matches (user_id, opportunity_id, status)
    select new.id, o.id, 'new'
    from public.opportunities o
    where o.is_active = true
      and o.specialty is not null
      and lower(btrim(o.specialty)) = lower(btrim(new.specialty))
    on conflict (user_id, opportunity_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_user_specialty_set on public.users;
create trigger on_user_specialty_set
  after insert or update of specialty on public.users
  for each row execute function public.create_matches_for_user();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.users         enable row level security;
alter table public.opportunities enable row level security;
alter table public.matches       enable row level security;
alter table public.facilities    enable row level security;

-- users ---------------------------------------------------------------
drop policy if exists "users_select" on public.users;
create policy "users_select" on public.users
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "users_insert" on public.users;
create policy "users_insert" on public.users
  for insert with check (auth.uid() = id or public.is_admin());

drop policy if exists "users_update" on public.users;
create policy "users_update" on public.users
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "users_delete" on public.users;
create policy "users_delete" on public.users
  for delete using (public.is_admin());

-- opportunities -------------------------------------------------------
drop policy if exists "opps_select" on public.opportunities;
create policy "opps_select" on public.opportunities
  for select using (is_active = true or public.is_admin());

drop policy if exists "opps_insert" on public.opportunities;
create policy "opps_insert" on public.opportunities
  for insert with check (public.is_admin());

drop policy if exists "opps_update" on public.opportunities;
create policy "opps_update" on public.opportunities
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "opps_delete" on public.opportunities;
create policy "opps_delete" on public.opportunities
  for delete using (public.is_admin());

-- matches -------------------------------------------------------------
drop policy if exists "matches_select" on public.matches;
create policy "matches_select" on public.matches
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "matches_insert" on public.matches;
create policy "matches_insert" on public.matches
  for insert with check (public.is_admin());

drop policy if exists "matches_update" on public.matches;
create policy "matches_update" on public.matches
  for update using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "matches_delete" on public.matches;
create policy "matches_delete" on public.matches
  for delete using (public.is_admin());

-- facilities (admin-only) ---------------------------------------------
drop policy if exists "facilities_admin_all" on public.facilities;
create policy "facilities_admin_all" on public.facilities
  for all using (public.is_admin()) with check (public.is_admin());

-- OPTIONAL: allow the public marketing-site form to submit a facility
-- lead anonymously (they still cannot read/update/delete). Uncomment to
-- wire the website's "list a role" form straight into this table.
-- drop policy if exists "facilities_public_insert" on public.facilities;
-- create policy "facilities_public_insert" on public.facilities
--   for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------
-- Grants (RLS is the real gate; these are the coarse table privileges)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant all on public.users         to authenticated;
grant all on public.opportunities to authenticated;
grant all on public.matches       to authenticated;
grant all on public.facilities    to authenticated;
