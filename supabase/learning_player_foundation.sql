-- Stage 1: resumable lesson-player progress on the existing learning table.
alter table public.player_learning_progress
  add column if not exists scene_index smallint not null default 0,
  add column if not exists scene_state jsonb not null default '{}'::jsonb,
  add column if not exists active_seconds integer not null default 0,
  add column if not exists started_at timestamptz;

alter table public.player_learning_progress
  drop constraint if exists player_learning_progress_scene_index_check;
alter table public.player_learning_progress
  add constraint player_learning_progress_scene_index_check check (scene_index >= 0);

alter table public.player_learning_progress
  drop constraint if exists player_learning_progress_active_seconds_check;
alter table public.player_learning_progress
  add constraint player_learning_progress_active_seconds_check check (active_seconds >= 0);

-- Existing RLS policies remain authoritative: each player can only read/write
-- rows whose user_id matches auth.uid(). No anonymous access is introduced.
