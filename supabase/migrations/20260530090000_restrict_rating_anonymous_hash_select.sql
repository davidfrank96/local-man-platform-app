-- Keep public rating reads available while preventing public correlation of
-- anonymous browser identities across vendor ratings.
revoke select on table public.ratings from anon, authenticated;

grant select (
  id,
  vendor_id,
  score,
  comment,
  source_type,
  created_at
) on table public.ratings to anon, authenticated;

-- Server-side routes and RPCs still need full ratings access for duplicate
-- detection, badge aggregation, and admin summaries.
grant select on table public.ratings to service_role;
