import QRCode from "https://esm.sh/qrcode@1.5.4?bundle";
import { requirePlayer, setPlayerHeader, setupLogout, supabase, toast } from "./flow-common.js";
import { onSocialPresenceChange, refreshSocialPresence } from "./social-presence.js";

const state = {
  user: null,
  profile: null,
  friends: [],
  requests: [],
  notifications: [],
  onlineIds: new Set(),
  activeFriend: null,
  conversationId: null,
  oldestMessageAt: null,
  messageChannel: null,
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
const displayName = (profile) => profile?.display_name || profile?.username || "ผู้เล่น";
const avatarLetter = (profile) => displayName(profile).trim().charAt(0).toUpperCase() || "P";

function friendlyError(error) {
  const code = error?.message || "";
  const messages = {
    INVITE_INVALID: "ลิงก์เชิญไม่ถูกต้อง หมดอายุ หรือถูกยกเลิกแล้ว",
    CANNOT_ADD_SELF: "คุณไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้",
    ALREADY_FRIENDS: "คุณเป็นเพื่อนกันอยู่แล้ว",
    REQUEST_RECEIVED: "ผู้เล่นคนนี้ส่งคำขอถึงคุณแล้ว กรุณาตอบรับจากรายการคำขอ",
    RATE_LIMITED: "ส่งคำขอบ่อยเกินไป กรุณารอหนึ่งชั่วโมงแล้วลองใหม่",
    USER_UNAVAILABLE: "ไม่สามารถติดต่อผู้เล่นคนนี้ได้",
    NOT_FRIENDS: "ไม่พบความสัมพันธ์เพื่อน",
  };
  return Object.entries(messages).find(([key]) => code.includes(key))?.[1] || code || "ระบบโซเชียลไม่พร้อมใช้งาน กรุณาลองใหม่";
}

function timeAgo(timestamp, allowed = true) {
  if (!allowed || !timestamp) return "ไม่ทราบเวลาออนไลน์ล่าสุด";
  const seconds = Math.max(0, (Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return "ออนไลน์ล่าสุดเมื่อสักครู่";
  if (seconds < 3600) return `ออนไลน์ล่าสุด ${Math.floor(seconds / 60)} นาทีที่แล้ว`;
  if (seconds < 86400) return `ออนไลน์ล่าสุด ${Math.floor(seconds / 3600)} ชั่วโมงที่แล้ว`;
  if (seconds < 172800) return "ออนไลน์ล่าสุดเมื่อวาน";
  return `ออนไลน์ล่าสุด ${Math.floor(seconds / 86400)} วันที่แล้ว`;
}

function isFriendOnline(friend) {
  return friend.presence?.share_online_status !== false && state.onlineIds.has(friend.id);
}

function statusText(friend) {
  if (isFriendOnline(friend)) return friend.presence?.current_game_status || "ออนไลน์";
  return timeAgo(friend.presence?.last_seen_at || friend.last_seen_at, friend.presence?.share_last_seen !== false);
}

function friendCard(friend) {
  const online = isFriendOnline(friend);
  const unread = state.notifications.filter((item) => !item.read_at && item.type === "direct_message" && item.actor_id === friend.id).length;
  return `<button class="friend-card" data-open-profile="${friend.id}">
    <span class="friend-avatar-wrap"><span class="avatar">${escapeHtml(avatarLetter(friend))}</span><i class="presence-dot ${online ? "online" : "offline"}"></i></span>
    <span class="friend-card-copy"><strong>${escapeHtml(displayName(friend))}</strong><small>${escapeHtml(statusText(friend))}</small></span>
    ${unread ? `<b class="unread-pill">${unread}</b>` : ""}<span class="friend-open">›</span>
  </button>`;
}

async function fetchProfiles(ids) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("profiles").select("id,username,display_name,avatar_url,level,last_seen_at").in("id", ids);
  if (error) throw error;
  return data || [];
}

async function loadFriends() {
  const { data: rows, error } = await supabase.from("friendships").select("user_a,user_b,created_at").or(`user_a.eq.${state.user.id},user_b.eq.${state.user.id}`);
  if (error) throw error;
  const friendIds = (rows || []).map((row) => row.user_a === state.user.id ? row.user_b : row.user_a);
  const [profiles, presenceResult, interactionsResult] = await Promise.all([
    fetchProfiles(friendIds),
    friendIds.length ? supabase.from("user_presence").select("user_id,is_online,current_game_status,share_online_status,share_last_seen,last_seen_at").in("user_id", friendIds) : Promise.resolve({ data: [] }),
    supabase.from("social_interactions").select("user_a,user_b,score,interaction_date").gte("interaction_date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
  ]);
  if (presenceResult.error) throw presenceResult.error;
  const presenceById = new Map((presenceResult.data || []).map((item) => [item.user_id, item]));
  const scoreById = new Map();
  (interactionsResult.data || []).forEach((item) => {
    const friendId = item.user_a === state.user.id ? item.user_b : item.user_a;
    scoreById.set(friendId, (scoreById.get(friendId) || 0) + item.score);
  });
  state.friends = profiles.map((profile) => ({ ...profile, presence: presenceById.get(profile.id), interactionScore: scoreById.get(profile.id) || 0 }));
}

async function loadRequests() {
  const { data, error } = await supabase.from("friend_requests").select("id,sender_id,receiver_id,status,created_at").eq("status", "pending").or(`sender_id.eq.${state.user.id},receiver_id.eq.${state.user.id}`).order("created_at", { ascending: false });
  if (error) throw error;
  const profileIds = [...new Set((data || []).flatMap((item) => [item.sender_id, item.receiver_id]).filter((id) => id !== state.user.id))];
  const profiles = await fetchProfiles(profileIds);
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  state.requests = (data || []).map((item) => ({ ...item, profile: byId.get(item.sender_id === state.user.id ? item.receiver_id : item.sender_id) }));
}

async function loadNotifications() {
  const { data, error } = await supabase.from("notifications").select("id,actor_id,type,related_entity_id,created_at,read_at").order("created_at", { ascending: false }).limit(40);
  if (error) throw error;
  const actors = await fetchProfiles([...new Set((data || []).map((item) => item.actor_id).filter(Boolean))]);
  const actorById = new Map(actors.map((profile) => [profile.id, profile]));
  state.notifications = (data || []).map((item) => ({ ...item, actor: actorById.get(item.actor_id) }));
}

function sortedFriends() {
  return [...state.friends].sort((a, b) => Number(isFriendOnline(b)) - Number(isFriendOnline(a)) || b.interactionScore - a.interactionScore || new Date(b.presence?.last_seen_at || b.last_seen_at || 0) - new Date(a.presence?.last_seen_at || a.last_seen_at || 0));
}

function renderDashboard() {
  const ordered = sortedFriends();
  const incoming = state.requests.filter((item) => item.receiver_id === state.user.id);
  $("#friend-total").textContent = state.friends.length;
  $("#friend-online").textContent = state.friends.filter(isFriendOnline).length;
  $("#request-total").textContent = incoming.length;
  $("#request-badge").textContent = incoming.length;
  const frequent = ordered.slice(0, 5);
  $("#frequent-friends").innerHTML = frequent.length ? frequent.map(friendCard).join("") : `<div class="social-empty"><span>🌟</span><h3>เริ่มต้นการผจญภัยกับเพื่อน</h3><p>สร้างลิงก์ส่วนตัวแล้วส่งให้เพื่อนของคุณ</p><button data-open-add class="social-primary">เพิ่มเพื่อนคนแรก</button></div>`;
  $("#friend-requests").innerHTML = incoming.length ? incoming.map((request) => `<article class="request-card"><div class="avatar">${escapeHtml(avatarLetter(request.profile))}</div><div><strong>${escapeHtml(displayName(request.profile))}</strong><small>อยากเป็นเพื่อนกับคุณ</small></div><div class="request-actions"><button data-request-accept="${request.id}" aria-label="ยอมรับ">✓</button><button data-request-decline="${request.id}" aria-label="ปฏิเสธ">×</button></div></article>`).join("") : `<div class="social-empty small">ยังไม่มีคำขอใหม่</div>`;
  renderNotificationBadge();
}

function renderAllFriends(filter = "") {
  const keyword = filter.trim().toLocaleLowerCase("th");
  const friends = sortedFriends().filter((friend) => displayName(friend).toLocaleLowerCase("th").includes(keyword));
  $("#all-friends-count").textContent = state.friends.length;
  const online = friends.filter(isFriendOnline);
  const offline = friends.filter((friend) => !isFriendOnline(friend));
  const group = (label, items) => `<section class="friend-list-group"><h3>${label} <span>${items.length}</span></h3>${items.length ? items.map(friendCard).join("") : `<p>ไม่มีรายชื่อในกลุ่มนี้</p>`}</section>`;
  $("#all-friends-list").innerHTML = group("ออนไลน์", online) + group("ออฟไลน์", offline);
}

function renderNotificationBadge() {
  const unread = state.notifications.filter((item) => !item.read_at).length;
  $("#notification-count").hidden = !unread;
  $("#notification-count").textContent = unread > 99 ? "99+" : unread;
}

function renderNotifications() {
  const copy = { friend_request: "ส่งคำขอเป็นเพื่อนถึงคุณ", friend_accepted: "ตอบรับคำขอเป็นเพื่อนแล้ว", direct_message: "ส่งข้อความใหม่ถึงคุณ", room_invite: "คำเชิญห้องจากระบบเดิม (ไม่ใช้งานแล้ว)" };
  $("#notification-list").innerHTML = state.notifications.length ? state.notifications.map((item) => `<button class="notification-item ${item.read_at ? "" : "unread"}" data-notification-id="${item.id}" data-actor-id="${item.actor_id || ""}"><span class="avatar">${escapeHtml(avatarLetter(item.actor))}</span><span><strong>${escapeHtml(displayName(item.actor))}</strong><small>${copy[item.type] || "มีการอัปเดตใหม่"}</small><time>${new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</time></span></button>`).join("") : `<div class="social-empty small">ยังไม่มีการแจ้งเตือน</div>`;
}

function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
}

function openFriendProfile(friendId) {
  const friend = state.friends.find((item) => item.id === friendId);
  if (!friend) return;
  state.activeFriend = friend;
  const online = isFriendOnline(friend);
  $("#friend-profile-content").innerHTML = `<div class="profile-modal-hero"><span class="avatar">${escapeHtml(avatarLetter(friend))}</span><i class="presence-dot ${online ? "online" : "offline"}"></i></div><p class="step">FRIEND PROFILE</p><h2>${escapeHtml(displayName(friend))}</h2><p class="profile-status">${escapeHtml(statusText(friend))}</p><div class="profile-facts"><span><b>LV. ${friend.level || 1}</b><small>ระดับผู้เล่น</small></span><span><b>${friend.interactionScore}</b><small>คะแนนปฏิสัมพันธ์ 30 วัน</small></span></div><div class="profile-primary-actions"><button data-profile-chat class="social-primary">💬 แชทส่วนตัว</button><button data-profile-room class="social-secondary">🎮 เปิด Ai Word</button></div><details class="profile-more"><summary>เพิ่มเติม</summary><button data-remove-friend>ลบเพื่อน</button><button data-block-friend>บล็อกผู้ใช้</button><button data-report-friend>รายงานผู้ใช้</button></details>`;
  openDialog($("#friend-profile-dialog"));
}

async function respondRequest(id, accept) {
  const { error } = await supabase.rpc("respond_friend_request", { request_uuid: id, accept_request: accept });
  if (error) throw error;
  toast(accept ? "เพิ่มเป็นเพื่อนแล้ว ✨" : "ปฏิเสธคำขอแล้ว", accept ? "success" : "info");
  await reloadSocial();
  if (accept) await refreshSocialPresence(state.user.id);
}

async function createInvite() {
  const { data: token, error } = await supabase.rpc("create_friend_invite");
  if (error) throw error;
  const url = new URL("friends.html", window.location.href);
  url.searchParams.set("invite", token);
  $("#friend-invite-url").value = url.toString();
  await QRCode.toCanvas($("#friend-qr"), url.toString(), { width: 220, margin: 1, errorCorrectionLevel: "H", color: { dark: "#225b8f", light: "#ffffff" } });
  return url.toString();
}

async function openInviteCreator() {
  openDialog($("#add-friend-dialog"));
  try { await createInvite(); } catch (error) { toast(friendlyError(error), "error"); }
}

async function handleInviteFromUrl(token) {
  openDialog($("#invite-preview-dialog"));
  const { data, error } = await supabase.rpc("friend_invite_preview", { invite_token: token });
  const profile = data?.[0];
  if (error || !profile) {
    $("#invite-preview-content").innerHTML = `<div class="social-empty"><span>🔗</span><h3>ลิงก์นี้ใช้ไม่ได้แล้ว</h3><p>${escapeHtml(friendlyError(error))}</p></div>`;
    return;
  }
  const labels = { self: "นี่คือลิงก์ของคุณเอง", friends: "คุณเป็นเพื่อนกันอยู่แล้ว", sent: "ส่งคำขอแล้ว", received: "มีคำขอจากผู้เล่นนี้รออยู่" };
  const canSend = profile.relationship_status === "available";
  $("#invite-preview-content").innerHTML = `<div class="profile-modal-hero"><span class="avatar">${escapeHtml(avatarLetter(profile))}</span></div><p class="step">FRIEND INVITATION</p><h2>${escapeHtml(displayName(profile))}</h2><p>LV. ${profile.level || 1} · ${labels[profile.relationship_status] || "เชิญคุณมาเป็นเพื่อนใน AI District"}</p>${canSend ? `<button class="social-primary full-button" data-send-invite-request>ส่งคำขอเป็นเพื่อน</button>` : ""}`;
}

async function sendInviteRequest() {
  const token = new URLSearchParams(window.location.search).get("invite");
  const { error } = await supabase.rpc("send_friend_request_by_invite", { invite_token: token });
  if (error) throw error;
  toast("ส่งคำขอเป็นเพื่อนแล้ว 💌", "success");
  $("#invite-preview-dialog").close();
  history.replaceState({}, "", "friends.html");
  await reloadSocial();
}

async function openChat(friend) {
  state.activeFriend = friend;
  $("#chat-avatar").textContent = avatarLetter(friend);
  $("#chat-name").textContent = displayName(friend);
  $("#chat-status").textContent = statusText(friend);
  $("#chat-messages").innerHTML = `<div class="social-loading">กำลังโหลดข้อความ…</div>`;
  openDialog($("#chat-dialog"));
  const { data, error } = await supabase.rpc("open_direct_conversation", { friend_uuid: friend.id });
  if (error) throw error;
  state.conversationId = data;
  await loadMessages();
  await supabase.rpc("mark_conversation_read", { conversation_uuid: data });
  await loadNotifications(); renderNotificationBadge();
  if (state.messageChannel) await supabase.removeChannel(state.messageChannel);
  state.messageChannel = supabase.channel(`direct-${data}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${data}` }, async () => {
    await loadMessages();
    if ($("#chat-dialog").open) await supabase.rpc("mark_conversation_read", { conversation_uuid: data });
  }).subscribe();
}

async function loadMessages(before = null) {
  let query = supabase.from("direct_messages").select("id,sender_id,body,created_at,read_at").eq("conversation_id", state.conversationId).order("created_at", { ascending: false }).limit(30);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw error;
  const messages = (data || []).reverse();
  if (!before) $("#chat-messages").innerHTML = "";
  const fragment = messages.map((message) => `<article class="chat-bubble ${message.sender_id === state.user.id ? "mine" : "theirs"}"><p>${escapeHtml(message.body)}</p><time>${new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))}</time></article>`).join("");
  if (before) $("#chat-messages").insertAdjacentHTML("afterbegin", fragment); else $("#chat-messages").innerHTML = fragment || `<div class="social-empty small">ยังไม่มีข้อความ ลองทักทายเพื่อนของคุณดูสิ</div>`;
  state.oldestMessageAt = messages[0]?.created_at || null;
  $("#load-older-messages").hidden = (data || []).length < 30;
  if (!before) $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
}

async function reloadSocial() {
  await Promise.all([loadFriends(), loadRequests(), loadNotifications()]);
  renderDashboard();
  if ($("#all-friends-dialog").open) renderAllFriends($("#friend-search-input").value);
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button,[data-open-profile]");
  if (!button) return;
  try {
    if (button.matches("[data-close-dialog]")) button.closest("dialog")?.close();
    else if (button.matches("[data-open-add]")) await openInviteCreator();
    else if (button.dataset.openProfile) openFriendProfile(button.dataset.openProfile);
    else if (button.dataset.requestAccept) await respondRequest(button.dataset.requestAccept, true);
    else if (button.dataset.requestDecline) await respondRequest(button.dataset.requestDecline, false);
    else if (button.matches("[data-send-invite-request]")) await sendInviteRequest();
    else if (button.matches("[data-profile-chat]")) { $("#friend-profile-dialog").close(); await openChat(state.activeFriend); }
    else if (button.matches("[data-profile-room]")) window.location.assign("ai-world.html");
    else if (button.dataset.notificationId) {
      const { error } = await supabase.rpc("mark_notification_read", { notification_uuid: button.dataset.notificationId });
      if (error) throw error;
      await loadNotifications(); renderNotifications(); renderNotificationBadge();
      const friend = state.friends.find((item) => item.id === button.dataset.actorId);
      if (friend) { $("#notification-dialog").close(); openFriendProfile(friend.id); }
    }
    else if (button.matches("[data-remove-friend]") && confirm(`ลบ ${displayName(state.activeFriend)} ออกจากเพื่อนใช่ไหม?`)) { await supabase.rpc("remove_friend", { friend_uuid: state.activeFriend.id }).then(({ error }) => { if (error) throw error; }); $("#friend-profile-dialog").close(); await reloadSocial(); await refreshSocialPresence(state.user.id); }
    else if (button.matches("[data-block-friend]") && confirm(`บล็อก ${displayName(state.activeFriend)} และลบออกจากเพื่อนใช่ไหม?`)) { await supabase.rpc("block_social_user", { target_uuid: state.activeFriend.id }).then(({ error }) => { if (error) throw error; }); $("#friend-profile-dialog").close(); await reloadSocial(); await refreshSocialPresence(state.user.id); }
    else if (button.matches("[data-report-friend]")) { const reason = prompt("กรุณาระบุเหตุผลในการรายงาน"); if (reason) { const { error } = await supabase.rpc("report_social_user", { target_uuid: state.activeFriend.id, report_reason: reason, related_message: null }); if (error) throw error; toast("ส่งรายงานแล้ว ทีมงานจะตรวจสอบต่อไป", "success"); } }
  } catch (error) { toast(friendlyError(error), "error"); }
});

