-- Extend public rating persistence to store optional predefined signal
-- selections atomically. Raw signal selections remain internal and are never
-- returned by this RPC.

drop function if exists public.submit_public_vendor_rating(uuid, integer, text, text);

create or replace function public.submit_public_vendor_rating(
  target_vendor_id uuid,
  target_score integer,
  target_source_type text default 'public_simple_rating',
  target_anonymous_client_hash text default null,
  target_signal_tags text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_average numeric(3, 2);
  current_count integer;
  inserted_count integer;
  inserted_rating_id uuid;
  normalized_client_hash text;
  normalized_signal_tags text[];
  signal_count integer;
  distinct_signal_count integer;
  valid_signal_count integer;
begin
  if target_score is null or target_score < 1 or target_score > 5 then
    raise exception 'Invalid rating input.'
      using errcode = '22023';
  end if;

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
    raise exception 'Invalid rating input.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(coalesce(target_signal_tags, '{}'::text[])) as signal(tag)
    where tag is null
      or btrim(tag) = ''
  ) then
    raise exception 'Invalid rating input.'
      using errcode = '22023';
  end if;

  select coalesce(array_agg(btrim(tag)), '{}'::text[])
  into normalized_signal_tags
  from unnest(coalesce(target_signal_tags, '{}'::text[])) as signal(tag);

  signal_count := cardinality(normalized_signal_tags);

  if signal_count > 2 then
    raise exception 'Invalid rating input.'
      using errcode = '22023';
  end if;

  select count(distinct tag)::integer
  into distinct_signal_count
  from unnest(normalized_signal_tags) as signal(tag);

  if distinct_signal_count <> signal_count then
    raise exception 'Invalid rating input.'
      using errcode = '22023';
  end if;

  if signal_count > 0 then
    select count(*)::integer
    into valid_signal_count
    from public.rating_signal_options
    where slug = any(normalized_signal_tags)
      and is_active is true
      and target_score between score_min and score_max;

    if valid_signal_count <> signal_count then
      raise exception 'Invalid rating input.'
        using errcode = '22023';
    end if;
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
  do nothing
  returning id into inserted_rating_id;

  get diagnostics inserted_count = row_count;

  if inserted_count > 0 then
    if signal_count > 0 then
      insert into public.rating_signal_selections (
        rating_id,
        signal_option_id
      )
      select inserted_rating_id, options.id
      from public.rating_signal_options as options
      where options.slug = any(normalized_signal_tags)
        and options.is_active is true
        and target_score between options.score_min and options.score_max;
    end if;

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

revoke all privileges on function public.submit_public_vendor_rating(
  uuid,
  integer,
  text,
  text,
  text[]
) from public;

revoke all privileges on function public.submit_public_vendor_rating(
  uuid,
  integer,
  text,
  text,
  text[]
) from anon, authenticated, service_role;

grant execute on function public.submit_public_vendor_rating(
  uuid,
  integer,
  text,
  text,
  text[]
) to service_role;
