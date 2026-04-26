\pset format aligned
\pset pager off

\echo 'TOTAL EVENTS'
select count(*) as total_events
from public.user_events;

\echo ''
\echo 'EVENT COUNTS'
select
  event_type,
  count(*) as event_count
from public.user_events
group by event_type
order by event_count desc, event_type asc;

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
\echo 'LEAST USED ACTIVE VENDORS'
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
\echo 'VENDOR FUNNEL COUNTS'
select
  count(*) filter (where event_type = 'vendor_selected') as vendor_selected,
  count(*) filter (where event_type = 'vendor_detail_opened') as vendor_detail_opened,
  count(*) filter (where event_type = 'call_clicked') as call_clicked,
  count(*) filter (where event_type = 'directions_clicked') as directions_clicked,
  count(*) filter (where event_type = 'search_used') as search_used,
  count(*) filter (where event_type in ('filter_applied', 'filters_applied')) as filter_applied_any
from public.user_events;

\echo ''
\echo 'EVENTS BY DEVICE TYPE'
select
  device_type,
  count(*) as event_count
from public.user_events
group by device_type
order by event_count desc, device_type asc;

\echo ''
\echo 'EVENTS BY LOCATION SOURCE'
select
  coalesce(location_source, '[null]') as location_source,
  count(*) as event_count
from public.user_events
group by coalesce(location_source, '[null]')
order by event_count desc, location_source asc;
