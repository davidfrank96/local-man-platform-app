create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  level text not null check (level in ('debug', 'info', 'warn', 'error')),
  area text not null check (length(btrim(area)) > 0),
  event text not null check (length(btrim(event)) > 0),
  message text,
  route text,
  method text,
  status integer check (status is null or (status between 100 and 599)),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  request_id text,
  actor_role text,
  actor_id text,
  vendor_id text,
  vendor_slug text,
  environment text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists operational_events_created_at_idx
on public.operational_events (created_at desc);

create index if not exists operational_events_level_idx
on public.operational_events (level);

create index if not exists operational_events_area_idx
on public.operational_events (area);

create index if not exists operational_events_event_idx
on public.operational_events (event);

create index if not exists operational_events_route_idx
on public.operational_events (route);

alter table public.operational_events enable row level security;

drop policy if exists "Admins can read operational events" on public.operational_events;
create policy "Admins can read operational events"
on public.operational_events
for select
using (public.is_admin());
