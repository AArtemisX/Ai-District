import { cardResponseMetadata, RESPONSE_METADATA_STATUS, DEMO_CONTEXT_RULES } from "./card-response-config.js";
import {consumeSelectedCard,selectCardInstance} from "./deck-engine.js";

export const DEMO_MATCH_CONFIG = Object.freeze({maxTurnsPerActor:6,initialStability:10,maximumStability:10,
  scoring:Object.freeze({EFFECTIVE:Object.freeze({rp:3,stability:0}),PARTIAL:Object.freeze({rp:1,stability:-1}),INEFFECTIVE:Object.freeze({rp:0,stability:-2}),BASIC:Object.freeze({rp:1,stability:-1})})});

export const RESPONSE_TYPES = Object.freeze({ CARD: "CARD", BASIC: "BASIC" });

export function evaluateCardCompatibility(scenario, cardId) {
  const metadata = cardResponseMetadata(cardId);
  const matchedTags = metadata.tags.filter((tag) => scenario.cardTags.includes(tag));
  const rule = scenario.compatibilityRules || DEMO_CONTEXT_RULES[scenario.scenarioId.replace(/^adventure-/, "")];
  const usable = Boolean(rule && metadata.tags.length);
  const compatibility = rule?.effective.includes(cardId) ? "EFFECTIVE" : rule?.partial.includes(cardId) ? "PARTIAL" : "INEFFECTIVE";
  return {
    usable,
    compatibility,
    matchedTags,
    metadataStatus: RESPONSE_METADATA_STATUS,
    reason: usable ? `${rule.reason} — ${compatibility === "EFFECTIVE" ? "แนวทางการ์ดนี้ตอบความเสี่ยงหลัก" : compatibility === "PARTIAL" ? "ช่วยบางส่วน แต่ยังต้องมีมาตรการหลักเพิ่ม" : "แนวทางการ์ดนี้ไม่ตอบความเสี่ยงหลัก"}` : "ยังไม่มีบริบท/Metadata ที่รองรับการ์ดนี้ ใช้ Basic Response ได้",
    summary: metadata.summary,
  };
}

export function createResponseSelection({ type, scenario, deck, instanceId = null }) {
  if (!scenario) throw new Error("SCENARIO_REQUIRED");
  if (type === RESPONSE_TYPES.BASIC) return { type, instanceId: null, cardId: null, compatibility:"BASIC", usable: true, reason: scenario.basicResponse.description };
  if(type !== RESPONSE_TYPES.CARD) throw new Error("INVALID_RESPONSE_TYPE");
  const instance = deck.hand.find((card) => card.instanceId === instanceId);
  if (!instance) throw new Error("CARD_NOT_IN_HAND");
  return { type, instanceId, cardId: instance.cardId, ...evaluateCardCompatibility(scenario, instance.cardId) };
}

export function resolveScenarioResponse({ scenario, actorId, selection, actionId, resolvedActionIds = [] }) {
  if (!actionId) throw new Error("ACTION_ID_REQUIRED");
  if (resolvedActionIds.includes(actionId)) return { duplicate: true, resolvedActionIds, result: null };
  if (!selection?.usable) throw new Error("RESPONSE_NOT_USABLE");
  const isBasic = selection.type === RESPONSE_TYPES.BASIC;
  const evaluated = isBasic ? {compatibility:"BASIC",reason:scenario.basicResponse.explanation} : evaluateCardCompatibility(scenario,selection.cardId);
  if(!isBasic && !evaluated.usable) throw new Error("RESPONSE_NOT_USABLE");
  const delta = DEMO_MATCH_CONFIG.scoring[evaluated.compatibility];
  return {
    duplicate: false,
    resolvedActionIds: [...resolvedActionIds, actionId],
    result: {
      actionId,
      actorId,
      scenarioId: scenario.scenarioId,
      contentIdentity:scenario.contentIdentity,
      responseType: selection.type,
      cardId: selection.cardId,
      status: "RESOLVED",
      resolver: RESPONSE_METADATA_STATUS,
      compatibility:evaluated.compatibility,
      rpDelta:delta.rp,stabilityDelta:delta.stability,
      impact: isBasic ? scenario.basicResponse.impact : evaluated.compatibility === "EFFECTIVE" ? "การ์ดตอบความเสี่ยงหลักของสถานการณ์" : evaluated.compatibility === "PARTIAL" ? "การ์ดช่วยลดความเสี่ยงได้บางส่วน" : "การ์ดไม่ตอบความเสี่ยงหลักของสถานการณ์",
      explanation: evaluated.reason,
    },
  };
}

