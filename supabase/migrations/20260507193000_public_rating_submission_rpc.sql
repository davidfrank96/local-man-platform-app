create or replace function public.refresh_vendor_rating_summary(target_vendor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_average numeric(3, 2);
  next_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_vendor_id::text, 0));

  select
    coalesce(round(avg(score)::numeric, 2), 0)::numeric(3, 2),
    count(*)::integer
  into next_average, next_count
  from public.ratings
  where vendor_id = target_vendor_id;

  update public.vendors
  set
    average_rating = next_average,
    review_count = next_count,
    updated_at = now()
  where id = target_vendor_id;
end;
$$;

create or replace function public.submit_public_vendor_rating(
  target_vendor_id uuid,
  target_score integer,
  target_source_type text default 'public_simple_rating'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_average numeric(3, 2);
  current_count integer;
begin
  if not exists (
    select 1
    from public.vendors
    where id = target_vendor_id
      and is_active = true
  ) then
    return null;
  end if;

  insert into public.ratings (vendor_id, score, source_type)
  values (
    target_vendor_id,
    target_score,
    nullif(btrim(coalesce(target_source_type, '')), '')
  );

  perform public.refresh_vendor_rating_summary(target_vendor_id);

  select average_rating, review_count
  into current_average, current_count
  from public.vendors
  where id = target_vendor_id;

  return jsonb_build_object(
    'vendor_id',
    target_vendor_id,
    'average_rating',
    coalesce(current_average, 0),
    'review_count',
    coalesce(current_count, 0)
  );
end;
$$;
