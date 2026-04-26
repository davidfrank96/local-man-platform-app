\pset format aligned
\pset pager off

\echo 'RATING / COMMENT EVIDENCE'
select
  count(*) as total_ratings,
  count(*) filter (where comment is not null and btrim(comment) <> '') as ratings_with_comments
from public.ratings;

\echo ''
\echo 'RECENT NON-EMPTY COMMENTS'
select
  id,
  vendor_id,
  score,
  comment,
  source_type,
  created_at
from public.ratings
where comment is not null
  and btrim(comment) <> ''
order by created_at desc
limit 10;
