\pset format aligned
\pset pager off

\echo 'EVENT COUNTS'
select
  event_type,
  count(*) as event_count
from public.user_events
group by event_type
order by event_count desc, event_type asc;

\echo ''
\echo 'SESSION SUMMARY'
with session_rollup as (
  select
    session_id,
    min(timestamp) as session_start,
    max(timestamp) as session_end,
    extract(epoch from max(timestamp) - min(timestamp))::int as duration_seconds,
    (
      select ue.event_type
      from public.user_events ue
      where ue.session_id = s.session_id
      order by ue.timestamp asc
      limit 1
    ) as first_action,
    (
      select ue.event_type
      from public.user_events ue
      where ue.session_id = s.session_id
      order by ue.timestamp desc
      limit 1
    ) as last_action,
    count(*) as total_events
  from public.user_events s
  where s.session_id is not null
  group by s.session_id
)
select
  count(*) as sessions,
  coalesce(avg(duration_seconds)::numeric(10,2), 0) as avg_duration_seconds,
  coalesce(percentile_cont(0.5) within group (order by duration_seconds)::numeric(10,2), 0) as median_duration_seconds,
  coalesce(max(duration_seconds), 0) as max_duration_seconds,
  coalesce(avg(total_events)::numeric(10,2), 0) as avg_events_per_session
from session_rollup;

\echo ''
\echo 'FIRST ACTIONS'
with session_rollup as (
  select
    s.session_id,
    (
      select ue.event_type
      from public.user_events ue
      where ue.session_id = s.session_id
      order by ue.timestamp asc
      limit 1
    ) as first_action
  from public.user_events s
  where s.session_id is not null
  group by s.session_id
)
select
  first_action,
  count(*) as sessions
from session_rollup
group by first_action
order by sessions desc, first_action asc;

\echo ''
\echo 'LAST ACTIONS'
with session_rollup as (
  select
    s.session_id,
    (
      select ue.event_type
      from public.user_events ue
      where ue.session_id = s.session_id
      order by ue.timestamp desc
      limit 1
    ) as last_action
  from public.user_events s
  where s.session_id is not null
  group by s.session_id
)
select
  last_action,
  count(*) as sessions
from session_rollup
group by last_action
order by sessions desc, last_action asc;

\echo ''
\echo 'TOP VENDORS'
select
  coalesce(v.name, ue.vendor_slug, '[unknown vendor]') as vendor,
  ue.vendor_id,
  count(*) filter (where ue.event_type = 'vendor_selected') as vendor_selected_count,
  count(*) filter (where ue.event_type = 'vendor_detail_opened') as vendor_detail_opened_count,
  count(*) filter (where ue.event_type = 'call_clicked') as call_clicked_count,
  count(*) filter (where ue.event_type = 'directions_clicked') as directions_clicked_count,
  count(*) as total_vendor_events
from public.user_events ue
left join public.vendors v
  on v.id = ue.vendor_id
where ue.vendor_id is not null
group by coalesce(v.name, ue.vendor_slug, '[unknown vendor]'), ue.vendor_id
order by total_vendor_events desc, vendor asc
limit 10;

\echo ''
\echo 'LEAST USED VENDORS'
select
  v.name as vendor,
  v.id as vendor_id,
  count(ue.id) as tracked_events
from public.vendors v
left join public.user_events ue
  on ue.vendor_id = v.id
where v.is_active = true
group by v.name, v.id
order by tracked_events asc, vendor asc
limit 10;

\echo ''
\echo 'DROP-OFF: NO MEANINGFUL INTERACTION'
with session_events as (
  select
    session_id,
    count(*) filter (
      where event_type in (
        'vendor_selected',
        'vendor_detail_opened',
        'call_clicked',
        'directions_clicked',
        'search_used',
        'filter_applied'
      )
    ) as meaningful_events
  from public.user_events
  where session_id is not null
  group by session_id
)
select
  count(*) as sessions_without_meaningful_interaction
from session_events
where meaningful_events = 0;

\echo ''
\echo 'FRICTION: SEARCHED BUT DID NOT CLICK'
with session_events as (
  select
    session_id,
    bool_or(event_type = 'search_used') as used_search,
    bool_or(event_type in ('vendor_selected', 'vendor_detail_opened', 'call_clicked', 'directions_clicked')) as clicked_vendor_path
  from public.user_events
  where session_id is not null
  group by session_id
)
select
  count(*) as search_without_click_sessions
from session_events
where used_search = true and clicked_vendor_path = false;

\echo ''
\echo 'FRICTION: OPENED VENDOR BUT DID NOT ACT'
with session_events as (
  select
    session_id,
    bool_or(event_type = 'vendor_detail_opened') as opened_vendor,
    bool_or(event_type in ('call_clicked', 'directions_clicked')) as acted_after_open
  from public.user_events
  where session_id is not null
  group by session_id
)
select
  count(*) as vendor_open_without_action_sessions
from session_events
where opened_vendor = true and acted_after_open = false;