$("#all-friends-button").addEventListener("click", () => { renderAllFriends(); openDialog($("#all-friends-dialog")); });
$("#add-friend-button").addEventListener("click", openInviteCreator);
$("#friend-search-input").addEventListener("input", (event) => renderAllFriends(event.target.value));
$("#notification-button").addEventListener("click", () => { renderNotifications(); openDialog($("#notification-dialog")); });
$("#mark-all-read").addEventListener("click", async () => { await supabase.rpc("mark_notification_read", { notification_uuid: null }); await loadNotifications(); renderNotifications(); renderNotificationBadge(); });
$("#rotate-invite-button").addEventListener("click", async () => { try { await createInvite(); toast("สร้างลิงก์ใหม่แล้ว ลิงก์เดิมถูกยกเลิก", "success"); } catch (error) { toast(friendlyError(error), "error"); } });
$("#copy-invite-button").addEventListener("click", async () => { await navigator.clipboard.writeText($("#friend-invite-url").value); toast("คัดลอกลิงก์แล้ว", "success"); });
$("#save-qr-button").addEventListener("click", () => { const link = document.createElement("a"); link.download = "ai-district-friend-qr.png"; link.href = $("#friend-qr").toDataURL("image/png"); link.click(); });
$("#load-older-messages").addEventListener("click", () => loadMessages(state.oldestMessageAt));
$("#chat-form").addEventListener("submit", async (event) => { event.preventDefault(); const input = $("#chat-input"); const body = input.value.trim(); if (!body) return; input.disabled = true; try { const { error } = await supabase.rpc("send_direct_message", { conversation_uuid: state.conversationId, message_body: body }); if (error) throw error; input.value = ""; } catch (error) { toast(friendlyError(error), "error"); } finally { input.disabled = false; input.focus(); } });
try {
  const player = await requirePlayer();
  state.user = player.user; state.profile = player.profile;
  setPlayerHeader(state.profile); setupLogout();
  await reloadSocial();
  onSocialPresenceChange((onlineIds) => { state.onlineIds = onlineIds; renderDashboard(); if ($("#all-friends-dialog").open) renderAllFriends($("#friend-search-input").value); });
  const realtimeRefresh = () => reloadSocial().catch(() => {});
  supabase.channel(`social-updates-${state.user.id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, realtimeRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, realtimeRefresh)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${state.user.id}` }, async () => { await loadNotifications(); renderNotificationBadge(); toast("มีการแจ้งเตือนใหม่ 🔔", "success"); })
    .subscribe();
  const inviteToken = new URLSearchParams(window.location.search).get("invite");
  if (inviteToken) await handleInviteFromUrl(inviteToken);
  else if (new URLSearchParams(window.location.search).get("action") === "add") await openInviteCreator();
} catch (error) {
  if (!error.message.endsWith("REQUIRED")) toast(friendlyError(error), "error");
}
