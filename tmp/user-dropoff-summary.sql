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
\echo 'SEARCH WITHOUT CLICK (EVENT-LEVEL PROXY)'
with counts as (
  select
    count(*) filter (where event_type = 'search_used') as search_used_count,
    count(*) filter (where event_type = 'vendor_selected') as vendor_selected_count,
    count(*) filter (where event_type = 'vendor_detail_opened') as vendor_detail_opened_count
  from public.user_events
)
select
  search_used_count,
  vendor_selected_count,
  vendor_detail_opened_count,
  greatest(search_used_count - vendor_selected_count, 0) as search_without_selection_gap
from counts;

\echo ''
\echo 'VENDOR OPEN WITHOUT ACTION (EVENT-LEVEL PROXY)'
with counts as (
  select
    count(*) filter (where event_type = 'vendor_detail_opened') as vendor_detail_opened_count,
    count(*) filter (where event_type = 'call_clicked') as call_clicked_count,
    count(*) filter (where event_type = 'directions_clicked') as directions_clicked_count
  from public.user_events
)
select
  vendor_detail_opened_count,
  call_clicked_count,
  directions_clicked_count,
  greatest(vendor_detail_opened_count - (call_clicked_count + directions_clicked_count), 0) as open_without_action_gap
from counts;

\echo ''
\echo 'APP OPEN BUT NO INTERACTION'
select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_events'
      and column_name = 'session_id'
  ) as has_session_id_column;
