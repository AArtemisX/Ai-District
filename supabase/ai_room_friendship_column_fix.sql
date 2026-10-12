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
  if exists (select 1 from public.lobby_members m where m.room_id = room_uuid and m.user_id = friend_uuid) then raise exception 'เพื่อนอยู่ในห้องแล้ว'; end if;

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

revoke execute on function public.invite_friend_to_room(uuid,uuid) from public, anon;
grant execute on function public.invite_friend_to_room(uuid,uuid) to authenticated;
