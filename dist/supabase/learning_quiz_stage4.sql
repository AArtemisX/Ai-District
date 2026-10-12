begin;

alter table public.player_learning_progress
  add column if not exists mission_completed_at timestamptz,
  add column if not exists quiz_passed_at timestamptz,
  add column if not exists best_quiz_score smallint;

create table if not exists public.lesson_quizzes (
  id uuid primary key default gen_random_uuid(), lesson_id bigint not null unique references public.learning_lessons(id) on delete cascade,
  code text not null unique, title text not null, passing_score smallint not null default 8,
  total_questions smallint not null default 10, is_active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.quiz_questions (
  id text primary key, quiz_id uuid not null references public.lesson_quizzes(id) on delete cascade,
  learning_objective_id text not null check (learning_objective_id in ('LO1','LO2','LO3','LO4')),
  question_type text not null check (question_type in ('single','multiple','scenario')),
  question_text text not null, options jsonb not null, position smallint not null,
  unique (quiz_id, position)
);
create table if not exists private.quiz_answer_keys (
  question_id text primary key references public.quiz_questions(id) on delete cascade,
  correct_answer jsonb not null, explanation text not null, remediation_scene_id text not null,
  difficulty text not null check (difficulty in ('medium','hard'))
);
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(), client_submission_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.lesson_quizzes(id) on delete cascade,
  answers jsonb not null, score smallint not null, max_score smallint not null,
  passed boolean not null, learning_objective_results jsonb not null, feedback jsonb not null,
  submitted_at timestamptz not null default now(), unique(user_id, client_submission_id)
);
create index if not exists quiz_questions_quiz_position_idx on public.quiz_questions(quiz_id,position);
create index if not exists quiz_attempts_user_quiz_submitted_idx on public.quiz_attempts(user_id,quiz_id,submitted_at desc);

alter table public.lesson_quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
drop policy if exists "Players view active quizzes" on public.lesson_quizzes;
create policy "Players view active quizzes" on public.lesson_quizzes for select to authenticated using (is_active);
drop policy if exists "Players view quiz questions" on public.quiz_questions;
create policy "Players view quiz questions" on public.quiz_questions for select to authenticated using (exists(select 1 from public.lesson_quizzes q where q.id=quiz_id and q.is_active));
drop policy if exists "Players view own quiz attempts" on public.quiz_attempts;
create policy "Players view own quiz attempts" on public.quiz_attempts for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.lesson_quizzes,public.quiz_questions,public.quiz_attempts from anon;
grant select on public.lesson_quizzes,public.quiz_questions,public.quiz_attempts to authenticated;

insert into public.lesson_quizzes(lesson_id,code,title,passing_score,total_questions)
select id,'ai-ethics-m6-01-final','แบบทดสอบ: เมืองที่ AI ตัดสินผิดพลาด',8,10 from public.learning_lessons where code='ai-ethics-m6-01'
on conflict(code) do update set title=excluded.title,passing_score=8,total_questions=10,is_active=true;

