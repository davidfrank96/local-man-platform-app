alter table public.ratings
add column if not exists anonymous_client_hash text;

create unique index if not exists ratings_vendor_anonymous_client_hash_idx
on public.ratings (vendor_id, anonymous_client_hash)
where anonymous_client_hash is not null;

drop function if exists public.submit_public_vendor_rating(uuid, integer, text);

create or replace function public.submit_public_vendor_rating(
  target_vendor_id uuid,
  target_score integer,
  target_source_type text default 'public_simple_rating',
  target_anonymous_client_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_average numeric(3, 2);
  current_count integer;
  inserted_count integer;
  normalized_client_hash text;
begin
  if not exists (
    select 1
    from public.vendors
    where id = target_vendor_id
      and is_active = true
  ) then
    return null;
  end if;

  normalized_client_hash := nullif(btrim(coalesce(target_anonymous_client_hash, '')), '');

  if normalized_client_hash is not null and normalized_client_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'anonymous client hash must be a sha256 hex digest'
      using errcode = '22023';
  end if;

  insert into public.ratings (
    vendor_id,
    score,
    source_type,
    anonymous_client_hash
  )
  values (
    target_vendor_id,
    target_score,
    nullif(btrim(coalesce(target_source_type, '')), ''),
    normalized_client_hash
  )
  on conflict (vendor_id, anonymous_client_hash)
    where anonymous_client_hash is not null
  do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count > 0 then
    perform public.refresh_vendor_rating_summary(target_vendor_id);
  end if;

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
    coalesce(current_count, 0),
    'duplicate',
    inserted_count = 0
  );
end;
$$;
