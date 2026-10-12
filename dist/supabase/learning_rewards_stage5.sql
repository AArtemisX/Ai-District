begin;

-- Stage 5 keeps permanent unlocks separate from consumable battle-card instances.
create table if not exists public.action_cards (
  id text primary key,
  name text not null,
  card_type text not null check (card_type in ('ATTACK','DEFENSE','CONTROL','SUPPORT')),
  en_cost smallint not null check (en_cost between 0 and 9),
  description text not null,
  effect jsonb not null default '{}'::jsonb,
  target_type text not null,
  icon_key text not null,
  is_starter boolean not null default false,
  education jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_rewards (
  id uuid primary key default gen_random_uuid(),
  lesson_id bigint not null references public.learning_lessons(id) on delete cascade,
  reward_type text not null check (reward_type = 'ACTION_CARD_UNLOCK'),
  action_card_id text not null references public.action_cards(id),
  trigger_type text not null check (trigger_type = 'FINAL_QUIZ_PASSED'),
  minimum_score smallint not null check (minimum_score >= 0),
  claim_policy text not null check (claim_policy = 'FIRST_PASS_ONLY'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (lesson_id, action_card_id)
);

create table if not exists public.user_card_unlocks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_card_id text not null references public.action_cards(id),
  source_lesson_id bigint not null references public.learning_lessons(id) on delete restrict,
  source_attempt_id uuid not null references public.quiz_attempts(id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, action_card_id)
);

create table if not exists public.player_card_loadouts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  action_card_id text not null references public.action_cards(id),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot),
  unique (user_id, action_card_id)
);

create index if not exists lesson_rewards_lesson_id_idx on public.lesson_rewards(lesson_id);
create index if not exists lesson_rewards_action_card_id_idx on public.lesson_rewards(action_card_id);
create index if not exists user_card_unlocks_action_card_id_idx on public.user_card_unlocks(action_card_id);
create index if not exists user_card_unlocks_source_lesson_id_idx on public.user_card_unlocks(source_lesson_id);
create index if not exists user_card_unlocks_source_attempt_id_idx on public.user_card_unlocks(source_attempt_id);
create index if not exists player_card_loadouts_action_card_id_idx on public.player_card_loadouts(action_card_id);

insert into public.action_cards(id,name,card_type,en_cost,description,effect,target_type,icon_key,is_starter,education)
values
  ('data-strike','Data Strike','ATTACK',1,'ลด Influence ของคู่แข่งใน District เป้าหมาย 2 IP','{"kind":"DAMAGE_IP","amount":2}','OPPONENT_DISTRICT','data-strike',false,'{"concept":"การรบกวนความพร้อมใช้ของข้อมูล","disclaimer":"เป็นกลไกเกม ไม่ใช่แบบจำลองการโจมตีระบบจริง"}'),
  ('system-crash','System Crash','ATTACK',3,'โจมตีระบบหลักและลด Influence ของคู่แข่ง 4 IP','{"kind":"DAMAGE_IP","amount":4}','OPPONENT_DISTRICT','system-crash',false,'{"concept":"ความเสี่ยงจากความล้มเหลวของระบบ","disclaimer":"เป็นกลไกเกม ไม่ใช่วิธีโจมตีระบบจริง"}'),
  ('firewall-guard','Firewall Guard','DEFENSE',1,'ป้องกันการลด IP จากการ์ดโจมตีครั้งถัดไปใน District','{"kind":"FIREWALL_SHIELD","uses":1}','ANY_DISTRICT','firewall',true,'{"concept":"มาตรการป้องกันระบบ","gameUse":"ป้องกันการโจมตี IP ครั้งถัดไป","limitation":"ไม่ใช่การแก้ไข AI Bias โดยตรง","disclaimer":"พลังการ์ดได้รับแรงบันดาลใจจากเทคโนโลยีและไม่จำลองระบบจริงทั้งหมด"}'),
  ('secure-backup','Secure Backup','DEFENSE',2,'เพิ่ม Influence ของตนเองใน District ที่ครอบครอง 2 IP','{"kind":"ADD_IP","amount":2}','OWNED_DISTRICT','backup',false,'{"concept":"ความต่อเนื่องและการกู้คืนข้อมูล","disclaimer":"เป็นกลไกเกม ไม่ใช่ขั้นตอนสำรองข้อมูลฉบับสมบูรณ์"}'),
  ('lag-pulse','Lag Pulse','CONTROL',2,'บล็อกการเพิ่ม IP ครั้งถัดไปของคู่แข่งในเขตเป้าหมาย','{"kind":"INFLUENCE_BLOCK","uses":1}','ANY_DISTRICT','lag',false,'{"concept":"ผลกระทบจากความล่าช้าของระบบ","disclaimer":"เป็นกลไกเกม ไม่ใช่วิธีรบกวนเครือข่ายจริง"}'),
  ('access-denied','Access Denied','CONTROL',2,'บล็อกการ์ด ATTACK ของคู่แข่งต่อ District จนจบเทิร์นถัดไป','{"kind":"ATTACK_BLOCK"}','ANY_DISTRICT','access-denied',false,'{"concept":"มาตรการกำกับ สิทธิ์เข้าถึง และการป้องกันความเสี่ยง","gameUse":"บล็อกการ์ดโจมตีต่อ District ชั่วคราว","limitation":"ไม่ใช่การแก้ไข AI Bias โดยตรง ต้องใช้ร่วมกับการตรวจข้อมูลและ Human Oversight","disclaimer":"พลังการ์ดได้รับแรงบันดาลใจจากเทคโนโลยีและไม่จำลองระบบจริงทั้งหมด"}'),
  ('patch-update','Patch Update','SUPPORT',1,'เพิ่ม Influence ของตนเองใน District เป้าหมาย 2 IP','{"kind":"ADD_IP","amount":2}','ANY_DISTRICT','patch',true,'{"concept":"การปรับปรุงระบบอย่างต่อเนื่อง","disclaimer":"เป็นกลไกเกม ไม่ใช่กระบวนการอัปเดตซอฟต์แวร์จริง"}'),
  ('energy-boost','Energy Boost','SUPPORT',0,'เพิ่ม Energy ของผู้ใช้ 2 โดยไม่เกินค่าสูงสุด','{"kind":"ADD_ENERGY","amount":2}','SELF','energy',true,'{"concept":"การจัดสรรทรัพยากร","disclaimer":"Energy เป็นทรัพยากรในเกม"}')