with q as (select id from public.lesson_quizzes where code='ai-ethics-m6-01-final')
insert into public.quiz_questions(id,quiz_id,learning_objective_id,question_type,question_text,options,position) values
('m6q01',(select id from q),'LO1','single','ระบบมีอัตราผ่านต่างกันระหว่างกลุ่ม ข้อสรุปแรกที่เหมาะสมที่สุดคืออะไร?','[{"id":"a","label":"AI เลือกปฏิบัติแน่นอน"},{"id":"b","label":"มีสัญญาณความเสี่ยงที่ต้องตรวจข้อมูล เกณฑ์ และบริบทเพิ่ม"},{"id":"c","label":"ระบบเป็นกลางเพราะใช้คอมพิวเตอร์"},{"id":"d","label":"ลบข้อมูลกลุ่มทั้งหมดทันที"}]',1),
('m6q02',(select id from q),'LO1','single','ข้อใดเป็นตัวอย่าง Data Bias ที่สัมพันธ์กับภารกิจมากที่สุด?','[{"id":"a","label":"ข้อมูลฝึกแทนผู้สมัครบางพื้นที่น้อยกว่าสัดส่วนจริง"},{"id":"b","label":"หน้าจอใช้สีไม่สวย"},{"id":"c","label":"เซิร์ฟเวอร์ตอบช้า"},{"id":"d","label":"ชื่อโมเดลยาวเกินไป"}]',2),
('m6q03',(select id from q),'LO1','single','เหตุใดตัวแปรจำนวนกิจกรรมนอกห้องเรียนจึงอาจสร้างความเสี่ยง?','[{"id":"a","label":"เพราะเป็นตัวเลขเสมอ"},{"id":"b","label":"อาจเป็นตัวแทนของโอกาสและทรัพยากรที่แต่ละคนเข้าถึงไม่เท่ากัน"},{"id":"c","label":"เพราะ AI อ่านตัวเลขไม่ได้"},{"id":"d","label":"เพราะทุกกิจกรรมไม่มีประโยชน์"}]',3),
('m6q04',(select id from q),'LO2','multiple','เลือกทุกวิธีที่ช่วยตรวจ Algorithmic Fairness ได้จริง','[{"id":"a","label":"วัดผลแยกตามกลุ่มที่เกี่ยวข้อง"},{"id":"b","label":"ดูเฉพาะความแม่นยำรวม"},{"id":"c","label":"ตรวจอัตราความผิดพลาดและผลกระทบในบริบท"},{"id":"d","label":"สมมติว่าข้อมูลมากย่อมเป็นธรรม"}]',4),
('m6q05',(select id from q),'LO2','scenario','เพิ่มข้อมูลจากแหล่งเดิมจำนวนมาก แต่ข้อมูลยังล้าสมัยและไม่ครอบคลุม ผลที่สมเหตุสมผลคืออะไร?','[{"id":"a","label":"ความเป็นธรรมดีขึ้นแน่นอน"},{"id":"b","label":"อคติเดิมอาจยังคงอยู่หรือถูกขยาย"},{"id":"c","label":"ไม่ต้องประเมินรายกลุ่มแล้ว"},{"id":"d","label":"Human Oversight ไม่มีความจำเป็น"}]',5),
('m6q06',(select id from q),'LO2','single','เหตุใดเกณฑ์ Fairness จึงต้องพิจารณาบริบท?','[{"id":"a","label":"เพราะไม่มีตัวชี้วัดใดเหมาะกับทุกผลกระทบและทุกกลุ่มเสมอ"},{"id":"b","label":"เพราะไม่ควรวัดระบบ AI"},{"id":"c","label":"เพราะคะแนนรวมใช้ไม่ได้ทุกกรณี"},{"id":"d","label":"เพราะเลือกเกณฑ์แบบสุ่มได้"}]',6),
('m6q07',(select id from q),'LO3','single','แนวทางใดสะท้อน Transparency และ Explainability มากที่สุด?','[{"id":"a","label":"เผยแพร่ซอร์สโค้ดทั้งหมดโดยไม่อธิบาย"},{"id":"b","label":"แจ้งปัจจัยสำคัญ ข้อจำกัด และเหตุผลที่ผู้สมัครเข้าใจได้"},{"id":"c","label":"บอกเพียงว่า AI เป็นผู้ตัดสิน"},{"id":"d","label":"ซ่อนข้อมูลเพื่อป้องกันคำถาม"}]',7),
('m6q08',(select id from q),'LO3','multiple','เลือกทุกองค์ประกอบของ Human Oversight ที่รับผิดชอบ','[{"id":"a","label":"มีผู้รับผิดชอบชัดเจน"},{"id":"b","label":"มีช่องทางอุทธรณ์และทบทวนกรณีเสี่ยง"},{"id":"c","label":"ให้มนุษย์กดยืนยันโดยไม่เห็นข้อมูล"},{"id":"d","label":"ติดตามผลและปรับปรุงหลังเปิดใช้"}]',8),
('m6q09',(select id from q),'LO4','scenario','เมืองต้องเปิดระบบคัดเลือกใหม่ แนวทางใดรับผิดชอบที่สุด?','[{"id":"a","label":"เปิดทันทีแล้วค่อยแก้เมื่อมีร้องเรียน"},{"id":"b","label":"ทดสอบรายกลุ่ม เพิ่มคำอธิบาย มนุษย์ทบทวน และติดตามผล"},{"id":"c","label":"ซ่อนข้อมูลกลุ่มแล้วใช้ระบบเดิม"},{"id":"d","label":"ให้ AI ตัดสินสุดท้ายทุกกรณี"}]',9),
('m6q10',(select id from q),'LO4','scenario','พบว่าผู้ตรวจที่เป็นมนุษย์ก็อาจมีอคติ ควรทำอย่างไร?','[{"id":"a","label":"ยกเลิกการกำกับทั้งหมด"},{"id":"b","label":"ใช้แนวทางตรวจที่ชัดเจน อบรม ตรวจสอบซ้ำ และเก็บช่องทางอุทธรณ์"},{"id":"c","label":"ให้ผู้ตรวจคนเดิมตัดสินลำพัง"},{"id":"d","label":"เชื่อผล AI โดยไม่ตรวจ"}]',10)
on conflict(id) do update set learning_objective_id=excluded.learning_objective_id,question_type=excluded.question_type,question_text=excluded.question_text,options=excluded.options,position=excluded.position;

