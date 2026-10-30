-- Phase 2 additions — run this in the Supabase SQL editor AFTER schema.sql
-- (safe to run on an existing database; only adds new tables/columns)

-- ===== Event RSVPs =====
create table if not exists event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique (event_id, email)
);

alter table event_rsvps enable row level security;

create policy "public can rsvp"
  on event_rsvps for insert
  with check (true);

create policy "admin full access rsvps"
  on event_rsvps for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Public can see a COUNT of RSVPs per event without seeing names/emails
create or replace function get_rsvp_count(p_event_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int from event_rsvps where event_id = p_event_id;
$$;

grant execute on function get_rsvp_count(uuid) to anon, authenticated;

-- ===== Photo gallery =====
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text not null,
  event_id uuid references events(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table photos enable row level security;

create policy "public can view photos"
  on photos for select
  using (true);

create policy "admin full access photos"
  on photos for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ===== Alumni spotlight (extends members) =====
alter table members add column if not exists is_spotlight boolean not null default false;
alter table members add column if not exists spotlight_blurb text;
alter table members add column if not exists spotlight_set_at timestamptz;

-- ===== Newsletter subscribers =====
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table newsletter_subscribers enable row level security;

create policy "public can subscribe"
  on newsletter_subscribers for insert
  with check (true);

create policy "admin full access newsletter"
  on newsletter_subscribers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
