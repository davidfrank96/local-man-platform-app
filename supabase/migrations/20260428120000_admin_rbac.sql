alter table public.admin_users
drop constraint if exists admin_users_role_check;

alter table public.admin_users
add constraint admin_users_role_check
check (role in ('admin', 'agent'));

update public.admin_users
set role = 'admin'
where role is null or role not in ('admin', 'agent');

create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.admin_users
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin_workspace_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_admin_role() in ('admin', 'agent');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_admin_role() = 'admin';
$$;

drop policy if exists "Public can read active vendors" on public.vendors;
create policy "Public can read active vendors"
on public.vendors
for select
using (is_active = true or public.is_admin_workspace_user());

drop policy if exists "Admins can manage vendors" on public.vendors;
create policy "Workspace users can insert vendors"
on public.vendors
for insert
with check (
  public.is_admin_workspace_user()
  and (public.is_admin() or is_active = true)
);

create policy "Workspace users can update vendors"
on public.vendors
for update
using (public.is_admin_workspace_user())
with check (
  public.is_admin_workspace_user()
  and (public.is_admin() or is_active = true)
);

create policy "Admins can delete vendors"
on public.vendors
for delete
using (public.is_admin());

drop policy if exists "Public can read active vendor hours" on public.vendor_hours;
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
  or public.is_admin_workspace_user()
);

drop policy if exists "Admins can manage vendor hours" on public.vendor_hours;
create policy "Workspace users can manage vendor hours"
on public.vendor_hours
for all
using (public.is_admin_workspace_user())
with check (public.is_admin_workspace_user());

drop policy if exists "Admins can manage categories" on public.vendor_categories;
create policy "Admins can manage categories"
on public.vendor_categories
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read active vendor category mappings" on public.vendor_category_map;
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

drop policy if exists "Admins can manage vendor category mappings" on public.vendor_category_map;
create policy "Admins can manage vendor category mappings"
on public.vendor_category_map
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read active vendor featured dishes" on public.vendor_featured_dishes;
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
  or public.is_admin_workspace_user()
);

drop policy if exists "Admins can manage vendor featured dishes" on public.vendor_featured_dishes;
create policy "Workspace users can manage vendor featured dishes"
on public.vendor_featured_dishes
for all
using (public.is_admin_workspace_user())
with check (public.is_admin_workspace_user());

drop policy if exists "Public can read active vendor images" on public.vendor_images;
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
  or public.is_admin_workspace_user()
);

drop policy if exists "Admins can manage vendor images" on public.vendor_images;
create policy "Workspace users can manage vendor images"
on public.vendor_images
for all
using (public.is_admin_workspace_user())
with check (public.is_admin_workspace_user());

drop policy if exists "Public can read ratings for active vendors" on public.ratings;
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

drop policy if exists "Admins can manage ratings" on public.ratings;
create policy "Admins can manage ratings"
on public.ratings
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
on public.admin_users
for select
using (public.is_admin());

create policy "Admins can insert admin users"
on public.admin_users
for insert
with check (public.is_admin());

create policy "Admins can update admin users"
on public.admin_users
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs"
on public.audit_logs
for select
using (public.is_admin());

drop policy if exists "Admins can create audit logs" on public.audit_logs;
create policy "Workspace users can create audit logs"
on public.audit_logs
for insert
with check (public.is_admin_workspace_user());

drop policy if exists "Admins can manage vendor images" on storage.objects;
drop policy if exists "Workspace users can manage vendor images" on storage.objects;
create policy "Workspace users can manage vendor images"
on storage.objects
for all
using (
  bucket_id = 'vendor-images'
  and public.is_admin_workspace_user()
)
with check (
  bucket_id = 'vendor-images'
  and public.is_admin_workspace_user()
);
