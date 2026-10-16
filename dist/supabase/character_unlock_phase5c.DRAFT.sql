-- DRAFT ONLY: do not apply to Production. See CHARACTER_UNLOCK_MIGRATION_PLAN.md.
-- No mission/reward seed. Mission 02 has no approved production identity or quiz.
begin;

-- Fail rather than trusting attempts that a browser role can forge.
do $$
begin
  if pg_catalog.has_table_privilege('authenticated', 'public.quiz_attempts', 'INSERT,UPDATE,DELETE')
    or pg_catalog.has_table_privilege('anon', 'public.quiz_attempts', 'INSERT,UPDATE,DELETE')
    or pg_catalog.has_any_column_privilege('authenticated', 'public.quiz_attempts', 'INSERT,UPDATE')
    or pg_catalog.has_any_column_privilege('anon', 'public.quiz_attempts', 'INSERT,UPDATE') then
    raise exception 'PRECONDITION_FAILED: quiz_attempts must be server-created and immutable to browser roles';
  end if;
end $$;

create table public.character_reward_catalog (
  character_id text primary key,
  is_starter boolean not null,
  check ((character_id in ('alexander','mamasan','milo') and is_starter)
    or (character_id in ('albert','alice','dylan','nancy','nicolas','noah') and not is_starter))
);
insert into public.character_reward_catalog(character_id,is_starter) values
  ('alexander',true),('mamasan',true),('milo',true),
  ('albert',false),('alice',false),('dylan',false),('nancy',false),('nicolas',false),('noah',false);

-- One explicit, reviewed policy per lesson. Snapshot quiz policy prevents silent drift.
create table public.mission_character_rewards (
  lesson_id bigint primary key references public.learning_lessons(id),
  quiz_id uuid not null references public.lesson_quizzes(id),
  character_id text not null references public.character_reward_catalog(character_id),
  minimum_score smallint not null,
  approved_passing_score smallint not null,
  approved_total_questions smallint not null,
  eligible_attempts_since timestamptz not null,
  approved_at timestamptz,
  is_active boolean not null default false,
  check (approved_total_questions > 0),
  check (approved_passing_score > 0 and approved_passing_score <= approved_total_questions),
  check (minimum_score >= approved_passing_score and minimum_score <= approved_total_questions),
  check (not is_active or approved_at is not null)
);

create table public.user_character_unlocks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  character_id text not null references public.character_reward_catalog(character_id),
  source_lesson_id bigint not null references public.learning_lessons(id),
  source_attempt_id uuid not null references public.quiz_attempts(id),
  unlocked_at timestamptz not null default now(),
  primary key (user_id,character_id)
);
create index character_unlocks_source_lesson_idx on public.user_character_unlocks(source_lesson_id);
create index character_unlocks_source_attempt_idx on public.user_character_unlocks(source_attempt_id);
create index character_rewards_quiz_idx on public.mission_character_rewards(quiz_id);
create index character_rewards_character_idx on public.mission_character_rewards(character_id);

alter table public.character_reward_catalog enable row level security;
alter table public.mission_character_rewards enable row level security;
alter table public.user_character_unlocks enable row level security;
revoke all on public.character_reward_catalog,public.mission_character_rewards,public.user_character_unlocks from public,anon,authenticated;
grant select on public.user_character_unlocks to authenticated;
create policy "Players read own character unlocks" on public.user_character_unlocks
  for select to authenticated using ((select auth.uid()) = user_id);
-- No browser write policies or grants; catalog/mapping have no browser access.

create function public.claim_character_reward(p_lesson_code text)
returns table(status text, character_id text, unlocked_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
  v_reward record;
  v_attempt public.quiz_attempts;
  v_unlock public.user_character_unlocks;
  v_rows integer;
begin
  if v_user is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  -- Lock policy, lesson, quiz and catalog during verification and insertion.
  select r.*, q.passing_score, q.total_questions into v_reward
  from public.mission_character_rewards r
  join public.learning_lessons l on l.id=r.lesson_id and l.is_active
  join public.lesson_quizzes q on q.id=r.quiz_id and q.lesson_id=l.id and q.is_active
  join public.character_reward_catalog c on c.character_id=r.character_id and not c.is_starter
  where l.code=p_lesson_code and r.is_active and r.approved_at is not null
    and q.passing_score=r.approved_passing_score and q.total_questions=r.approved_total_questions
  for share of r,l,q,c;
  if not found then
    return query select 'REWARD_NOT_CONFIGURED'::text,null::text,null::timestamptz;
    return;
  end if;
  -- Repeat provenance precondition at claim time, including column-level grants.
  if pg_catalog.has_table_privilege('authenticated','public.quiz_attempts','INSERT,UPDATE,DELETE')
    or pg_catalog.has_table_privilege('anon','public.quiz_attempts','INSERT,UPDATE,DELETE')
    or pg_catalog.has_any_column_privilege('authenticated','public.quiz_attempts','INSERT,UPDATE')
    or pg_catalog.has_any_column_privilege('anon','public.quiz_attempts','INSERT,UPDATE') then
    raise exception 'QUIZ_ATTEMPTS_NOT_TRUSTED';
  end if;
  select a.* into v_attempt from public.quiz_attempts a
  where a.user_id=v_user and a.quiz_id=v_reward.quiz_id and a.passed
    and a.score >= greatest(v_reward.minimum_score,v_reward.passing_score)
    and a.score <= a.max_score and a.max_score=v_reward.total_questions
    and a.submitted_at >= v_reward.eligible_attempts_since
  order by a.submitted_at,a.id limit 1 for share;
  if not found then
    return query select 'NOT_ELIGIBLE'::text,v_reward.character_id,null::timestamptz;
    return;
  end if;
  insert into public.user_character_unlocks(user_id,character_id,source_lesson_id,source_attempt_id)
  values(v_user,v_reward.character_id,v_reward.lesson_id,v_attempt.id)
  on conflict on constraint user_character_unlocks_pkey do nothing;
  get diagnostics v_rows = row_count;
  select u.* into v_unlock from public.user_character_unlocks u
    where u.user_id=v_user and u.character_id=v_reward.character_id;
  return query select case when v_rows=1 then 'UNLOCKED' else 'ALREADY_UNLOCKED' end,
    v_unlock.character_id,v_unlock.unlocked_at;
end $$;
revoke all on function public.claim_character_reward(text) from public,anon,authenticated;
grant execute on function public.claim_character_reward(text) to authenticated;

-- Deliberately no INSERT into mission_character_rewards or user_character_unlocks.
commit;
