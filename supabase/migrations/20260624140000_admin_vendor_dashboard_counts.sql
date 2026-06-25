-- Admin dashboard vendor count aggregates. This function returns aggregate
-- counts only; vendor rows remain paginated through the admin vendor list API.

create or replace function public.get_admin_vendor_dashboard_counts()
returns table (
  total_vendor_count integer,
  active_vendor_count integer,
  missing_hours_count integer,
  missing_images_count integer,
  missing_dishes_count integer,
  needs_follow_up_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with vendor_completeness as (
    select
      vendors.id,
      vendors.is_active,
      coalesce(hours.hours_count, 0) as hours_count,
      coalesce(images.images_count, 0) as images_count,
      coalesce(dishes.dishes_count, 0) as dishes_count
    from public.vendors as vendors
    left join (
      select vendor_id, count(*)::integer as hours_count
      from public.vendor_hours
      group by vendor_id
    ) as hours
      on hours.vendor_id = vendors.id
    left join (
      select vendor_id, count(*)::integer as images_count
      from public.vendor_images
      group by vendor_id
    ) as images
      on images.vendor_id = vendors.id
    left join (
      select vendor_id, count(*)::integer as dishes_count
      from public.vendor_featured_dishes
      group by vendor_id
    ) as dishes
      on dishes.vendor_id = vendors.id
  )
  select
    count(*)::integer as total_vendor_count,
    count(*) filter (where is_active)::integer as active_vendor_count,
    count(*) filter (where hours_count < 7)::integer as missing_hours_count,
    count(*) filter (where images_count < 1)::integer as missing_images_count,
    count(*) filter (where dishes_count < 1)::integer as missing_dishes_count,
    count(*) filter (
      where hours_count < 7
        or images_count < 1
        or dishes_count < 1
    )::integer as needs_follow_up_count
  from vendor_completeness;
$$;

revoke all privileges on function public.get_admin_vendor_dashboard_counts() from public;
revoke all privileges on function public.get_admin_vendor_dashboard_counts()
from anon, authenticated, service_role;
grant execute on function public.get_admin_vendor_dashboard_counts() to service_role;
