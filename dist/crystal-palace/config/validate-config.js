// Config validation for the palace layout and exhibits. Pure; returns a list of problems.
import { PALACE, ROOF_TIERS, SPAWN, WALKABLE_RECTS, ZONES, ZONE_BY_ID, zoneAt } from "./palace-layout.js";
import { EXHIBIT_KIND, EXHIBITS, REQUIRED_LESSON_CODES } from "./exhibits.js";

const SAFE_LINK = /^[a-z0-9-]+\.html(\?[a-z0-9=&_-]*)?$/;

export function validatePalaceConfig({ zones = ZONES, exhibits = EXHIBITS, rects = WALKABLE_RECTS } = {}) {
  const errors = [];
  const ids = new Set();
  for (const zone of zones) {
    if (ids.has(zone.id)) errors.push(`duplicate zone ${zone.id}`);
    ids.add(zone.id);
    const b = zone.bounds;
    if (!(b.xMin < b.xMax && b.zMin < b.zMax)) errors.push(`zone ${zone.id} has empty bounds`);
  }
  for (const required of ["entrance", "atrium", "ethics", "impact", "archive"]) {
    if (!zones.some((zone) => zone.id === required && zone.open)) errors.push(`missing open zone ${required}`);
  }
  if (zones.filter((zone) => zone.id.startsWith("future-") && !zone.open).length !== 2) errors.push("expected two closed future-expansion zones at the nave ends");
  for (const rect of rects) {
    if (!(rect.xMin < rect.xMax && rect.zMin < rect.zMax)) errors.push(`walkable rect ${rect.id} is empty`);
    if (rect.xMin < -PALACE.openHalfLength || rect.xMax > PALACE.openHalfLength) errors.push(`walkable rect ${rect.id} enters a closed future-expansion zone`);
  }
  if (zoneAt(SPAWN.x, SPAWN.z)?.id !== "entrance") errors.push("spawn must be in the Grand Entrance");
  if (ROOF_TIERS.find((tier) => tier.id === "nave").height <= Math.max(...ROOF_TIERS.filter((tier) => tier.id !== "nave").map((tier) => tier.height))) errors.push("nave roof must be the tallest tier");

  const exhibitIds = new Set();
  const lessonCodes = new Set();
  for (const item of exhibits) {
    if (exhibitIds.has(item.id)) errors.push(`duplicate exhibit ${item.id}`);
    exhibitIds.add(item.id);
    const zone = (zones === ZONES ? ZONE_BY_ID : Object.fromEntries(zones.map((z) => [z.id, z])))[item.zone];
    if (!zone) { errors.push(`exhibit ${item.id} has unknown zone ${item.zone}`); continue; }
    if (!zone.open) errors.push(`exhibit ${item.id} is in closed zone ${item.zone}`);
    if (zoneAt(item.x, item.z)?.id !== item.zone) errors.push(`exhibit ${item.id} position is outside zone ${item.zone}`);
    if (!Object.values(EXHIBIT_KIND).includes(item.kind)) errors.push(`exhibit ${item.id} has unknown kind`);
    if (!item.title || !item.summary) errors.push(`exhibit ${item.id} needs title and summary`);
    if (item.kind === EXHIBIT_KIND.LESSON) {
      if (!REQUIRED_LESSON_CODES.includes(item.lessonCode)) errors.push(`exhibit ${item.id} has unknown lesson ${item.lessonCode}`);
      if (lessonCodes.has(item.lessonCode)) errors.push(`lesson ${item.lessonCode} appears twice`);
      lessonCodes.add(item.lessonCode);
    } else if (item.lessonCode) errors.push(`info exhibit ${item.id} must not carry a lesson code`);
    if (item.panel && !["archive", "passport"].includes(item.panel)) errors.push(`exhibit ${item.id} has unknown panel ${item.panel}`);
    if (item.link && !SAFE_LINK.test(item.link.href)) errors.push(`exhibit ${item.id} link must be a same-site page`);
    // Phase 2 guard: exhibits never grant anything.
    for (const key of ["reward", "rewards", "stamp", "unlock", "xp", "credits"]) if (key in item) errors.push(`exhibit ${item.id} must not define ${key}`);
  }
  for (const code of REQUIRED_LESSON_CODES) if (!lessonCodes.has(code)) errors.push(`lesson ${code} has no exhibit`);
  return errors;
}
