-- NEON NEXUS: initial game database schema for Supabase/Postgres
-- Run this file in Supabase Dashboard > SQL Editor.
-- Authentication accounts remain managed by Supabase Auth (auth.users).

begin;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Player profile and progression
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text,
  avatar_url text,
  level integer not null default 1 check (level >= 1),
  xp bigint not null default 0 check (xp >= 0),
  credits bigint not null default 0 check (credits >= 0),
  status text not null default 'offline' check (status in ('online', 'away', 'offline')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 24),
  constraint profiles_username_trimmed check (username = btrim(username)),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 40)
);

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Game catalogs (read-only from the browser)
-- ---------------------------------------------------------------------------

create table if not exists public.game_modes (
  code text primary key,
  name text not null,
  description text,
  min_players smallint not null default 1 check (min_players between 1 and 16),
  max_players smallint not null default 4 check (max_players between 1 and 16),
  is_ranked boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint game_modes_player_range check (min_players <= max_players)
);

create table if not exists public.game_items (
  code text primary key,
  name text not null,
  item_type text not null check (item_type in ('weapon', 'armor', 'skin', 'badge', 'consumable')),
  rarity text not null default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary')),
  price_credits bigint check (price_credits is null or price_credits >= 0),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.missions (
  id bigint generated always as identity primary key,
  code text not null unique,
  title text not null,
  description text,
  mission_type text not null default 'daily' check (mission_type in ('daily', 'weekly', 'seasonal')),
  target_count integer not null check (target_count > 0),
  reward_xp integer not null default 0 check (reward_xp >= 0),
  reward_credits integer not null default 0 check (reward_credits >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint missions_valid_period check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists missions_active_period_idx
  on public.missions (is_active, starts_at, ends_at);

-- ---------------------------------------------------------------------------
-- Lobby rooms and members
-- ---------------------------------------------------------------------------

create table if not exists public.lobby_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  game_mode_code text not null references public.game_modes(code),
  max_players smallint not null default 4 check (max_players between 1 and 16),
  status text not null default 'waiting' check (status in ('waiting', 'matching', 'in_game', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lobby_rooms_code_format check (room_code ~ '^[A-Z0-9]{4,8}$'),
  constraint lobby_rooms_name_length check (char_length(name) between 1 and 60)
);

create index if not exists lobby_rooms_owner_id_idx on public.lobby_rooms (owner_id);
create index if not exists lobby_rooms_game_mode_code_idx on public.lobby_rooms (game_mode_code);
create index if not exists lobby_rooms_open_idx
  on public.lobby_rooms (created_at desc)
  where status in ('waiting', 'matching');

drop trigger if exists lobby_rooms_set_updated_at on public.lobby_rooms;
create trigger lobby_rooms_set_updated_at
before update on public.lobby_rooms
for each row execute function public.set_updated_at();

create table if not exists public.lobby_members (
  room_id uuid not null references public.lobby_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('leader', 'member')),
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists lobby_members_user_id_idx on public.lobby_members (user_id);

-- ---------------------------------------------------------------------------
-- Player-owned rewards and mission progress
-- These tables should be written by trusted server code, not directly by users.
-- ---------------------------------------------------------------------------

create table if not exists public.player_inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_code text not null references public.game_items(code),
  quantity integer not null default 1 check (quantity > 0),
  is_equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_code)
);

create index if not exists player_inventory_item_code_idx on public.player_inventory (item_code);

create table if not exists public.player_mission_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id bigint not null references public.missions(id) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, mission_id),
  constraint mission_claim_requires_completion check (claimed_at is null or completed_at is not null)
);

create index if not exists player_mission_progress_mission_id_idx
  on public.player_mission_progress (mission_id);

drop trigger if exists player_mission_progress_set_updated_at on public.player_mission_progress;
create trigger player_mission_progress_set_updated_at
before update on public.player_mission_progress
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Match history
-- Match results are server-authoritative to prevent score/reward cheating.
-- ---------------------------------------------------------------------------

