import { supabase, requirePlayer, setPlayerHeader, toast } from "./flow-common.js";

const $ = (selector) => document.querySelector(selector);
const state = { user: null, profile: null, room: null, members: [], channel: null, busy: false };
const code = new URLSearchParams(location.search).get("code")?.trim().toUpperCase();

function friendlyError(error) {
  const message = error?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่";
  return message.replace(/^P0001:\s*/i, "");
}

function displayName(profile) { return profile?.display_name || profile?.username || "ผู้เล่น"; }
function initial(profile) { return displayName(profile).trim().charAt(0).toUpperCase() || "P"; }

async function copyText(value, message) {
  await navigator.clipboard.writeText(value);
  toast(message, "success");
}

function slotCard(slot, index) {
  if (slot?.kind === "human") {
    const owner = slot.member.user_id === state.room.owner_id;
    return `<article class="player-slot occupied"><span class="slot-number">0${index + 1}</span><div class="slot-avatar">${initial(slot.member.profiles)}</div><div><strong>${displayName(slot.member.profiles)}</strong><small>${owner ? "หัวหน้าห้อง" : slot.member.is_ready ? "พร้อมแล้ว" : "กำลังเตรียมตัว"} · ${slot.member.characters?.name || "Agent"}</small></div><span class="ready-mark ${slot.member.is_ready ? "is-ready" : ""}">${slot.member.is_ready ? "✓" : "…"}</span>${state.room.owner_id === state.user.id && !owner ? `<button class="kick-player" data-kick-player="${slot.member.user_id}" aria-label="นำผู้เล่นออก">×</button>` : ""}</article>`;
  }
  if (slot?.kind === "bot") return `<article class="player-slot bot"><span class="slot-number">0${index + 1}</span><div class="slot-avatar">AI</div><div><strong>AI Bot ${slot.number}</strong><small>บอทฝึกซ้อม · พร้อมแล้ว</small></div><span class="ready-mark is-ready">✓</span></article>`;
  if (slot?.kind === "closed") return `<article class="player-slot closed"><span class="slot-number">0${index + 1}</span><div class="slot-avatar">—</div><div><strong>ปิดช่อง</strong><small>หัวหน้าห้องจำกัดจำนวนผู้เล่น</small></div></article>`;
  return `<article class="player-slot empty"><span class="slot-number">0${index + 1}</span><div class="slot-avatar">＋</div><div><strong>รอผู้เล่น</strong><small>แชร์เลขห้อง ${state.room.room_code} เพื่อเชิญเพื่อน</small></div></article>`;
}

function renderRoom() {
  const owner = state.room.owner_id === state.user.id;
  const slots = state.members.map((member) => ({ kind: "human", member }));
  for (let i = 0; i < state.room.bot_count; i += 1) slots.push({ kind: "bot", number: i + 1 });
  while (slots.length < state.room.max_players) slots.push({ kind: "empty" });
  while (slots.length < 4) slots.push({ kind: "closed" });

  $("#waiting-room-name").textContent = state.room.name;
  $("#waiting-room-code").textContent = state.room.room_code;
  $("#room-count-label").textContent = `${state.members.length + state.room.bot_count} / ${state.room.max_players}`;
  $("#player-slots").innerHTML = slots.slice(0, 4).map(slotCard).join("");
  $("#owner-controls").hidden = !owner;
  $("#member-controls").hidden = owner;
  $("#start-game-button").hidden = !owner;
  $("#max-player-select").value = String(state.room.max_players);
  $("#bot-count").textContent = state.room.bot_count;
  $("#leave-room-button").textContent = owner ? "ยุบห้อง" : "ออกจากห้อง";

  const me = state.members.find((member) => member.user_id === state.user.id);
  if (me && !owner) {
    $("#ready-button").textContent = me.is_ready ? "✓ พร้อมแล้ว" : "ฉันพร้อมแล้ว";
    $("#ready-button").classList.toggle("is-ready", me.is_ready);
  }

  const filled = state.members.length + state.room.bot_count === state.room.max_players;
  const everyoneReady = state.members.every((member) => member.is_ready);
  const canStart = filled && everyoneReady && state.room.max_players >= 2;
  $("#start-game-button").disabled = !canStart || state.busy;
  $("#readiness-icon").textContent = canStart ? "✓" : filled ? "⌛" : "＋";
  $("#readiness-title").textContent = canStart ? "ทุกคนพร้อมแล้ว" : filled ? "รอผู้เล่นกดพร้อม" : "กำลังรอสมาชิก";
  $("#readiness-detail").textContent = canStart ? "หัวหน้าห้องเริ่มเกมได้เลย" : filled ? "สมาชิกทุกคนต้องยืนยันความพร้อม" : `ยังว่าง ${state.room.max_players - state.members.length - state.room.bot_count} ช่อง`;
}

async function loadRoom() {
  const { data: room, error: roomError } = await supabase.from("lobby_rooms").select("id,room_code,owner_id,name,max_players,status,bot_count").eq("room_code", code).maybeSingle();
  if (roomError || !room) throw new Error("ไม่พบห้องจากรหัสนี้");
  const { data: members, error: memberError } = await supabase.from("lobby_members").select("room_id,user_id,member_role,is_ready,character_code,joined_at,profiles(display_name,username,avatar_url),characters(name,accent_color)").eq("room_id", room.id).order("joined_at");
  if (memberError) throw memberError;
  if (!(members || []).some((member) => member.user_id === state.user.id)) throw new Error("คุณไม่ได้เป็นสมาชิกของห้องนี้");
  state.room = room; state.members = members || [];
  if (room.status === "in_game") {
    const { data: session } = await supabase.from("ai_world_sessions").select("id").eq("room_id", room.id).maybeSingle();
    if (session) { location.assign(`map-3d.html?session=${session.id}`); return; }
  }
  renderRoom();
}

