-- AI District Friends & Social Hub
-- Apply through the Supabase migration runner. All mutations are exposed through
-- authenticated RPC functions so atomic relationship changes never depend on UI state.

create table if not exists public.friend_invites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  token_hint text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create unique index if not exists friend_invites_one_active_owner
  on public.friend_invites(owner_id) where is_active;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

create unique index if not exists friend_requests_one_pending_pair
  on public.friend_requests(least(sender_id, receiver_id), greatest(sender_id, receiver_id))
  where status = 'pending';
create index if not exists friend_requests_receiver_status_idx on public.friend_requests(receiver_id, status, created_at desc);
create index if not exists friend_requests_sender_status_idx on public.friend_requests(sender_id, status, created_at desc);

create table if not exists public.friendships (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  accepted_request_id uuid references public.friend_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists friendships_user_b_idx on public.friendships(user_b);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean not null default false,
  current_game_status text,
  share_online_status boolean not null default true,
  share_last_seen boolean not null default true,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_a, user_b),
  check (user_a < user_b)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists direct_messages_conversation_created_idx on public.direct_messages(conversation_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('friend_request','friend_accepted','direct_message','room_invite')),
  related_entity_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_recipient_unread_idx on public.notifications(recipient_id, read_at, created_at desc);

create table if not exists public.social_interactions (
  id bigint generated always as identity primary key,
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  interaction_date date not null default current_date,
  kind text not null check (kind in ('daily_chat','completed_match','accepted_room_invite')),
  score smallint not null check (score in (1,2,3)),
  created_at timestamptz not null default now(),
  unique(user_a, user_b, interaction_date, kind),
  check (user_a < user_b)
);
create index if not exists social_interactions_recent_idx on public.social_interactions(user_a, user_b, interaction_date desc);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid references public.direct_messages(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

alter table public.friend_invites enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_presence enable row level security;
alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.social_interactions enable row level security;
alter table public.user_reports enable row level security;

create policy "Owners can view own friend invite" on public.friend_invites for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Participants can view friend requests" on public.friend_requests for select to authenticated
  using (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()));
create policy "Participants can view friendships" on public.friendships for select to authenticated
  using (user_a = (select auth.uid()) or user_b = (select auth.uid()));
create policy "Blockers can view own blocks" on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "Players can view friend presence" on public.user_presence for select to authenticated
  using (
    user_id = (select auth.uid()) or exists (
      select 1 from public.friendships f
      where (f.user_a = least(user_id, (select auth.uid())) and f.user_b = greatest(user_id, (select auth.uid())))
    )
  );
create policy "Players can insert own presence" on public.user_presence for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Players can update own presence" on public.user_presence for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members can view direct conversations" on public.direct_conversations for select to authenticated
  using (user_a = (select auth.uid()) or user_b = (select auth.uid()));
create policy "Members can view direct messages" on public.direct_messages for select to authenticated
  using (exists (
    select 1 from public.direct_conversations c
    where c.id = conversation_id and ((select auth.uid()) in (c.user_a, c.user_b))
  ));
create policy "Recipients can view notifications" on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy "Participants can view social interactions" on public.social_interactions for select to authenticated
  using (user_a = (select auth.uid()) or user_b = (select auth.uid()));
create policy "Reporters can view own reports" on public.user_reports for select to authenticated
  using (reporter_id = (select auth.uid()));

create or replace function public.create_friend_invite()
returns text language plpgsql security definer set search_path = '' as $$
declare raw_token text; token_digest text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  raw_token := encode(extensions.gen_random_bytes(24), 'hex');
  token_digest := encode(extensions.digest(raw_token, 'sha256'), 'hex');
  update public.friend_invites set is_active = false where owner_id = auth.uid() and is_active;
  insert into public.friend_invites(owner_id, token_hash, token_hint)
  values (auth.uid(), token_digest, left(raw_token, 8));
  return raw_token;
end; $$;

create or replace function public.friend_invite_preview(invite_token text)
returns table(user_id uuid, username text, display_name text, avatar_url text, level integer, relationship_status text)
language plpgsql security definer set search_path = '' as $$
declare owner_uuid uuid; relation text := 'available';
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select i.owner_id into owner_uuid from public.friend_invites i
  where i.token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
    and i.is_active and i.expires_at > now();
  if owner_uuid is null then raise exception 'INVITE_INVALID'; end if;
  if owner_uuid = auth.uid() then relation := 'self';
  elsif exists (select 1 from public.friendships f where f.user_a = least(owner_uuid, auth.uid()) and f.user_b = greatest(owner_uuid, auth.uid())) then relation := 'friends';
  elsif exists (select 1 from public.friend_requests r where r.status='pending' and r.sender_id=auth.uid() and r.receiver_id=owner_uuid) then relation := 'sent';
  elsif exists (select 1 from public.friend_requests r where r.status='pending' and r.sender_id=owner_uuid and r.receiver_id=auth.uid()) then relation := 'received';
  end if;
  return query select p.id, p.username, p.display_name, p.avatar_url, p.level, relation
  from public.profiles p where p.id = owner_uuid;
