export const CHARACTER_ACCESS = Object.freeze({ FREE: "FREE", LOCKED: "LOCKED" });

function character(definition) {
  return Object.freeze({
    ...definition,
    artwork: Object.freeze(definition.artwork),
    portrait: Object.freeze(definition.portrait),
    unlock: Object.freeze(definition.unlock),
  });
}

export const CHARACTER_ROSTER = Object.freeze([
  character({ id: "alexander", displayName: "Alexander", access: "FREE", artwork: { src: "assets/Alexander.png", alt: "การ์ดตัวละคร S+ Alexander แบบเต็มใบ" }, portrait: { objectPosition: "50% 39%" }, unlock: { policy: "STARTER", implemented: true } }),
  character({ id: "mamasan", displayName: "MAMASan", access: "FREE", artwork: { src: "assets/Mama.png", alt: "การ์ดตัวละคร S+ MAMASan แบบเต็มใบ" }, portrait: { objectPosition: "50% 39%" }, unlock: { policy: "STARTER", implemented: true } }),
  character({ id: "milo", displayName: "Milo", access: "FREE", artwork: { src: "assets/Milo.png", alt: "การ์ดตัวละคร S+ Milo แบบเต็มใบ" }, portrait: { objectPosition: "50% 39%" }, unlock: { policy: "STARTER", implemented: true } }),
  character({ id: "albert", displayName: "Albert", access: "LOCKED", artwork: { src: "assets/Albert.png", alt: "การ์ดตัวละคร S+ Albert แบบเต็มใบ" }, portrait: { objectPosition: "50% 39%" }, unlock: { policy: "FUTURE_STORY_MISSION", implemented: false } }),
  character({ id: "alice", displayName: "Alice", access: "LOCKED", artwork: { src: "assets/Alice.png", alt: "การ์ดตัวละคร S+ Alice แบบเต็มใบ" }, portrait: { objectPosition: "50% 39%" }, unlock: { policy: "FUTURE_STORY_MISSION", implemented: false } }),
  character({ id: "dylan", displayName: "Dylan", access: "LOCKED", artwork: { src: "assets/Dylan.png", alt: "การ์ดตัวละคร S+ Dylan แบบเต็มใบ" }, portrait: { objectPosition: "50% 39%" }, unlock: { policy: "FUTURE_STORY_MISSION", implemented: false } }),
  character({ id: "nancy", displayName: "Nancy", access: "LOCKED", artwork: { src: "assets/Nancy.png", alt: "การ์ดตัวละคร S+ Nancy แบบเต็มใบ" }, portrait: { objectPosition: "50% 39%" }, unlock: { policy: "FUTURE_STORY_MISSION", implemented: false, previewMessage: "ปลดล็อกผ่าน Story Mission: คะแนนที่มองไม่เห็น (เร็วๆ นี้)", rewardClaimEnabled: false } }),
  character({ id: "nicolas", displayName: "Nicolas", access: "LOCKED", artwork: { src: "assets/Nicolas.png", alt: "การ์ดตัวละคร S+ Nicolas แบบเต็มใบ" }, portrait: { objectPosition: "50% 39%" }, unlock: { policy: "FUTURE_STORY_MISSION", implemented: false } }),
  character({ id: "noah", displayName: "Noah", access: "LOCKED", artwork: { src: "assets/Noah.png", alt: "การ์ดตัวละคร S+ Noah แบบเต็มใบ" }, portrait: { objectPosition: "50% 39%" }, unlock: { policy: "FUTURE_STORY_MISSION", implemented: false } }),
]);

export const CHARACTER_BY_ID = Object.freeze(Object.fromEntries(CHARACTER_ROSTER.map((item) => [item.id, item])));

export function isSelectableCharacter(characterId) {
  return CHARACTER_BY_ID[characterId]?.access === CHARACTER_ACCESS.FREE;
}

export function validateCharacterRoster(roster = CHARACTER_ROSTER) {
  const errors = [];
  const ids = new Set();
  for (const item of roster) {
    if (!item?.id || ids.has(item.id)) errors.push(`INVALID_OR_DUPLICATE_ID:${item?.id || "missing"}`);
    ids.add(item?.id);
    if (!item?.artwork?.src || !item?.artwork?.alt) errors.push(`ARTWORK_REQUIRED:${item?.id}`);
    if (!Object.values(CHARACTER_ACCESS).includes(item?.access)) errors.push(`INVALID_ACCESS:${item?.id}`);
    if (item?.access === CHARACTER_ACCESS.LOCKED && item?.unlock?.implemented !== false) errors.push(`LOCKED_CHARACTER_ENABLED:${item?.id}`);
  }
  return { valid: errors.length === 0, errors };
}

