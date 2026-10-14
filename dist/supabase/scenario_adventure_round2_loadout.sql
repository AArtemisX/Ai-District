-- AI District Scenario Adventure ROUND 2
-- REVIEWED MIGRATION DRAFT — NOT APPLIED TO PRODUCTION BY CODEX.
-- Keeps the legacy three-card player_card_loadouts table and RPC unchanged.

begin;

create table if not exists public.scenario_adventure_loadouts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  slot smallint not null check (slot between 1 and 5),
  action_card_id text not null references public.action_cards(id),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

create index if not exists scenario_adventure_loadouts_action_card_id_idx
  on public.scenario_adventure_loadouts(action_card_id);

alter table public.scenario_adventure_loadouts enable row level security;

drop policy if exists "Players view own scenario adventure loadout"
  on public.scenario_adventure_loadouts;
create policy "Players view own scenario adventure loadout"
  on public.scenario_adventure_loadouts
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.scenario_adventure_loadouts from anon;
revoke insert, update, delete on public.scenario_adventure_loadouts from authenticated;
grant select on public.scenario_adventure_loadouts to authenticated;

create or replace function private.save_scenario_adventure_loadout_internal_round2(p_card_ids text[])
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_allowed integer;
  v_result text[];
begin
  if v_user is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if coalesce(array_length(p_card_ids, 1), 0) <> 5 then
    raise exception 'SCENARIO_LOADOUT_REQUIRES_5_CARDS';
  end if;
  if exists (
    select 1 from unnest(p_card_ids) selected(card_id)
    group by selected.card_id having count(*) > 2
  ) then
    raise exception 'SCENARIO_LOADOUT_MAX_2_COPIES';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 502));
  select count(*) into v_allowed
  from unnest(p_card_ids) selected(card_id)
  join public.action_cards c on c.id = selected.card_id and c.is_active
  where c.is_starter or exists (
    select 1 from public.user_card_unlocks u
    where u.user_id = v_user and u.action_card_id = c.id
  );
  if v_allowed <> 5 then raise exception 'CARD_NOT_UNLOCKED'; end if;

  delete from public.scenario_adventure_loadouts where user_id = v_user;
  insert into public.scenario_adventure_loadouts(user_id, slot, action_card_id)
  select v_user, ordinality::smallint, card_id
  from unnest(p_card_ids) with ordinality selected(card_id, ordinality);

  select array_agg(action_card_id order by slot) into v_result
  from public.scenario_adventure_loadouts where user_id = v_user;
  return v_result;
end;
$$;

revoke all on function private.save_scenario_adventure_loadout_internal_round2(text[]) from public, anon;
grant execute on function private.save_scenario_adventure_loadout_internal_round2(text[]) to authenticated;

create or replace function public.save_scenario_adventure_loadout(p_card_ids text[])
returns text[]
language sql
security invoker
set search_path = ''
as $$ select private.save_scenario_adventure_loadout_internal_round2(p_card_ids); $$;

revoke all on function public.save_scenario_adventure_loadout(text[]) from public, anon;
grant execute on function public.save_scenario_adventure_loadout(text[]) to authenticated;

commit;

