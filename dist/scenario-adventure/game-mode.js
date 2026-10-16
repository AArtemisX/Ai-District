export const GAME_MODES = Object.freeze({
  SCENARIO_ADVENTURE: "scenario-adventure",
});

export const DEFAULT_GAME_MODE = GAME_MODES.SCENARIO_ADVENTURE;

export const GAME_MODE_CONFIG = Object.freeze({
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
