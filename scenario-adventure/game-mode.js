export const GAME_MODES = Object.freeze({
  LEGACY_DISTRICT_BATTLE: "district-battle",
  SCENARIO_ADVENTURE: "scenario-adventure",
});

export const DEFAULT_GAME_MODE = GAME_MODES.LEGACY_DISTRICT_BATTLE;

export const GAME_MODE_CONFIG = Object.freeze({
  [GAME_MODES.LEGACY_DISTRICT_BATTLE]: Object.freeze({
    id: GAME_MODES.LEGACY_DISTRICT_BATTLE,
    label: "District Battle (Legacy)",
    legacy: true,
    capabilities: Object.freeze({
      districtConstruction: true,
      districtOwnership: true,
      influencePoints: true,
      itemActions: true,
      scenarioAdventure: false,
    }),
  }),
  [GAME_MODES.SCENARIO_ADVENTURE]: Object.freeze({
    id: GAME_MODES.SCENARIO_ADVENTURE,
    label: "Scenario Card Adventure",
    legacy: false,
    capabilities: Object.freeze({
      districtConstruction: false,
      districtOwnership: false,
      influencePoints: false,
      itemActions: false,
      scenarioAdventure: true,
    }),
  }),
});

export function normalizeGameMode(value) {
  return Object.values(GAME_MODES).includes(value) ? value : DEFAULT_GAME_MODE;
}

export function resolveGameMode(search = "") {
  const params = new URLSearchParams(search);
  return normalizeGameMode(params.get("mode"));
}

export function getGameModeConfig(mode) {
  return GAME_MODE_CONFIG[normalizeGameMode(mode)];
}
