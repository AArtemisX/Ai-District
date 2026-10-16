import { SCENARIO_ADVENTURE_SEED } from "./scenario-seed.js";

export function validateAdventureScenario(scenario) {
  if (!scenario || typeof scenario !== "object") return false;
  const requiredStrings = ["scenarioId", "contentIdentity", "themeId", "category", "difficulty", "title", "description", "explanation", "status"];
  if (requiredStrings.some((key) => typeof scenario[key] !== "string" || !scenario[key].trim())) return false;
  if (!Array.isArray(scenario.availableResponses) || !scenario.availableResponses.includes("BASIC")) return false;
  if (!Array.isArray(scenario.cardTags) || !scenario.cardTags.length) return false;
  if (!scenario.basicResponse?.responseId || !scenario.basicResponse?.label || !scenario.basicResponse?.explanation) return false;
  if (!scenario.compatibilityRules?.reason || !Array.isArray(scenario.compatibilityRules.effective) || !Array.isArray(scenario.compatibilityRules.partial)) return false;
  return Boolean(scenario.outcomes?.basicResponse && scenario.outcomes?.matchedCard);
}

export class ScenarioRepository {
  async list() {
    throw new Error("ScenarioRepository.list must be implemented");
  }

}

export class LocalScenarioRepository extends ScenarioRepository {
  constructor({ scenarios = SCENARIO_ADVENTURE_SEED } = {}) {
    super();
    this.scenarios = scenarios.filter(validateAdventureScenario);
  }

  async list({ themeId, category = null, statuses = null } = {}) {
    return this.scenarios.filter((scenario) => (
      (!themeId || scenario.themeId === themeId)
      && (!category || scenario.category === category)
      && (!statuses?.length || statuses.includes(scenario.status))
    ));
  }

}

export function createScenarioRepository(options) {
  return new LocalScenarioRepository(options);
}
