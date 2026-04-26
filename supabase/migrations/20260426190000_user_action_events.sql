create table if not exists public.user_action_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  vendor_id uuid references public.vendors(id) on delete set null,
  vendor_slug text,
  page_path text not null,
  search_query text,
  filters jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_action_events_event_name_idx
  on public.user_action_events (event_name, created_at desc);

create index if not exists user_action_events_vendor_id_idx
  on public.user_action_events (vendor_id, created_at desc);
