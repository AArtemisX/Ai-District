-- AI District Phase 4B.2A
-- SAFE MIGRATION DRAFT — REVIEW ONLY; NOT APPLIED BY CODEX.
-- Adds canonical catalog identities and a Scenario Adventure-only starter policy.
-- Legacy is_starter values, player_card_loadouts, rewards, effects and ownership are untouched.

begin;

-- PRE-FLIGHT: fail before writes when required Stage 5 objects are missing.
do $$
begin
  if to_regclass('public.action_cards') is null then
    raise exception 'PRECHECK_FAILED: public.action_cards is required';
  end if;
  if to_regclass('public.user_card_unlocks') is null then
    raise exception 'PRECHECK_FAILED: public.user_card_unlocks is required';
  end if;
  if to_regclass('public.profiles') is null then
    raise exception 'PRECHECK_FAILED: public.profiles is required';
  end if;
  if exists (
    with expected(id, name) as (values
      ('privacy-shield','Privacy Shield'),
      ('firewall-guard','Firewall Guard'),
      ('threat-shutdown','Threat Shutdown'),
      ('system-countermeasure','System Countermeasure'),
      ('recovery-protocol','Recovery Protocol'),
      ('human-assistance','Human Assistance'),
      ('data-audit','Data Audit'),
      ('explainability-insight','Explainability Insight'),
      ('ethical-override','Ethical Override'),
      ('responsible-ai-protocol','Responsible AI Protocol')
    )
    select 1 from public.action_cards c join expected e on e.id = c.id
    where lower(c.name) <> lower(e.name)
  ) then
    raise exception 'PRECHECK_FAILED: a canonical card ID is already used by another card';
  end if;
end;
$$;

