-- Explicitly document that no Data API client role may access the migration
-- ledger through RLS. service_role keeps table privileges and bypasses RLS.

drop policy if exists "No client access to schema migrations" on public.app_schema_migrations;
create policy "No client access to schema migrations"
on public.app_schema_migrations
for all
using (false)
with check (false);
