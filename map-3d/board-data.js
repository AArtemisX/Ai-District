export const TILE_COLORS = ["#55b8ff", "#ffcf54", "#ad7cf6", "#59d184", "#ff829c"];
export const OWNER_COLORS = { player: "#55b8ff", bot: "#ff77a9", neutral: "#d9e8ee" };

export const DISTRICTS = [
  { id: "academy", name: "AI Academy", position: [-5.2, 1.05, -4.2], color: "#55b8ff", rotation: 0.18 },
  { id: "cloud", name: "Cloud Data", position: [5.2, 1.05, -4.2], color: "#ad7cf6", rotation: -0.18 },
  { id: "robot", name: "Robot Lab", position: [-5.2, 1.05, 4.2], color: "#ff77a9", rotation: -0.18 },
  { id: "green", name: "Green AI", position: [5.2, 1.05, 4.2], color: "#59d184", rotation: 0.18 },
];

function perimeterPoint(index, count = 32) {
  const side = count / 4;
  const step = index % side;
  const t = (step + .5) / side;
  const edge = Math.floor(index / side);
  const span = 17.4;
  const min = -span / 2;
  const max = span / 2;
  if (edge === 0) return [min + span * t, .82, min];
  if (edge === 1) return [max, .82, min + span * t];
  if (edge === 2) return [max - span * t, .82, max];
  return [min, .82, max - span * t];
}

export const BOARD_TILES = Array.from({ length: 32 }, (_, index) => ({
  id: `tile-${index}`,
  index,
  position: perimeterPoint(index),
  color: TILE_COLORS[index % TILE_COLORS.length],
  type: ["DATA", "LEARN", "ETHICS", "ENERGY", "AI"][index % 5],
}));
