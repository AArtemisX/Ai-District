import { DEFAULT_THEME_ID, getScenarioCategoryForTile, getTheme } from "./theme-config.js";
import {DEMO_MATCH_CONFIG} from "./response-engine.js";
import {SCENARIO_ADVENTURE_SEED} from "./scenario-seed.js";

export function createScenarioHistory(records = []) {
  return records
    .filter((record) => record?.scenarioId)
    .map((record) => {const seed=SCENARIO_ADVENTURE_SEED.find(s=>s.scenarioId===record.scenarioId);return {...record,contentIdentity:record.contentIdentity || seed?.contentIdentity,contentSignature:record.contentSignature || (seed && contentSignature(seed))};});
}

export function usedScenarioIds(history = []) {
  return new Set(history.map((record) => record.scenarioId));
}

function chooseIndex(length, random) {
  const sample = Math.min(.999999999, Math.max(0, Number(random()) || 0));
  return Math.floor(sample * length);
}

export function contentSignature(scenario) {
  return String(scenario.description || "").normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
}
function isUnseen(scenario,history) {
  return Boolean(scenario.contentIdentity && !scenario.isFallback && scenario.status!=="FALLBACK" && !history.some(r=>r.scenarioId===scenario.scenarioId || r.contentIdentity===scenario.contentIdentity || r.contentSignature===contentSignature(scenario)));
}

export async function selectAdventureScenario({
  repository,
  themeId = DEFAULT_THEME_ID,
  category = null,
  tileIndex = 0,
  history = [],
  random = Math.random,
} = {}) {
  if (!repository?.list) throw new Error("A ScenarioRepository is required");
  const theme = getTheme(themeId);
  const resolvedCategory = category || getScenarioCategoryForTile(tileIndex, theme.themeId);
  if (!theme.scenarioCategories.includes(resolvedCategory)) throw new Error(`Category ${resolvedCategory} is not available in theme ${theme.themeId}`);

  const normalizedHistory=createScenarioHistory(history);
  const categoryPool = await repository.list({ themeId: theme.themeId, category: resolvedCategory });
  let pool=categoryPool.filter(s=>isUnseen(s,normalizedHistory));
  if(!pool.length) pool=(await repository.list({themeId:theme.themeId})).filter(s=>isUnseen(s,normalizedHistory));
  if(!pool.length) {const error=new Error("SCENARIO_POOL_EXHAUSTED");error.code="SCENARIO_POOL_EXHAUSTED";throw error;}
  const selected=structuredClone(pool[chooseIndex(pool.length,random)]);
  return {...selected,requestedCategory:resolvedCategory,categoryChanged:selected.category!==resolvedCategory};
}

export function recordScenarioUse(history, { scenario, actorId, tileIndex, turnNumber }) {
  if (!scenario?.scenarioId || !scenario?.contentIdentity) throw new Error("Scenario is required");
  if (!actorId) throw new Error("Actor is required");
  if (!isUnseen(scenario,createScenarioHistory(history))) throw new Error(`Scenario ${scenario.scenarioId} has already been used in this match`);
  return [
    ...history,
    {
      scenarioId: scenario.scenarioId,
      contentIdentity:scenario.contentIdentity,
      contentSignature:contentSignature(scenario),
      title:scenario.title,
      themeId: scenario.themeId,
      category: scenario.category,
      actorId,
      tileIndex: Math.trunc(Number(tileIndex) || 0),
      turnNumber: Math.max(1, Math.trunc(Number(turnNumber) || 1)),
      isFallback: Boolean(scenario.isFallback),
    },
  ];
}

export function createScenarioAdventureMatch({ themeId = DEFAULT_THEME_ID, history = [], actorOrder = ["player","bot"] } = {}) {
  const theme = getTheme(themeId);
  if(actorOrder.length<2 || actorOrder.length>4 || new Set(actorOrder).size!==actorOrder.length || actorOrder.some(id=>!["player","bot","player3","player4"].includes(id)))throw new Error("INVALID_ACTORS");
  return {
    mode: "scenario-adventure",
    themeId: theme.themeId,
    scenarioHistory: createScenarioHistory(history),eventHistory:[],
    createdAt: new Date().toISOString(),
    actorOrder:[...actorOrder],currentTurn:actorOrder[0],maxTurnsPerActor:DEMO_MATCH_CONFIG.maxTurnsPerActor,
    scores:Object.fromEntries(actorOrder.map(id=>[id,{rp:0,stability:DEMO_MATCH_CONFIG.initialStability}])),
    turns:Object.fromEntries(actorOrder.map(id=>[id,0])),responseHistory:[],usedActionIds:[],status:"PLAYING",winner:null,
  };
}
