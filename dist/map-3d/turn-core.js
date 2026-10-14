export const GAME_PHASES = Object.freeze({
  WAITING: "WAITING",
  ROLLING: "ROLLING",
  MOVING: "MOVING",
  TILE_EVENT: "TILE_EVENT",
  ACTION_PHASE: "ACTION_PHASE",
  TURN_END: "TURN_END",
  GAME_END: "GAME_END",
});

export const PHASE_LABELS = Object.freeze({
  WAITING: "รอทอยลูกเต๋า",
  ROLLING: "กำลังทอย",
  MOVING: "กำลังเดิน",
  TILE_EVENT: "ตรวจสอบช่อง",
  ACTION_PHASE: "Action Phase",
  TURN_END: "จบเทิร์น",
  GAME_END: "จบเกม",
});

const TRANSITIONS = Object.freeze({
  WAITING: [GAME_PHASES.ROLLING, GAME_PHASES.GAME_END],
  ROLLING: [GAME_PHASES.MOVING, GAME_PHASES.GAME_END],
  MOVING: [GAME_PHASES.TILE_EVENT, GAME_PHASES.GAME_END],
  TILE_EVENT: [GAME_PHASES.ACTION_PHASE, GAME_PHASES.GAME_END],
  ACTION_PHASE: [GAME_PHASES.TURN_END, GAME_PHASES.GAME_END],
  TURN_END: [GAME_PHASES.WAITING, GAME_PHASES.GAME_END],
  GAME_END: [],
});

export const TURN_ORDER = Object.freeze(["player", "bot"]);

export function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionPhase(from, to) {
  if (!canTransition(from, to)) throw new Error(`Invalid phase transition: ${from} -> ${to}`);
  return to;
}

export function nextTurn(current, order = TURN_ORDER) {
  const index = order.indexOf(current);
  return order[(index + 1) % order.length];
}

export function rollDie(random = Math.random) {
  const sample = Math.min(.999999999, Math.max(0, random()));
  return Math.floor(sample * 6) + 1;
}

