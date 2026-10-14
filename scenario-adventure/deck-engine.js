export const SCENARIO_HAND_LIMIT = 3;

function safeSample(random) {
  return Math.min(.999999999, Math.max(0, Number(random()) || 0));
}

export function shuffleCards(cards, random = Math.random) {
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(safeSample(random) * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createCardInstances(cardIds, { actorId = "player", matchId = "local-match" } = {}) {
  return cardIds.map((cardId, index) => Object.freeze({
    instanceId: `${matchId}:${actorId}:${index + 1}:${cardId}`,
    cardId,
  }));
}

export function createDeckState(cardIds, options = {}) {
  const instances = createCardInstances(cardIds, options);
  const shuffled = shuffleCards(instances, options.random);
  return {
    hand: shuffled.slice(0, SCENARIO_HAND_LIMIT),
    drawPile: shuffled.slice(SCENARIO_HAND_LIMIT),
    discard: [],
    pendingInstanceId: null,
    consumedActionIds: [],
  };
}

export function selectCardInstance(deck, instanceId) {
  if (!deck.hand.some((card) => card.instanceId === instanceId)) throw new Error("CARD_NOT_IN_HAND");
  return { ...deck, pendingInstanceId: instanceId };
}

export function cancelCardSelection(deck) {
  return { ...deck, pendingInstanceId: null };
}

export function consumeSelectedCard(deck, { actionId, successful }) {
  if (!actionId) throw new Error("ACTION_ID_REQUIRED");
  if (deck.consumedActionIds.includes(actionId)) return { deck, duplicate: true, consumed: null };
  if (!successful) return {
    deck: { ...deck, consumedActionIds: [...deck.consumedActionIds, actionId], pendingInstanceId: null },
    duplicate: false,
    consumed: null,
  };
  const selected = deck.hand.find((card) => card.instanceId === deck.pendingInstanceId);
  if (!selected) throw new Error("CARD_NOT_SELECTED");
  const remainingHand = deck.hand.filter((card) => card.instanceId !== selected.instanceId);
  const replacement = deck.drawPile[0] || null;
  return {
    duplicate: false,
    consumed: selected,
    deck: {
      hand: replacement ? [...remainingHand, replacement] : remainingHand,
      drawPile: replacement ? deck.drawPile.slice(1) : deck.drawPile,
      discard: [...deck.discard, selected],
      pendingInstanceId: null,
      consumedActionIds: [...deck.consumedActionIds, actionId],
    },
  };
}

export function prepareDeckForTurn(deck, random = Math.random) {
  if (deck.drawPile.length || !deck.discard.length) return { ...deck, pendingInstanceId: null };
  const drawPile = shuffleCards(deck.discard, random);
  const needed = Math.max(0, SCENARIO_HAND_LIMIT - deck.hand.length);
  return {
    ...deck,
    hand: [...deck.hand, ...drawPile.slice(0, needed)],
    drawPile: drawPile.slice(needed),
    discard: [],
    pendingInstanceId: null,
  };
}

export function countDeckCards(deck) {
  return deck.hand.length + deck.drawPile.length + deck.discard.length;
}