on conflict(id) do update set
  name=excluded.name, card_type=excluded.card_type, en_cost=excluded.en_cost,
  description=excluded.description, effect=excluded.effect, target_type=excluded.target_type,
  icon_key=excluded.icon_key, is_starter=excluded.is_starter,
  education=excluded.education, is_active=true;

-- Firewall Guard is already a starter card. Access Denied is the closest existing
-- non-starter control card, so it becomes the real permanent unlock without
-- withdrawing any existing player entitlement or changing card balance.
insert into public.lesson_rewards(lesson_id,reward_type,action_card_id,trigger_type,minimum_score,claim_policy)
select id,'ACTION_CARD_UNLOCK','access-denied','FINAL_QUIZ_PASSED',8,'FIRST_PASS_ONLY'
from public.learning_lessons where code='ai-ethics-m6-01'
on conflict(lesson_id,action_card_id) do update set
  reward_type=excluded.reward_type, trigger_type=excluded.trigger_type,
  minimum_score=excluded.minimum_score, claim_policy=excluded.claim_policy,
  is_active=true;

alter table public.action_cards enable row level security;
alter table public.lesson_rewards enable row level security;
alter table public.user_card_unlocks enable row level security;
alter table public.player_card_loadouts enable row level security;

drop policy if exists "Players view active action cards" on public.action_cards;
create policy "Players view active action cards" on public.action_cards
for select to authenticated using (is_active);
drop policy if exists "Players view active lesson rewards" on public.lesson_rewards;
create policy "Players view active lesson rewards" on public.lesson_rewards
for select to authenticated using (is_active);
drop policy if exists "Players view own card unlocks" on public.user_card_unlocks;
create policy "Players view own card unlocks" on public.user_card_unlocks
for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Players view own card loadout" on public.player_card_loadouts;
create policy "Players view own card loadout" on public.player_card_loadouts
for select to authenticated using ((select auth.uid())=user_id);

revoke all on public.action_cards,public.lesson_rewards,public.user_card_unlocks,public.player_card_loadouts from anon;
revoke insert,update,delete on public.user_card_unlocks,public.player_card_loadouts from authenticated;
grant select on public.action_cards,public.lesson_rewards,public.user_card_unlocks,public.player_card_loadouts to authenticated;

create or replace function private.claim_lesson_reward_internal_stage5(p_lesson_code text)
returns table(
  status text, action_card_id text, card_name text, card_type text,
  en_cost smallint, description text, education jsonb, unlocked_at timestamptz
)
language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
  v_reward record;
  v_attempt public.quiz_attempts;
  v_unlock public.user_card_unlocks;
  v_rows integer := 0;
