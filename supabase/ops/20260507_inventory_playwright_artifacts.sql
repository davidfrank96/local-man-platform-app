\echo '=== Localman Playwright/QA Artifact Inventory ==='
\echo 'This is a read-only inventory. No rows are deleted by this script.'

begin;

create temp table cleanup_vendor_candidates on commit drop as
select
  v.id,
  v.name,
  v.slug,
  v.is_active,
  v.created_at,
  case
    when v.name ilike 'QA Admin Vendor%' then 'name:QA Admin Vendor%'
    when v.name ilike 'QA_TEST_%' then 'name:QA_TEST_%'
    when v.name ilike 'qa_test_%' then 'name:qa_test_%'
    when v.name ilike 'playwright%' then 'name:playwright%'
    when v.name ilike 'e2e%' then 'name:e2e%'
    when v.slug ilike 'qa-admin-%' then 'slug:qa-admin-%'
    when v.slug ilike 'qa-test-%' then 'slug:qa-test-%'
    when v.slug ilike 'playwright%' then 'slug:playwright%'
    when v.slug ilike 'e2e%' then 'slug:e2e%'
    else 'unclassified'
  end as matched_pattern,
  (
    v.name ilike 'QA Admin Vendor%'
    or v.name ilike 'QA_TEST_%'
    or v.name ilike 'qa_test_%'
    or v.name ilike 'playwright%'
    or v.name ilike 'e2e%'
  ) as cleanup_safe
from public.vendors v
where v.name ilike 'QA Admin Vendor%'
   or v.name ilike 'QA_TEST_%'
   or v.name ilike 'qa_test_%'
   or v.name ilike 'playwright%'
   or v.name ilike 'e2e%'
   or v.slug ilike 'qa-admin-%'
   or v.slug ilike 'qa-test-%'
   or v.slug ilike 'playwright%'
   or v.slug ilike 'e2e%';

create temp table cleanup_user_candidates on commit drop as
select
  coalesce(au.id, ad.id) as id,
  au.email as auth_email,
  ad.email as admin_email,
  ad.role,
  ad.full_name,
  au.created_at as auth_created_at,
  ad.created_at as admin_created_at,
  case
    when lower(coalesce(au.email, ad.email, '')) like 'qa_admin_%' then 'email:qa_admin_%'
    when lower(coalesce(au.email, ad.email, '')) like 'qa_agent_%' then 'email:qa_agent_%'
    when lower(coalesce(au.email, ad.email, '')) like 'qa_test_%' then 'email:qa_test_%'
    when lower(coalesce(au.email, ad.email, '')) like 'playwright%' then 'email:playwright%'
    when lower(coalesce(au.email, ad.email, '')) like 'e2e%' then 'email:e2e%'
    when coalesce(au.raw_user_meta_data ->> 'full_name', ad.full_name, '') ilike 'QA Admin%' then 'full_name:QA Admin%'
    when coalesce(au.raw_user_meta_data ->> 'full_name', ad.full_name, '') ilike 'QA Test%' then 'full_name:QA Test%'
    when coalesce(au.raw_user_meta_data ->> 'full_name', ad.full_name, '') ilike 'Playwright%' then 'full_name:Playwright%'
    when coalesce(au.raw_user_meta_data ->> 'full_name', ad.full_name, '') ilike 'E2E%' then 'full_name:E2E%'
    else 'unclassified'
  end as matched_pattern,
  (
    split_part(lower(coalesce(au.email, ad.email, '')), '@', 2) in ('example.com', 'example.test', 'test.com')
    and (
      lower(coalesce(au.email, ad.email, '')) like 'qa_admin_%'
      or lower(coalesce(au.email, ad.email, '')) like 'qa_agent_%'
      or lower(coalesce(au.email, ad.email, '')) like 'qa_test_%'
      or lower(coalesce(au.email, ad.email, '')) like 'playwright%'
      or lower(coalesce(au.email, ad.email, '')) like 'e2e%'
    )
  ) as cleanup_safe
from auth.users au
full outer join public.admin_users ad
  on ad.id = au.id
where lower(coalesce(au.email, ad.email, '')) like 'qa_admin_%'
   or lower(coalesce(au.email, ad.email, '')) like 'qa_agent_%'
   or lower(coalesce(au.email, ad.email, '')) like 'qa_test_%'
   or lower(coalesce(au.email, ad.email, '')) like 'playwright%'
   or lower(coalesce(au.email, ad.email, '')) like 'e2e%'
   or coalesce(au.raw_user_meta_data ->> 'full_name', ad.full_name, '') ilike 'QA Admin%'
   or coalesce(au.raw_user_meta_data ->> 'full_name', ad.full_name, '') ilike 'QA Test%'
   or coalesce(au.raw_user_meta_data ->> 'full_name', ad.full_name, '') ilike 'Playwright%'
   or coalesce(au.raw_user_meta_data ->> 'full_name', ad.full_name, '') ilike 'E2E%';

