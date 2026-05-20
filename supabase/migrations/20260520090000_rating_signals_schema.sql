-- Rating signals are isolated from public.ratings because ratings rows are
-- intentionally public-selectable for vendor detail summaries. Raw signal
-- selections must stay behind server/admin access and never be exposed through
-- public table grants.

create table if not exists public.rating_signal_options (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  signal_type text not null,
  score_min integer not null,
  score_max integer not null,
  is_public_positive boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint rating_signal_options_slug_format_check check (
    slug ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
  ),
  constraint rating_signal_options_known_slug_check check (
    slug in (
      'good_food',
      'clean_vendor',
      'fair_price',
      'fast_service',
      'friendly_vendor',
      'easy_to_find',
      'average_food',
      'slow_service',
      'price_could_be_better',
      'location_hard_to_find',
      'poor_hygiene',
      'food_safety_concern',
      'rude_service',
      'price_issue',
      'vendor_unavailable',
      'wrong_location',
      'long_wait'
    )
  ),
  constraint rating_signal_options_label_not_blank_check check (
    length(btrim(label)) > 0
  ),
  constraint rating_signal_options_signal_type_check check (
    signal_type in ('positive', 'neutral', 'negative')
  ),
  constraint rating_signal_options_score_bounds_check check (
    score_min between 1 and 5
    and score_max between 1 and 5
    and score_min <= score_max
  ),
  constraint rating_signal_options_type_score_range_check check (
    (
      signal_type = 'positive'
      and score_min = 4
      and score_max = 5
      and is_public_positive is true
    )
    or (
      signal_type = 'neutral'
      and score_min = 3
      and score_max = 3
      and is_public_positive is false
    )
    or (
      signal_type = 'negative'
      and score_min = 1
      and score_max = 2
      and is_public_positive is false
    )
  ),
  constraint rating_signal_options_sort_order_check check (sort_order >= 0)
);

create table if not exists public.rating_signal_selections (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid not null references public.ratings(id) on delete cascade,
  signal_option_id uuid not null references public.rating_signal_options(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint rating_signal_selections_rating_option_unique unique (
    rating_id,
    signal_option_id
  )
);

insert into public.rating_signal_options (
  slug,
  label,
  signal_type,
  score_min,
  score_max,
  is_public_positive,
  sort_order
)
values
  ('good_food', 'Good food', 'positive', 4, 5, true, 10),
  ('clean_vendor', 'Clean vendor', 'positive', 4, 5, true, 20),
  ('fair_price', 'Fair price', 'positive', 4, 5, true, 30),
  ('fast_service', 'Fast service', 'positive', 4, 5, true, 40),
  ('friendly_vendor', 'Friendly vendor', 'positive', 4, 5, true, 50),
  ('easy_to_find', 'Easy to find', 'positive', 4, 5, true, 60),
  ('average_food', 'Average food', 'neutral', 3, 3, false, 110),
  ('slow_service', 'Slow service', 'neutral', 3, 3, false, 120),
  ('price_could_be_better', 'Price could be better', 'neutral', 3, 3, false, 130),
  ('location_hard_to_find', 'Hard to find', 'neutral', 3, 3, false, 140),
  ('poor_hygiene', 'Poor hygiene', 'negative', 1, 2, false, 210),
  ('food_safety_concern', 'Food safety concern', 'negative', 1, 2, false, 220),
  ('rude_service', 'Rude service', 'negative', 1, 2, false, 230),
  ('price_issue', 'Price issue', 'negative', 1, 2, false, 240),
  ('vendor_unavailable', 'Vendor unavailable', 'negative', 1, 2, false, 250),
  ('wrong_location', 'Wrong location', 'negative', 1, 2, false, 260),
  ('long_wait', 'Long wait', 'negative', 1, 2, false, 270)
on conflict (slug) do update set
  label = excluded.label,
  signal_type = excluded.signal_type,
  score_min = excluded.score_min,
  score_max = excluded.score_max,
  is_public_positive = excluded.is_public_positive,
  is_active = true,
  sort_order = excluded.sort_order;

create index if not exists rating_signal_options_active_sort_idx
on public.rating_signal_options (is_active, signal_type, sort_order);

create index if not exists rating_signal_selections_rating_idx
on public.rating_signal_selections (rating_id);

create index if not exists rating_signal_selections_option_idx
on public.rating_signal_selections (signal_option_id);

create or replace function public.enforce_rating_signal_selection_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  selected_score integer;
  option_score_min integer;
  option_score_max integer;
  existing_selection_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.rating_id::text, 0));

  select ratings.score, options.score_min, options.score_max
  into selected_score, option_score_min, option_score_max
  from public.ratings
  join public.rating_signal_options as options
    on options.id = new.signal_option_id
  where ratings.id = new.rating_id
    and options.is_active is true;

  if selected_score is null then
    raise exception 'Rating signal selection must reference an existing rating and active signal option.'
      using errcode = '23503';
  end if;

  if selected_score < option_score_min or selected_score > option_score_max then
    raise exception 'Rating signal option is not allowed for the selected score.'
      using errcode = '23514';
  end if;

  select count(*)
  into existing_selection_count
  from public.rating_signal_selections
  where rating_id = new.rating_id
    and (new.id is null or id <> new.id);

  if existing_selection_count >= 2 then
    raise exception 'A rating can have at most two signal selections.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_rating_signal_selection_rules on public.rating_signal_selections;
create trigger enforce_rating_signal_selection_rules
before insert or update of rating_id, signal_option_id on public.rating_signal_selections
for each row execute function public.enforce_rating_signal_selection_rules();

alter table public.rating_signal_options enable row level security;
alter table public.rating_signal_selections enable row level security;

drop policy if exists "Admins can manage rating signal options" on public.rating_signal_options;
create policy "Admins can manage rating signal options"
on public.rating_signal_options
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read rating signal selections" on public.rating_signal_selections;
create policy "Admins can read rating signal selections"
on public.rating_signal_selections
for select
using (public.is_admin());

revoke all privileges on table
  public.rating_signal_options,
  public.rating_signal_selections
from public;

revoke all privileges on table
  public.rating_signal_options,
  public.rating_signal_selections
from anon, authenticated, service_role;

-- No anon/authenticated table grants are added in this phase. Public UI will
-- consume shaped server responses later; raw selections remain fail-closed.
grant select, insert, update, delete on table
  public.rating_signal_options,
  public.rating_signal_selections
to service_role;

revoke all privileges on function public.enforce_rating_signal_selection_rules() from public;
revoke all privileges on function public.enforce_rating_signal_selection_rules()
from anon, authenticated, service_role;
grant execute on function public.enforce_rating_signal_selection_rules() to service_role;
