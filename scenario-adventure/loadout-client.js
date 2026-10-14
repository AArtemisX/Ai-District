import { supabase } from "../supabase-client.js";
import { buildUnifiedCardCatalog, scenarioStarterIdsFromServer, validateUnifiedCardCatalog } from "../action-cards/card-catalog.js";
import {
  SCENARIO_LOADOUT_POLICIES,
  availableAdventureCardIds,
  normalizeAdventureLoadout,
  scenarioLoadoutPolicy,
  validateAdventureLoadout,
} from "./loadout-engine.js";

export async function loadAdventureInventory(userId) {
  const [cardsResult, unlocksResult, loadoutResult, eligibilityResult] = await Promise.all([
    supabase.from("action_cards").select("id,name,card_type,en_cost,description,icon_key,is_starter,is_active").eq("is_active", true).order("created_at"),
    supabase.from("user_card_unlocks").select("action_card_id").eq("user_id", userId),
    supabase.from("scenario_adventure_loadouts").select("slot,action_card_id").eq("user_id", userId).order("slot"),
    supabase.from("scenario_card_eligibility").select("game_mode_code,action_card_id,is_starter,is_active").eq("game_mode_code", "scenario-adventure").eq("is_active", true),
  ]);
  const coreError = cardsResult.error || unlocksResult.error;
  if (coreError) throw coreError;
  const cards = buildUnifiedCardCatalog(cardsResult.data || []);
  const catalogValidation = validateUnifiedCardCatalog(cards);
  if (!catalogValidation.valid) throw new Error(`INVALID_CARD_CATALOG:${catalogValidation.errors.join(",")}`);
  const unlockedIds = new Set((unlocksResult.data || []).map((row) => row.action_card_id));
  const scenarioStarterIds = eligibilityResult.error ? [] : scenarioStarterIdsFromServer(eligibilityResult.data || []);
  const loadoutPolicy = scenarioLoadoutPolicy({ serverEligibilityReady: !eligibilityResult.error, starterIds: scenarioStarterIds });
  const allowedIds = availableAdventureCardIds(cards, unlockedIds, scenarioStarterIds);
  const persistedIds = loadoutResult.error ? [] : (loadoutResult.data || []).map((row) => row.action_card_id);
  return {
    cards,
    unlockedIds,
    allowedIds,
    loadout: normalizeAdventureLoadout(
      persistedIds,
      allowedIds,
      loadoutPolicy === SCENARIO_LOADOUT_POLICIES.FIVE_UNIQUE_STARTERS ? scenarioStarterIds : undefined,
      { policy: loadoutPolicy },
    ),
    persistenceReady: !loadoutResult.error,
    persistenceMessage: loadoutResult.error ? "ฐานข้อมูล Scenario Loadout 5 ใบยังไม่ได้เปิดใช้งาน" : "",
    catalogPolicy: "SERVER_OWNERSHIP_WITH_PROTOTYPE_CATALOG",
    loadoutPolicy,
    scenarioStarterIds,
    serverEligibilityReady: !eligibilityResult.error,
  };
}

export async function saveAdventureLoadout(cardIds, allowedIds, loadoutPolicy = SCENARIO_LOADOUT_POLICIES.LEGACY_COMPAT) {
  const validation = validateAdventureLoadout(cardIds, allowedIds, { policy: loadoutPolicy });
  if (!validation.valid) {
    const copyRule = loadoutPolicy === SCENARIO_LOADOUT_POLICIES.FIVE_UNIQUE_STARTERS ? "และห้ามใช้ ID ซ้ำ" : "และซ้ำได้ไม่เกิน 2 ใบ";
    return { ok: false, validation, message: `Loadout ต้องมี 5 ใบ ใช้เฉพาะการ์ดที่มีสิทธิ์ ${copyRule}` };
  }
  const { data, error } = await supabase.rpc("save_scenario_adventure_loadout", { p_card_ids: cardIds });
  if (error) return { ok: false, validation, message: error.message };
  return { ok: true, validation, cardIds: data };
}

