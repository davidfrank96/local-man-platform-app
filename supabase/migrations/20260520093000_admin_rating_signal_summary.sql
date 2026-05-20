-- Admin-only operational signal summary. This returns aggregate counts only;
-- raw rating IDs, anonymous hashes, client identifiers, and per-rating signal
-- rows remain private.

create or replace function public.get_admin_vendor_rating_signal_summary(
  target_vendor_id uuid
)
returns table (
  positive_signal_count integer,
  neutral_signal_count integer,
  negative_signal_count integer,
  food_safety_concern_count integer,
  poor_hygiene_count integer,
  vendor_unavailable_count integer,
  recent_signal_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with vendor_signal_rows as (
    select
      options.slug,
      options.signal_type,
      selections.created_at
    from public.rating_signal_selections as selections
    join public.rating_signal_options as options
      on options.id = selections.signal_option_id
    join public.ratings as ratings
      on ratings.id = selections.rating_id
    where ratings.vendor_id = target_vendor_id
  )
  select
    count(*) filter (where signal_type = 'positive')::integer as positive_signal_count,
    count(*) filter (where signal_type = 'neutral')::integer as neutral_signal_count,
    count(*) filter (where signal_type = 'negative')::integer as negative_signal_count,
    count(*) filter (where slug = 'food_safety_concern')::integer as food_safety_concern_count,
    count(*) filter (where slug = 'poor_hygiene')::integer as poor_hygiene_count,
    count(*) filter (where slug = 'vendor_unavailable')::integer as vendor_unavailable_count,
    count(*) filter (where created_at >= now() - interval '30 days')::integer as recent_signal_count
  from vendor_signal_rows;
$$;

revoke all privileges on function public.get_admin_vendor_rating_signal_summary(uuid) from public;
revoke all privileges on function public.get_admin_vendor_rating_signal_summary(uuid)
from anon, authenticated, service_role;
grant execute on function public.get_admin_vendor_rating_signal_summary(uuid) to service_role;
