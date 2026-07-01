create table if not exists public.admin_login_security_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null,
  outcome text not null,
  attempted_email text,
  attempted_email_hash text,
  ip_address text,
  ip_address_hash text,
  user_agent text,
  scope_type text not null,
  scope_key text not null,
  reason text,
  request_id text,
  delay_ms integer not null default 0 check (delay_ms >= 0),
  cooldown_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint admin_login_security_events_action_check check (
    action in (
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGIN_RATE_LIMITED',
      'LOGIN_DELAY_APPLIED',
      'LOGIN_COOLDOWN_STARTED',
      'LOGIN_COOLDOWN_ENDED',
      'SUSPICIOUS_LOGIN_ACTIVITY'
    )
  ),
  constraint admin_login_security_events_outcome_check check (
    outcome in ('allowed', 'failed', 'delayed', 'rate_limited', 'cooldown_started', 'cooldown_ended')
  ),
  constraint admin_login_security_events_scope_type_check check (
    scope_type in ('ip', 'account', 'ip_account', 'global')
  )
);

alter table public.admin_login_security_events enable row level security;

revoke all privileges on table public.admin_login_security_events from public;
revoke all privileges on table public.admin_login_security_events from anon, authenticated, service_role;
grant select, insert on table public.admin_login_security_events to service_role;

create index if not exists admin_login_security_events_created_at_idx
on public.admin_login_security_events (created_at desc);

create index if not exists admin_login_security_events_scope_idx
on public.admin_login_security_events (scope_type, scope_key, created_at desc);

create index if not exists admin_login_security_events_cooldown_idx
on public.admin_login_security_events (scope_type, scope_key, cooldown_until desc)
where cooldown_until is not null;

create index if not exists admin_login_security_events_email_idx
on public.admin_login_security_events (attempted_email_hash, created_at desc)
where attempted_email_hash is not null;

create index if not exists admin_login_security_events_ip_idx
on public.admin_login_security_events (ip_address_hash, created_at desc)
where ip_address_hash is not null;
