begin;
create or replace function private.sync_quiz_progress()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_lesson_id bigint;
begin
  select lesson_id into v_lesson_id from public.lesson_quizzes where id=new.quiz_id;
  insert into public.player_learning_progress(user_id,lesson_id,status,score,completed_at,mission_completed_at,quiz_passed_at,best_quiz_score,started_at)
  values(new.user_id,v_lesson_id,case when new.passed then 'completed' else 'in_progress' end,new.score*10,case when new.passed then new.submitted_at end,new.submitted_at,case when new.passed then new.submitted_at end,new.score,new.submitted_at)
  on conflict(user_id,lesson_id) do update set
    status=case when public.player_learning_progress.status='completed' or new.passed then 'completed' else 'in_progress' end,
    score=greatest(coalesce(public.player_learning_progress.score,0),new.score*10),
    completed_at=case when new.passed then coalesce(public.player_learning_progress.completed_at,new.submitted_at) else public.player_learning_progress.completed_at end,
    mission_completed_at=coalesce(public.player_learning_progress.mission_completed_at,new.submitted_at),
    quiz_passed_at=case when new.passed then coalesce(public.player_learning_progress.quiz_passed_at,new.submitted_at) else public.player_learning_progress.quiz_passed_at end,
    best_quiz_score=greatest(coalesce(public.player_learning_progress.best_quiz_score,0),new.score);
  return new;
end $$;
revoke all on function private.sync_quiz_progress() from public,anon,authenticated;
drop trigger if exists quiz_attempts_sync_progress on public.quiz_attempts;
create trigger quiz_attempts_sync_progress after insert on public.quiz_attempts for each row execute function private.sync_quiz_progress();
commit;
