alter table public.audit_logs
add column if not exists user_role text;

update public.audit_logs logs
set user_role = admins.role
from public.admin_users admins
where logs.admin_user_id = admins.id
  and logs.user_role is null;

update public.audit_logs
set user_role = 'admin'
where user_role is null;

alter table public.audit_logs
alter column user_role set default 'admin';

alter table public.audit_logs
alter column user_role set not null;

alter table public.audit_logs
drop constraint if exists audit_logs_user_role_check;

alter table public.audit_logs
add constraint audit_logs_user_role_check
check (user_role in ('admin', 'agent'));

create index if not exists audit_logs_created_at_idx
on public.audit_logs (created_at desc);

create index if not exists audit_logs_user_role_action_idx
on public.audit_logs (user_role, action, created_at desc);
