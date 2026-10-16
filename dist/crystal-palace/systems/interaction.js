// Nearest-exhibit lookup for the "E / tap to explore" prompt. Pure.
import { INTERACT_RADIUS } from "../config/palace-layout.js";
import { exhibitInteractRadius } from "../config/exhibits.js";

export function nearestExhibit(player, exhibits, radius = INTERACT_RADIUS) {
  let best = null;
  let bestScore = Infinity;
  for (const item of exhibits) {
    const reach = exhibitInteractRadius(item, radius);
    const distance = Math.hypot(item.x - player.x, item.z - player.z);
    if (distance > reach) continue;
    // Compare relative to each exhibit's own reach so a large landmark doesn't swallow nearby stands.
    const score = distance / reach;
    if (score < bestScore) { best = item; bestScore = score; }
  }
  return best;
}

export const isInteractKey = (code) => code === "KeyE" || code === "Enter";
