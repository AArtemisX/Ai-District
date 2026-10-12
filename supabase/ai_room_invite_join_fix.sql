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
  chosen_character text;
begin
  select * into invite from public.room_invitations where id = invitation_uuid for update;
  if invite.id is null or invite.recipient_id <> caller then raise exception 'ไม่พบคำเชิญ'; end if;
  if invite.status <> 'pending' then raise exception 'คำเชิญนี้ถูกตอบแล้ว'; end if;
  if not accept_invitation then
    update public.room_invitations set status='declined', responded_at=now() where id=invite.id;
    update public.notifications set read_at=coalesce(read_at,now()) where related_entity_id=invite.id and recipient_id=caller;
    return jsonb_build_object('status','declined');
  end if;
  select * into target from public.lobby_rooms where id=invite.room_id for update;
  if target.id is null or target.status <> 'waiting' then raise exception 'ห้องนี้เริ่มเกมหรือปิดแล้ว'; end if;
  select count(*) into human_count from public.lobby_members m where m.room_id=target.id;
  if human_count + target.bot_count >= target.max_players then raise exception 'ห้องนี้เต็มแล้ว'; end if;
  select p.selected_character_code into chosen_character from public.profiles p where p.id=caller;
  if chosen_character is null then select c.code into chosen_character from public.characters c where c.is_active order by c.rank desc,c.code limit 1; end if;
  insert into public.lobby_members (room_id,user_id,member_role,is_ready,character_code,selected_items)
  values (target.id,caller,'member',false,chosen_character,'[]'::jsonb)
  on conflict (room_id,user_id) do update set character_code=excluded.character_code;
  update public.room_invitations set status='accepted', responded_at=now() where id=invite.id;
  update public.notifications set read_at=coalesce(read_at,now()) where related_entity_id=invite.id and recipient_id=caller;
  return jsonb_build_object('status','accepted','room_code',target.room_code);
end;
$$;

revoke execute on function public.respond_room_invitation(uuid,boolean) from public, anon;
grant execute on function public.respond_room_invitation(uuid,boolean) to authenticated;
