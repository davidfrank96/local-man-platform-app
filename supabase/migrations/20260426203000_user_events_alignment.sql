alter table if exists public.user_action_events
  rename to user_events;

alter table if exists public.user_events
  rename column event_name to event_type;

alter table if exists public.user_events
  rename column created_at to timestamp;

alter table if exists public.user_events
  add column if not exists device_type text not null default 'unknown';

alter table if exists public.user_events
  add column if not exists location_source text;

alter index if exists user_action_events_event_name_idx
  rename to user_events_event_type_idx;

alter index if exists user_action_events_vendor_id_idx
  rename to user_events_vendor_id_idx;

drop index if exists public.user_events_event_type_idx;
create index if not exists user_events_event_type_idx
  on public.user_events (event_type, timestamp desc);

drop index if exists public.user_events_vendor_id_idx;
create index if not exists user_events_vendor_id_idx
  on public.user_events (vendor_id, timestamp desc);