create temp table cleanup_storage_candidates on commit drop as
select distinct
  'linked_vendor_image'::text as source,
  o.bucket_id,
  o.name,
  c.id as vendor_id,
  c.name as vendor_name
from public.vendor_images vi
join cleanup_vendor_candidates c
  on c.id = vi.vendor_id
join storage.objects o
  on o.bucket_id = 'vendor-images'
 and o.name = vi.storage_object_path
where vi.storage_object_path is not null

union all

select distinct
  'pattern_orphan'::text as source,
  o.bucket_id,
  o.name,
  null::uuid as vendor_id,
  null::text as vendor_name
from storage.objects o
where o.bucket_id = 'vendor-images'
  and (
    o.name ilike 'qa-admin-%'
    or o.name ilike 'qa_test_%'
    or o.name ilike 'playwright%'
    or o.name ilike 'e2e%'
    or o.name ilike 'qa admin vendor%'
  )
  and not exists (
    select 1
    from public.vendor_images vi
    where vi.storage_object_path = o.name
  );

create temp table suspicious_mutated_vendors on commit drop as
select
  v.id,
  v.name,
  v.slug,
  v.short_description,
  v.area,
  v.created_at,
  case
    when v.short_description ilike 'QA updated %' then 'short_description:QA updated %'
    when v.area ilike 'QA Updated %' then 'area:QA Updated %'
    when coalesce(v.short_description, '') ilike '%onerror=alert(1)%' then 'short_description:XSS marker'
    when coalesce(v.area, '') ilike '%onerror=alert(1)%' then 'area:XSS marker'
    else 'unclassified'
  end as suspicious_pattern
from public.vendors v
where not exists (
    select 1
    from cleanup_vendor_candidates c
    where c.id = v.id
  )
  and (
    v.short_description ilike 'QA updated %'
    or v.area ilike 'QA Updated %'
    or coalesce(v.short_description, '') ilike '%onerror=alert(1)%'
    or coalesce(v.area, '') ilike '%onerror=alert(1)%'
  );

\echo ''
\echo '--- Vendor candidates ---'
table cleanup_vendor_candidates;

\echo ''
\echo '--- Vendor dependency counts ---'
with dependency_counts as (
  select 'vendors'::text as relation_name, count(*)::bigint as record_count
  from cleanup_vendor_candidates
  union all
  select 'vendor_hours', count(*) from public.vendor_hours vh join cleanup_vendor_candidates c on c.id = vh.vendor_id
  union all
  select 'vendor_category_map', count(*) from public.vendor_category_map vcm join cleanup_vendor_candidates c on c.id = vcm.vendor_id
  union all
  select 'vendor_featured_dishes', count(*) from public.vendor_featured_dishes vfd join cleanup_vendor_candidates c on c.id = vfd.vendor_id
  union all
  select 'vendor_images', count(*) from public.vendor_images vi join cleanup_vendor_candidates c on c.id = vi.vendor_id
  union all
  select 'ratings', count(*) from public.ratings r join cleanup_vendor_candidates c on c.id = r.vendor_id
  union all
  select 'user_events', count(*) from public.user_events ue join cleanup_vendor_candidates c on c.id = ue.vendor_id
  union all
  select 'user_events_by_slug', count(*) from public.user_events ue join cleanup_vendor_candidates c on c.slug = ue.vendor_slug
  union all
  select 'audit_logs_by_entity', count(*) from public.audit_logs al join cleanup_vendor_candidates c on al.entity_type = 'vendor' and al.entity_id = c.id
)
select * from dependency_counts order by relation_name;

\echo ''
\echo '--- User candidates ---'
table cleanup_user_candidates;

\echo ''
\echo '--- User dependency counts ---'
with user_dependency_counts as (
  select 'auth_users'::text as relation_name, count(*)::bigint as record_count
  from cleanup_user_candidates
  where auth_email is not null
  union all
  select 'admin_users', count(*) from cleanup_user_candidates where admin_email is not null
  union all
  select 'audit_logs_by_admin_user', count(*)
  from public.audit_logs al
  join cleanup_user_candidates c
    on c.id = al.admin_user_id
)
select * from user_dependency_counts order by relation_name;

\echo ''
\echo '--- Storage object candidates ---'
table cleanup_storage_candidates;

\echo ''
\echo '--- Summary ---'
select
  (select count(*) from cleanup_vendor_candidates) as vendor_candidates,
  (select count(*) from cleanup_vendor_candidates where cleanup_safe) as vendor_candidates_cleanup_safe,
  (select count(*) from cleanup_user_candidates) as user_candidates,
  (select count(*) from cleanup_user_candidates where cleanup_safe) as user_candidates_cleanup_safe,
  (select count(*) from cleanup_storage_candidates) as storage_object_candidates,
  (select count(*) from suspicious_mutated_vendors) as suspicious_mutated_vendors;

\echo ''
\echo '--- Remaining suspicious mutated vendors (not auto-cleaned) ---'
table suspicious_mutated_vendors;

\echo ''
\echo 'No separate reviews table exists on this schema. Ratings are the only review-like artifact table.'

rollback;
