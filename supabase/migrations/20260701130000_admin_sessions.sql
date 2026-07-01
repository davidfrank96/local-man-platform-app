create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  login_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  refreshed_at timestamptz,
  expires_at timestamptz not null,
  auth_user_id uuid not null,
  admin_user_id uuid references public.admin_users(id) on delete set null,
  status text not null default 'active',
  revoked_at timestamptz,
  revoked_reason text,
  revoked_by_admin_id uuid references public.admin_users(id) on delete set null,
  ip_address text,
  ip_address_hash text,
  user_agent text,
  access_token_hash text,
  refresh_token_hash text,
  metadata jsonb not null default '{}'::jsonb,
  constraint admin_sessions_status_check check (
    status in ('active', 'idle_expired', 'absolute_expired', 'revoked', 'logged_out')
  )
);

alter table public.admin_sessions enable row level security;

revoke all privileges on table public.admin_sessions from public;
revoke all privileges on table public.admin_sessions from anon, authenticated, service_role;
grant select, insert, update on table public.admin_sessions to service_role;

create index if not exists admin_sessions_auth_user_status_idx
on public.admin_sessions (auth_user_id, status, last_activity_at desc);

create index if not exists admin_sessions_admin_user_status_idx
on public.admin_sessions (admin_user_id, status, last_activity_at desc)
where admin_user_id is not null;

create index if not exists admin_sessions_expires_at_idx
on public.admin_sessions (expires_at);

create index if not exists admin_sessions_refresh_token_hash_idx
on public.admin_sessions (refresh_token_hash)
where refresh_token_hash is not null;
