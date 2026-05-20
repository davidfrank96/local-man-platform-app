-- Public confidence badges are shaped aggregation output only. Raw signal
-- selections remain private and are never exposed through public table grants.

create or replace function public.get_public_vendor_rating_badges(
  target_vendor_id uuid
)
returns table (
  slug text,
  label text
)
language sql
stable
security definer
set search_path = ''
as $$
  with vendor_rating_volume as (
    select count(ratings.id)::integer as total_rating_count
    from public.ratings
    join public.vendors
      on vendors.id = ratings.vendor_id
     and vendors.is_active is true
    where ratings.vendor_id = target_vendor_id
  ),
  eligible_positive_ratings as (
    select ratings.id
    from public.ratings
    join public.vendors
      on vendors.id = ratings.vendor_id
     and vendors.is_active is true
    where ratings.vendor_id = target_vendor_id
      and ratings.score between 4 and 5
  ),
  eligible_positive_volume as (
    select count(*)::integer as eligible_rating_count
    from eligible_positive_ratings
  ),
  badge_candidates as (
    select
      options.slug,
      options.label,
      options.sort_order,
      count(distinct ratings.id)::integer as signal_rating_count,
      eligible_positive_volume.eligible_rating_count,
      vendor_rating_volume.total_rating_count
    from public.rating_signal_options as options
    join public.rating_signal_selections as selections
      on selections.signal_option_id = options.id
    join public.ratings
      on ratings.id = selections.rating_id
     and ratings.vendor_id = target_vendor_id
     and ratings.score between options.score_min and options.score_max
    cross join eligible_positive_volume
    cross join vendor_rating_volume
    where options.is_active is true
      and options.is_public_positive is true
      and options.signal_type = 'positive'
      and options.score_min >= 4
      and options.score_max <= 5
    group by
      options.slug,
      options.label,
      options.sort_order,
      eligible_positive_volume.eligible_rating_count,
      vendor_rating_volume.total_rating_count
  )
  select
    badge_candidates.slug,
    badge_candidates.label
  from badge_candidates
  where badge_candidates.total_rating_count >= 5
    and badge_candidates.eligible_rating_count >= 3
    and badge_candidates.signal_rating_count >= 3
    and badge_candidates.signal_rating_count * 2 >= badge_candidates.eligible_rating_count
  order by
    badge_candidates.signal_rating_count desc,
    badge_candidates.sort_order asc,
    badge_candidates.slug asc
  limit 3;
$$;

revoke all privileges on function public.get_public_vendor_rating_badges(uuid) from public;
revoke all privileges on function public.get_public_vendor_rating_badges(uuid)
from anon, authenticated, service_role;
grant execute on function public.get_public_vendor_rating_badges(uuid) to service_role;
