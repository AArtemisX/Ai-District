import { CHARACTER_BY_ID, CHARACTER_ACCESS } from "./character-roster.js";

export const CHARACTER_STATES = Object.freeze({ FREE: "FREE", LOCKED: "LOCKED", UNLOCKED: "UNLOCKED", LOADING: "LOADING", ERROR: "ERROR" });

// Ephemeral read result only. Never persist this object as evidence of ownership.
export function ownershipSnapshot(userId, status = "LOADING", characterIds = []) {
  return Object.freeze({ userId, status, characterIds: Object.freeze([...characterIds]) });
}

export function characterOwnershipState(characterId, snapshot, userId) {
  const character = CHARACTER_BY_ID[characterId];
  if (!character) return CHARACTER_STATES.LOCKED;
  if (character.access === CHARACTER_ACCESS.FREE) return CHARACTER_STATES.FREE;
  if (!userId || snapshot?.userId !== userId) return CHARACTER_STATES.ERROR;
  if (snapshot.status === "LOADING") return CHARACTER_STATES.LOADING;
  if (snapshot.status !== "READY") return CHARACTER_STATES.ERROR;
  return snapshot.characterIds.includes(characterId) ? CHARACTER_STATES.UNLOCKED : CHARACTER_STATES.LOCKED;
}

export async function loadCharacterOwnership(client, userId, { timeoutMs = 8000 } = {}) {
  let timer;
  const controller = new AbortController();
  try {
    const request = async () => {
      const before = await client.auth.getUser();
      if (!userId || before.error || before.data?.user?.id !== userId) throw new Error("ACCOUNT_CHANGED");
      const result = await client.from("user_character_unlocks")
        .select("user_id,character_id,source_lesson_id,source_attempt_id,unlocked_at")
        .eq("user_id", userId).abortSignal(controller.signal);
      if (result.error || !Array.isArray(result.data)) throw new Error("OWNERSHIP_UNAVAILABLE");
      const after = await client.auth.getUser();
      if (after.error || after.data?.user?.id !== userId) throw new Error("ACCOUNT_CHANGED");
      const ids = new Set();
      for (const row of result.data) {
        if (row.user_id !== userId || CHARACTER_BY_ID[row.character_id]?.access !== CHARACTER_ACCESS.LOCKED
          || !row.source_lesson_id || !row.source_attempt_id || !Number.isFinite(Date.parse(row.unlocked_at))) {
          throw new Error("INVALID_OWNERSHIP_RESPONSE");
        }
        ids.add(row.character_id);
      }
      return ownershipSnapshot(userId, "READY", ids);
    };
    return await Promise.race([
      request(),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("OWNERSHIP_TIMEOUT")); }, timeoutMs); }),
    ]);
  } catch {
    return ownershipSnapshot(userId, "ERROR");
  } finally {
    clearTimeout(timer);
  }
}