export function chooseBotResponse({ scenario, deck }) {
  let partial = null;
  for (const instance of deck.hand) {
    const selection = createResponseSelection({ type: RESPONSE_TYPES.CARD, scenario, deck, instanceId: instance.instanceId });
    if (selection.usable && selection.compatibility === "EFFECTIVE") return selection;
    if (selection.usable && selection.compatibility === "PARTIAL" && !partial) partial=selection;
  }
  return partial || createResponseSelection({ type: RESPONSE_TYPES.BASIC, scenario, deck });
}

export function determineDemoWinners(scores) {
  const ranked=Object.keys(scores).sort((a,b)=>scores[b].rp-scores[a].rp || scores[b].stability-scores[a].stability);
  const best=scores[ranked[0]];
  return ranked.filter(id=>scores[id].rp===best.rp && scores[id].stability===best.stability);
}
export function determineDemoWinner(scores) {
  const winners=determineDemoWinners(scores);
  return winners.length===1?winners[0]:"DRAW";
}

export function resolveMatchResponse({match,scenario,actorId,selection,deck,allowedIds}) {
  const actorOrder=match.actorOrder || ["player","bot"];
  if(!actorOrder.includes(actorId)) throw new Error("INVALID_ACTOR");
  const actionId=`${actorId}:${match.turns[actorId]+1}:${scenario.scenarioId}`;
  if(match.status!=="PLAYING" || match.usedActionIds.includes(actionId) || match.responseHistory.some(r=>r.actorId===actorId && r.scenarioId===scenario.scenarioId)) return {duplicate:true,match,deck,result:null};
  if(match.currentTurn!==actorId || match.turns[actorId]>=match.maxTurnsPerActor) throw new Error("INVALID_TURN");
  if(selection.type===RESPONSE_TYPES.CARD){
    const instance=deck.hand.find(c=>c.instanceId===selection.instanceId);
    if(!instance || instance.cardId!==selection.cardId || !allowedIds.includes(instance.cardId)) throw new Error("CARD_NOT_ALLOWED_OR_IN_HAND");
    selection=createResponseSelection({type:RESPONSE_TYPES.CARD,scenario,deck,instanceId:instance.instanceId});
  }
  const resolved=resolveScenarioResponse({scenario,actorId,selection,actionId,resolvedActionIds:match.usedActionIds});
  const nextDeck=selection.type===RESPONSE_TYPES.CARD ? consumeSelectedCard(selectCardInstance(deck,selection.instanceId),{actionId,successful:true}).deck : deck;
  return commitMatchResult({match,actorId,deck:nextDeck,result:resolved.result,actionId});
}

// Shared score bounds, turn count and winner handling for every board event.
export function commitMatchResult({match,actorId,deck,result:rawResult,actionId}) {
  if(match.usedActionIds.includes(actionId))return {duplicate:true,match,deck,result:null};
  if(match.status!=='PLAYING'||match.currentTurn!==actorId||!Object.hasOwn(match.turns,actorId)||match.turns[actorId]>=match.maxTurnsPerActor)throw Error('INVALID_TURN');
  const actorOrder=match.actorOrder||['player','bot'];
  const prior=match.scores[actorId];
  const scores={...match.scores,[actorId]:{rp:Math.max(0,prior.rp+rawResult.rpDelta),stability:Math.max(0,Math.min(DEMO_MATCH_CONFIG.maximumStability,prior.stability+rawResult.stabilityDelta))}};
  const result={...rawResult,appliedStabilityDelta:scores[actorId].stability-prior.stability};
  const turns={...match.turns,[actorId]:match.turns[actorId]+1};
  const finished=actorOrder.every(id=>turns[id]===match.maxTurnsPerActor);
  return {duplicate:false,deck,result,match:{...match,scores,turns,usedActionIds:[...match.usedActionIds,actionId],responseHistory:[...match.responseHistory,result],status:finished?"FINISHED":"PLAYING",winners:finished?determineDemoWinners(scores):[],winner:finished?determineDemoWinner(scores):null}};
}

