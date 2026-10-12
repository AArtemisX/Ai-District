-- Cover every foreign key used by Friends Hub cleanup and moderation paths.
create index if not exists direct_conversations_user_b_idx on public.direct_conversations(user_b);
create index if not exists direct_messages_sender_id_idx on public.direct_messages(sender_id);
create index if not exists friendships_request_idx on public.friendships(accepted_request_id);
create index if not exists notifications_actor_idx on public.notifications(actor_id);
create index if not exists social_interactions_user_b_idx on public.social_interactions(user_b);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);
create index if not exists user_reports_reporter_idx on public.user_reports(reporter_id);
create index if not exists user_reports_reported_idx on public.user_reports(reported_user_id);
create index if not exists user_reports_message_idx on public.user_reports(message_id);
