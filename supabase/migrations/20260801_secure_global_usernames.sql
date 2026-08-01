begin;

delete from public.leaderboard_scores
where upper(trim(player_name)) in ('PLAYER', 'ADMIN', 'NEONDROP', 'GOOGLE', 'APPLE')
   or upper(trim(player_name)) !~ '^[A-Z][A-Z0-9_]{2,11}$';

with duplicates as (
  select
    ctid,
    row_number() over (
      partition by upper(trim(player_name))
      order by score desc, updated_at desc nulls last
    ) as duplicate_number
  from public.leaderboard_scores
)
delete from public.leaderboard_scores scores
using duplicates
where scores.ctid = duplicates.ctid
  and duplicates.duplicate_number > 1;

create unique index if not exists leaderboard_scores_unique_player_name
  on public.leaderboard_scores (upper(trim(player_name)));

alter table public.leaderboard_scores
  drop constraint if exists leaderboard_scores_valid_player_name;

alter table public.leaderboard_scores
  add constraint leaderboard_scores_valid_player_name
  check (
    player_name = upper(trim(player_name))
    and player_name ~ '^[A-Z][A-Z0-9_]{2,11}$'
    and player_name not in ('PLAYER', 'ADMIN', 'NEONDROP', 'GOOGLE', 'APPLE')
  );

commit;