create table if not exists public.match_history (
  id bigint generated always as identity primary key,
  game_mode_code text not null references public.game_modes(code),
  status text not null default 'created' check (status in ('created', 'running', 'completed', 'cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint match_history_valid_period check (ended_at is null or started_at is null or ended_at >= started_at)
);

create index if not exists match_history_game_mode_code_idx on public.match_history (game_mode_code);
create index if not exists match_history_created_at_idx on public.match_history (created_at desc);

create table if not exists public.match_players (
  match_id bigint not null references public.match_history(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  result text check (result in ('win', 'loss', 'draw', 'left')),
  score integer not null default 0 check (score >= 0),
  kills integer not null default 0 check (kills >= 0),
  deaths integer not null default 0 check (deaths >= 0),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  credits_earned integer not null default 0 check (credits_earned >= 0),
  primary key (match_id, user_id)
);

create index if not exists match_players_user_id_idx on public.match_players (user_id);

-- ---------------------------------------------------------------------------
-- Explicit Data API privileges
-- New Supabase projects no longer expose new public tables automatically.
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.game_modes, public.game_items,
  public.missions, public.lobby_rooms, public.lobby_members,
  public.player_inventory, public.player_mission_progress,
  public.match_history, public.match_players
from anon;

grant usage on schema public to authenticated, service_role;

grant select on public.profiles, public.game_modes, public.game_items,
  public.missions, public.lobby_rooms, public.lobby_members,
  public.player_inventory, public.player_mission_progress,
  public.match_history, public.match_players
to authenticated;

grant insert (id, username, display_name, avatar_url)
  on public.profiles to authenticated;
grant update (username, display_name, avatar_url, status, last_seen_at)
  on public.profiles to authenticated;

grant insert, update, delete on public.lobby_rooms to authenticated;
grant insert (room_id, user_id, member_role, is_ready)
  on public.lobby_members to authenticated;
grant update (is_ready) on public.lobby_members to authenticated;
grant delete on public.lobby_members to authenticated;

grant all privileges on public.profiles, public.game_modes, public.game_items,
  public.missions, public.lobby_rooms, public.lobby_members,
  public.player_inventory, public.player_mission_progress,
  public.match_history, public.match_players
to service_role;
grant all privileges on sequence public.missions_id_seq,
  public.match_history_id_seq
to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.game_modes enable row level security;
alter table public.game_items enable row level security;
alter table public.missions enable row level security;
alter table public.lobby_rooms enable row level security;
alter table public.lobby_members enable row level security;
alter table public.player_inventory enable row level security;
alter table public.player_mission_progress enable row level security;
alter table public.match_history enable row level security;
alter table public.match_players enable row level security;

drop policy if exists "Authenticated players can view profiles" on public.profiles;
create policy "Authenticated players can view profiles"
on public.profiles for select to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Players can create their own profile" on public.profiles;
create policy "Players can create their own profile"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Players can update their own profile" on public.profiles;
create policy "Players can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Authenticated players can view game modes" on public.game_modes;
create policy "Authenticated players can view game modes"
on public.game_modes for select to authenticated
using (is_active = true);

drop policy if exists "Authenticated players can view game items" on public.game_items;
create policy "Authenticated players can view game items"
on public.game_items for select to authenticated
using (is_active = true);

drop policy if exists "Authenticated players can view active missions" on public.missions;
create policy "Authenticated players can view active missions"
on public.missions for select to authenticated
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);

drop policy if exists "Authenticated players can view lobby rooms" on public.lobby_rooms;
create policy "Authenticated players can view lobby rooms"
on public.lobby_rooms for select to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Players can create owned lobby rooms" on public.lobby_rooms;
create policy "Players can create owned lobby rooms"
on public.lobby_rooms for insert to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can update lobby rooms" on public.lobby_rooms;
create policy "Owners can update lobby rooms"
on public.lobby_rooms for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can delete lobby rooms" on public.lobby_rooms;
create policy "Owners can delete lobby rooms"
on public.lobby_rooms for delete to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Authenticated players can view lobby members" on public.lobby_members;
create policy "Authenticated players can view lobby members"
on public.lobby_members for select to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Players can join a lobby as themselves" on public.lobby_members;
create policy "Players can join a lobby as themselves"
on public.lobby_members for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    member_role = 'member'
    or (
      member_role = 'leader'
      and exists (
        select 1 from public.lobby_rooms room
        where room.id = lobby_members.room_id
          and room.owner_id = (select auth.uid())
      )
    )
  )
);

drop policy if exists "Players can update their lobby state" on public.lobby_members;
create policy "Players can update their lobby state"
on public.lobby_members for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Players or room owners can remove lobby members" on public.lobby_members;
create policy "Players or room owners can remove lobby members"
on public.lobby_members for delete to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1 from public.lobby_rooms room
    where room.id = lobby_members.room_id
      and room.owner_id = (select auth.uid())
  )
);

drop policy if exists "Players can view their inventory" on public.player_inventory;
create policy "Players can view their inventory"
on public.player_inventory for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Players can view their mission progress" on public.player_mission_progress;
create policy "Players can view their mission progress"
on public.player_mission_progress for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Players can view matches they joined" on public.match_history;
create policy "Players can view matches they joined"
on public.match_history for select to authenticated
using (
  exists (
    select 1 from public.match_players participant
    where participant.match_id = match_history.id
      and participant.user_id = (select auth.uid())
  )
);

drop policy if exists "Players can view their match stats" on public.match_players;
create policy "Players can view their match stats"
on public.match_players for select to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Starter data shown by the current Lobby UI
-- ---------------------------------------------------------------------------

insert into public.game_modes (code, name, description, min_players, max_players, is_ranked)
values
  ('nightfall', 'ปฏิบัติการดาวมืด', 'รวมทีมฝ่ากองทัพจักรกล', 1, 4, false),
  ('duel_arena', 'Duel Arena', 'ดวลอันดับแบบหนึ่งต่อหนึ่ง', 2, 2, true),
  ('core_rush', 'Core Rush', 'แข่งขันแบบสามต่อสาม', 2, 6, false),
  ('void_raid', 'Void Raid', 'ภารกิจร่วมมือระดับยาก', 1, 4, false)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  min_players = excluded.min_players,
  max_players = excluded.max_players,
  is_ranked = excluded.is_ranked;

insert into public.missions (
  code, title, description, mission_type, target_count, reward_xp, reward_credits
)
values (
  'daily_play_3',
  'ภารกิจวันนี้',
  'เล่นโหมดใดก็ได้ให้ครบ 3 รอบ',
  'daily',
  3,
  500,
  100
)
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  target_count = excluded.target_count,
  reward_xp = excluded.reward_xp,
  reward_credits = excluded.reward_credits;

commit;

