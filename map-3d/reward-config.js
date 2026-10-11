export const REWARD_TABLE = Object.freeze({
  SCENARIO_BEST: Object.freeze([
    { kind: "CARD", id: "patch-update" },
    { kind: "CARD", id: "firewall-guard" },
    { kind: "ITEM", id: "energy-cell" },
  ]),
  ITEM_TILE: Object.freeze([
    { kind: "ITEM", id: "repair-kit" },
    { kind: "ITEM", id: "scanner-lens" },
    { kind: "ITEM", id: "speed-chip" },
    { kind: "ITEM", id: "shield-module" },
    { kind: "ITEM", id: "lucky-cache" },
  ]),
  LESSON_COMPLETE: Object.freeze([
    { kind: "CARD", id: "data-strike" },
    { kind: "CARD", id: "secure-backup" },
  ]),
});

export function chooseReward(source, seed = 0) {
  const pool = REWARD_TABLE[source] || [];
  if (!pool.length) return null;
  return pool[Math.abs(Number(seed) || 0) % pool.length];
}

// Integration point for the existing lesson completion flow. Phase 5 keeps
// lesson persistence untouched and exposes only a deterministic reward lookup.
export function getLessonCompletionReward(lessonId) {
  return chooseReward("LESSON_COMPLETE", String(lessonId || "").length);
}

