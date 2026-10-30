-- Alumni Association — Phase 1 Supabase schema
-- Run this in the Supabase SQL editor for your project

-- 1. Members (the alumni directory)
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  grad_year int not null,
  email text not null unique,
  phone text,
  location text,
  profession text,
  bio text,
  photo_url text,
  approved boolean not null default false,  -- admin must approve before showing in directory
  created_at timestamptz not null default now()
);

-- 2. News & announcements
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Events
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  event_date timestamptz not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: public can only read approved members / published announcements / events.
-- Writes happen only via the admin account (Supabase auth), matching the Harttech pattern
-- of disabling public sign-ups and using a single admin login.

alter table members enable row level security;
alter table announcements enable row level security;
alter table events enable row level security;

-- Public read: approved members only
create policy "public can view approved members"
  on members for select
  using (approved = true);

-- Public can insert their own registration (goes in unapproved, pending admin review)
create policy "public can register as member"
  on members for insert
  with check (approved = false);

-- Admin (authenticated) full access
create policy "admin full access members"
  on members for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "public can view published announcements"
  on announcements for select
  using (published = true);

create policy "admin full access announcements"
  on announcements for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "public can view events"
  on events for select
  using (true);

create policy "admin full access events"
  on events for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
