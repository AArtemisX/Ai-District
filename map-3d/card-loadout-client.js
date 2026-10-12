import { supabase } from "../supabase-client.js";
import { STARTER_CARD_IDS } from "../learning-reward-engine.mjs";
import { normalizeBattleCardPool } from "./action-engine.js";

export async function loadPlayerActionCardIds() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [...STARTER_CARD_IDS];
  const { data, error } = await supabase
    .from("player_card_loadouts")
    .select("slot,action_card_id")
    .eq("user_id",user.id)
    .order("slot");
  if (error) throw error;
  return normalizeBattleCardPool(data?.map((row)=>row.action_card_id), STARTER_CARD_IDS);
}
