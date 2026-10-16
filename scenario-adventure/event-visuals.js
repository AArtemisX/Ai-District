// Presentation only. Keys must follow EVENT_TYPES from board-events.js; the tile→type mapping lives there.
// iconPath is a 24×24 stroke icon so each type is recognisable without relying on color.
export const EVENT_VISUALS = Object.freeze({
  ACTION: Object.freeze({ color: "#2388f5", dark: "#0755ae", label: "เหตุการณ์การ์ด", shortLabel: "ACTION", iconPath: "M4 8h11v12H4z M8 4h12v12h-5 M7 13h5" }),
  BONUS: Object.freeze({ color: "#39c86a", dark: "#14753a", label: "ช่องโบนัส", shortLabel: "BONUS", iconPath: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z" }),
  SUPPORT: Object.freeze({ color: "#f5a623", dark: "#9a5a05", label: "การสนับสนุน", shortLabel: "SUPPORT", iconPath: "M12 4v16 M4 12h16" }),
  RISK: Object.freeze({ color: "#f0525f", dark: "#9c2133", label: "ความเสี่ยง", shortLabel: "RISK", iconPath: "M12 3l10 18H2z M12 10v5 M12 18v.5" }),
  DECISION: Object.freeze({ color: "#925de5", dark: "#52259b", label: "การตัดสินใจ", shortLabel: "DECISION", iconPath: "M12 21v-8 M12 13L5 6 M12 13l7-7 M3 4h4v4 M17 4h4v4" }),
});

export function eventVisualForType(type) {
  const visual = EVENT_VISUALS[type];
  if (!visual) throw new Error(`UNKNOWN_EVENT_VISUAL:${type}`);
  return visual;
}

// Per-kind BONUS glyphs. Keys follow BONUS_KINDS; the tile→kind mapping lives in board-events.js (TILE_BONUS_KINDS).
export const BONUS_VISUALS = Object.freeze({
  FORWARD_2: Object.freeze({ glyph: "⏩", shortLabel: "+2 ช่อง" }),
  RP_PLUS_1: Object.freeze({ glyph: "★", shortLabel: "RP +1" }),
  STABILITY_PLUS_1: Object.freeze({ glyph: "♥", shortLabel: "STAB +1" }),
  REST: Object.freeze({ glyph: "☕", shortLabel: "พัก" }),
});

export function bonusVisualForKind(kind) {
  const bonus = BONUS_VISUALS[kind];
  if (!bonus) throw new Error(`UNKNOWN_BONUS_VISUAL:${kind}`);
  return Object.freeze({ ...EVENT_VISUALS.BONUS, ...bonus, bonusKind: kind });
}

// Tile visual: the event-type visual, refined with the BONUS kind glyph when the tile is a BONUS tile.
export function tileVisualFor(eventType, bonusKind = null) {
  return eventType === "BONUS" ? bonusVisualForKind(bonusKind) : eventVisualForType(eventType);
}
