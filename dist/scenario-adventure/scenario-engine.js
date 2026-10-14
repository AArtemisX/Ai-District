import { DEFAULT_THEME_ID, getScenarioCategoryForTile, getTheme } from "./theme-config.js";

export function createScenarioHistory(records = []) {
  return records
    .filter((record) => record?.scenarioId)
    .map((record) => ({ ...record }));
}

export function usedScenarioIds(history = []) {
  return new Set(history.map((record) => record.scenarioId));
}

function chooseIndex(length, random) {
  const sample = Math.min(.999999999, Math.max(0, Number(random()) || 0));
  return Math.floor(sample * length);
}

function createFallbackScenario(template, { themeId, category, history }) {
  const fallbackCount = history.filter((record) => record.isFallback).length + 1;
  return {
    ...structuredClone(template),
    scenarioId: `${template.scenarioId}:${themeId}:${category}:${fallbackCount}`,
    themeId,
    category,
    isFallback: true,
  };
}

export async function selectAdventureScenario({
  repository,
  themeId = DEFAULT_THEME_ID,
  category = null,
  tileIndex = 0,
  history = [],
  random = Math.random,
} = {}) {
  if (!repository?.list || !repository?.getFallbackTemplate) throw new Error("A ScenarioRepository is required");
  const theme = getTheme(themeId);
  const resolvedCategory = category || getScenarioCategoryForTile(tileIndex, theme.themeId);
  if (!theme.scenarioCategories.includes(resolvedCategory)) throw new Error(`Category ${resolvedCategory} is not available in theme ${theme.themeId}`);

  const used = usedScenarioIds(history);
  const categoryPool = await repository.list({ themeId: theme.themeId, category: resolvedCategory });
  const unseenInCategory = categoryPool.filter((scenario) => !used.has(scenario.scenarioId));
  if (unseenInCategory.length) return structuredClone(unseenInCategory[chooseIndex(unseenInCategory.length, random)]);
  return createFallbackScenario(repository.getFallbackTemplate(), {
    themeId: theme.themeId,
    category: resolvedCategory,
    history,
  });
}

export function recordScenarioUse(history, { scenario, actorId, tileIndex, turnNumber }) {
  if (!scenario?.scenarioId) throw new Error("Scenario is required");
  if (!actorId) throw new Error("Actor is required");
  if (usedScenarioIds(history).has(scenario.scenarioId)) throw new Error(`Scenario ${scenario.scenarioId} has already been used in this match`);
  return [
    ...history,
    {
      scenarioId: scenario.scenarioId,
      baseScenarioId: scenario.isFallback ? scenario.scenarioId.split(":").slice(0, 1).join(":") : scenario.scenarioId,
      themeId: scenario.themeId,
      category: scenario.category,
      actorId,
      tileIndex: Math.trunc(Number(tileIndex) || 0),
      turnNumber: Math.max(1, Math.trunc(Number(turnNumber) || 1)),
      isFallback: Boolean(scenario.isFallback),
    },
  ];
}

export function createScenarioAdventureMatch({ themeId = DEFAULT_THEME_ID, history = [] } = {}) {
  const theme = getTheme(themeId);
  return {
    mode: "scenario-adventure",
    themeId: theme.themeId,
    scenarioHistory: createScenarioHistory(history),
    createdAt: new Date().toISOString(),
  };
}
