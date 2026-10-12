-- AI District: secure waiting-room flow for 2-4 players and bots.

alter table public.lobby_rooms
  add column if not exists bot_count smallint not null default 0;

alter table public.lobby_rooms
  drop constraint if exists lobby_rooms_bot_count_check;
alter table public.lobby_rooms
  add constraint lobby_rooms_bot_count_check check (bot_count between 0 and 3);

alter table public.lobby_members
  add column if not exists character_code text references public.characters(code),
  add column if not exists selected_items jsonb not null default '[]'::jsonb;

create table if not exists public.room_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.lobby_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint room_invitations_not_self check (sender_id <> recipient_id)
);

create unique index if not exists room_invitations_pending_uidx
  on public.room_invitations (room_id, recipient_id) where status = 'pending';
create index if not exists room_invitations_recipient_idx
  on public.room_invitations (recipient_id, created_at desc);

alter table public.room_invitations enable row level security;
revoke all on public.room_invitations from anon;
grant select on public.room_invitations to authenticated;
grant all privileges on public.room_invitations to service_role;

drop policy if exists "Room invite participants can view invitations" on public.room_invitations;
create policy "Room invite participants can view invitations"
on public.room_invitations for select to authenticated
using ((select auth.uid()) in (sender_id, recipient_id));

create or replace function public.create_ai_room(
  room_name text,
  selected_character text,
  selected_item_codes jsonb default '[]'::jsonb,
  desired_players smallint default 4
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  generated_code text;
  new_room public.lobby_rooms;
begin
  if caller is null then raise exception 'กรุณาเข้าสู่ระบบ'; end if;
  if char_length(trim(room_name)) not between 1 and 60 then raise exception 'ชื่อห้องต้องมี 1-60 ตัวอักษร'; end if;
  if desired_players not between 2 and 4 then raise exception 'ห้องรองรับผู้เล่น 2-4 คน'; end if;
  if jsonb_typeof(selected_item_codes) <> 'array' or jsonb_array_length(selected_item_codes) > 3 then
    raise exception 'เลือกไอเทมได้สูงสุด 3 ชิ้น';
  end if;
  if not exists (select 1 from public.characters c where c.code = selected_character and c.is_active) then
    raise exception 'ไม่พบตัวละครที่เลือก';
  end if;

  loop
    generated_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.lobby_rooms r where r.room_code = generated_code);
  end loop;

  insert into public.lobby_rooms (room_code, owner_id, name, game_mode_code, max_players, status, bot_count)
  values (generated_code, caller, trim(room_name), 'ai_world', desired_players, 'waiting', 0)
  returning * into new_room;

  insert into public.lobby_members (room_id, user_id, member_role, is_ready, character_code, selected_items)
  values (new_room.id, caller, 'leader', true, selected_character, selected_item_codes);

  return jsonb_build_object('room_id', new_room.id, 'room_code', new_room.room_code);
end;
$$;

