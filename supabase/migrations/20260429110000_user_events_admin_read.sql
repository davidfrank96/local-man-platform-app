alter table if exists public.user_events enable row level security;

drop policy if exists "Admins can read user events" on public.user_events;
create policy "Admins can read user events"
on public.user_events
for select
using (public.is_admin());
