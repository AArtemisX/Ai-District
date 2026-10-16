import { GAME_MODES, resolveGameMode } from "./scenario-adventure/game-mode.js";
import { readScenarioCharacterSelection } from "./characters/character-session.js";

const mode = resolveGameMode(window.location.search);
document.documentElement.dataset.gameMode = mode;

if (mode === GAME_MODES.SCENARIO_ADVENTURE) {
  if (!readScenarioCharacterSelection()) {
    window.location.replace("character-selection.html");
  } else {
    await import("./scenario-adventure/app.js?v=board-v2");
  }
}