-- Canonical production rows. Effects are intentionally disabled design metadata;
-- Phase 4B.2A does not activate Scenario card effects or rebalance legacy Battle.
insert into public.action_cards(
  id, name, card_type, en_cost, description, effect, target_type,
  icon_key, is_starter, education, is_active
)
values
  ('privacy-shield','Privacy Shield','DEFENSE',0,'ป้องกันหรือลดผลกระทบจากสถานการณ์ด้านข้อมูลส่วนบุคคล','{"kind":"DESIGN_CONTRACT_ONLY","enabled":false}','SCENARIO_CONTEXT','privacy-shield',false,'{"prototypeId":"prototype-privacy-shield","prototypeType":"DEFENSE","rarity":"COMMON","artwork":"assets/Luminous Shield for Private Data-1.png","phase":"4B.2A"}',true),
  ('threat-shutdown','Threat Shutdown','ATTACK',0,'หยุดหรือจำกัดการทำงานของระบบ AI ที่ก่อให้เกิดความเสี่ยง','{"kind":"DESIGN_CONTRACT_ONLY","enabled":false}','SCENARIO_CONTEXT','threat-shutdown',false,'{"prototypeId":"prototype-threat-shutdown","prototypeType":"ATTACK","rarity":"COMMON","artwork":"assets/Emergency Stop Powers Down AI Core-3.png","phase":"4B.2A"}',true),
  ('system-countermeasure','System Countermeasure','ATTACK',0,'ตอบโต้ภัยคุกคามและจำกัดการแพร่กระจายของผลกระทบ','{"kind":"DESIGN_CONTRACT_ONLY","enabled":false}','SCENARIO_CONTEXT','system-countermeasure',false,'{"prototypeId":"prototype-system-countermeasure","prototypeType":"ATTACK","rarity":"RARE","artwork":"assets/Radiant Circuit Intercepts Crimson Shards-4.png","phase":"4B.2A"}',true),
  ('recovery-protocol','Recovery Protocol','SUPPORT',0,'สนับสนุนการฟื้นฟูระบบ AI หลังเกิดข้อผิดพลาด','{"kind":"DESIGN_CONTRACT_ONLY","enabled":false}','SCENARIO_CONTEXT','recovery-protocol',false,'{"prototypeId":"prototype-recovery-protocol","prototypeType":"SUPPORT","rarity":"COMMON","artwork":"assets/Mint light core repair-5.png","phase":"4B.2A"}',true),
  ('human-assistance','Human Assistance','SUPPORT',0,'ขอ Human Oversight เพื่อร่วมตรวจสอบและตัดสินใจ','{"kind":"DESIGN_CONTRACT_ONLY","enabled":false}','SCENARIO_CONTEXT','human-assistance',false,'{"prototypeId":"prototype-human-assistance","prototypeType":"SUPPORT","rarity":"RARE","artwork":"assets/Human-AI teamwork at a holographic workstation-6.png","phase":"4B.2A"}',true),
  ('data-audit','Data Audit','CONTROL',0,'ตรวจสอบคุณภาพ ความเหมาะสม และอคติของข้อมูล','{"kind":"DESIGN_CONTRACT_ONLY","enabled":false}','SCENARIO_CONTEXT','data-audit',false,'{"prototypeId":"prototype-data-audit","prototypeType":"STRATEGY","rarity":"COMMON","artwork":"assets/Spotting the Odd Data Crystal-7.png","phase":"4B.2A"}',true),
  ('explainability-insight','Explainability Insight','CONTROL',0,'วิเคราะห์เหตุผลและความโปร่งใสของการตัดสินใจจาก AI','{"kind":"DESIGN_CONTRACT_ONLY","enabled":false}','SCENARIO_CONTEXT','explainability-insight',false,'{"prototypeId":"prototype-explainability-insight","prototypeType":"STRATEGY","rarity":"RARE","artwork":"assets/Transparent AI Brain with Glowing Pathways-8.png","phase":"4B.2A"}',true),
  ('ethical-override','Ethical Override','CONTROL',0,'ให้มนุษย์ทบทวนการตัดสินใจเมื่อเกิดประเด็นจริยธรรม','{"kind":"DESIGN_CONTRACT_ONLY","enabled":false}','SCENARIO_CONTEXT','ethical-override',false,'{"prototypeId":"prototype-ethical-override","prototypeType":"SPECIAL","rarity":"EPIC","artwork":"assets/Golden Balance Guiding a Purple AI Core-9.png","phase":"4B.2A"}',true),
  ('responsible-ai-protocol','Responsible AI Protocol','CONTROL',0,'กำกับดูแล AI โดยพิจารณาความปลอดภัย ความเป็นธรรม และผลกระทบ','{"kind":"DESIGN_CONTRACT_ONLY","enabled":false}','SCENARIO_CONTEXT','responsible-ai-protocol',false,'{"prototypeId":"prototype-responsible-ai-protocol","prototypeType":"SPECIAL","rarity":"EPIC","artwork":"assets/Golden Codex of Responsible AI-10.png","phase":"4B.2A"}',true)
on conflict (id) do nothing;

-- Mode-specific eligibility. This does not change global action_cards.is_starter.
create table if not exists public.scenario_card_eligibility (
  game_mode_code text not null check (game_mode_code = 'scenario-adventure'),
  action_card_id text not null references public.action_cards(id) on delete restrict,
  is_starter boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (game_mode_code, action_card_id)
);

insert into public.scenario_card_eligibility(game_mode_code, action_card_id, is_starter, is_active)
values
  ('scenario-adventure','privacy-shield',true,true),
  ('scenario-adventure','threat-shutdown',true,true),
  ('scenario-adventure','recovery-protocol',true,true),
  ('scenario-adventure','data-audit',true,true),
  ('scenario-adventure','firewall-guard',true,true)
on conflict (game_mode_code, action_card_id) do update set
  is_starter = excluded.is_starter,
  is_active = excluded.is_active,
  updated_at = now();

