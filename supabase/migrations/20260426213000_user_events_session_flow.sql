alter table if exists public.user_events
  add column if not exists session_id uuid;

create index if not exists user_events_session_id_idx
  on public.user_events (session_id, timestamp desc);
