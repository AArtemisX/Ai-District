begin;
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
  order by r.created_at limit 1;
  if not found then raise exception 'REWARD_NOT_CONFIGURED'; end if;
  select a.* into v_attempt
  from public.quiz_attempts a
  join public.lesson_quizzes q on q.id=a.quiz_id
  where a.user_id=v_user and q.lesson_id=v_reward.lesson_id
    and a.passed and a.score>=greatest(v_reward.minimum_score,q.passing_score)
  order by a.submitted_at,a.id limit 1;
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
commit;
