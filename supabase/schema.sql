create extension if not exists pgcrypto;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  age integer,
  gender text,
  education_level text,
  class_name text,
  sports_interest text,
  assigned_variant text not null check (assigned_variant in ('A', 'B')),
  device_type text,
  browser text,
  screen_resolution text,
  completed boolean not null default false,
  completed_at timestamptz,
  total_session_duration_ms integer
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  question_id text not null,
  answer text not null,
  time_to_answer_ms integer,
  change_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, question_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  timestamp timestamptz not null default now()
);

create index if not exists participants_variant_idx on public.participants (assigned_variant);
create index if not exists participants_completed_idx on public.participants (completed);
create index if not exists responses_participant_idx on public.responses (participant_id);
create index if not exists events_participant_idx on public.events (participant_id);
create index if not exists events_type_idx on public.events (event_type);

alter table public.participants enable row level security;
alter table public.responses enable row level security;
alter table public.events enable row level security;

drop policy if exists "No direct participant reads" on public.participants;
drop policy if exists "No direct response reads" on public.responses;
drop policy if exists "No direct event reads" on public.events;
drop policy if exists "Anon can insert participants" on public.participants;
drop policy if exists "Anon can insert responses" on public.responses;
drop policy if exists "Anon can insert events" on public.events;

create policy "No direct participant reads"
  on public.participants for select
  using (false);

create policy "No direct response reads"
  on public.responses for select
  using (false);

create policy "No direct event reads"
  on public.events for select
  using (false);

create policy "Anon can insert participants"
  on public.participants for insert
  to anon
  with check (true);

create policy "Anon can insert responses"
  on public.responses for insert
  to anon
  with check (true);

create policy "Anon can insert events"
  on public.events for insert
  to anon
  with check (true);

-- This MVP writes through server actions using the service role key.
-- The service role bypasses RLS; never expose SUPABASE_SERVICE_ROLE_KEY in the browser.
