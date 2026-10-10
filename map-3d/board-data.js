export const TILE_COLORS = ["#55b8ff", "#ffcf54", "#ad7cf6", "#59d184", "#ff829c"];
export const OWNER_COLORS = { player: "#55b8ff", bot: "#ff77a9", neutral: "#d9e8ee" };

export const DISTRICTS = [
  { id: "academy", name: "AI Academy", position: [-5.2, 1.05, -4.2], color: "#55b8ff", rotation: 0.18 },
  { id: "cloud", name: "Cloud Data", position: [5.2, 1.05, -4.2], color: "#ad7cf6", rotation: -0.18 },
  { id: "robot", name: "Robot Lab", position: [-5.2, 1.05, 4.2], color: "#ff77a9", rotation: -0.18 },
  { id: "green", name: "Green AI", position: [5.2, 1.05, 4.2], color: "#59d184", rotation: 0.18 },
];

function perimeterPoint(index) {
  const span = 17.4;
  const min = -span / 2;
  const max = span / 2;
  const step = span / 8;

  // Four corners are shared by adjoining edges instead of being duplicated.
  // 9 top + 7 right + 9 bottom + 7 left = 32 non-overlapping tiles.
  if (index <= 8) return [min + step * index, .82, min];
  if (index <= 15) return [max, .82, min + step * (index - 8)];
  if (index <= 24) return [max - step * (index - 16), .82, max];
  return [min, .82, max - step * (index - 24)];
}

export const BOARD_TILES = Array.from({ length: 32 }, (_, index) => ({
  id: `tile-${index}`,
  index,
  position: perimeterPoint(index),
  color: TILE_COLORS[index % TILE_COLORS.length],
  type: ["DATA", "LEARN", "ETHICS", "ENERGY", "AI"][index % 5],
}));

// The movement path is derived from the actual mesh coordinates above.
// Keep this as the single source of truth when the board layout changes.
export const TILE_POSITIONS = BOARD_TILES.map((tile) => [...tile.position]);

export function normalizeTileIndex(index, tileCount = TILE_POSITIONS.length) {
  return ((index % tileCount) + tileCount) % tileCount;
}

export function buildTilePath(startIndex, steps, tileCount = TILE_POSITIONS.length) {
  const safeSteps = Math.max(0, Math.floor(steps));
  return Array.from({ length: safeSteps }, (_, step) => normalizeTileIndex(startIndex + step + 1, tileCount));
}
