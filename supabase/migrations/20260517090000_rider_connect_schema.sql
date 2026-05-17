-- Rider Connect stores registered independent riders and a minimal public
-- handoff audit trail. Public users must access rider contact details only
-- through shaped server routes; raw phone/WhatsApp fields are not granted to
-- anon via the Supabase Data API.

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(btrim(display_name)) > 0),
  full_name text check (full_name is null or length(btrim(full_name)) > 0),
  phone text not null check (length(btrim(phone)) > 0),
  whatsapp_phone text not null check (length(btrim(whatsapp_phone)) > 0),
  photo_url text check (photo_url is null or length(btrim(photo_url)) > 0),
  vehicle_type text check (vehicle_type is null or length(btrim(vehicle_type)) > 0),
  plate_number text check (plate_number is null or length(btrim(plate_number)) > 0),
  operating_areas text[] not null default '{}'::text[],
  usual_available_hours jsonb check (
    usual_available_hours is null
    or jsonb_typeof(usual_available_hours) = 'object'
  ),
  verification_status text not null default 'pending' check (
    verification_status in ('pending', 'verified', 'rejected')
  ),
  visibility_status text not null default 'hidden' check (
    visibility_status in ('hidden', 'visible', 'suspended')
  ),
  notes text,
  consent_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (array_position(operating_areas, '') is null)
);

create table if not exists public.rider_contact_intents (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  rider_id uuid not null references public.riders(id),
  customer_phone_hash text check (
    customer_phone_hash is null
    or length(btrim(customer_phone_hash)) > 0
  ),
  delivery_area text check (
    delivery_area is null
    or length(btrim(delivery_area)) > 0
  ),
  location_mode text check (
    location_mode is null
    or location_mode in ('current_location', 'manual_address')
  ),
  payment_note_type text check (
    payment_note_type is null
    or payment_note_type in (
      'coordinate_directly',
      'already_paid_vendor',
      'pay_vendor_on_pickup',
      'cash_on_delivery'
    )
  ),
  disclaimer_accepted_at timestamptz not null,
  whatsapp_link_generated_at timestamptz not null default now(),
  request_metadata jsonb check (
    request_metadata is null
    or jsonb_typeof(request_metadata) = 'object'
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.rider_unavailable_reports (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id),
  vendor_id uuid references public.vendors(id) on delete set null,
  reason text not null check (
    reason in ('no_response', 'unavailable', 'wrong_number', 'unsafe', 'other')
  ),
  reporter_phone_hash text check (
    reporter_phone_hash is null
    or length(btrim(reporter_phone_hash)) > 0
  ),
  created_at timestamptz not null default now()
);

drop trigger if exists set_riders_updated_at on public.riders;
create trigger set_riders_updated_at
before update on public.riders
for each row execute function public.set_updated_at();

create index if not exists riders_visibility_status_idx
on public.riders (visibility_status, verification_status);

create index if not exists riders_operating_areas_idx
on public.riders using gin (operating_areas);

create index if not exists rider_contact_intents_vendor_created_idx
on public.rider_contact_intents (vendor_id, created_at desc);

create index if not exists rider_contact_intents_rider_created_idx
on public.rider_contact_intents (rider_id, created_at desc);

create index if not exists rider_unavailable_reports_rider_created_idx
on public.rider_unavailable_reports (rider_id, created_at desc);

alter table public.riders enable row level security;
alter table public.rider_contact_intents enable row level security;
alter table public.rider_unavailable_reports enable row level security;

drop policy if exists "Admins can manage riders" on public.riders;
create policy "Admins can manage riders"
on public.riders
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read rider contact intents" on public.rider_contact_intents;
create policy "Admins can read rider contact intents"
on public.rider_contact_intents
for select
using (public.is_admin());

drop policy if exists "Admins can read rider unavailable reports" on public.rider_unavailable_reports;
create policy "Admins can read rider unavailable reports"
on public.rider_unavailable_reports
for select
using (public.is_admin());

revoke all privileges on table
  public.riders,
  public.rider_contact_intents,
  public.rider_unavailable_reports
from public;

revoke all privileges on table
  public.riders,
  public.rider_contact_intents,
  public.rider_unavailable_reports
from anon, authenticated, service_role;

-- Admin browser clients receive privileges only where admin RLS allows them.
-- Anon receives no table grants because rider contact fields are sensitive.
grant select, insert, update, delete on table public.riders to authenticated;
grant select on table public.rider_contact_intents to authenticated;
grant select on table public.rider_unavailable_reports to authenticated;

-- Server-side routes use service_role to shape public-safe suggestions, write
-- contact intents, and receive unavailable reports.
grant select, insert, update, delete on table
  public.riders,
  public.rider_contact_intents,
  public.rider_unavailable_reports
to service_role;
