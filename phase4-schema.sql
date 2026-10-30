-- Phase 4 additions — run this in the Supabase SQL editor AFTER schema.sql, phase2-schema.sql, phase3-schema.sql
--
-- IMPORTANT: payment records here are written by the browser after Flutterwave's
-- checkout reports success. There is no server-side webhook verifying with your
-- Flutterwave secret key, because this site has no backend server — only Supabase.
-- That's an acceptable trust model for a small community site, but if you ever need
-- this to be fraud-proof, add a Supabase Edge Function that verifies each tx_ref
-- against Flutterwave's /transactions/verify endpoint using your secret key, and
-- have it write the "paid" record instead of the browser.

-- ===== Event ticketing =====
alter table events add column if not exists ticket_price numeric;  -- null or 0 = free (RSVP flow)
alter table events add column if not exists currency text not null default 'KES';

create table if not exists event_tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  full_name text not null,
  email text not null,
  amount numeric not null,
  currency text not null default 'KES',
  payment_reference text not null unique,
  created_at timestamptz not null default now()
);

alter table event_tickets enable row level security;

create policy "public can record a paid ticket"
  on event_tickets for insert
  with check (true);

create policy "admin full access tickets"
  on event_tickets for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create or replace function get_ticket_count(p_event_id uuid)
returns integer
language sql security definer set search_path = public as $$
  select count(*)::int from event_tickets where event_id = p_event_id;
$$;
grant execute on function get_ticket_count(uuid) to anon, authenticated;

-- ===== Donations =====
create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  amount numeric not null,
  currency text not null default 'KES',
  message text,
  payment_reference text not null unique,
  created_at timestamptz not null default now()
);

alter table donations enable row level security;

create policy "public can record a donation"
  on donations for insert
  with check (true);

create policy "admin full access donations"
  on donations for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Public total (no individual amounts exposed)
create or replace function get_total_donations()
returns numeric
language sql security definer set search_path = public as $$
  select coalesce(sum(amount), 0) from donations;
$$;
grant execute on function get_total_donations() to anon, authenticated;

-- Public "wall of supporters" — names only, no amounts or emails
create view donation_wall as
  select full_name, created_at from donations order by created_at desc limit 30;
grant select on donation_wall to anon, authenticated;

-- ===== Memorial / tribute page =====
create table if not exists memorials (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  grad_year int,
  date_of_passing date,
  tribute_text text,
  photo_url text,
  submitted_by_name text,
  submitted_by_email text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table memorials enable row level security;

create policy "public can view approved memorials"
  on memorials for select using (approved = true);

create policy "public can submit a memorial"
  on memorials for insert with check (approved = false);

create policy "admin full access memorials"
  on memorials for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
