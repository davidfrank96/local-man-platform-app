-- Add structured Rider Connect availability windows for current-time
-- suggestion filtering. The existing usual_available_hours JSON label remains
-- display-only for backwards compatibility.

alter table public.riders
  add column if not exists weekday_available_from time,
  add column if not exists weekday_available_until time,
  add column if not exists weekend_available_from time,
  add column if not exists weekend_available_until time;

alter table public.riders
  drop constraint if exists riders_weekday_availability_pair_check,
  add constraint riders_weekday_availability_pair_check
  check (
    (
      weekday_available_from is null
      and weekday_available_until is null
    )
    or (
      weekday_available_from is not null
      and weekday_available_until is not null
    )
  );

alter table public.riders
  drop constraint if exists riders_weekend_availability_pair_check,
  add constraint riders_weekend_availability_pair_check
  check (
    (
      weekend_available_from is null
      and weekend_available_until is null
    )
    or (
      weekend_available_from is not null
      and weekend_available_until is not null
    )
  );