async function configureRoom(maxPlayers, botCount) {
  state.busy = true; renderRoom();
  const { error } = await supabase.rpc("configure_ai_room", { room_uuid: state.room.id, desired_players: maxPlayers, desired_bots: botCount });
  state.busy = false;
  if (error) throw error;
  await loadRoom();
}

async function loadFriendsForInvite() {
  $("#room-friend-list").innerHTML = `<div class="social-loading">กำลังโหลดรายชื่อเพื่อน…</div>`;
  const { data: links, error } = await supabase.from("friendships").select("user_a,user_b").or(`user_a.eq.${state.user.id},user_b.eq.${state.user.id}`);
  if (error) throw error;
  const memberIds = new Set(state.members.map((member) => member.user_id));
  const ids = (links || []).map((link) => link.user_a === state.user.id ? link.user_b : link.user_a).filter((id) => !memberIds.has(id));
  if (!ids.length) { $("#room-friend-list").innerHTML = `<div class="social-empty small">ยังไม่มีเพื่อนที่เชิญได้</div>`; return; }
  const { data: profiles, error: profileError } = await supabase.from("profiles").select("id,display_name,username").in("id", ids);
  if (profileError) throw profileError;
  $("#room-friend-list").innerHTML = (profiles || []).map((profile) => `<article><span class="avatar">${initial(profile)}</span><div><strong>${displayName(profile)}</strong><small>ส่งคำเชิญเข้าห้อง ${state.room.room_code}</small></div><button data-invite-friend="${profile.id}">เชิญ</button></article>`).join("");
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  try {
    if (button.matches("[data-close-dialog]")) button.closest("dialog")?.close();
    else if (button.dataset.inviteFriend) {
      button.disabled = true;
      const { error } = await supabase.rpc("invite_friend_to_room", { room_uuid: state.room.id, friend_uuid: button.dataset.inviteFriend });
      if (error) throw error;
      button.textContent = "ส่งแล้ว"; toast("ส่งคำเชิญให้เพื่อนแล้ว", "success");
    } else if (button.dataset.kickPlayer) {
      if (!confirm("นำผู้เล่นคนนี้ออกจากห้องใช่ไหม?")) return;
      const { error } = await supabase.from("lobby_members").delete().eq("room_id", state.room.id).eq("user_id", button.dataset.kickPlayer);
      if (error) throw error;
    }
  } catch (error) { toast(friendlyError(error), "error"); button.disabled = false; }
});

$("#copy-room-code").addEventListener("click", () => copyText(state.room.room_code, "คัดลอกรหัสห้องแล้ว"));
$("#copy-room-link").addEventListener("click", () => copyText(location.href, "คัดลอกลิงก์ห้องแล้ว"));
$("#invite-friends-button").addEventListener("click", async () => { try { await loadFriendsForInvite(); $("#room-friends-dialog").showModal(); } catch (error) { toast(friendlyError(error), "error"); } });
$("#max-player-select").addEventListener("change", async (event) => { try { await configureRoom(Number(event.target.value), Math.min(state.room.bot_count, Number(event.target.value) - state.members.length)); } catch (error) { toast(friendlyError(error), "error"); event.target.value = String(state.room.max_players); } });
$("#add-bot").addEventListener("click", async () => { try { await configureRoom(state.room.max_players, state.room.bot_count + 1); } catch (error) { toast(friendlyError(error), "error"); } });
$("#remove-bot").addEventListener("click", async () => { try { await configureRoom(state.room.max_players, Math.max(0, state.room.bot_count - 1)); } catch (error) { toast(friendlyError(error), "error"); } });
$("#ready-button").addEventListener("click", async () => { const me = state.members.find((member) => member.user_id === state.user.id); const { error } = await supabase.from("lobby_members").update({ is_ready: !me.is_ready }).eq("room_id", state.room.id).eq("user_id", state.user.id); if (error) toast(friendlyError(error), "error"); });
$("#start-game-button").addEventListener("click", async () => { state.busy = true; renderRoom(); const { data, error } = await supabase.rpc("start_ai_room", { room_uuid: state.room.id }); if (error) { state.busy = false; renderRoom(); toast(friendlyError(error), "error"); return; } location.assign(`map-3d.html?session=${data}`); });
$("#leave-room-button").addEventListener("click", async () => {
  const owner = state.room.owner_id === state.user.id;
  if (!confirm(owner ? "ยุบห้องนี้สำหรับทุกคนใช่ไหม?" : "ออกจากห้องนี้ใช่ไหม?")) return;
  const query = owner ? supabase.from("lobby_rooms").delete().eq("id", state.room.id) : supabase.from("lobby_members").delete().eq("room_id", state.room.id).eq("user_id", state.user.id);
  const { error } = await query; if (error) { toast(friendlyError(error), "error"); return; } location.assign("ai-world.html");
});

try {
  if (!code) throw new Error("กรุณาระบุรหัสห้อง");
  const player = await requirePlayer(); state.user = player.user; state.profile = player.profile; setPlayerHeader(state.profile);
  await loadRoom();
  state.channel = supabase.channel(`waiting-room-${state.room.id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "lobby_rooms", filter: `id=eq.${state.room.id}` }, () => loadRoom().catch(() => {}))
    .on("postgres_changes", { event: "*", schema: "public", table: "lobby_members", filter: `room_id=eq.${state.room.id}` }, () => loadRoom().catch(() => {}))
    .subscribe();
} catch (error) {
  toast(friendlyError(error), "error");
  $("#waiting-room-message").textContent = friendlyError(error);
}
