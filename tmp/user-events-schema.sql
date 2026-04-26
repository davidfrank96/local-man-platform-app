\pset format aligned
\pset pager off

\echo 'USER_EVENTS COLUMNS'
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_events'
order by ordinal_position;

\echo ''
\echo 'SAMPLE USER_EVENTS ROWS'
select *
from public.user_events
order by 1 desc
limit 5;
