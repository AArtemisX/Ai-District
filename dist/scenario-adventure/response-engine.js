import { cardResponseMetadata, RESPONSE_METADATA_STATUS } from "./card-response-config.js";

export const RESPONSE_TYPES = Object.freeze({ CARD: "CARD", BASIC: "BASIC" });

export function evaluateCardCompatibility(scenario, cardId) {
  const metadata = cardResponseMetadata(cardId);
  const matchedTags = metadata.tags.filter((tag) => scenario.cardTags.includes(tag));
  return {
    usable: matchedTags.length > 0,
    matchedTags,
    metadataStatus: RESPONSE_METADATA_STATUS,
    reason: matchedTags.length ? `ตรงกับแนวทาง ${matchedTags.join(", ")}` : "การ์ดใบนี้ยังไม่ตรงกับความเสี่ยงหลักของสถานการณ์",
    summary: metadata.summary,
  };
}

export function createResponseSelection({ type, scenario, deck, instanceId = null }) {
  if (!scenario) throw new Error("SCENARIO_REQUIRED");
  if (type === RESPONSE_TYPES.BASIC) return { type, instanceId: null, cardId: null, usable: true, reason: scenario.basicResponse.description };
  const instance = deck.hand.find((card) => card.instanceId === instanceId);
  if (!instance) throw new Error("CARD_NOT_IN_HAND");
  return { type, instanceId, cardId: instance.cardId, ...evaluateCardCompatibility(scenario, instance.cardId) };
}

export function resolveScenarioResponse({ scenario, actorId, selection, actionId, resolvedActionIds = [] }) {
  if (!actionId) throw new Error("ACTION_ID_REQUIRED");
  if (resolvedActionIds.includes(actionId)) return { duplicate: true, resolvedActionIds, result: null };
  if (!selection?.usable) throw new Error("RESPONSE_NOT_USABLE");
  const isBasic = selection.type === RESPONSE_TYPES.BASIC;
  return {
    duplicate: false,
    resolvedActionIds: [...resolvedActionIds, actionId],
    result: {
      actionId,
      actorId,
      scenarioId: scenario.scenarioId,
      responseType: selection.type,
      cardId: selection.cardId,
      status: "RESOLVED",
      resolver: RESPONSE_METADATA_STATUS,
      impact: isBasic ? scenario.basicResponse.impact : "การ์ดตอบสนองสอดคล้องกับ Metadata ของสถานการณ์",
      explanation: isBasic ? scenario.basicResponse.explanation : `${selection.summary} — ${selection.reason}`,
    },
  };
}

export function chooseBotResponse({ scenario, deck }) {
  for (const instance of deck.hand) {
    const selection = createResponseSelection({ type: RESPONSE_TYPES.CARD, scenario, deck, instanceId: instance.instanceId });
    if (selection.usable) return selection;
  }
  return createResponseSelection({ type: RESPONSE_TYPES.BASIC, scenario, deck });
}

