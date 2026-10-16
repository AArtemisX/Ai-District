// Read-only Supabase access for the Crystal Palace (Phase 3). SELECT queries only — the palace never
// unlocks cards, stamps passports or grants rewards; those stay with the lesson / quiz server flow.
import { REQUIRED_LESSON_CODES } from "../config/exhibits.js";

export async function fetchPalaceData(supabase, userId) {
  const [lessons, progress, rewards, unlocks] = await Promise.all([
    supabase.from("learning_lessons").select("id,code,title,category,unlock_order").eq("is_active", true).in("code", REQUIRED_LESSON_CODES),
    supabase.from("player_learning_progress").select("lesson_id,status,mission_completed_at,quiz_passed_at,best_quiz_score,updated_at").eq("user_id", userId),
    supabase.from("lesson_rewards").select("lesson_id,action_card_id,minimum_score").eq("is_active", true),
    supabase.from("user_card_unlocks").select("action_card_id,unlocked_at").eq("user_id", userId),
  ]);
  for (const result of [lessons, progress, rewards, unlocks]) if (result.error) throw result.error;
  const cardIds = [...new Set([...(rewards.data || []).map((row) => row.action_card_id), ...(unlocks.data || []).map((row) => row.action_card_id)])];
  let cards = [];
  if (cardIds.length) {
    const result = await supabase.from("action_cards").select("id,name,card_type,education").in("id", cardIds);
    if (result.error) throw result.error;
    cards = result.data || [];
  }
  return { lessons: lessons.data || [], progress: progress.data || [], rewards: rewards.data || [], unlocks: unlocks.data || [], cards };
}
