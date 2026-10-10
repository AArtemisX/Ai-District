-- Ai District gameplay rules: scenarios, facilities, 8-round results.
begin;

create table if not exists public.ai_scenarios (
  code text primary key,
  title text not null,
  category text not null check (category in ('ethics', 'impact')),
  description text not null,
  evidence jsonb not null default '[]'::jsonb,
  choices jsonb not null default '[]'::jsonb,
  learning_topic text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_facilities (
  code text primary key,
  name text not null,
  description text not null,
  base_points integer not null default 20 check (base_points >= 0),
  accent_color text not null default '#5ee7ff',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_world_facility_states (
  session_id uuid not null references public.ai_world_sessions(id) on delete cascade,
  facility_code text not null references public.ai_facilities(code),
  owner_id uuid references public.profiles(id) on delete set null,
  level smallint not null default 1 check (level between 1 and 5),
  control_points integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (session_id, facility_code)
);
create index if not exists ai_world_facility_states_owner_id_idx on public.ai_world_facility_states(owner_id);
create index if not exists ai_world_facility_states_facility_code_idx on public.ai_world_facility_states(facility_code);

alter table public.ai_world_sessions add column if not exists max_turns smallint not null default 8 check (max_turns between 1 and 30);
alter table public.ai_world_sessions add column if not exists completed_at timestamptz;
alter table public.ai_world_sessions add column if not exists winner_id uuid references public.profiles(id) on delete set null;
create index if not exists ai_world_sessions_winner_id_idx on public.ai_world_sessions(winner_id);

alter table public.ai_world_turns add column if not exists scenario_code text references public.ai_scenarios(code);
alter table public.ai_world_turns add column if not exists decision_score integer not null default 0;
alter table public.ai_world_turns add column if not exists facility_score integer not null default 0;
create index if not exists ai_world_turns_scenario_code_idx on public.ai_world_turns(scenario_code);

insert into public.ai_scenarios (code, title, category, description, evidence, choices, learning_topic)
values
  ('data_center_privacy', 'ศูนย์ข้อมูลใช้ข้อมูลเกินความจำเป็น', 'ethics', 'AI ของศูนย์ข้อมูลกำลังรวบรวมข้อมูลประชาชนละเอียดกว่าที่ภารกิจต้องใช้',
   '["มีข้อมูลตำแหน่งแบบเรียลไทม์", "ประชาชนยังไม่ได้ให้ความยินยอม", "ลดข้อมูลลงได้โดยความแม่นยำลดเพียงเล็กน้อย"]'::jsonb,
   '[{"id":"minimize","label":"หยุดเก็บข้อมูลส่วนเกิน ขอความยินยอม และใช้ข้อมูลเท่าที่จำเป็น","score":30,"impact":"ลดความเสี่ยงด้านความเป็นส่วนตัวและสร้างความเชื่อมั่น","feedback":"คุณใช้หลัก data minimization และให้ผู้ใช้ควบคุมข้อมูล"},{"id":"anonymize","label":"ทำข้อมูลให้ไม่ระบุตัวตนและให้คณะกรรมการตรวจสอบ","score":22,"impact":"ลดความเสี่ยงได้ แต่ยังต้องทบทวนความจำเป็นของข้อมูล","feedback":"เป็นมาตรการที่ดี แต่ควรลดขอบเขตข้อมูลร่วมด้วย"},{"id":"continue","label":"เก็บข้อมูลต่อเพราะระบบทำงานได้แม่นยำกว่า","score":4,"impact":"ความเป็นส่วนตัวลดลงและอาจสูญเสียความไว้วางใจ","feedback":"ความแม่นยำไม่ควรลบสิทธิของผู้ได้รับผลกระทบ"}]'::jsonb, 'ความเป็นส่วนตัว'),
  ('clinic_bias', 'ระบบคัดกรองผู้ป่วยมีอคติ', 'ethics', 'โมเดลจัดลำดับผู้ป่วยกลุ่มหนึ่งต่ำกว่ากลุ่มอื่น แม้อาการใกล้เคียงกัน',
   '["ความแม่นยำรวม 91%", "ความแม่นยำของกลุ่มเสี่ยงเหลือ 68%", "มีแพทย์พร้อมตรวจทาน"]'::jsonb,
   '[{"id":"pause","label":"หยุดใช้กับกลุ่มเสี่ยง ตรวจข้อมูลแยกกลุ่ม และให้แพทย์ตัดสินใจ","score":32,"impact":"ลดอันตรายทันทีและสร้างข้อมูลสำหรับแก้อคติ","feedback":"การวัดผลแยกกลุ่มช่วยเห็นความไม่เป็นธรรมที่ค่าเฉลี่ยซ่อนไว้"},{"id":"monitor","label":"ใช้ต่อแต่เพิ่มหน้าจอเตือนแพทย์","score":17,"impact":"มีมนุษย์ช่วยตรวจ แต่ความเสี่ยงเชิงระบบยังอยู่","feedback":"Human oversight ช่วยได้ แต่ต้องแก้โมเดลและข้อมูลด้วย"},{"id":"average","label":"ใช้ต่อเพราะค่าเฉลี่ยรวมสูงกว่าเกณฑ์","score":2,"impact":"ผู้ป่วยบางกลุ่มยังได้รับความเสี่ยงไม่เท่ากัน","feedback":"ค่าเฉลี่ยรวมไม่ยืนยันความเป็นธรรมระหว่างกลุ่ม"}]'::jsonb, 'ความเป็นธรรม'),
  ('school_transparency', 'โรงเรียนใช้ AI ให้คะแนนโดยไม่อธิบาย', 'impact', 'นักเรียนถูกลดคะแนนจากระบบอัตโนมัติแต่ไม่ทราบเหตุผลและไม่มีช่องทางอุทธรณ์',
   '["ระบบใช้พฤติกรรมการส่งงาน", "ครูเห็นเฉพาะคะแนนสุดท้าย", "นักเรียนขอตรวจสอบได้"]'::jsonb,
   '[{"id":"explain","label":"แสดงปัจจัยสำคัญ เปิดช่องทางอุทธรณ์ และให้ครูตัดสินขั้นสุดท้าย","score":30,"impact":"นักเรียนเข้าใจและโต้แย้งข้อผิดพลาดได้","feedback":"ความโปร่งใสต้องมาพร้อมการเยียวยาและมนุษย์รับผิดชอบ"},{"id":"teacher","label":"ส่งคะแนนให้ครูตรวจเฉพาะกรณีต่ำกว่าเกณฑ์","score":19,"impact":"ลดข้อผิดพลาดบางส่วนแต่ผู้เรียนยังเห็นเหตุผลไม่ครบ","feedback":"เพิ่มการตรวจทานแล้ว แต่ควรอธิบายผลให้ผู้เรียนด้วย"},{"id":"secret","label":"เก็บเกณฑ์เป็นความลับเพื่อป้องกันการโกง","score":5,"impact":"ลดความไว้วางใจและไม่มีวิธีแก้ผลที่ผิด","feedback":"สามารถป้องกันการโกงพร้อมอธิบายปัจจัยในระดับที่เหมาะสมได้"}]'::jsonb, 'ความโปร่งใส'),
  ('energy_model', 'โมเดลใหม่ใช้พลังงานสูง', 'impact', 'โมเดลใหม่แม่นขึ้น 2% แต่ใช้พลังงานมากกว่าเดิมห้าเท่า',
   '["งานส่วนใหญ่ไม่ต้องการความแม่นยำสูงสุด", "ศูนย์ข้อมูลใช้พลังงานจากหลายแหล่ง", "มีโมเดลขนาดเล็กให้เลือก"]'::jsonb,
   '[{"id":"tiered","label":"ใช้โมเดลเล็กเป็นค่าเริ่มต้น และใช้โมเดลใหญ่เฉพาะงานจำเป็น","score":28,"impact":"รักษาประโยชน์พร้อมลดพลังงานส่วนเกิน","feedback":"การเลือกโมเดลตามงานช่วยลดผลกระทบตลอดวงจรชีวิต"},{"id":"offset","label":"ใช้โมเดลใหญ่ทั้งหมดและซื้อเครดิตชดเชย","score":12,"impact":"ชดเชยบางส่วนแต่ยังใช้ทรัพยากรโดยไม่จำเป็น","feedback":"ควรลดการใช้ก่อนพิจารณาการชดเชย"},{"id":"maximum","label":"เลือกโมเดลใหญ่เพื่อความแม่นยำสูงสุดเสมอ","score":3,"impact":"ต้นทุนสิ่งแวดล้อมสูงเกินประโยชน์ที่เพิ่มเล็กน้อย","feedback":"ต้องเทียบประโยชน์ส่วนเพิ่มกับต้นทุนจริง"}]'::jsonb, 'ผลกระทบต่อสิ่งแวดล้อม')
on conflict (code) do update set title=excluded.title, category=excluded.category, description=excluded.description, evidence=excluded.evidence, choices=excluded.choices, learning_topic=excluded.learning_topic, is_active=true;

insert into public.ai_facilities (code, name, description, base_points, accent_color)
values
 ('data_center', 'Data Center', 'โครงสร้างพื้นฐานข้อมูลและความเป็นส่วนตัว', 20, '#5ee7ff'),
 ('research_lab', 'Research Lab', 'ศูนย์วิจัยเพื่อพัฒนา AI อย่างรับผิดชอบ', 25, '#a970ff')
on conflict (code) do update set name=excluded.name, description=excluded.description, base_points=excluded.base_points, accent_color=excluded.accent_color, is_active=true;

revoke all on public.ai_scenarios, public.ai_facilities, public.ai_world_facility_states from anon;
grant select on public.ai_scenarios, public.ai_facilities, public.ai_world_facility_states to authenticated;
grant insert, update on public.ai_world_facility_states to authenticated;
grant all privileges on public.ai_scenarios, public.ai_facilities, public.ai_world_facility_states to service_role;

alter table public.ai_scenarios enable row level security;
alter table public.ai_facilities enable row level security;
alter table public.ai_world_facility_states enable row level security;

drop policy if exists "Players can view active scenarios" on public.ai_scenarios;
create policy "Players can view active scenarios" on public.ai_scenarios for select to authenticated using (is_active=true);
drop policy if exists "Players can view active facilities" on public.ai_facilities;
create policy "Players can view active facilities" on public.ai_facilities for select to authenticated using (is_active=true);
drop policy if exists "Participants can view facility states" on public.ai_world_facility_states;
create policy "Participants can view facility states" on public.ai_world_facility_states for select to authenticated using (
  exists(select 1 from public.ai_world_sessions s where s.id=session_id and (s.owner_id=(select auth.uid()) or exists(select 1 from public.lobby_members m where m.room_id=s.room_id and m.user_id=(select auth.uid()))))
);
drop policy if exists "Session owners can create facility states" on public.ai_world_facility_states;
create policy "Session owners can create facility states" on public.ai_world_facility_states for insert to authenticated with check (
  exists(select 1 from public.ai_world_sessions s where s.id=session_id and s.owner_id=(select auth.uid()))
);
drop policy if exists "Session owners can update facility states" on public.ai_world_facility_states;
create policy "Session owners can update facility states" on public.ai_world_facility_states for update to authenticated using (
  exists(select 1 from public.ai_world_sessions s where s.id=session_id and s.owner_id=(select auth.uid()))
) with check (
  exists(select 1 from public.ai_world_sessions s where s.id=session_id and s.owner_id=(select auth.uid()))
);

commit;
