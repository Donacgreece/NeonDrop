begin;

drop index if exists public.leaderboard_scores_unique_player_name;

alter table public.leaderboard_scores
  drop constraint if exists leaderboard_scores_valid_player_name;

delete from public.leaderboard_scores
where upper(trim(player_name)) in ('PLAYER', 'ADMIN', 'NEONDROP', 'GOOGLE', 'APPLE')
   or upper(trim(player_name)) !~ '^[A-Z][A-Z0-9_]{2,11}$';

alter table public.leaderboard_scores
  add constraint leaderboard_scores_valid_player_name
  check (
    player_name = upper(trim(player_name))
    and player_name ~ '^[A-Z][A-Z0-9_]{2,11}$'
    and player_name not in ('PLAYER', 'ADMIN', 'NEONDROP', 'GOOGLE', 'APPLE')
  );

drop function if exists public.get_neon_leaderboard(text, integer);

create function public.get_neon_leaderboard(
  p_platform text default 'all',
  p_limit integer default 10
)
returns table (
  rank_number bigint,
  player_name text,
  player_tag text,
  score bigint,
  platform text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    row_number() over (
      order by scores.score desc, scores.updated_at asc, scores.user_id asc
    ) as rank_number,
    scores.player_name,
    upper(substr(replace(scores.user_id::text, '-', ''), 1, 4)) as player_tag,
    scores.score::bigint,
    scores.platform
  from public.leaderboard_scores scores
  where p_platform = 'all' or scores.platform = p_platform
  order by scores.score desc, scores.updated_at asc, scores.user_id asc
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
$$;

revoke all on function public.get_neon_leaderboard(text, integer) from public, anon;
grant execute on function public.get_neon_leaderboard(text, integer) to authenticated;

commit;
