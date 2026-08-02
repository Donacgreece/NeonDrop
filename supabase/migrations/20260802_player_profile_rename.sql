begin;

alter table public.leaderboard_scores
  add column if not exists last_name_change_at timestamptz;

create or replace function public.rename_neon_player(p_player_name text)
returns table (player_name text, next_change_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_name text := upper(trim(coalesce(p_player_name, '')));
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if requested_name !~ '^[A-Z][A-Z0-9_]{2,11}$'
     or requested_name in ('PLAYER', 'ADMIN', 'NEONDROP', 'GOOGLE', 'APPLE') then
    raise exception 'Choose a valid player name.';
  end if;

  update public.leaderboard_scores scores
  set player_name = requested_name,
      last_name_change_at = now()
  where scores.user_id = auth.uid()
    and (scores.last_name_change_at is null or scores.last_name_change_at <= now() - interval '7 days')
  returning scores.player_name, scores.last_name_change_at + interval '7 days'
  into player_name, next_change_at;

  if not found then
    if exists (select 1 from public.leaderboard_scores scores where scores.user_id = auth.uid()) then
      raise exception 'Player name can only be changed once every 7 days.';
    end if;
    raise exception 'Publish a score before changing your player name.';
  end if;

  return next;
end;
$$;

revoke all on function public.rename_neon_player(text) from public, anon;
grant execute on function public.rename_neon_player(text) to authenticated;

commit;
