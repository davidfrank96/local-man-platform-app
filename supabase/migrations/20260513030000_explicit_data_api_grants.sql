-- Supabase Data API access must be explicit. These grants document the
-- intended public/admin/server access model without weakening RLS policies.

grant usage on schema public to anon, authenticated, service_role;

alter table public.app_schema_migrations enable row level security;

revoke all privileges on table
  public.vendors,
  public.vendor_hours,
  public.vendor_categories,
  public.vendor_category_map,
  public.vendor_featured_dishes,
  public.vendor_images,
  public.ratings,
  public.admin_users,
  public.audit_logs,
  public.user_events,
  public.operational_events,
  public.app_schema_migrations
from public;

revoke all privileges on table
  public.vendors,
  public.vendor_hours,
  public.vendor_categories,
  public.vendor_category_map,
  public.vendor_featured_dishes,
  public.vendor_images,
  public.ratings,
  public.admin_users,
  public.audit_logs,
  public.user_events,
  public.operational_events,
  public.app_schema_migrations
from anon, authenticated, service_role;

-- Public discovery and vendor-detail reads. RLS continues to restrict rows to
-- active public vendors, while workspace policies expose inactive rows only to
-- authenticated admin/agent users.
grant select on table
  public.vendors,
  public.vendor_hours,
  public.vendor_categories,
  public.vendor_category_map,
  public.vendor_featured_dishes,
  public.vendor_images,
  public.ratings
to anon, authenticated;

-- Authenticated workspace users may mutate vendor content where RLS allows it.
grant insert, update, delete on table public.vendors to authenticated;
grant insert, update, delete on table public.vendor_hours to authenticated;
grant insert, update, delete on table public.vendor_categories to authenticated;
grant insert, update, delete on table public.vendor_category_map to authenticated;
grant insert, update, delete on table public.vendor_featured_dishes to authenticated;
grant insert, update, delete on table public.vendor_images to authenticated;
grant insert, update, delete on table public.ratings to authenticated;

-- Admin workspace tables remain inaccessible to anon. Authenticated privileges
-- are paired with RLS admin/agent policies.
grant select, insert, update on table public.admin_users to authenticated;
grant select, insert on table public.audit_logs to authenticated;
grant select on table public.user_events to authenticated;
grant select on table public.operational_events to authenticated;

-- Server-side routes and maintenance scripts use service_role for privileged
-- writes and operational reads.
grant select, insert, update, delete on table
  public.vendors,
  public.vendor_hours,
  public.vendor_categories,
  public.vendor_category_map,
  public.vendor_featured_dishes,
  public.vendor_images,
  public.ratings,
  public.admin_users,
  public.audit_logs,
  public.user_events,
  public.operational_events,
  public.app_schema_migrations
to service_role;

revoke all privileges on function public.set_updated_at() from public;
revoke all privileges on function public.is_admin() from public;
revoke all privileges on function public.current_admin_role() from public;
revoke all privileges on function public.is_admin_workspace_user() from public;
revoke all privileges on function public.refresh_vendor_rating_summary(uuid) from public;
revoke all privileges on function public.sync_vendor_rating_summary() from public;
revoke all privileges on function public.get_admin_analytics_snapshot(timestamp with time zone, integer) from public;
revoke all privileges on function public.get_vendor_usage_scores(uuid[]) from public;
revoke all privileges on function public.submit_public_vendor_rating(uuid, integer, text, text) from public;

revoke all privileges on function public.set_updated_at() from anon, authenticated, service_role;
revoke all privileges on function public.is_admin() from anon, authenticated, service_role;
revoke all privileges on function public.current_admin_role() from anon, authenticated, service_role;
revoke all privileges on function public.is_admin_workspace_user() from anon, authenticated, service_role;
revoke all privileges on function public.refresh_vendor_rating_summary(uuid) from anon, authenticated, service_role;
revoke all privileges on function public.sync_vendor_rating_summary() from anon, authenticated, service_role;
revoke all privileges on function public.get_admin_analytics_snapshot(timestamp with time zone, integer) from anon, authenticated, service_role;
revoke all privileges on function public.get_vendor_usage_scores(uuid[]) from anon, authenticated, service_role;
revoke all privileges on function public.submit_public_vendor_rating(uuid, integer, text, text) from anon, authenticated, service_role;

-- RLS helper functions must remain executable by API roles because public
-- policies call them during row visibility checks.
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.current_admin_role() to anon, authenticated, service_role;
grant execute on function public.is_admin_workspace_user() to anon, authenticated, service_role;

-- Trigger/RPC functions are intentionally not public API entry points.
grant execute on function public.set_updated_at() to service_role;
grant execute on function public.refresh_vendor_rating_summary(uuid) to service_role;
grant execute on function public.sync_vendor_rating_summary() to service_role;
grant execute on function public.get_admin_analytics_snapshot(timestamp with time zone, integer) to service_role;
grant execute on function public.get_vendor_usage_scores(uuid[]) to service_role;
grant execute on function public.submit_public_vendor_rating(uuid, integer, text, text) to service_role;
