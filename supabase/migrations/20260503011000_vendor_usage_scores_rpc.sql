create or replace function public.get_vendor_usage_scores(vendor_ids uuid[])
returns table (
  vendor_id uuid,
  ranking_score integer
)
language sql
stable
set search_path = public
as $$
  select
    ue.vendor_id,
    (
      count(*) filter (where ue.event_type = 'vendor_selected') +
      count(*) filter (where ue.event_type = 'vendor_detail_opened') * 3 +
      count(*) filter (where ue.event_type = 'directions_clicked') * 5 +
      count(*) filter (where ue.event_type = 'call_clicked') * 8
    )::int as ranking_score
  from public.user_events ue
  where
    ue.vendor_id = any(coalesce(vendor_ids, '{}'::uuid[]))
    and ue.event_type in (
      'vendor_selected',
      'vendor_detail_opened',
      'directions_clicked',
      'call_clicked'
    )
  group by ue.vendor_id;
$$;

revoke all on function public.get_vendor_usage_scores(uuid[]) from public;
grant execute on function public.get_vendor_usage_scores(uuid[]) to service_role;
