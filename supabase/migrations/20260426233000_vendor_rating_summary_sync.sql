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

create or replace function public.sync_vendor_rating_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_vendor_rating_summary(old.vendor_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.vendor_id <> new.vendor_id then
    perform public.refresh_vendor_rating_summary(old.vendor_id);
  end if;

  perform public.refresh_vendor_rating_summary(new.vendor_id);
  return new;
end;
$$;

drop trigger if exists sync_vendor_rating_summary on public.ratings;

create trigger sync_vendor_rating_summary
after insert or update or delete on public.ratings
for each row execute function public.sync_vendor_rating_summary();
