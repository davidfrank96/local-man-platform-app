-- Localman migrations run as postgres through scripts/run-migrations.mjs.
-- Revoke all default public-schema privileges from Data API roles so future
-- app-managed objects fail closed until their migration grants access
-- explicitly.

alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on functions from public, anon, authenticated, service_role;

do $$
begin
  begin
    alter default privileges for role supabase_admin in schema public
      revoke all privileges on tables from anon, authenticated, service_role;
    alter default privileges for role supabase_admin in schema public
      revoke all privileges on sequences from anon, authenticated, service_role;
    alter default privileges for role supabase_admin in schema public
      revoke all privileges on functions from public, anon, authenticated, service_role;
  exception
    when insufficient_privilege then
      raise notice 'Skipping supabase_admin default privilege revocation because the migration role cannot alter that owner.';
    when undefined_object then
      raise notice 'Skipping supabase_admin default privilege revocation because the role is unavailable.';
  end;
end;
$$;