create or replace function public.join_ai_room(
  requested_code text,
  selected_character text,
  selected_item_codes jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.lobby_rooms;
  human_count integer;
begin
  if caller is null then raise exception 'กรุณาเข้าสู่ระบบ'; end if;
  if jsonb_typeof(selected_item_codes) <> 'array' or jsonb_array_length(selected_item_codes) > 3 then
    raise exception 'เลือกไอเทมได้สูงสุด 3 ชิ้น';
  end if;
  if not exists (select 1 from public.characters c where c.code = selected_character and c.is_active) then
    raise exception 'ไม่พบตัวละครที่เลือก';
  end if;

  select * into target from public.lobby_rooms
  where room_code = upper(trim(requested_code)) for update;
  if target.id is null then raise exception 'ไม่พบห้องจากรหัสนี้'; end if;
  if target.status <> 'waiting' then raise exception 'ห้องนี้เริ่มเกมหรือปิดแล้ว'; end if;

  if exists (select 1 from public.lobby_members m where m.room_id = target.id and m.user_id = caller) then
    return jsonb_build_object('room_id', target.id, 'room_code', target.room_code);
  end if;

  select count(*) into human_count from public.lobby_members m where m.room_id = target.id;
  if human_count + target.bot_count >= target.max_players then raise exception 'ห้องนี้เต็มแล้ว'; end if;

  insert into public.lobby_members (room_id, user_id, member_role, is_ready, character_code, selected_items)
  values (target.id, caller, 'member', false, selected_character, selected_item_codes);

  update public.room_invitations
  set status = 'accepted', responded_at = now()
  where room_id = target.id and recipient_id = caller and status = 'pending';

  return jsonb_build_object('room_id', target.id, 'room_code', target.room_code);
end;
$$;

create or replace function public.configure_ai_room(
  room_uuid uuid,
  desired_players smallint,
  desired_bots smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.lobby_rooms;
  human_count integer;
begin
  select * into target from public.lobby_rooms where id = room_uuid for update;
  if target.id is null then raise exception 'ไม่พบห้อง'; end if;
  if target.owner_id <> auth.uid() then raise exception 'เฉพาะหัวหน้าห้องเท่านั้น'; end if;
  if target.status <> 'waiting' then raise exception 'ปรับห้องหลังเริ่มเกมไม่ได้'; end if;
  if desired_players not between 2 and 4 then raise exception 'เลือกจำนวนผู้เล่น 2-4 คน'; end if;
  if desired_bots not between 0 and 3 then raise exception 'จำนวนบอทไม่ถูกต้อง'; end if;
  select count(*) into human_count from public.lobby_members m where m.room_id = room_uuid;
  if human_count + desired_bots > desired_players then raise exception 'จำนวนคนและบอทเกินขนาดห้อง'; end if;
  update public.lobby_rooms set max_players = desired_players, bot_count = desired_bots where id = room_uuid;
end;
$$;

create or replace function public.invite_friend_to_room(room_uuid uuid, friend_uuid uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.lobby_rooms;
  invite_id uuid;
begin
  select * into target from public.lobby_rooms where id = room_uuid for update;
  if target.id is null or target.status <> 'waiting' then raise exception 'ห้องนี้ไม่พร้อมรับคำเชิญ'; end if;
  if target.owner_id <> caller then raise exception 'เฉพาะหัวหน้าห้องเท่านั้น'; end if;
  if not exists (
    select 1 from public.friendships f
    where (f.user_a = caller and f.user_b = friend_uuid)
       or (f.user_a = friend_uuid and f.user_b = caller)
  ) then raise exception 'เชิญได้เฉพาะผู้ที่เป็นเพื่อนกัน'; end if;
  if exists (select 1 from public.lobby_members m where m.room_id = room_uuid and m.user_id = friend_uuid) then
    raise exception 'เพื่อนอยู่ในห้องแล้ว';
  end if;

  insert into public.room_invitations (room_id, sender_id, recipient_id)
  values (room_uuid, caller, friend_uuid)
  on conflict (room_id, recipient_id) where status = 'pending'
  do update set sender_id = excluded.sender_id, created_at = now()
  returning id into invite_id;

  insert into public.notifications (recipient_id, actor_id, type, related_entity_id)
  values (friend_uuid, caller, 'room_invite', invite_id);
  return invite_id;
end;
$$;

create or replace function public.respond_room_invitation(invitation_uuid uuid, accept_invitation boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  invite public.room_invitations;
  target public.lobby_rooms;
  human_count integer;
begin
  select * into invite from public.room_invitations where id = invitation_uuid for update;
  if invite.id is null or invite.recipient_id <> caller then raise exception 'ไม่พบคำเชิญ'; end if;
  if invite.status <> 'pending' then raise exception 'คำเชิญนี้ถูกตอบแล้ว'; end if;
  if not accept_invitation then
    update public.room_invitations set status='declined', responded_at=now() where id=invite.id;
    return jsonb_build_object('status','declined');
  end if;
  select * into target from public.lobby_rooms where id=invite.room_id for update;
  if target.id is null or target.status <> 'waiting' then raise exception 'ห้องนี้เริ่มเกมหรือปิดแล้ว'; end if;
  select count(*) into human_count from public.lobby_members m where m.room_id=target.id;
  if human_count + target.bot_count >= target.max_players then raise exception 'ห้องนี้เต็มแล้ว'; end if;
  update public.room_invitations set status='accepted', responded_at=now() where id=invite.id;
  return jsonb_build_object('status','accepted','room_code',target.room_code);
end;
$$;

create or replace function public.start_ai_room(room_uuid uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.lobby_rooms;
  owner_member public.lobby_members;
  human_count integer;
  unready_count integer;
  session_uuid uuid;
  participant_data jsonb;
begin
  select * into target from public.lobby_rooms where id=room_uuid for update;
  if target.id is null then raise exception 'ไม่พบห้อง'; end if;
  if target.owner_id <> caller then raise exception 'เฉพาะหัวหน้าห้องเท่านั้น'; end if;
  if target.status <> 'waiting' then
    select id into session_uuid from public.ai_world_sessions where room_id=room_uuid;
    if session_uuid is not null then return session_uuid; end if;
    raise exception 'ห้องนี้ไม่พร้อมเริ่มเกม';
  end if;
  select * into owner_member from public.lobby_members where room_id=room_uuid and user_id=caller;
  select count(*), count(*) filter (where not is_ready) into human_count, unready_count
  from public.lobby_members where room_id=room_uuid;
  if human_count + target.bot_count <> target.max_players then raise exception 'กรุณาเติมผู้เล่นหรือบอทให้ครบก่อนเริ่ม'; end if;
  if unready_count > 0 then raise exception 'ยังมีผู้เล่นที่ไม่พร้อม'; end if;
  if owner_member.character_code is null then raise exception 'หัวหน้าห้องยังไม่ได้เลือกตัวละคร'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', m.user_id, 'character_code', m.character_code, 'items', m.selected_items,
    'display_name', coalesce(p.display_name,p.username,'Player')
  ) order by m.joined_at), '[]'::jsonb)
  into participant_data
  from public.lobby_members m join public.profiles p on p.id=m.user_id where m.room_id=room_uuid;

  insert into public.ai_world_sessions (owner_id, room_id, character_code, board_state)
  values (caller, room_uuid, owner_member.character_code,
    jsonb_build_object('position',0,'insight',0,'energy',3,'items',owner_member.selected_items,
      'room_setup',jsonb_build_object('max_players',target.max_players,'bot_count',target.bot_count,'players',participant_data)))
  returning id into session_uuid;
  update public.lobby_rooms set status='in_game' where id=room_uuid;
  return session_uuid;
end;
$$;

revoke execute on function public.create_ai_room(text,text,jsonb,smallint) from public, anon;
revoke execute on function public.join_ai_room(text,text,jsonb) from public, anon;
revoke execute on function public.configure_ai_room(uuid,smallint,smallint) from public, anon;
revoke execute on function public.invite_friend_to_room(uuid,uuid) from public, anon;
revoke execute on function public.respond_room_invitation(uuid,boolean) from public, anon;
revoke execute on function public.start_ai_room(uuid) from public, anon;
grant execute on function public.create_ai_room(text,text,jsonb,smallint) to authenticated;
grant execute on function public.join_ai_room(text,text,jsonb) to authenticated;
grant execute on function public.configure_ai_room(uuid,smallint,smallint) to authenticated;
grant execute on function public.invite_friend_to_room(uuid,uuid) to authenticated;
grant execute on function public.respond_room_invitation(uuid,boolean) to authenticated;
grant execute on function public.start_ai_room(uuid) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lobby_rooms') then
    alter publication supabase_realtime add table public.lobby_rooms;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lobby_members') then
    alter publication supabase_realtime add table public.lobby_members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='room_invitations') then
    alter publication supabase_realtime add table public.room_invitations;
  end if;
end $$;
