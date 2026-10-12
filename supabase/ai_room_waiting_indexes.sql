create index if not exists lobby_members_character_code_idx
  on public.lobby_members (character_code);
create index if not exists room_invitations_sender_idx
  on public.room_invitations (sender_id, created_at desc);
