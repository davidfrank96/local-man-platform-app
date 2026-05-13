-- Follow-up for existing projects that already received Supabase's legacy
-- default grants directly on anon/authenticated/service_role. The previous
-- migration documents the full intended grant state; this file makes the
-- revoke step effective for already-applied databases.

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
from anon, authenticated, service_role;

grant select on table
  public.vendors,
  public.vendor_hours,
  public.vendor_categories,
  public.vendor_category_map,
  public.vendor_featured_dishes,
  public.vendor_images,
  public.ratings
to anon, authenticated;

grant insert, update, delete on table public.vendors to authenticated;
grant insert, update, delete on table public.vendor_hours to authenticated;
grant insert, update, delete on table public.vendor_categories to authenticated;
grant insert, update, delete on table public.vendor_category_map to authenticated;
grant insert, update, delete on table public.vendor_featured_dishes to authenticated;
grant insert, update, delete on table public.vendor_images to authenticated;
grant insert, update, delete on table public.ratings to authenticated;

grant select, insert, update on table public.admin_users to authenticated;
grant select, insert on table public.audit_logs to authenticated;
grant select on table public.user_events to authenticated;
grant select on table public.operational_events to authenticated;

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

revoke all privileges on function public.set_updated_at() from anon, authenticated, service_role;
revoke all privileges on function public.is_admin() from anon, authenticated, service_role;
revoke all privileges on function public.current_admin_role() from anon, authenticated, service_role;
revoke all privileges on function public.is_admin_workspace_user() from anon, authenticated, service_role;
revoke all privileges on function public.refresh_vendor_rating_summary(uuid) from anon, authenticated, service_role;
revoke all privileges on function public.sync_vendor_rating_summary() from anon, authenticated, service_role;
revoke all privileges on function public.get_admin_analytics_snapshot(timestamp with time zone, integer) from anon, authenticated, service_role;
revoke all privileges on function public.get_vendor_usage_scores(uuid[]) from anon, authenticated, service_role;
revoke all privileges on function public.submit_public_vendor_rating(uuid, integer, text, text) from anon, authenticated, service_role;

grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.current_admin_role() to anon, authenticated, service_role;
grant execute on function public.is_admin_workspace_user() to anon, authenticated, service_role;

grant execute on function public.set_updated_at() to service_role;
grant execute on function public.refresh_vendor_rating_summary(uuid) to service_role;
grant execute on function public.sync_vendor_rating_summary() to service_role;
grant execute on function public.get_admin_analytics_snapshot(timestamp with time zone, integer) to service_role;
grant execute on function public.get_vendor_usage_scores(uuid[]) to service_role;
grant execute on function public.submit_public_vendor_rating(uuid, integer, text, text) to service_role;
