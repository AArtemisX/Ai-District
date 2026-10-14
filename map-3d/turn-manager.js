import { BATTLE_TILE_EVENTS } from "./battle-config.js";
export { GAME_PHASES, PHASE_LABELS, TURN_ORDER, canTransition, transitionPhase, nextTurn, rollDie } from "./turn-core.js";

export const TILE_EVENTS = BATTLE_TILE_EVENTS;

export function getTileEvent(tileIndex) {
  const event = TILE_EVENTS[((tileIndex % TILE_EVENTS.length) + TILE_EVENTS.length) % TILE_EVENTS.length];
  return { ...event, tileIndex, duration: Math.max(30, event.duration) };
}
