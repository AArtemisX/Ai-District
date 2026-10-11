export const DISTRICT_RULES = Object.freeze({
  STARTING_ENERGY: 5,
  MAX_ENERGY: 10,
  BUILD_COST: 3,
  INFLUENCE_COST: 2,
  BUILD_INFLUENCE: 3,
  INFLUENCE_GAIN: 2,
  MAX_INFLUENCE: 12,
  ACTION_SECONDS: 30,
});

export const DISTRICT_STATUS = Object.freeze({
  NEUTRAL: "NEUTRAL",
  OWNED: "OWNED",
  CONTESTED: "CONTESTED",
});

export function clampEnergy(value) {
  return Math.min(DISTRICT_RULES.MAX_ENERGY, Math.max(0, Number(value) || 0));
}

export function createInitialDistrictStates(districts) {
  return Object.fromEntries(districts.map((district, index) => [district.id, {
    districtId: district.id,
    districtName: district.name,
    ownerId: null,
    isBuilt: false,
    influenceByPlayer: { player: 0, bot: 0 },
    status: DISTRICT_STATUS.NEUTRAL,
    variant: index % 3,
    modelUrl: null,
  }]));
}

export function getDistrictOwner(district) {
  return district?.ownerId || null;
}

export function getDistrictStatus(district) {
  if (!district?.isBuilt || !district.ownerId) return DISTRICT_STATUS.NEUTRAL;
  const challenger = district.ownerId === "player" ? "bot" : "player";
  return district.influenceByPlayer[challenger] > 0 ? DISTRICT_STATUS.CONTESTED : DISTRICT_STATUS.OWNED;
}

function withStatus(district) {
  const next = { ...district };
  next.status = getDistrictStatus(next);
  return next;
}

export function canBuildDistrict(district, actorId, energy, hasActionRight = true, actionUsed = false) {
  return Boolean(district && actorId && !district.isBuilt && hasActionRight && !actionUsed && energy >= DISTRICT_RULES.BUILD_COST);
}

export function buildDistrict(district, actorId, energy, options = {}) {
  if (!canBuildDistrict(district, actorId, energy, options.hasActionRight ?? true, options.actionUsed ?? false)) {
    return { success: false, district, energy: clampEnergy(energy), ownerChanged: false, message: "ไม่สามารถสร้าง District ได้" };
  }
  const nextDistrict = withStatus({
    ...district,
    isBuilt: true,
    ownerId: actorId,
    influenceByPlayer: { ...district.influenceByPlayer, [actorId]: DISTRICT_RULES.BUILD_INFLUENCE },
  });
  return {
    success: true,
    district: nextDistrict,
    energy: clampEnergy(energy - DISTRICT_RULES.BUILD_COST),
    ownerChanged: true,
    message: `${actorId === "player" ? "ผู้เล่น" : "บอท"} สร้างและครอบครอง ${district.districtName} สำเร็จ`,
  };
}

export function canIncreaseInfluence(district, actorId, energy, hasActionRight = true, actionUsed = false) {
  return Boolean(
    district?.isBuilt && actorId && hasActionRight && !actionUsed
    && energy >= DISTRICT_RULES.INFLUENCE_COST
    && (district.influenceByPlayer[actorId] || 0) < DISTRICT_RULES.MAX_INFLUENCE,
  );
}

export function applyInfluenceChange(district, actorId, amount) {
  const current = district.influenceByPlayer[actorId] || 0;
  const nextValue = Math.min(DISTRICT_RULES.MAX_INFLUENCE, Math.max(0, current + amount));
  let ownerId = district.ownerId;
  const previousOwner = ownerId;
  const nextInfluence = { ...district.influenceByPlayer, [actorId]: nextValue };
  if (district.isBuilt && ownerId) {
    const challenger = ownerId === "player" ? "bot" : "player";
    if ((nextInfluence[challenger] || 0) > (nextInfluence[ownerId] || 0)) ownerId = challenger;
  } else if (district.isBuilt && !ownerId) {
    const playerIp = nextInfluence.player || 0;
    const botIp = nextInfluence.bot || 0;
    if (playerIp !== botIp) ownerId = playerIp > botIp ? "player" : "bot";
  }
  const nextDistrict = withStatus({
    ...district,
    ownerId,
    influenceByPlayer: nextInfluence,
  });
  return { district: nextDistrict, ownerChanged: ownerId !== previousOwner, previousOwner, ownerId };
}

export function increaseInfluence(district, actorId, energy, options = {}) {
  if (!canIncreaseInfluence(district, actorId, energy, options.hasActionRight ?? true, options.actionUsed ?? false)) {
    return { success: false, district, energy: clampEnergy(energy), ownerChanged: false, message: "ไม่สามารถเพิ่ม Influence ได้" };
  }
  const changed = applyInfluenceChange(district, actorId, DISTRICT_RULES.INFLUENCE_GAIN);
  const captured = changed.ownerChanged
    ? ` และแย่งชิง ${district.districtName} สำเร็จ`
    : "";
  return {
    success: true,
    ...changed,
    energy: clampEnergy(energy - DISTRICT_RULES.INFLUENCE_COST),
    message: `${actorId === "player" ? "ผู้เล่น" : "บอท"} เพิ่ม Influence +${DISTRICT_RULES.INFLUENCE_GAIN}${captured}`,
  };
}

export function getDistrictIdForTile(tileIndex, districtIds) {
  const districtTileOrder = [4, 10, 16, 22, 28];
  const normalized = ((tileIndex % 32) + 32) % 32;
  const orderIndex = Math.max(0, districtTileOrder.indexOf(normalized));
  return districtIds[orderIndex % districtIds.length];
}

export function chooseBotDistrictAction(district, energy) {
  if (canBuildDistrict(district, "bot", energy)) return "BUILD";
  if (!canIncreaseInfluence(district, "bot", energy)) return "SKIP";
  const botIp = district.influenceByPlayer.bot || 0;
  const playerIp = district.influenceByPlayer.player || 0;
  if (district.ownerId === "player" && botIp + DISTRICT_RULES.INFLUENCE_GAIN > playerIp) return "INFLUENCE";
  if (district.ownerId === "bot" && playerIp >= botIp - DISTRICT_RULES.INFLUENCE_GAIN) return "INFLUENCE";
  if (district.ownerId === "player" && energy >= 4) return "INFLUENCE";
  return "SKIP";
}

export function getScenarioEnergyReward(result) {
  if (!result || result.status === "TIMEOUT") return 0;
  if (result.quality === "BEST") return 2;
  if (result.quality === "GOOD") return 1;
  return 0;
}
