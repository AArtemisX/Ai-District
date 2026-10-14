export const PREVIEW_DECK_LIMIT = 5;

export function togglePreviewDeck(selectedIds = [], cardId, { disabled = false, limit = PREVIEW_DECK_LIMIT } = {}) {
  if (disabled) return { selectedIds: [...selectedIds], changed: false, reason: "CARD_DISABLED" };
  if (selectedIds.includes(cardId)) return { selectedIds: selectedIds.filter((id) => id !== cardId), changed: true, reason: "REMOVED" };
  if (selectedIds.length >= limit) return { selectedIds: [...selectedIds], changed: false, reason: "DECK_FULL" };
  return { selectedIds: [...selectedIds, cardId], changed: true, reason: "ADDED" };
}

export function validatePreviewDeck(selectedIds = [], cards = [], { exactSize = null, limit = PREVIEW_DECK_LIMIT } = {}) {
  const known = new Map(cards.map((card) => [card.id, card]));
  const errors = [];
  if (selectedIds.length > limit) errors.push("DECK_LIMIT_EXCEEDED");
  if (new Set(selectedIds).size !== selectedIds.length) errors.push("DUPLICATE_CARD_ID");
  for (const id of selectedIds) {
    if (!known.has(id)) errors.push(`UNKNOWN_CARD:${id}`);
    else if (known.get(id).status !== "ACTIVE") errors.push(`CARD_NOT_ACTIVE:${id}`);
  }
  if (exactSize != null && selectedIds.length !== exactSize) errors.push(`DECK_REQUIRES_${exactSize}`);
  return { valid: errors.length === 0, errors, count: selectedIds.length, limit };
}