insert into private.quiz_answer_keys(question_id,correct_answer,explanation,remediation_scene_id,difficulty) values
('m6q01','["b"]','ผลต่างเป็นสัญญาณให้ตรวจสอบ แต่ยังไม่พิสูจน์สาเหตุโดยอัตโนมัติ','evidence','medium'),
('m6q02','["a"]','ข้อมูลที่ไม่เป็นตัวแทนประชากรจริงอาจทำให้แบบจำลองเรียนรู้บางกลุ่มได้ไม่ดี','evidence','medium'),
('m6q03','["b"]','ตัวแปรแทนสามารถสะท้อนความเหลื่อมล้ำของโอกาส แม้ไม่ได้ระบุกลุ่มโดยตรง','evidence','hard'),
('m6q04','["a","c"]','ควรประเมินทั้งผลรายกลุ่ม อัตราความผิดพลาด และผลกระทบในบริบท','evidence','hard'),
('m6q05','["b"]','ปริมาณข้อมูลไม่ชดเชยคุณภาพ ความเป็นปัจจุบัน หรือความครอบคลุมที่ไม่เหมาะสม','simulation','medium'),
('m6q06','["a"]','นิยามความเป็นธรรมขึ้นกับสิทธิ ผลกระทบ และวัตถุประสงค์ของการใช้งาน','simulation','hard'),
('m6q07','["b"]','คำอธิบายที่ดีสื่อสารปัจจัย ข้อจำกัด และเหตุผลในภาษาที่ผู้ได้รับผลกระทบเข้าใจ','decision','medium'),
('m6q08','["a","b","d"]','Human Oversight ต้องมีอำนาจ ความรับผิดชอบ ช่องทางแก้ไข และการติดตาม ไม่ใช่เพียงกดยืนยัน','decision','hard'),
('m6q09','["b"]','Responsible AI ใช้หลายมาตรการร่วมกันตลอดวงจรชีวิตระบบ','decision','hard'),
('m6q10','["b"]','มนุษย์ก็มีอคติได้ จึงต้องออกแบบกระบวนการกำกับให้ตรวจสอบและอุทธรณ์ได้','decision','hard')
on conflict(question_id) do update set correct_answer=excluded.correct_answer,explanation=excluded.explanation,remediation_scene_id=excluded.remediation_scene_id,difficulty=excluded.difficulty;

create or replace function public.submit_lesson_quiz(p_quiz_id uuid,p_answers jsonb,p_submission_id uuid)
returns public.quiz_attempts language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid()); v_q record; v_given jsonb; v_score int:=0; v_max int:=0; v_passed boolean; v_lo jsonb:='{}'; v_feedback jsonb:='[]'; v_entry jsonb; v_correct boolean; v_attempt public.quiz_attempts;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_attempt from public.quiz_attempts where user_id=v_user and client_submission_id=p_submission_id;
  if found then return v_attempt; end if;
  if not exists(select 1 from public.lesson_quizzes where id=p_quiz_id and is_active) then raise exception 'Quiz unavailable'; end if;
  for v_q in select q.id,q.learning_objective_id,k.correct_answer,k.explanation,k.remediation_scene_id from public.quiz_questions q join private.quiz_answer_keys k on k.question_id=q.id where q.quiz_id=p_quiz_id order by q.position loop
    v_max:=v_max+1; v_given:=p_answers->v_q.id;
    if v_given is null or jsonb_typeof(v_given)<>'array' or jsonb_array_length(v_given)=0 then raise exception 'INCOMPLETE_ANSWER:%',v_q.id; end if;
    select coalesce(array_agg(x order by x),array[]::text[]) = (select coalesce(array_agg(y order by y),array[]::text[]) from jsonb_array_elements_text(v_q.correct_answer) y) into v_correct from jsonb_array_elements_text(v_given) x;
    if v_correct then v_score:=v_score+1; end if;
    v_entry:=coalesce(v_lo->v_q.learning_objective_id,'{"correct":0,"total":0}'::jsonb);
    v_lo:=jsonb_set(v_lo,array[v_q.learning_objective_id],jsonb_build_object('correct',(v_entry->>'correct')::int+(case when v_correct then 1 else 0 end),'total',(v_entry->>'total')::int+1));
    v_feedback:=v_feedback||jsonb_build_array(jsonb_build_object('questionId',v_q.id,'correct',v_correct,'explanation',v_q.explanation,'remediationSceneId',v_q.remediation_scene_id));
  end loop;
  if v_max<>10 then raise exception 'Quiz configuration invalid'; end if;
  select v_score>=passing_score into v_passed from public.lesson_quizzes where id=p_quiz_id;
  insert into public.quiz_attempts(client_submission_id,user_id,quiz_id,answers,score,max_score,passed,learning_objective_results,feedback) values(p_submission_id,v_user,p_quiz_id,p_answers,v_score,v_max,v_passed,v_lo,v_feedback) returning * into v_attempt;
  if v_passed then
    update public.player_learning_progress p set status='completed',score=greatest(coalesce(p.score,0),v_score*10),completed_at=coalesce(p.completed_at,now()),quiz_passed_at=coalesce(p.quiz_passed_at,now()),best_quiz_score=greatest(coalesce(p.best_quiz_score,0),v_score) where p.user_id=v_user and p.lesson_id=(select lesson_id from public.lesson_quizzes where id=p_quiz_id);
  else
    update public.player_learning_progress p set best_quiz_score=greatest(coalesce(p.best_quiz_score,0),v_score) where p.user_id=v_user and p.lesson_id=(select lesson_id from public.lesson_quizzes where id=p_quiz_id);
  end if;
  return v_attempt;
end $$;
revoke all on function public.submit_lesson_quiz(uuid,jsonb,uuid) from public,anon;
grant execute on function public.submit_lesson_quiz(uuid,jsonb,uuid) to authenticated;

commit;
