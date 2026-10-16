// Pure derivations from read-only Supabase rows → what the palace shows. No I/O here.
// Nothing in this file grants, stamps or unlocks: it only reads what the server already recorded.
import { ACTION_CARD_PROTOTYPES } from "../../action-cards/card-data.js";
import { PROTOTYPE_TO_INVENTORY_CARD_ID } from "../../action-cards/card-catalog.js";
import { REQUIRED_LESSON_CODES } from "../config/exhibits.js";

export const LESSON_STATUS = Object.freeze({ LOCKED: "locked", AVAILABLE: "available", COMPLETED: "completed" });

export const CARD_TYPE_ART = Object.freeze({
  ATTACK: { icon: "⚡", label: "โจมตี", color: "#ff8f5a" },
  DEFENSE: { icon: "🛡️", label: "ป้องกัน", color: "#2aa9b8" },
  CONTROL: { icon: "🧭", label: "ควบคุม", color: "#9d7bea" },
  SUPPORT: { icon: "✚", label: "สนับสนุน", color: "#3fae5a" },
});

const PROTOTYPE_ART_BY_CARD_ID = Object.freeze(Object.fromEntries(ACTION_CARD_PROTOTYPES
  .filter((card) => PROTOTYPE_TO_INVENTORY_CARD_ID[card.id])
  .map((card) => [PROTOTYPE_TO_INVENTORY_CARD_ID[card.id], card.artwork.src])));

const toThumb = (src) => (typeof src === "string" && src.startsWith("assets/") && !src.includes("..") ? `assets/thumbs/${src.slice(7)}` : null);

// Thumbnail for a card id: server education.artwork first, then the mapped prototype art; else null
// (the UI then draws the card-type illustration).
export function cardArtwork(card) {
  if (!card) return null;
  return toThumb(card.education?.artwork) || toThumb(PROTOTYPE_ART_BY_CARD_ID[card.id]) || null;
}

function indexRows(data = {}) {
  const lessons = new Map((data.lessons || []).map((row) => [row.code, row]));
  const progress = new Map((data.progress || []).map((row) => [row.lesson_id, row]));
  const cards = new Map((data.cards || []).map((row) => [row.id, row]));
  const rewards = new Map();
  for (const row of data.rewards || []) if (!rewards.has(row.lesson_id)) rewards.set(row.lesson_id, row);
  const unlocked = new Set((data.unlocks || []).map((row) => row.action_card_id));
  return { lessons, progress, cards, rewards, unlocked };
}

// Lesson-linked exhibit → locked / available / completed, plus its real reward card.
// locked = no active lesson row exists for the code (nothing to play yet).
export function deriveExhibitStates(exhibits, data) {
  const idx = indexRows(data);
  const states = {};
  for (const exhibit of exhibits) {
    if (!exhibit.lessonCode) continue;
    const lesson = idx.lessons.get(exhibit.lessonCode);
    if (!lesson) {
      states[exhibit.id] = { status: LESSON_STATUS.LOCKED, lesson: null, inProgress: false, quizPassed: false, reward: null };
      continue;
    }
    const progress = idx.progress.get(lesson.id) || null;
    const rewardRow = idx.rewards.get(lesson.id) || null;
    const card = rewardRow ? idx.cards.get(rewardRow.action_card_id) || rewardRow.action_cards || null : null;
    const completed = progress?.status === "completed";
    states[exhibit.id] = {
      status: completed ? LESSON_STATUS.COMPLETED : LESSON_STATUS.AVAILABLE,
      lesson: { id: lesson.id, code: lesson.code, title: lesson.title },
      inProgress: Boolean(progress) && !completed,
      quizPassed: Boolean(progress?.quiz_passed_at),
      reward: rewardRow ? {
        cardId: rewardRow.action_card_id,
        name: card?.name || rewardRow.action_card_id,
        type: card?.card_type || null,
        minimumScore: rewardRow.minimum_score,
        unlocked: idx.unlocked.has(rewardRow.action_card_id),
      } : null,
    };
  }
  return states;
}

// Passport stamps: one per completed progress row for a palace lesson, in palace order.
export function derivePassportStamps(data, codes = REQUIRED_LESSON_CODES) {
  const idx = indexRows(data);
  const stamps = [];
  for (const code of codes) {
    const lesson = idx.lessons.get(code);
    const progress = lesson ? idx.progress.get(lesson.id) : null;
    if (progress?.status !== "completed") continue;
    stamps.push({ code, title: lesson.title, category: code.startsWith("impact") ? "impact" : "ethics", stampedAt: progress.updated_at || progress.mission_completed_at || null });
  }
  return { stamps, total: codes.length, codes: [...codes] };
}

// Collection Archive: every reward card (deduplicated) plus any other unlocked card.
// Unlocked → framed artwork; locked → silhouette + "pass the quiz of lesson X" from lesson_rewards.
export function deriveArchiveCards(data) {
  const idx = indexRows(data);
  const lessonById = new Map([...idx.lessons.values()].map((row) => [row.id, row]));
  const order = new Map(REQUIRED_LESSON_CODES.map((code, i) => [code, i]));
  const byCard = new Map();
  for (const row of data?.rewards || []) {
    const lesson = lessonById.get(row.lesson_id);
    if (!lesson) continue;
    const entry = byCard.get(row.action_card_id) || { cardId: row.action_card_id, lessons: [] };
    entry.lessons.push({ code: lesson.code, title: lesson.title, minimumScore: row.minimum_score, rank: order.get(lesson.code) ?? 99 });
    byCard.set(row.action_card_id, entry);
  }
  for (const cardId of idx.unlocked) if (!byCard.has(cardId)) byCard.set(cardId, { cardId, lessons: [] });
  return [...byCard.values()].map((entry) => {
    const card = idx.cards.get(entry.cardId) || null;
    const lessons = entry.lessons.sort((a, b) => a.rank - b.rank);
    const unlocked = idx.unlocked.has(entry.cardId);
    return {
      cardId: entry.cardId,
      name: card?.name || entry.cardId,
      type: card?.card_type || null,
      unlocked,
      art: unlocked ? cardArtwork(card || { id: entry.cardId }) : null,
      hint: unlocked || !lessons.length ? null : { lessonCode: lessons[0].code, lessonTitle: lessons[0].title, minimumScore: lessons[0].minimumScore, more: lessons.length - 1 },
    };
  }).sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || a.name.localeCompare(b.name));
}