end; $$;

create or replace function public.send_friend_request_by_invite(invite_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare receiver_uuid uuid; request_uuid uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select owner_id into receiver_uuid from public.friend_invites
  where token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
    and is_active and expires_at > now();
  if receiver_uuid is null then raise exception 'INVITE_INVALID'; end if;
  if receiver_uuid = auth.uid() then raise exception 'CANNOT_ADD_SELF'; end if;
  if exists (select 1 from public.user_blocks where (blocker_id=auth.uid() and blocked_id=receiver_uuid) or (blocker_id=receiver_uuid and blocked_id=auth.uid())) then raise exception 'USER_UNAVAILABLE'; end if;
  if exists (select 1 from public.friendships where user_a=least(auth.uid(), receiver_uuid) and user_b=greatest(auth.uid(), receiver_uuid)) then raise exception 'ALREADY_FRIENDS'; end if;
  if (select count(*) from public.friend_requests where sender_id=auth.uid() and created_at > now()-interval '1 hour') >= 10 then raise exception 'RATE_LIMITED'; end if;
  if exists (select 1 from public.friend_requests where status='pending' and sender_id=receiver_uuid and receiver_id=auth.uid()) then raise exception 'REQUEST_RECEIVED'; end if;
  insert into public.friend_requests(sender_id, receiver_id) values(auth.uid(), receiver_uuid)
  on conflict (least(sender_id, receiver_id), greatest(sender_id, receiver_id)) where status='pending'
  do update set updated_at=now()
  returning id into request_uuid;
  insert into public.notifications(recipient_id, actor_id, type, related_entity_id)
  values(receiver_uuid, auth.uid(), 'friend_request', request_uuid);
  return request_uuid;
end; $$;

create or replace function public.respond_friend_request(request_uuid uuid, accept_request boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare req public.friend_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into req from public.friend_requests where id=request_uuid for update;
  if req.id is null or req.receiver_id <> auth.uid() or req.status <> 'pending' then raise exception 'REQUEST_UNAVAILABLE'; end if;
  if accept_request then
    update public.friend_requests set status='accepted', updated_at=now() where id=req.id;
    insert into public.friendships(user_a,user_b,accepted_request_id)
    values(least(req.sender_id,req.receiver_id), greatest(req.sender_id,req.receiver_id), req.id)
    on conflict (user_a,user_b) do nothing;
    insert into public.notifications(recipient_id,actor_id,type,related_entity_id)
    values(req.sender_id,auth.uid(),'friend_accepted',req.id);
    return 'accepted';
  end if;
  update public.friend_requests set status='declined',updated_at=now() where id=req.id;
  return 'declined';
end; $$;

create or replace function public.cancel_friend_request(request_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.friend_requests set status='cancelled',updated_at=now()
  where id=request_uuid and sender_id=auth.uid() and status='pending';
  if not found then raise exception 'REQUEST_UNAVAILABLE'; end if;
end; $$;

create or replace function public.remove_friend(friend_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.friendships where user_a=least(auth.uid(),friend_uuid) and user_b=greatest(auth.uid(),friend_uuid);
  if not found then raise exception 'NOT_FRIENDS'; end if;
end; $$;

create or replace function public.block_social_user(target_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or target_uuid=auth.uid() then raise exception 'INVALID_TARGET'; end if;
  insert into public.user_blocks(blocker_id,blocked_id) values(auth.uid(),target_uuid) on conflict do nothing;
  delete from public.friendships where user_a=least(auth.uid(),target_uuid) and user_b=greatest(auth.uid(),target_uuid);
  update public.friend_requests set status='cancelled',updated_at=now()
    where status='pending' and ((sender_id=auth.uid() and receiver_id=target_uuid) or (sender_id=target_uuid and receiver_id=auth.uid()));
end; $$;

create or replace function public.report_social_user(target_uuid uuid, report_reason text, related_message uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare report_uuid uuid;
begin
  if auth.uid() is null or target_uuid=auth.uid() then raise exception 'INVALID_TARGET'; end if;
  if char_length(trim(report_reason)) not between 3 and 500 then raise exception 'INVALID_REASON'; end if;
  insert into public.user_reports(reporter_id,reported_user_id,message_id,reason)
  values(auth.uid(),target_uuid,related_message,trim(report_reason)) returning id into report_uuid;
  return report_uuid;
end; $$;

create or replace function public.open_direct_conversation(friend_uuid uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare conversation_uuid uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.friendships where user_a=least(auth.uid(),friend_uuid) and user_b=greatest(auth.uid(),friend_uuid)) then raise exception 'NOT_FRIENDS'; end if;
  if exists (select 1 from public.user_blocks where (blocker_id=auth.uid() and blocked_id=friend_uuid) or (blocker_id=friend_uuid and blocked_id=auth.uid())) then raise exception 'USER_UNAVAILABLE'; end if;
  insert into public.direct_conversations(user_a,user_b) values(least(auth.uid(),friend_uuid),greatest(auth.uid(),friend_uuid))
  on conflict(user_a,user_b) do update set updated_at=now() returning id into conversation_uuid;
  return conversation_uuid;
end; $$;

create or replace function public.send_direct_message(conversation_uuid uuid, message_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare conv public.direct_conversations%rowtype; recipient_uuid uuid; message_uuid uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into conv from public.direct_conversations where id=conversation_uuid;
  if conv.id is null or auth.uid() not in (conv.user_a,conv.user_b) then raise exception 'CONVERSATION_UNAVAILABLE'; end if;
  recipient_uuid := case when conv.user_a=auth.uid() then conv.user_b else conv.user_a end;
  if exists (select 1 from public.user_blocks where (blocker_id=auth.uid() and blocked_id=recipient_uuid) or (blocker_id=recipient_uuid and blocked_id=auth.uid())) then raise exception 'USER_UNAVAILABLE'; end if;
  if char_length(trim(message_body)) not between 1 and 1000 then raise exception 'INVALID_MESSAGE'; end if;
  insert into public.direct_messages(conversation_id,sender_id,body) values(conv.id,auth.uid(),trim(message_body)) returning id into message_uuid;
  update public.direct_conversations set updated_at=now() where id=conv.id;
  insert into public.social_interactions(user_a,user_b,interaction_date,kind,score)
  values(least(auth.uid(),recipient_uuid),greatest(auth.uid(),recipient_uuid),current_date,'daily_chat',1)
  on conflict(user_a,user_b,interaction_date,kind) do nothing;
  insert into public.notifications(recipient_id,actor_id,type,related_entity_id)
  values(recipient_uuid,auth.uid(),'direct_message',message_uuid);
  return message_uuid;
end; $$;

create or replace function public.mark_conversation_read(conversation_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.direct_conversations where id=conversation_uuid and auth.uid() in (user_a,user_b)) then raise exception 'CONVERSATION_UNAVAILABLE'; end if;
  update public.direct_messages set read_at=coalesce(read_at,now()) where conversation_id=conversation_uuid and sender_id<>auth.uid() and read_at is null;
  update public.notifications set read_at=coalesce(read_at,now()) where recipient_id=auth.uid() and type='direct_message' and read_at is null;
end; $$;

create or replace function public.mark_notification_read(notification_uuid uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.notifications set read_at=coalesce(read_at,now())
  where recipient_id=auth.uid() and (notification_uuid is null or id=notification_uuid);
end; $$;

revoke all on function public.create_friend_invite() from public, anon;
revoke all on function public.friend_invite_preview(text) from public, anon;
revoke all on function public.send_friend_request_by_invite(text) from public, anon;
revoke all on function public.respond_friend_request(uuid,boolean) from public, anon;
revoke all on function public.cancel_friend_request(uuid) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.block_social_user(uuid) from public, anon;
revoke all on function public.report_social_user(uuid,text,uuid) from public, anon;
revoke all on function public.open_direct_conversation(uuid) from public, anon;
revoke all on function public.send_direct_message(uuid,text) from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;

grant execute on function public.create_friend_invite() to authenticated;
grant execute on function public.friend_invite_preview(text) to authenticated;
grant execute on function public.send_friend_request_by_invite(text) to authenticated;
grant execute on function public.respond_friend_request(uuid,boolean) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.block_social_user(uuid) to authenticated;
grant execute on function public.report_social_user(uuid,text,uuid) to authenticated;
grant execute on function public.open_direct_conversation(uuid) to authenticated;
grant execute on function public.send_direct_message(uuid,text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['friend_requests','friendships','direct_messages','notifications','user_presence'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
