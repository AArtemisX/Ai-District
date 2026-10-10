-- Ai District flow extension: Intro Tutorial, Learning, and AI World
-- Additive and safe to run after game_schema.sql.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Catalogs
-- ---------------------------------------------------------------------------

create table if not exists public.characters (
  code text primary key,
  name text not null,
  rank text not null check (rank in ('S', 'S+')),
  title text not null,
  ability text not null,
  accent_color text not null default '#5ee7ff',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_lessons (
  id bigint generated always as identity primary key,
  code text not null unique,
  category text not null check (category in ('ethics', 'impact')),
  title text not null,
  summary text not null,
  content jsonb not null default '{}'::jsonb,
  unlock_order smallint not null unique check (unlock_order > 0),
  reward_xp integer not null default 100 check (reward_xp >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Player progress
-- ---------------------------------------------------------------------------

create table if not exists public.player_tutorial_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_step smallint not null default 1 check (current_step between 1 and 4),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.player_learning_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id bigint not null references public.learning_lessons(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  score smallint check (score is null or score between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists player_learning_progress_lesson_id_idx
  on public.player_learning_progress (lesson_id);

-- ---------------------------------------------------------------------------
-- AI World sessions and turn history
-- ---------------------------------------------------------------------------

create table if not exists public.ai_world_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid references public.lobby_rooms(id) on delete set null,
  character_code text not null references public.characters(code),
  current_turn integer not null default 1 check (current_turn > 0),
  phase text not null default 'start' check (phase in ('start', 'draw', 'inspect', 'resolve', 'result', 'end')),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  board_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_world_sessions_room_id_uidx
  on public.ai_world_sessions (room_id)
  where room_id is not null;
create index if not exists ai_world_sessions_owner_id_idx
  on public.ai_world_sessions (owner_id);
create index if not exists ai_world_sessions_character_code_idx
  on public.ai_world_sessions (character_code);

create table if not exists public.ai_world_turns (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.ai_world_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  turn_number integer not null check (turn_number > 0),
  block_type text not null check (block_type in ('ai_encounter', 'ai_facility', 'action', 'resource')),
  choice text not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, turn_number, user_id)
);

create index if not exists ai_world_turns_user_id_idx on public.ai_world_turns (user_id);

-- ---------------------------------------------------------------------------
-- Profile extension and timestamps
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists selected_character_code text references public.characters(code);
create index if not exists profiles_selected_character_code_idx
  on public.profiles (selected_character_code);

drop trigger if exists player_tutorial_progress_set_updated_at on public.player_tutorial_progress;
create trigger player_tutorial_progress_set_updated_at
before update on public.player_tutorial_progress
for each row execute function public.set_updated_at();

drop trigger if exists player_learning_progress_set_updated_at on public.player_learning_progress;
create trigger player_learning_progress_set_updated_at
before update on public.player_learning_progress
for each row execute function public.set_updated_at();

drop trigger if exists ai_world_sessions_set_updated_at on public.ai_world_sessions;
create trigger ai_world_sessions_set_updated_at
before update on public.ai_world_sessions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Starter content
-- ---------------------------------------------------------------------------

insert into public.characters (code, name, rank, title, ability, accent_color)
values
  ('aria', 'ARIA', 'S', 'Ethics Analyst', 'อ่านผลกระทบและลดความเสี่ยงจาก AI Encounter', '#5ee7ff'),
  ('nova', 'NOVA', 'S+', 'Systems Architect', 'สร้าง Facility ได้โดยใช้ทรัพยากรน้อยลง', '#a970ff'),
  ('kai', 'KAI', 'S', 'Field Mediator', 'เปลี่ยนผลลัพธ์เชิงลบให้เป็นกลางได้หนึ่งครั้ง', '#baff63'),
  ('mira', 'MIRA', 'S+', 'Impact Strategist', 'รับคะแนนเพิ่มเมื่อเลือกคำตอบที่โปร่งใสและเป็นธรรม', '#ff72b6')
on conflict (code) do update set
  name = excluded.name,
  rank = excluded.rank,
  title = excluded.title,
  ability = excluded.ability,
  accent_color = excluded.accent_color,
  is_active = true;

insert into public.game_items (code, name, item_type, rarity, metadata)
values
  ('logic_core', 'Logic Core', 'consumable', 'common', '{"effect":"reroll","description":"ทอยผลลัพธ์ของบล็อกใหม่หนึ่งครั้ง"}'::jsonb),
  ('ethics_shield', 'Ethics Shield', 'armor', 'rare', '{"effect":"protect","description":"ป้องกันผลกระทบด้านจริยธรรมหนึ่งครั้ง"}'::jsonb),
  ('impact_scanner', 'Impact Scanner', 'consumable', 'rare', '{"effect":"preview","description":"ดูผลลัพธ์ที่เป็นไปได้ก่อนตัดสินใจ"}'::jsonb)
on conflict (code) do update set
  name = excluded.name,
  item_type = excluded.item_type,
  rarity = excluded.rarity,
  metadata = excluded.metadata,
  is_active = true;

insert into public.game_modes (code, name, description, min_players, max_players, is_ranked)
values ('ai_world', 'AI World', 'เกมกระดานผลัดกันเล่นเพื่อเรียนรู้ผลกระทบของ AI', 1, 4, false)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  min_players = excluded.min_players,
  max_players = excluded.max_players,
  is_active = true;

insert into public.learning_lessons (code, category, title, summary, content, unlock_order, reward_xp)
values
  ('ethics_safety', 'ethics', 'ความมั่นคงและความปลอดภัย', 'ออกแบบ AI ให้ปลอดภัยแม้เกิดเหตุการณ์ที่ไม่คาดคิด', '{"scenario":"AI ควบคุมประตูโรงพยาบาลผิดพลาด คุณควรทำอย่างไร?","answer":"หยุดระบบอย่างปลอดภัยและให้มนุษย์ตรวจสอบ"}'::jsonb, 1, 100),
  ('ethics_reliability', 'ethics', 'ความน่าเชื่อถือ', 'ตรวจสอบว่า AI ทำงานสม่ำเสมอและอธิบายข้อจำกัดได้', '{"scenario":"โมเดลให้ผลต่างกันกับข้อมูลคล้ายกัน","answer":"ทดสอบซ้ำและประกาศข้อจำกัดของโมเดล"}'::jsonb, 2, 100),
  ('ethics_privacy', 'ethics', 'ความเป็นส่วนตัว', 'ใช้ข้อมูลเท่าที่จำเป็นและได้รับความยินยอม', '{"scenario":"แอปต้องการข้อมูลตำแหน่งตลอดเวลา","answer":"ขอเฉพาะช่วงที่จำเป็นและให้ผู้ใช้ปฏิเสธได้"}'::jsonb, 3, 120),
  ('ethics_transparency', 'ethics', 'ความโปร่งใส', 'บอกผู้ใช้เมื่อกำลังโต้ตอบกับ AI และอธิบายเหตุผลได้', '{"scenario":"AI ปฏิเสธคำขอสินเชื่อโดยไม่บอกเหตุผล","answer":"แสดงปัจจัยสำคัญและช่องทางอุทธรณ์"}'::jsonb, 4, 120),
  ('ethics_accountability', 'ethics', 'ภาระรับผิดชอบ', 'กำหนดผู้รับผิดชอบและช่องทางแก้ไขเมื่อ AI สร้างความเสียหาย', '{"scenario":"ระบบอัตโนมัติทำให้ลูกค้าเสียประโยชน์","answer":"มีเจ้าของระบบรับผิดชอบ ตรวจสอบ และเยียวยา"}'::jsonb, 5, 150),
  ('ethics_fairness', 'ethics', 'ความเป็นธรรมของมนุษย์', 'ตรวจจับอคติและออกแบบให้ทุกกลุ่มได้รับการปฏิบัติอย่างเป็นธรรม', '{"scenario":"โมเดลแม่นยำน้อยกว่าสำหรับผู้ใช้บางกลุ่ม","answer":"แยกวัดผลรายกลุ่มและปรับข้อมูลฝึก"}'::jsonb, 6, 150),
  ('impact_individual', 'impact', 'ผลกระทบต่อบุคคล', 'ประเมินสิทธิ ความปลอดภัย และโอกาสของแต่ละคน', '{"scenario":"AI แนะนำเส้นทางอาชีพให้ผู้เรียน","answer":"ให้ทางเลือก อธิบายเหตุผล และไม่ปิดกั้นโอกาส"}'::jsonb, 7, 120),
  ('impact_society', 'impact', 'ผลกระทบต่อสังคม', 'พิจารณาความเหลื่อมล้ำ ความไว้วางใจ และผลต่อชุมชน', '{"scenario":"เมืองใช้ AI จัดสรรบริการสาธารณะ","answer":"รับฟังชุมชนและตรวจสอบความเป็นธรรม"}'::jsonb, 8, 150),
  ('impact_environment', 'impact', 'ผลกระทบต่อสิ่งแวดล้อม', 'คำนึงถึงพลังงาน ฮาร์ดแวร์ และวงจรชีวิตของระบบ', '{"scenario":"โมเดลใหม่แม่นขึ้นเล็กน้อยแต่ใช้พลังงานมากขึ้นมาก","answer":"เทียบประโยชน์กับต้นทุนสิ่งแวดล้อมก่อนใช้งาน"}'::jsonb, 9, 150),
  ('impact_analysis', 'impact', 'การวิเคราะห์ผลกระทบ', 'ระบุผู้มีส่วนได้ส่วนเสีย ความเสี่ยง และผลระยะยาว', '{"scenario":"จะเปิดตัว AI ในโรงเรียนทั้งจังหวัด","answer":"ทดลองวงเล็ก วัดผล และเปิดรับข้อร้องเรียน"}'::jsonb, 10, 180),
  ('impact_guidance', 'impact', 'แนวทางรับผิดชอบ', 'เปลี่ยนการวิเคราะห์เป็นมาตรการ กฎ และการติดตามผล', '{"scenario":"โครงการ AI ผ่านการทดลองแล้ว","answer":"กำหนดเจ้าของความเสี่ยง เกณฑ์หยุด และรอบตรวจสอบ"}'::jsonb, 11, 200)
on conflict (code) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  unlock_order = excluded.unlock_order,
  reward_xp = excluded.reward_xp,
  is_active = true;

-- ---------------------------------------------------------------------------
-- Initialize starter progress/items when a profile is created
-- ---------------------------------------------------------------------------

create or replace function private.initialize_player_flow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is distinct from new.id then
    return new;
  end if;

  insert into public.player_tutorial_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.player_inventory (user_id, item_code, quantity)
  values
    (new.id, 'logic_core', 1),
    (new.id, 'ethics_shield', 1),
    (new.id, 'impact_scanner', 1)
  on conflict (user_id, item_code) do nothing;

  return new;
end;
$$;

revoke execute on function private.initialize_player_flow() from public, anon, authenticated;

drop trigger if exists profiles_initialize_player_flow on public.profiles;
create trigger profiles_initialize_player_flow
after insert on public.profiles
for each row execute function private.initialize_player_flow();

-- Backfill existing profiles without changing their current progress.
insert into public.player_tutorial_progress (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

insert into public.player_inventory (user_id, item_code, quantity)
select profile.id, item.code, 1
from public.profiles profile
cross join (values ('logic_core'), ('ethics_shield'), ('impact_scanner')) as item(code)
on conflict (user_id, item_code) do nothing;

-- ---------------------------------------------------------------------------
-- Explicit Data API grants and RLS
-- ---------------------------------------------------------------------------

revoke all on public.characters, public.learning_lessons,
  public.player_tutorial_progress, public.player_learning_progress,
  public.ai_world_sessions, public.ai_world_turns
from anon;

grant select on public.characters, public.learning_lessons,
  public.player_tutorial_progress, public.player_learning_progress,
  public.ai_world_sessions, public.ai_world_turns
to authenticated;

grant insert, update on public.player_tutorial_progress,
  public.player_learning_progress, public.ai_world_sessions
to authenticated;
grant delete on public.ai_world_sessions to authenticated;
grant insert on public.ai_world_turns to authenticated;
grant update (selected_character_code) on public.profiles to authenticated;

grant all privileges on public.characters, public.learning_lessons,
  public.player_tutorial_progress, public.player_learning_progress,
  public.ai_world_sessions, public.ai_world_turns
to service_role;
grant all privileges on sequence public.learning_lessons_id_seq,
  public.ai_world_turns_id_seq
to service_role;

alter table public.characters enable row level security;
alter table public.learning_lessons enable row level security;
alter table public.player_tutorial_progress enable row level security;
alter table public.player_learning_progress enable row level security;
alter table public.ai_world_sessions enable row level security;
alter table public.ai_world_turns enable row level security;

drop policy if exists "Players can view active characters" on public.characters;
create policy "Players can view active characters"
on public.characters for select to authenticated
using (is_active = true);

drop policy if exists "Players can view active lessons" on public.learning_lessons;
create policy "Players can view active lessons"
on public.learning_lessons for select to authenticated
using (is_active = true);

drop policy if exists "Players can view own tutorial progress" on public.player_tutorial_progress;
create policy "Players can view own tutorial progress"
on public.player_tutorial_progress for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Players can insert own tutorial progress" on public.player_tutorial_progress;
create policy "Players can insert own tutorial progress"
on public.player_tutorial_progress for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update own tutorial progress" on public.player_tutorial_progress;
create policy "Players can update own tutorial progress"
on public.player_tutorial_progress for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Players can view own learning progress" on public.player_learning_progress;
create policy "Players can view own learning progress"
on public.player_learning_progress for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Players can insert own learning progress" on public.player_learning_progress;
create policy "Players can insert own learning progress"
on public.player_learning_progress for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update own learning progress" on public.player_learning_progress;
create policy "Players can update own learning progress"
on public.player_learning_progress for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Participants can view AI sessions" on public.ai_world_sessions;
create policy "Participants can view AI sessions"
on public.ai_world_sessions for select to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.lobby_members member
    where member.room_id = ai_world_sessions.room_id
      and member.user_id = (select auth.uid())
  )
);

drop policy if exists "Players can create owned AI sessions" on public.ai_world_sessions;
create policy "Players can create owned AI sessions"
on public.ai_world_sessions for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can update AI sessions" on public.ai_world_sessions;
create policy "Owners can update AI sessions"
on public.ai_world_sessions for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can delete AI sessions" on public.ai_world_sessions;
create policy "Owners can delete AI sessions"
on public.ai_world_sessions for delete to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Participants can view AI turns" on public.ai_world_turns;
create policy "Participants can view AI turns"
on public.ai_world_turns for select to authenticated
using (
  exists (
    select 1 from public.ai_world_sessions session
    where session.id = ai_world_turns.session_id
      and (
        session.owner_id = (select auth.uid())
        or exists (
          select 1 from public.lobby_members member
          where member.room_id = session.room_id
            and member.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "Participants can record own AI turns" on public.ai_world_turns;
create policy "Participants can record own AI turns"
on public.ai_world_turns for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.ai_world_sessions session
    where session.id = ai_world_turns.session_id
      and (
        session.owner_id = (select auth.uid())
        or exists (
          select 1 from public.lobby_members member
          where member.room_id = session.room_id
            and member.user_id = (select auth.uid())
        )
      )
  )
);

commit;

