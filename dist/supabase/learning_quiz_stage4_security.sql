begin;
create index if not exists quiz_attempts_quiz_id_idx on public.quiz_attempts(quiz_id);

alter function public.submit_lesson_quiz(uuid,jsonb,uuid) rename to submit_lesson_quiz_internal_stage4;
alter function public.submit_lesson_quiz_internal_stage4(uuid,jsonb,uuid) set schema private;
revoke all on function private.submit_lesson_quiz_internal_stage4(uuid,jsonb,uuid) from public,anon;
grant execute on function private.submit_lesson_quiz_internal_stage4(uuid,jsonb,uuid) to authenticated;
grant usage on schema private to authenticated;

create or replace function public.submit_lesson_quiz(p_quiz_id uuid,p_answers jsonb,p_submission_id uuid)
returns public.quiz_attempts language sql security invoker set search_path='' as $$
  select private.submit_lesson_quiz_internal_stage4(p_quiz_id,p_answers,p_submission_id);
$$;
revoke all on function public.submit_lesson_quiz(uuid,jsonb,uuid) from public,anon;
grant execute on function public.submit_lesson_quiz(uuid,jsonb,uuid) to authenticated;
commit;
