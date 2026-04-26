begin;

with deleted as (
  delete from public.vendor_images
  where image_url like '/seed-images/%'
  returning id
)
select count(*) as removed_seed_vendor_images
from deleted;

commit;