create table if not exists public.scenario_adventure_loadouts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  slot smallint not null check (slot between 1 and 5),
  action_card_id text not null references public.action_cards(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

-- Pre-flight for installations that previously used the ROUND 2 draft.
do $$
begin
  if exists (
    select 1 from public.scenario_adventure_loadouts
    group by user_id, action_card_id having count(*) > 1
  ) then
    raise exception 'PRECHECK_FAILED: duplicate Scenario loadout IDs must be reviewed before enabling five-unique policy';
  end if;
end;
$$;

create unique index if not exists scenario_adventure_loadouts_user_card_uidx
  on public.scenario_adventure_loadouts(user_id, action_card_id);
create index if not exists scenario_adventure_loadouts_action_card_id_idx
  on public.scenario_adventure_loadouts(action_card_id);

alter table public.scenario_card_eligibility enable row level security;
alter table public.scenario_adventure_loadouts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scenario_card_eligibility'
      and policyname = 'Players view Scenario card eligibility'
  ) then
    create policy "Players view Scenario card eligibility"
      on public.scenario_card_eligibility for select to authenticated
      using (is_active);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scenario_adventure_loadouts'
      and policyname = 'Players view own scenario adventure loadout'
  ) then
    create policy "Players view own scenario adventure loadout"
      on public.scenario_adventure_loadouts for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end;
$$;

revoke all on public.scenario_card_eligibility, public.scenario_adventure_loadouts from anon;
revoke insert, update, delete on public.scenario_card_eligibility, public.scenario_adventure_loadouts from authenticated;
grant select on public.scenario_card_eligibility, public.scenario_adventure_loadouts to authenticated;

create or replace function private.save_scenario_adventure_loadout_internal_phase4b2a(p_card_ids text[])
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
  if (select count(distinct card_id) from unnest(p_card_ids) selected(card_id)) <> 5 then
    raise exception 'SCENARIO_LOADOUT_REQUIRES_5_UNIQUE_CARDS';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 502));
  select count(*) into v_allowed
  from unnest(p_card_ids) selected(card_id)
  join public.action_cards c on c.id = selected.card_id and c.is_active
  where exists (
    select 1 from public.scenario_card_eligibility e
    where e.game_mode_code = 'scenario-adventure'
      and e.action_card_id = c.id and e.is_active and e.is_starter
  ) or exists (
    select 1 from public.user_card_unlocks u
    where u.user_id = v_user and u.action_card_id = c.id
  );
  if v_allowed <> 5 then raise exception 'CARD_NOT_ELIGIBLE_OR_UNLOCKED'; end if;

  delete from public.scenario_adventure_loadouts where user_id = v_user;
  insert into public.scenario_adventure_loadouts(user_id, slot, action_card_id)
  select v_user, ordinality::smallint, card_id
  from unnest(p_card_ids) with ordinality selected(card_id, ordinality);

  select array_agg(action_card_id order by slot) into v_result
  from public.scenario_adventure_loadouts where user_id = v_user;
  return v_result;
end;
$$;

revoke all on function private.save_scenario_adventure_loadout_internal_phase4b2a(text[]) from public, anon;
grant execute on function private.save_scenario_adventure_loadout_internal_phase4b2a(text[]) to authenticated;

create or replace function public.save_scenario_adventure_loadout(p_card_ids text[])
returns text[]
language sql
security invoker
set search_path = ''
as $$ select private.save_scenario_adventure_loadout_internal_phase4b2a(p_card_ids); $$;

revoke all on function public.save_scenario_adventure_loadout(text[]) from public, anon;
grant execute on function public.save_scenario_adventure_loadout(text[]) to authenticated;

commit;

-- POST-APPLY VERIFICATION (run manually after an approved migration):
-- select id,name,is_starter,effect from public.action_cards
-- where id in ('privacy-shield','firewall-guard','threat-shutdown','system-countermeasure',
-- 'recovery-protocol','human-assistance','data-audit','explainability-insight',
-- 'ethical-override','responsible-ai-protocol') order by id;
-- select * from public.scenario_card_eligibility order by action_card_id;
-- select lesson_id,action_card_id,minimum_score from public.lesson_rewards;
-- select polname,polcmd,polroles from pg_policy
-- where polrelid in ('public.scenario_card_eligibility'::regclass,'public.scenario_adventure_loadouts'::regclass);
