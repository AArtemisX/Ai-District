-- Realtime Presence is private per friendship pair. A signed-in player can
-- publish/listen only when they belong to the friendship encoded in the topic.
drop policy if exists "Friends can listen to private presence" on realtime.messages;
drop policy if exists "Friends can track private presence" on realtime.messages;

create policy "Friends can listen to private presence"
on realtime.messages for select to authenticated
using (
  realtime.messages.extension = 'presence'
  and exists (
    select 1 from public.friendships f
    where (select realtime.topic()) = 'friends:' || f.user_a::text || ':' || f.user_b::text
      and (select auth.uid()) in (f.user_a, f.user_b)
  )
);

create policy "Friends can track private presence"
on realtime.messages for insert to authenticated
with check (
  realtime.messages.extension = 'presence'
  and exists (
    select 1 from public.friendships f
    where (select realtime.topic()) = 'friends:' || f.user_a::text || ':' || f.user_b::text
      and (select auth.uid()) in (f.user_a, f.user_b)
  )
);
