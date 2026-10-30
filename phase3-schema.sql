-- Phase 3 additions — run this in the Supabase SQL editor AFTER schema.sql and phase2-schema.sql

-- ===== Skills (extends members, powers the skills directory) =====
alter table members add column if not exists skills text; -- comma-separated, e.g. "Law, Public Speaking"

-- ===== Dues tracking (extends members) =====
alter table members add column if not exists dues_paid boolean not null default false;
alter table members add column if not exists dues_year int;

-- ===== Job / internship board =====
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text,
  description text,
  contact_email text not null,
  posted_by text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table jobs enable row level security;

create policy "public can view approved jobs"
  on jobs for select using (approved = true);

create policy "public can submit job"
  on jobs for insert with check (approved = false);

create policy "admin full access jobs"
  on jobs for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ===== Mentorship directory (mentor/mentee sign-up, matched by browsing + email) =====
create table if not exists mentorship_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  role text not null check (role in ('mentor', 'mentee')),
  area text,
  bio text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table mentorship_profiles enable row level security;

create policy "public can view approved mentorship profiles"
  on mentorship_profiles for select using (approved = true);

create policy "public can submit mentorship profile"
  on mentorship_profiles for insert with check (approved = false);

create policy "admin full access mentorship"
  on mentorship_profiles for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ===== Class-year notes (lightweight message board per graduating class) =====
create table if not exists class_notes (
  id uuid primary key default gen_random_uuid(),
  grad_year int not null,
  author_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table class_notes enable row level security;

create policy "public can view class notes"
  on class_notes for select using (true);

create policy "public can post class note"
  on class_notes for insert with check (true);

create policy "admin full access class notes"
  on class_notes for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
