// Remember where the player stood (and which exhibit was open) before leaving for a lesson, so the
// palace can put them back on return. sessionStorage only; one-shot read; validated on the way in.
import { EXHIBIT_BY_ID } from "../config/exhibits.js";
import { PALACE } from "../config/palace-layout.js";

export const PALACE_VISIT_KEY = "aiDistrict.crystalPalace.visit.v1";
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function createVisit({ x, z, heading = 0, exhibitId = null }, now = Date.now()) {
  return { schemaVersion: 1, x, z, heading, exhibitId, savedAt: now };
}

export function parseVisit(value, now = Date.now()) {
  try {
    const visit = typeof value === "string" ? JSON.parse(value) : value;
    if (visit?.schemaVersion !== 1) return null;
    const { x, z, heading, exhibitId, savedAt } = visit;
    if (![x, z, heading, savedAt].every(Number.isFinite)) return null;
    if (Math.abs(x) > PALACE.halfLength || z < PALACE.transeptNorth || z > PALACE.transeptSouth) return null;
    if (now - savedAt > MAX_AGE_MS || savedAt > now + 60_000) return null;
    return { x, z, heading, exhibitId: exhibitId && EXHIBIT_BY_ID[exhibitId] ? exhibitId : null };
  } catch {
    return null;
  }
}

export function saveVisit(storage, visit) {
  try { storage.setItem(PALACE_VISIT_KEY, JSON.stringify(createVisit(visit))); return true; } catch { return false; }
}

export function takeVisit(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(PALACE_VISIT_KEY);
    storage.removeItem(PALACE_VISIT_KEY);
    return raw ? parseVisit(raw, now) : null;
  } catch {
    return null;
  }
}
