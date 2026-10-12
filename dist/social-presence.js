import { supabase } from "./supabase-client.js";

let presenceChannels = [];
let activeUserId;
let heartbeatTimer;
const listeners = new Set();
let onlineIds = new Set();

function emitPresence() {
  listeners.forEach((listener) => listener(new Set(onlineIds)));
}

function syncPresenceState() {
  const next = new Set();
  presenceChannels.forEach((channel) => Object.values(channel.presenceState()).flat().forEach((entry) => {
      if (entry?.user_id) next.add(entry.user_id);
    }));
  onlineIds = next;
  emitPresence();
}

async function writeHeartbeat(isOnline = true) {
  if (!activeUserId) return;
  await supabase.from("user_presence").upsert({
    user_id: activeUserId,
    is_online: isOnline,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

export function startSocialPresence(userId, onChange) {
  if (onChange) listeners.add(onChange);
  if (presenceChannels.length && activeUserId === userId) {
    onChange?.(new Set(onlineIds));
    return () => listeners.delete(onChange);
  }

  activeUserId = userId;
  setupPrivateChannels(userId);

  window.clearInterval(heartbeatTimer);
  heartbeatTimer = window.setInterval(() => writeHeartbeat(true), 5 * 60 * 1000);
  return () => listeners.delete(onChange);
}

async function setupPrivateChannels(userId) {
  const { data: relationships } = await supabase.from("friendships").select("user_a,user_b").or(`user_a.eq.${userId},user_b.eq.${userId}`);
  await supabase.realtime.setAuth();
  const tabId = crypto.randomUUID();
  presenceChannels = (relationships || []).map((friendship) => {
    const topic = `friends:${friendship.user_a}:${friendship.user_b}`;
    const channel = supabase.channel(topic, { config: { private: true, presence: { key: `${userId}:${tabId}` } } });
    channel.on("presence", { event: "sync" }, syncPresenceState)
      .on("presence", { event: "join" }, syncPresenceState)
      .on("presence", { event: "leave" }, syncPresenceState)
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        await writeHeartbeat(true);
      });
    return channel;
  });
  if (!presenceChannels.length) await writeHeartbeat(true);
  syncPresenceState();
}

export async function refreshSocialPresence(userId = activeUserId) {
  await Promise.all(presenceChannels.map((channel) => supabase.removeChannel(channel)));
  presenceChannels = [];
  onlineIds = new Set();
  emitPresence();
  if (userId) await setupPrivateChannels(userId);
}

export function onSocialPresenceChange(listener) {
  listeners.add(listener);
  listener(new Set(onlineIds));
  return () => listeners.delete(listener);
}
