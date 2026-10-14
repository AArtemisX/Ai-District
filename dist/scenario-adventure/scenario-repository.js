import { FALLBACK_SCENARIO_TEMPLATE, SCENARIO_ADVENTURE_SEED } from "./scenario-seed.js";

export function validateAdventureScenario(scenario) {
  if (!scenario || typeof scenario !== "object") return false;
  const requiredStrings = ["scenarioId", "themeId", "category", "difficulty", "title", "description", "explanation", "status"];
  if (requiredStrings.some((key) => typeof scenario[key] !== "string" || !scenario[key].trim())) return false;
  if (!Array.isArray(scenario.availableResponses) || !scenario.availableResponses.includes("BASIC")) return false;
  if (!Array.isArray(scenario.cardTags) || !scenario.cardTags.length) return false;
  if (!scenario.basicResponse?.responseId || !scenario.basicResponse?.label || !scenario.basicResponse?.explanation) return false;
  return Boolean(scenario.outcomes?.basicResponse && scenario.outcomes?.matchedCard);
}

export class ScenarioRepository {
  async list() {
    throw new Error("ScenarioRepository.list must be implemented");
  }

  getFallbackTemplate() {
    throw new Error("ScenarioRepository.getFallbackTemplate must be implemented");
  }
}

export class LocalScenarioRepository extends ScenarioRepository {
  constructor({ scenarios = SCENARIO_ADVENTURE_SEED, fallbackTemplate = FALLBACK_SCENARIO_TEMPLATE } = {}) {
    super();
    this.scenarios = scenarios.filter(validateAdventureScenario);
    this.fallbackTemplate = fallbackTemplate;
  }

  async list({ themeId, category = null, statuses = null } = {}) {
    return this.scenarios.filter((scenario) => (
      (!themeId || scenario.themeId === themeId)
      && (!category || scenario.category === category)
      && (!statuses?.length || statuses.includes(scenario.status))
    ));
  }

  getFallbackTemplate() {
    return this.fallbackTemplate;
  }
}

export function createScenarioRepository(options) {
  return new LocalScenarioRepository(options);
}
