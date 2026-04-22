create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  short_description text,
  phone_number text,
  address_text text,
  city text,
  area text,
  state text,
  country text,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  price_band text check (price_band in ('budget', 'standard', 'premium')),
  average_rating numeric(3, 2) not null default 0 check (average_rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  is_active boolean not null default true,
  is_open_override boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendor_hours (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, day_of_week),
  check (is_closed or (open_time is not null and close_time is not null))
);

create table public.vendor_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table public.vendor_category_map (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  category_id uuid not null references public.vendor_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (vendor_id, category_id)
);

create table public.vendor_featured_dishes (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  dish_name text not null check (length(btrim(dish_name)) > 0),
  description text,
  image_url text,
  is_featured boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendor_images (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  image_url text not null check (length(btrim(image_url)) > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text,
  source_type text,
  created_at timestamptz not null default now()
);

create table public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.admin_users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger set_vendors_updated_at
before update on public.vendors
for each row execute function public.set_updated_at();

create trigger set_vendor_hours_updated_at
before update on public.vendor_hours
for each row execute function public.set_updated_at();

create trigger set_vendor_featured_dishes_updated_at
before update on public.vendor_featured_dishes
for each row execute function public.set_updated_at();

create index vendors_city_idx on public.vendors (city);
create index vendors_area_idx on public.vendors (area);
create index vendors_is_active_idx on public.vendors (is_active);
create index vendors_location_idx on public.vendors (latitude, longitude) where is_active = true;
create index vendors_search_idx on public.vendors using gin (
  to_tsvector(
    'english',
    coalesce(name, '') || ' ' ||
      coalesce(short_description, '') || ' ' ||
      coalesce(area, '') || ' ' ||
      coalesce(city, '')
  )
);
create index vendor_hours_vendor_id_idx on public.vendor_hours (vendor_id);
create index vendor_category_map_vendor_id_idx on public.vendor_category_map (vendor_id);
create index vendor_category_map_category_id_idx on public.vendor_category_map (category_id);
create index vendor_featured_dishes_vendor_id_idx on public.vendor_featured_dishes (vendor_id);
create index vendor_images_vendor_id_sort_order_idx on public.vendor_images (vendor_id, sort_order);
create index ratings_vendor_id_idx on public.ratings (vendor_id);
create index audit_logs_admin_user_id_idx on public.audit_logs (admin_user_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where id = auth.uid()
  );
$$;

alter table public.vendors enable row level security;
alter table public.vendor_hours enable row level security;
alter table public.vendor_categories enable row level security;
alter table public.vendor_category_map enable row level security;
alter table public.vendor_featured_dishes enable row level security;
alter table public.vendor_images enable row level security;
alter table public.ratings enable row level security;
alter table public.admin_users enable row level security;
alter table public.audit_logs enable row level security;

create policy "Public can read active vendors"
on public.vendors
for select
using (is_active = true or public.is_admin());

create policy "Admins can manage vendors"
on public.vendors
for all
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active vendor hours"
on public.vendor_hours
for select
using (
  exists (
    select 1
    from public.vendors
    where vendors.id = vendor_hours.vendor_id
      and vendors.is_active = true
  )
  or public.is_admin()
);

create policy "Admins can manage vendor hours"
on public.vendor_hours
for all
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read categories"
on public.vendor_categories
for select
using (true);

create policy "Admins can manage categories"
on public.vendor_categories
for all
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active vendor category mappings"
on public.vendor_category_map
for select
using (
  exists (
    select 1
    from public.vendors
    where vendors.id = vendor_category_map.vendor_id
      and vendors.is_active = true
  )
  or public.is_admin()
);

create policy "Admins can manage vendor category mappings"
on public.vendor_category_map
for all
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active vendor featured dishes"
on public.vendor_featured_dishes
for select
using (
  exists (
    select 1
    from public.vendors
    where vendors.id = vendor_featured_dishes.vendor_id
      and vendors.is_active = true
  )
  or public.is_admin()
);

create policy "Admins can manage vendor featured dishes"
on public.vendor_featured_dishes
for all
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active vendor images"
on public.vendor_images
for select
using (
  exists (
    select 1
    from public.vendors
    where vendors.id = vendor_images.vendor_id
      and vendors.is_active = true
  )
  or public.is_admin()
);

create policy "Admins can manage vendor images"
on public.vendor_images
for all
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read ratings for active vendors"
on public.ratings
for select
using (
  exists (
    select 1
    from public.vendors
    where vendors.id = ratings.vendor_id
      and vendors.is_active = true
  )
  or public.is_admin()
);

create policy "Admins can manage ratings"
on public.ratings
for all
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can read admin users"
on public.admin_users
for select
using (public.is_admin());

create policy "Admins can read audit logs"
on public.audit_logs
for select
using (public.is_admin());

create policy "Admins can create audit logs"
on public.audit_logs
for insert
with check (public.is_admin());
