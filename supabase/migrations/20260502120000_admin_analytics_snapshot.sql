create index if not exists user_events_timestamp_idx
  on public.user_events (timestamp desc);

create index if not exists user_events_vendor_slug_idx
  on public.user_events (vendor_slug, timestamp desc);

create or replace function public.get_admin_analytics_snapshot(
  range_start timestamptz default null,
  recent_limit integer default 25
)
returns jsonb
language sql
security definer
set search_path = public
as $$
with limits as (
  select greatest(1, least(coalesce(recent_limit, 25), 50)) as recent_limit
),
normalized_events as materialized (
  select
    ue.id,
    case lower(trim(ue.event_type))
      when 'session_start' then 'session_started'
      when 'filters_applied' then 'filter_applied'
      when 'call_click' then 'call_clicked'
      when 'call_clicks' then 'call_clicked'
      when 'direction_clicked' then 'directions_clicked'
      when 'direction_click' then 'directions_clicked'
      when 'directions_click' then 'directions_clicked'
      else lower(trim(ue.event_type))
    end as event_type,
    ue.vendor_id,
    nullif(trim(ue.vendor_slug), '') as vendor_slug,
    case
      when ue.device_type in ('mobile', 'tablet', 'desktop') then ue.device_type
      else 'unknown'
    end as device_type,
    case
      when ue.location_source in ('precise', 'approximate', 'default_city') then ue.location_source
      else null
    end as location_source,
    ue.timestamp,
    ue.session_id
  from public.user_events ue
  where range_start is null or ue.timestamp >= range_start
),
summary_counts as materialized (
  select
    count(*)::int as total_events,
    count(*) filter (where event_type = 'vendor_selected')::int as vendor_selections,
    count(*) filter (where event_type = 'vendor_detail_opened')::int as vendor_detail_opens,
    count(*) filter (where event_type = 'call_clicked')::int as call_clicks,
    count(*) filter (where event_type = 'directions_clicked')::int as directions_clicks,
    count(*) filter (where event_type = 'search_used')::int as searches_used,
    count(*) filter (where event_type = 'filter_applied')::int as filters_applied,
    count(distinct session_id) filter (where session_id is not null)::int as distinct_sessions,
    count(*) filter (where event_type = 'session_started')::int as session_started_count
  from normalized_events
),
vendor_rollups as materialized (
  select
    case
      when vendor_id is not null then 'id:' || vendor_id::text
      when vendor_slug is not null then 'slug:' || vendor_slug
      else null
    end as vendor_key,
    min(vendor_id::text)::uuid as vendor_id,
    max(vendor_slug) as vendor_slug,
    count(*) filter (where event_type = 'vendor_selected')::int as vendor_selected_count,
    count(*) filter (where event_type = 'vendor_detail_opened')::int as vendor_detail_open_count,
    count(*) filter (where event_type = 'call_clicked')::int as call_click_count,
    count(*) filter (where event_type = 'directions_clicked')::int as directions_click_count
  from normalized_events
  where vendor_id is not null or vendor_slug is not null
  group by 1
),
vendor_enriched as materialized (
  select
    vr.vendor_key,
    vr.vendor_id,
    coalesce(v.slug, vr.vendor_slug) as vendor_slug,
    coalesce(v.name, nullif(initcap(replace(vr.vendor_slug, '-', ' ')), '')) as vendor_name,
    vr.vendor_selected_count,
    vr.vendor_detail_open_count,
    vr.call_click_count,
    vr.directions_click_count
  from vendor_rollups vr
  left join public.vendors v on v.id = vr.vendor_id
),
session_rollups as materialized (
  select
    session_id,
    bool_or(
      event_type in (
        'vendor_selected',
        'vendor_detail_opened',
        'call_clicked',
        'directions_clicked',
        'search_used',
        'filter_applied'
      )
    ) as has_meaningful_interaction,
    bool_or(event_type = 'search_used') as used_search,
    bool_or(event_type = 'vendor_selected') as selected_vendor,
    bool_or(event_type = 'vendor_detail_opened') as opened_detail,
    bool_or(event_type in ('call_clicked', 'directions_clicked')) as took_action
  from normalized_events
  where session_id is not null
  group by session_id
),
recent_events as materialized (
  select
    ne.id,
    ne.event_type,
    ne.vendor_id,
    coalesce(v.name, nullif(initcap(replace(ne.vendor_slug, '-', ' ')), '')) as vendor_name,
    coalesce(v.slug, ne.vendor_slug) as vendor_slug,
    ne.device_type,
    ne.location_source,
    ne.timestamp
  from normalized_events ne
  left join public.vendors v on v.id = ne.vendor_id
  order by ne.timestamp desc
  limit (select recent_limit from limits)
)
select jsonb_build_object(
  'summary',
  jsonb_build_object(
    'total_sessions',
    case
      when sc.distinct_sessions > 0 then sc.distinct_sessions
      else sc.session_started_count
    end,
    'total_events', sc.total_events,
    'vendor_selections', sc.vendor_selections,
    'vendor_detail_opens', sc.vendor_detail_opens,
    'call_clicks', sc.call_clicks,
    'directions_clicks', sc.directions_clicks,
    'searches_used', sc.searches_used,
    'filters_applied', sc.filters_applied
  ),
  'vendor_performance',
  jsonb_build_object(
    'most_selected_vendors',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'vendor_id', ve.vendor_id,
          'vendor_name', ve.vendor_name,
          'vendor_slug', ve.vendor_slug,
          'count', ve.vendor_selected_count
        )
        order by ve.vendor_selected_count desc, ve.vendor_name asc nulls last
      )
      from (
        select *
        from vendor_enriched
        where vendor_selected_count > 0
        order by vendor_selected_count desc, vendor_name asc nulls last
        limit 5
      ) ve
    ), '[]'::jsonb),
    'most_viewed_vendor_details',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'vendor_id', ve.vendor_id,
          'vendor_name', ve.vendor_name,
          'vendor_slug', ve.vendor_slug,
          'count', ve.vendor_detail_open_count
        )
        order by ve.vendor_detail_open_count desc, ve.vendor_name asc nulls last
      )
      from (
        select *
        from vendor_enriched
        where vendor_detail_open_count > 0
        order by vendor_detail_open_count desc, vendor_name asc nulls last
        limit 5
      ) ve
    ), '[]'::jsonb),
    'most_call_clicks',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'vendor_id', ve.vendor_id,
          'vendor_name', ve.vendor_name,
          'vendor_slug', ve.vendor_slug,
          'count', ve.call_click_count
        )
        order by ve.call_click_count desc, ve.vendor_name asc nulls last
      )
      from (
        select *
        from vendor_enriched
        where call_click_count > 0
        order by call_click_count desc, vendor_name asc nulls last
        limit 5
      ) ve
    ), '[]'::jsonb),
    'most_directions_clicks',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'vendor_id', ve.vendor_id,
          'vendor_name', ve.vendor_name,
          'vendor_slug', ve.vendor_slug,
          'count', ve.directions_click_count
        )
        order by ve.directions_click_count desc, ve.vendor_name asc nulls last
      )
      from (
        select *
        from vendor_enriched
        where directions_click_count > 0
        order by directions_click_count desc, vendor_name asc nulls last
        limit 5
      ) ve
    ), '[]'::jsonb)
  ),
  'dropoff',
  jsonb_build_object(
    'session_metrics_available',
    exists(select 1 from session_rollups),
    'sessions_without_meaningful_interaction',
    case
      when exists(select 1 from session_rollups)
        then (select count(*)::int from session_rollups where not has_meaningful_interaction)
      else null
    end,
    'sessions_with_search_without_vendor_click',
    case
      when exists(select 1 from session_rollups)
        then (select count(*)::int from session_rollups where used_search and not selected_vendor)
      else null
    end,
    'sessions_with_detail_without_action',
    case
      when exists(select 1 from session_rollups)
        then (select count(*)::int from session_rollups where opened_detail and not took_action)
      else null
    end
  ),
  'recent_events',
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', re.id,
        'event_type', re.event_type,
        'vendor_id', re.vendor_id,
        'vendor_name', re.vendor_name,
        'vendor_slug', re.vendor_slug,
        'device_type', re.device_type,
        'location_source', re.location_source,
        'timestamp', re.timestamp
      )
      order by re.timestamp desc
    )
    from recent_events re
  ), '[]'::jsonb)
)
from summary_counts sc;
$$;
