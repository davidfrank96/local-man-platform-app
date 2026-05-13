-- Keep Localman's own public-schema migration ledger behind RLS as defense in
-- depth. Only service_role has table privileges for this ledger.

alter table public.app_schema_migrations enable row level security;
