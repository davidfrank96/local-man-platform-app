alter table public.vendor_images
add column if not exists storage_object_path text;

insert into storage.buckets (id, name, public)
values ('vendor-images', 'vendor-images', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists "Public can read vendor images" on storage.objects;
create policy "Public can read vendor images"
on storage.objects
for select
using (
  bucket_id = 'vendor-images'
);

drop policy if exists "Admins can manage vendor images" on storage.objects;
create policy "Admins can manage vendor images"
on storage.objects
for all
using (
  bucket_id = 'vendor-images'
  and public.is_admin()
)
with check (
  bucket_id = 'vendor-images'
  and public.is_admin()
);