begin
  if v_user is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;

  select r.lesson_id,r.action_card_id,r.minimum_score,c.name,c.card_type,c.en_cost,c.description,c.education
  into v_reward
  from public.lesson_rewards r
  join public.learning_lessons l on l.id=r.lesson_id
  join public.action_cards c on c.id=r.action_card_id and c.is_active
  where l.code=p_lesson_code and r.is_active and r.reward_type='ACTION_CARD_UNLOCK'
    and r.trigger_type='FINAL_QUIZ_PASSED'
  order by r.created_at
  limit 1;
  if not found then raise exception 'REWARD_NOT_CONFIGURED'; end if;

  select a.* into v_attempt
  from public.quiz_attempts a
  join public.lesson_quizzes q on q.id=a.quiz_id
  where a.user_id=v_user and q.lesson_id=v_reward.lesson_id
    and a.passed and a.score>=greatest(v_reward.minimum_score,q.passing_score)
  order by a.submitted_at, a.id
  limit 1;

  if v_attempt.id is null then
    return query select 'NOT_ELIGIBLE'::text,v_reward.action_card_id,v_reward.name,
      v_reward.card_type,v_reward.en_cost,v_reward.description,v_reward.education,null::timestamptz;
    return;
  end if;

  insert into public.user_card_unlocks(user_id,action_card_id,source_lesson_id,source_attempt_id)
  values(v_user,v_reward.action_card_id,v_reward.lesson_id,v_attempt.id)
  on conflict on constraint user_card_unlocks_pkey do nothing;
  get diagnostics v_rows = row_count;

  select u.* into v_unlock from public.user_card_unlocks u
  where u.user_id=v_user and u.action_card_id=v_reward.action_card_id;

  return query select case when v_rows=1 then 'UNLOCKED' else 'ALREADY_UNLOCKED' end,
    v_reward.action_card_id,v_reward.name,v_reward.card_type,v_reward.en_cost,
    v_reward.description,v_reward.education,v_unlock.unlocked_at;
end;
$$;

revoke all on function private.claim_lesson_reward_internal_stage5(text) from public,anon;
grant execute on function private.claim_lesson_reward_internal_stage5(text) to authenticated;

create or replace function public.claim_lesson_reward(p_lesson_code text)
returns table(
  status text, action_card_id text, card_name text, card_type text,
  en_cost smallint, description text, education jsonb, unlocked_at timestamptz
)
language sql security invoker set search_path=''
as $$ select * from private.claim_lesson_reward_internal_stage5(p_lesson_code); $$;
revoke all on function public.claim_lesson_reward(text) from public,anon;
grant execute on function public.claim_lesson_reward(text) to authenticated;

create or replace function private.save_action_card_loadout_internal_stage5(p_card_ids text[])
returns text[] language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
  v_allowed integer;
  v_result text[];
begin
  if v_user is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if coalesce(array_length(p_card_ids,1),0)<>3
     or (select count(distinct x) from unnest(p_card_ids) x)<>3 then
    raise exception 'LOADOUT_REQUIRES_3_UNIQUE_CARDS';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text,501));
  select count(*) into v_allowed
  from unnest(p_card_ids) selected(card_id)
  join public.action_cards c on c.id=selected.card_id and c.is_active
  where c.is_starter or exists(
    select 1 from public.user_card_unlocks u
    where u.user_id=v_user and u.action_card_id=c.id
  );
  if v_allowed<>3 then raise exception 'CARD_NOT_UNLOCKED'; end if;

  delete from public.player_card_loadouts where user_id=v_user;
  insert into public.player_card_loadouts(user_id,slot,action_card_id)
  select v_user,ordinality::smallint,card_id
  from unnest(p_card_ids) with ordinality selected(card_id,ordinality);
  select array_agg(action_card_id order by slot) into v_result
  from public.player_card_loadouts where user_id=v_user;
  return v_result;
end;
$$;
revoke all on function private.save_action_card_loadout_internal_stage5(text[]) from public,anon;
grant execute on function private.save_action_card_loadout_internal_stage5(text[]) to authenticated;

create or replace function public.save_action_card_loadout(p_card_ids text[])
returns text[] language sql security invoker set search_path=''
as $$ select private.save_action_card_loadout_internal_stage5(p_card_ids); $$;
revoke all on function public.save_action_card_loadout(text[]) from public,anon;
grant execute on function public.save_action_card_loadout(text[]) to authenticated;

commit;
