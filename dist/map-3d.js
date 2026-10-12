import React, { Suspense, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { html } from "./map-3d/runtime.js";
import { BOARD_TILES, DISTRICTS, buildTilePath } from "./map-3d/board-data.js";
import { MapScene } from "./map-3d/MapScene.js";
import { GAME_PHASES, getTileEvent, nextTurn, rollDie, transitionPhase } from "./map-3d/turn-manager.js";
import { DistrictPanel } from "./map-3d/DistrictPanel.js";
import { DISTRICT_RULES, buildDistrict, chooseBotDistrictAction, createInitialDistrictStates, getDistrictIdForTile, increaseInfluence } from "./map-3d/district-engine.js";
import { ActionInventoryPanel } from "./map-3d/ActionInventoryPanel.js";
import { BOT_CARD_POOL_IDS, activeEffects, chooseBotUtilityAction, consumeInfluenceBlock, consumeSpeedBoost, createInitialInventory, createUtilityActionId, drawCardFromPool, grantReward, isInventoryCompatibleWithPool, resolveCardAction, resolveItemAction } from "./map-3d/action-engine.js";
import { chooseReward } from "./map-3d/reward-config.js";
import { GameResultPanel } from "./map-3d/GameResultPanel.js";
import { createMatchId, createMatchResult, MATCH_RULES } from "./map-3d/result-engine.js";
import { saveMatchResult } from "./map-3d/match-result-storage.js";
import { loadPlayerActionCardIds } from "./map-3d/card-loadout-client.js";
import { ACTION_ENCOUNTER_TYPES, regenerateTurnEnergy, resolveEnergyTile } from "./map-3d/battle-config.js";

const initialDistricts = createInitialDistrictStates(DISTRICTS);
const matchSessionId = new URLSearchParams(window.location.search).get("session") || "demo";
const inventoryStorageKey = `ai-district-phase5:${matchSessionId}`;
const DISTRICT_STATUS_LABELS = Object.freeze({ NEUTRAL: "ยังไม่มีเจ้าของ", OWNED: "มีเจ้าของแล้ว", CONTESTED: "กำลังแย่งชิง" });
const HUD_PHASE_LABELS = Object.freeze({
  WAITING: "รอทอยลูกเต๋า",
  ROLLING: "กำลังทอยลูกเต๋า",
  MOVING: "กำลังเดิน",
  TILE_EVENT: "พบเหตุการณ์ใหม่",
  ACTION_PHASE: "เลือกการกระทำ",
  TURN_END: "จบเทิร์น",
  GAME_END: "จบเกม",
});

function phaseHint(currentTurn, gamePhase) {
  if (currentTurn === "bot") return "บอทกำลังวางแผน...";
  return {
    WAITING: "ถึงตาคุณแล้ว! ทอยลูกเต๋าเพื่อเดิน",
    ROLLING: "กำลังทอยลูกเต๋า...",
    MOVING: "กำลังเดิน...",
    TILE_EVENT: "พบเหตุการณ์ใหม่!",
    ACTION_PHASE: "เลือกการกระทำ",
    TURN_END: "กำลังจบเทิร์น...",
    GAME_END: "การแข่งขันสิ้นสุดแล้ว",
  }[gamePhase] || "เตรียมพร้อมสำหรับเทิร์นถัดไป";
}

function loadSavedInventories() {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(inventoryStorageKey));
    if (saved?.player?.hand && saved?.bot?.hand) return saved;
  } catch {
    // Ignore invalid or tampered match state and rebuild it from the verified loadout.
  }
  return null;
}

function App() {
  const [surrenderOpen, setSurrenderOpen] = useState(false);
  const [selectedTile, setSelectedTile] = useState(0);
  const [selectedDistrict, setSelectedDistrict] = useState("academy");
  const [districtStates, setDistrictStates] = useState(initialDistricts);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [botPosition, setBotPosition] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [currentTurn, setCurrentTurn] = useState("player");
  const [gamePhase, setGamePhase] = useState(GAME_PHASES.WAITING);
  const [movement, setMovement] = useState(null);
  const [rollRequest, setRollRequest] = useState(null);
  const [diceResult, setDiceResult] = useState(null);
  const [landedTile, setLandedTile] = useState(null);
  const [actionSeconds, setActionSeconds] = useState(0);
  const [lastActionResult, setLastActionResult] = useState(null);
  const [round, setRound] = useState(1);
  const [decisionPoints, setDecisionPoints] = useState({ player: 0, bot: 0 });
  const [scenarioHistory, setScenarioHistory] = useState([]);
  const [energy, setEnergy] = useState({ player: DISTRICT_RULES.STARTING_ENERGY, bot: DISTRICT_RULES.STARTING_ENERGY });
  const [districtActionSession, setDistrictActionSession] = useState(null);
  const [districtFeedback, setDistrictFeedback] = useState(null);
  const [districtActionUsed, setDistrictActionUsed] = useState(false);
  const [inventories, setInventories] = useState(() => ({ player: createInitialInventory("player"), bot: createInitialInventory("bot") }));
  const [loadoutReady, setLoadoutReady] = useState(false);
  const [effects, setEffects] = useState([]);
  const [cardActionUsed, setCardActionUsed] = useState(false);
  const [itemActionUsed, setItemActionUsed] = useState(false);
  const [utilityFeedback, setUtilityFeedback] = useState(null);
  const [rewardNotification, setRewardNotification] = useState(null);
  const [botUtilityResolved, setBotUtilityResolved] = useState(false);
  const [turnNumber, setTurnNumber] = useState(0);
  const [movementSteps, setMovementSteps] = useState(null);
  const [ownershipToast, setOwnershipToast] = useState(null);
  const [battleVisual, setBattleVisual] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const districtStatesRef = useRef(districtStates);
  const energyRef = useRef(energy);
  const effectsRef = useRef(effects);
  const resolvedEncounterIds = useRef(new Set());
  const completedDistrictActionIds = useRef(new Set());
  const resolvedUtilityActionIds = useRef(new Set());
  const districtOwnersRef = useRef(Object.fromEntries(Object.values(initialDistricts).map((district) => [district.districtId, district.ownerId])));
  const matchEndingRef = useRef(false);
  const resolvedVisualEventIds = useRef(new Set());
  const pendingCaptureVisuals = useRef(new Map());
  const ownershipVisualSequence = useRef(0);

  const selectedTileData = BOARD_TILES[selectedTile];
  const activePosition = currentTurn === "player" ? playerPosition : botPosition;
  const currentTile = landedTile || getTileEvent(activePosition);
  const isDistrictTile = currentTile.type === "DISTRICT";
  const eventPanelOpen = !isDistrictTile && [GAME_PHASES.TILE_EVENT, GAME_PHASES.ACTION_PHASE, GAME_PHASES.TURN_END].includes(gamePhase);
  const canPlayerRoll = loadoutReady && !matchResult && currentTurn === "player" && gamePhase === GAME_PHASES.WAITING && !isMoving;
  const actionDistrict = districtActionSession ? districtStates[districtActionSession.districtId] : null;
  const currentHint = loadoutReady ? phaseHint(currentTurn, gamePhase) : "กำลังเตรียมชุดการ์ดสำหรับการแข่งขัน...";

  function publishBattleVisual(event) {
    if (!event?.id || resolvedVisualEventIds.current.has(event.id)) return;
    resolvedVisualEventIds.current.add(event.id);
    setBattleVisual(event);
    if (event.districtId) setSelectedDistrict(event.districtId);
  }

  useEffect(() => {
    let active = true;
    loadPlayerActionCardIds()
      .then((cardIds) => {
        if (!active) return;
        const saved = loadSavedInventories();
        const canResumePlayer = isInventoryCompatibleWithPool(saved?.player, cardIds);
        const canResumeBot = isInventoryCompatibleWithPool(saved?.bot, BOT_CARD_POOL_IDS);
        setInventories({
          player: canResumePlayer ? saved.player : createInitialInventory("player", cardIds),
          bot: canResumeBot ? saved.bot : createInitialInventory("bot"),
        });
        setLoadoutReady(true);
      })
      .catch(() => {
        if (!active) return;
        setInventories((current) => ({ ...current, player: createInitialInventory("player") }));
        setRewardNotification({ success: false, message: "โหลดชุดการ์ดไม่สำเร็จ จึงใช้ชุดพื้นฐานที่ปลอดภัย" });
        setLoadoutReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const previous = districtOwnersRef.current;
    for (const district of Object.values(districtStates)) {
      if (previous[district.districtId] !== district.ownerId && district.ownerId) {
        setOwnershipToast({ districtId: district.districtId, districtName: district.districtName, ownerId: district.ownerId });
        setSelectedDistrict(district.districtId);
        const pending = pendingCaptureVisuals.current.get(district.districtId);
        if (pending) pendingCaptureVisuals.current.delete(district.districtId);
        publishBattleVisual(pending || {
          id: `owner-${district.districtId}-${district.ownerId}-${ownershipVisualSequence.current += 1}`,
          kind: "CAPTURE",
          districtId: district.districtId,
          label: "ยึดครองเขตสำเร็จ",
          title: district.districtName,
          detail: district.ownerId === "player" ? "เขตนี้เป็นของคุณแล้ว" : "บอทยึดครองเขตนี้แล้ว",
        });
      }
    }
    districtOwnersRef.current = Object.fromEntries(Object.values(districtStates).map((district) => [district.districtId, district.ownerId]));
  }, [districtStates]);

  useEffect(() => {
    if (!ownershipToast) return undefined;
    const timer = window.setTimeout(() => setOwnershipToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [ownershipToast]);

  useEffect(() => {
    if (!battleVisual) return undefined;
    const timer = window.setTimeout(() => {
      setBattleVisual((current) => current?.id === battleVisual.id ? null : current);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [battleVisual]);

  function advancePhase(nextPhase) {
    setGamePhase((current) => transitionPhase(current, nextPhase));
  }

  function endMatch(endReason) {
    if (matchEndingRef.current || gamePhase === GAME_PHASES.GAME_END) return;
    matchEndingRef.current = true;
    const completedRounds = endReason === "ROUNDS_COMPLETE" ? MATCH_RULES.MAX_ROUNDS : Math.max(0, round - 1);
    const result = createMatchResult({
      matchId: createMatchId(),
      endReason,
      totalRounds: completedRounds,
      districts: districtStatesRef.current,
      decisionPoints,
      energy: energyRef.current,
      scenarioHistory,
    });
    setSurrenderOpen(false);
    setMovement(null);
    setRollRequest(null);
    setIsMoving(false);
    setActionSeconds(0);
    setDistrictActionSession(null);
    setDistrictFeedback(null);
    setGamePhase((current) => current === GAME_PHASES.GAME_END ? current : transitionPhase(current, GAME_PHASES.GAME_END));
    setMatchResult(result);
    setSaveStatus({ status: "SAVING", message: "กำลังบันทึกผล…" });
    saveMatchResult(result, matchSessionId).then(setSaveStatus);
  }

  function replayMatch() {
    window.sessionStorage.removeItem(inventoryStorageKey);
    window.location.assign(`map-3d.html?session=practice-${Date.now()}`);
  }

  function awardReward(actor, reward, eventId) {
    const result = grantReward(inventories[actor], reward, eventId);
    if (result.success) setInventories((current) => ({ ...current, [actor]: result.inventory }));
    if (actor === "player") setRewardNotification(result);
    return result;
  }

  function startRoll(actor) {
    if (matchEndingRef.current || gamePhase !== GAME_PHASES.WAITING || currentTurn !== actor || isMoving) return;
    const value = rollDie();
    const speed = consumeSpeedBoost(effects, actor, turnNumber);
    const steps = value + speed.bonus;
    setEffects(speed.effects);
    setDiceResult(null);
    setMovementSteps(steps);
    setLandedTile(null);
    setLastActionResult(null);
    setDistrictActionSession(null);
    setDistrictFeedback(null);
    setRollRequest({ id: `${actor}-${performance.now()}`, actor, value, steps });
    advancePhase(GAME_PHASES.ROLLING);
  }

  function finishRoll(value) {
    if (gamePhase !== GAME_PHASES.ROLLING) return;
    const from = currentTurn === "player" ? playerPosition : botPosition;
    const steps = rollRequest?.steps || value;
    setDiceResult(value);
    setMovement({ id: `${currentTurn}-${performance.now()}`, actor: currentTurn, from, path: buildTilePath(from, steps) });
    setIsMoving(true);
    advancePhase(GAME_PHASES.MOVING);
  }

  function finishMove(actor, finalIndex) {
    if (gamePhase !== GAME_PHASES.MOVING || actor !== currentTurn) return;
    if (actor === "player") setPlayerPosition(finalIndex);
    else setBotPosition(finalIndex);
    setSelectedTile(finalIndex);
    const tileEvent = getTileEvent(finalIndex);
    setLandedTile(tileEvent);
    const encounterId = `${actor}-turn-${turnNumber}-tile-${finalIndex}`;
    if (!resolvedEncounterIds.current.has(encounterId)) {
      resolvedEncounterIds.current.add(encounterId);
      if (tileEvent.type === ACTION_ENCOUNTER_TYPES.CARD) {
        const result = drawCardFromPool(inventories[actor], encounterId, round + finalIndex);
        if (result.success) setInventories((current) => ({ ...current, [actor]: result.inventory }));
        if (actor === "player") setRewardNotification(result);
        setLastActionResult(result.message);
      } else if (tileEvent.type === ACTION_ENCOUNTER_TYPES.ITEM) {
        const result = awardReward(actor, chooseReward("ITEM_TILE", round + finalIndex), encounterId);
        setLastActionResult(result.message);
      } else if (tileEvent.type === ACTION_ENCOUNTER_TYPES.ENERGY) {
        const result = resolveEnergyTile(energyRef.current[actor]);
        energyRef.current = { ...energyRef.current, [actor]: result.energy };
        setEnergy(energyRef.current);
        const message = result.gained > 0 ? `สถานีพลังงานฟื้นฟู +${result.gained} EN` : "พลังงานเต็มแล้ว";
        setLastActionResult(message);
        if (result.gained > 0) publishBattleVisual({ id: `${encounterId}-energy`, kind: "ENERGY", label: `+${result.gained} EN`, title: "ฟื้นฟูพลังงาน", detail: `คงเหลือ ${result.energy} EN` });
        if (actor === "player") setRewardNotification({ success: true, message });
      } else if (tileEvent.type === ACTION_ENCOUNTER_TYPES.RANDOM_EVENT) {
        setLastActionResult(tileEvent.safeResult);
      }
    }
    if (tileEvent.type === ACTION_ENCOUNTER_TYPES.DISTRICT) {
      const districtId = getDistrictIdForTile(finalIndex, DISTRICTS.map((district) => district.id));
      setSelectedDistrict(districtId);
      setDistrictActionSession({ id: `${actor}-${districtId}-${performance.now()}`, actor, districtId, source: "tile", status: "PENDING" });
      setDistrictFeedback(null);
      setActionSeconds(DISTRICT_RULES.ACTION_SECONDS);
    } else {
      setDistrictActionSession(null);
      setDistrictFeedback(null);
    }
    setMovement(null);
    setIsMoving(false);
    advancePhase(GAME_PHASES.TILE_EVENT);
  }

  function finishAction(reason = "continue") {
    if (gamePhase !== GAME_PHASES.ACTION_PHASE || !landedTile) return;
    setLastActionResult((current) => current || (reason === "timeout" ? landedTile.safeResult : "ดำเนินการเรียบร้อย"));
    advancePhase(GAME_PHASES.TURN_END);
  }

  function applyUtilityResult(actor, kind, result, actionId) {
    setUtilityFeedback(result);
    if (kind === "CARD" && result.card) {
      const resolution = result.resolution || {};
      const ownerDistrict = resolution.targetDistrictId ? result.districts?.[resolution.targetDistrictId] : null;
      const kindName = resolution.blockedBy ? "BLOCKED"
        : resolution.ownerChanged ? "CAPTURE"
          : result.card.type === "ATTACK" ? "ATTACK"
            : result.card.type === "DEFENSE" || result.card.type === "CONTROL" ? "DEFENSE" : "ENERGY";
      const visualEvent = {
        id: actionId,
        kind: kindName,
        districtId: resolution.targetDistrictId,
        label: resolution.blockedBy ? "BLOCKED"
          : resolution.ownerChanged ? "ยึดครองเขตสำเร็จ"
            : resolution.ipChange ? `${resolution.ipChange > 0 ? "+" : ""}${resolution.ipChange} IP`
              : result.energyChange > 0 ? `+${result.energyChange} EN` : "เปิดใช้การป้องกัน",
        title: result.card.name,
        detail: result.success ? `${result.message} · คงเหลือ ${result.energy} EN` : result.message,
        actor,
      };
      if (result.success || resolution.blockedBy) {
        if (resolution.ownerChanged && ownerDistrict) {
          pendingCaptureVisuals.current.set(ownerDistrict.districtId, { ...visualEvent, kind: "CAPTURE", label: "ยึดครองเขตสำเร็จ", ipLabel: resolution.ipChange ? `${resolution.ipChange > 0 ? "+" : ""}${resolution.ipChange} IP` : null });
        } else publishBattleVisual(visualEvent);
      }
    }
    if (!result.success) return false;
    setInventories((current) => ({ ...current, [actor]: result.inventory }));
    energyRef.current = { ...energyRef.current, [actor]: result.energy };
    districtStatesRef.current = result.districts;
    effectsRef.current = result.effects;
    setEnergy(energyRef.current);
    setDistrictStates(result.districts);
    setEffects(result.effects);
    if (kind === "CARD") setCardActionUsed(true);
    else setItemActionUsed(true);
    return true;
  }

  function useUtility(kind, instanceId, targetDistrictId, actor = currentTurn) {
    if (gamePhase !== GAME_PHASES.ACTION_PHASE || isMoving || actor !== currentTurn) {
      return { success: false, message: "ยังไม่สามารถใช้การ์ดหรือไอเทมในสถานะนี้ได้" };
    }
    const actionId = createUtilityActionId({ actorId: actor, turnNumber, kind, instanceId, targetDistrictId });
    if (resolvedUtilityActionIds.current.has(actionId)) {
      const duplicate = { success: false, message: "คำสั่งนี้ถูกประมวลผลแล้ว กรุณาเลือกการกระทำอื่น" };
      if (actor === "player") setUtilityFeedback(duplicate);
      return duplicate;
    }
    resolvedUtilityActionIds.current.add(actionId);
    const shared = {
      actorId: actor,
      instanceId,
      targetDistrictId,
      inventory: inventories[actor],
      energy: energy[actor],
      districts: districtStates,
      effects,
      turnNumber,
    };
    const result = kind === "CARD"
      ? resolveCardAction({ ...shared, actionUsed: cardActionUsed })
      : resolveItemAction({ ...shared, actionUsed: itemActionUsed });
    if (!result.success) resolvedUtilityActionIds.current.delete(actionId);
    applyUtilityResult(actor, kind, result, actionId);
    return result;
  }

  function completeDistrictAction(type) {
    if (gamePhase !== GAME_PHASES.ACTION_PHASE || !districtActionSession || districtFeedback || districtActionUsed) return;
    if (completedDistrictActionIds.current.has(districtActionSession.id)) return;
    const district = districtStatesRef.current[districtActionSession.districtId];
    const actorEnergy = energyRef.current[currentTurn];
    let result;
    if (type === "BUILD") result = { type, ...buildDistrict(district, currentTurn, actorEnergy) };
    else if (type === "INFLUENCE") {
      const blocked = consumeInfluenceBlock(effectsRef.current, currentTurn, district.districtId, turnNumber);
      effectsRef.current = blocked.effects;
      setEffects(blocked.effects);
      result = blocked.blocked ? {
        type: "BLOCKED",
        success: true,
        district,
        energy: actorEnergy,
        ownerChanged: false,
        message: "Lag Pulse บล็อกการเพิ่ม Influence ครั้งนี้",
      } : { type, ...increaseInfluence(district, currentTurn, actorEnergy) };
    }
    else result = {
      type,
      success: true,
      district,
      energy: actorEnergy,
      ownerChanged: false,
      message: type === "TIMEOUT" ? "หมดเวลา — ข้ามการจัดการเขตอัตโนมัติ" : `${currentTurn === "player" ? "ผู้เล่น" : "บอท"} เลือกข้ามการจัดการเขต`,
    };
    if (!result.success) return;
    completedDistrictActionIds.current.add(districtActionSession.id);
    districtStatesRef.current = { ...districtStatesRef.current, [district.districtId]: result.district };
    energyRef.current = { ...energyRef.current, [currentTurn]: result.energy };
    setDistrictStates(districtStatesRef.current);
    setEnergy(energyRef.current);
    setDistrictActionUsed(true);
    setDistrictFeedback(result);
    setDistrictActionSession((current) => current ? { ...current, status: "RESULT" } : current);
  }

  function finishDistrictAction() {
    if (gamePhase !== GAME_PHASES.ACTION_PHASE || !districtFeedback) return;
    setLastActionResult(districtFeedback.message);
    advancePhase(GAME_PHASES.TURN_END);
  }

  useEffect(() => {
    window.sessionStorage.setItem(inventoryStorageKey, JSON.stringify(inventories));
  }, [inventories]);

  useEffect(() => { districtStatesRef.current = districtStates; }, [districtStates]);
  useEffect(() => { energyRef.current = energy; }, [energy]);
  useEffect(() => { effectsRef.current = effects; }, [effects]);

  useEffect(() => {
    if (gamePhase !== GAME_PHASES.TILE_EVENT) return undefined;
    const timer = window.setTimeout(() => advancePhase(GAME_PHASES.ACTION_PHASE), 420);
    return () => window.clearTimeout(timer);
  }, [gamePhase]);

  useEffect(() => {
    if (gamePhase !== GAME_PHASES.ACTION_PHASE || currentTurn !== "bot" || botUtilityResolved || isMoving) return undefined;
    const timer = window.setTimeout(() => {
      const action = chooseBotUtilityAction({
        inventory: inventories.bot,
        energy: energy.bot,
        districts: districtStates,
        effects,
        cardUsed: cardActionUsed,
        itemUsed: itemActionUsed,
        turnNumber,
      });
      if (action) useUtility(action.kind, action.instanceId, action.targetDistrictId, "bot");
      setBotUtilityResolved(true);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [gamePhase, currentTurn, botUtilityResolved, isMoving, inventories, energy, districtStates, effects, cardActionUsed, itemActionUsed, turnNumber]);

  useEffect(() => {
    if (gamePhase !== GAME_PHASES.ACTION_PHASE || !landedTile) return undefined;
    if (districtActionSession) {
      if (districtFeedback || districtActionUsed) return undefined;
      setActionSeconds(DISTRICT_RULES.ACTION_SECONDS);
      const ticker = window.setInterval(() => setActionSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
      const timeout = window.setTimeout(() => completeDistrictAction("TIMEOUT"), DISTRICT_RULES.ACTION_SECONDS * 1000);
      const botAction = currentTurn === "bot" ? window.setTimeout(() => {
        const action = chooseBotDistrictAction(districtStates[districtActionSession.districtId], energy.bot);
        completeDistrictAction(action);
      }, 1000) : null;
      return () => {
        window.clearInterval(ticker);
        window.clearTimeout(timeout);
        if (botAction) window.clearTimeout(botAction);
      };
    }
    const duration = Math.max(30, landedTile.duration);
    setActionSeconds(duration);
    const ticker = window.setInterval(() => setActionSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    const timeout = window.setTimeout(() => finishAction("timeout"), duration * 1000);
    const botAction = currentTurn === "bot" ? window.setTimeout(() => finishAction("bot-auto"), 900) : null;
    return () => {
      window.clearInterval(ticker);
      window.clearTimeout(timeout);
      if (botAction) window.clearTimeout(botAction);
    };
  }, [gamePhase, landedTile, currentTurn, districtActionSession, districtFeedback, districtActionUsed]);

  useEffect(() => {
    if (gamePhase !== GAME_PHASES.ACTION_PHASE || !districtFeedback) return undefined;
    if (currentTurn === "player" && districtFeedback.type !== "TIMEOUT") return undefined;
    const timer = window.setTimeout(finishDistrictAction, 1200);
    return () => window.clearTimeout(timer);
  }, [gamePhase, districtFeedback, currentTurn]);

  useEffect(() => {
    if (gamePhase !== GAME_PHASES.TURN_END) return undefined;
    const timer = window.setTimeout(() => {
      if (currentTurn === "bot" && round >= MATCH_RULES.MAX_ROUNDS) {
        endMatch("ROUNDS_COMPLETE");
        return;
      }
      const next = nextTurn(currentTurn);
      if (currentTurn === "bot" && next === "player") setRound((value) => value + 1);
      setCurrentTurn(next);
      const regeneration = regenerateTurnEnergy(energyRef.current[next]);
      energyRef.current = { ...energyRef.current, [next]: regeneration.energy };
      setEnergy(energyRef.current);
      setActionSeconds(0);
      setDistrictActionSession(null);
      setDistrictFeedback(null);
      setDistrictActionUsed(false);
      setCardActionUsed(false);
      setItemActionUsed(false);
      setUtilityFeedback(null);
      setRewardNotification(next === "player" && regeneration.gained > 0
        ? { success: true, message: `เริ่มเทิร์น: ฟื้นฟู +${regeneration.gained} EN` }
        : null);
      setBotUtilityResolved(false);
      setMovementSteps(null);
      setTurnNumber((value) => {
        const nextTurnNumber = value + 1;
        setEffects((current) => activeEffects(current, nextTurnNumber));
        return nextTurnNumber;
      });
      advancePhase(GAME_PHASES.WAITING);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [gamePhase, currentTurn, round, decisionPoints, scenarioHistory]);

  useEffect(() => {
    if (gamePhase !== GAME_PHASES.WAITING || currentTurn !== "bot") return undefined;
    const timer = window.setTimeout(() => startRoll("bot"), 720);
    return () => window.clearTimeout(timer);
  }, [gamePhase, currentTurn]);

  return html`
    <div className="map-app">
      <div className="map-canvas">
        <${Canvas} shadows dpr=${[1,1.5]} camera=${{ position: [18,18,18], fov: 38, near: .1, far: 80 }} gl=${{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
          <${Suspense} fallback=${null}>
            <${MapScene}
              selectedTile=${selectedTile}
              onSelectTile=${(tile) => setSelectedTile(tile.index)}
              districtStates=${districtStates}
              selectedDistrict=${selectedDistrict}
              onSelectDistrict=${setSelectedDistrict}
              effects=${effects}
              battleVisual=${battleVisual}
              playerPosition=${playerPosition}
              botPosition=${botPosition}
              movement=${movement}
              onMoveComplete=${finishMove}
              rollRequest=${rollRequest}
              onRollComplete=${finishRoll}
            />
          </${Suspense}>
        </${Canvas}>
      </div>

      <header className="map-topbar">
        <a className="map-brand" href="lobby.html"><img src="assets/ai-district-logo.png" alt="Ai District" /><span>AI DISTRICT · 3D WORLD</span></a>
        <button type="button" className="map-surrender" disabled=${gamePhase === GAME_PHASES.GAME_END} onClick=${() => setSurrenderOpen(true)}><span aria-hidden="true">⚑</span> ยอมแพ้</button>
      </header>

      <aside className="map-panel">
        <div className="panel-heading">
          <div><p className="map-kicker">AI DISTRICT · MATCH CONTROL</p><h1>มหานคร AI District</h1></div>
          <span className="round-pill"><small>ROUND</small>${Math.min(round, MATCH_RULES.MAX_ROUNDS)}<em>/ ${MATCH_RULES.MAX_ROUNDS}</em></span>
        </div>
        <section className="hud-group match-info" aria-labelledby="match-info-title">
          <div className="hud-group-title"><span id="match-info-title">ข้อมูลการแข่งขัน</span><small>รอบ ${round}</small></div>
          <div className=${`turn-indicator ${currentTurn}`}>
            <i className="turn-avatar" aria-hidden="true">${currentTurn === "player" ? "P" : "B"}</i>
            <span>ผู้เล่นปัจจุบัน<strong>${currentTurn === "player" ? "ผู้เล่น" : "บอท"}</strong></span>
            <b>${HUD_PHASE_LABELS[gamePhase]}</b>
          </div>
        </section>
        <section className="hud-group player-info" aria-labelledby="player-info-title">
          <div className="hud-group-title"><span id="player-info-title">ข้อมูลผู้เล่น</span><small>PLAYER / BOT</small></div>
          <div className="map-stats">
            <div className="map-stat energy-stat"><i aria-hidden="true">⚡</i><span>พลังงาน<strong key=${`energy-${energy.player}-${energy.bot}`} className="value-pop">${energy.player} / ${energy.bot} EN</strong></span><em style=${{"--energy-level":`${Math.min(100, energy.player / 12 * 100)}%`}}></em></div>
            <div className="map-stat"><i aria-hidden="true">✦</i><span>คะแนนการตัดสินใจ<strong key=${`dp-${decisionPoints.player}-${decisionPoints.bot}`} className="value-pop">${decisionPoints.player} / ${decisionPoints.bot} DP</strong></span></div>
            <div className="map-stat"><i aria-hidden="true">⚄</i><span>ผลลูกเต๋า<strong key=${`dice-${diceResult}-${gamePhase}`} className="value-pop">${gamePhase === GAME_PHASES.ROLLING ? "กำลังหมุน…" : diceResult == null ? "—" : movementSteps > diceResult ? `${diceResult} + ${movementSteps - diceResult}` : diceResult}</strong></span></div>
            <div className="map-stat"><i aria-hidden="true">◎</i><span>ตำแหน่ง P / B<strong>${playerPosition + 1} / ${botPosition + 1}</strong></span></div>
            <div className="map-stat current-tile-stat"><i aria-hidden="true">◈</i><span>ช่องปัจจุบัน<strong>${currentTile.tileIndex + 1} · ${currentTile.type}</strong></span></div>
          </div>
          <div className="map-actions">
            <button type="button" className="primary roll-button" disabled=${!canPlayerRoll} onClick=${() => startRoll("player")}>${currentTurn === "bot" ? "บอทกำลังเล่น…" : gamePhase === GAME_PHASES.WAITING ? "ทอยลูกเต๋า" : HUD_PHASE_LABELS[gamePhase]}</button>
          </div>
          <p className="map-movement-status" aria-live="polite">${currentHint}</p>
        </section>
        <section className="hud-group district-overview" aria-labelledby="district-overview-title">
          <div className="district-list-title"><span id="district-overview-title">ภาพรวมเขต</span><small>PLAYER / BOT IP</small></div>
          <div className="district-list">
            ${DISTRICTS.map((district)=>html`
              <button key=${district.id} type="button" className=${`district-row ${selectedDistrict === district.id ? "selected" : ""} ${ownershipToast?.districtId === district.id ? "ownership-flash" : ""}`} onClick=${()=>setSelectedDistrict(district.id)} style=${{"--district-color":districtStates[district.id].ownerId ? (districtStates[district.id].ownerId === "player" ? "#55b8ff" : "#ff77a9") : district.color}}>
                <i></i><span>${district.name}<small><b>${districtStates[district.id].influenceByPlayer.player}</b> / <b>${districtStates[district.id].influenceByPlayer.bot}</b> IP</small></span><strong>${DISTRICT_STATUS_LABELS[districtStates[district.id].status]}<small>${districtStates[district.id].ownerId === "player" ? "ผู้เล่น" : districtStates[district.id].ownerId === "bot" ? "บอท" : ""}</small></strong>
              </button>
            `)}
          </div>
        </section>
      </aside>

      ${surrenderOpen ? html`
        <div className="surrender-backdrop" role="presentation" onClick=${() => setSurrenderOpen(false)}>
          <section className="surrender-dialog" role="dialog" aria-modal="true" aria-labelledby="surrender-title" onClick=${(event) => event.stopPropagation()}>
            <div className="surrender-icon" aria-hidden="true">⚑</div>
            <p className="map-kicker">LEAVE CURRENT MATCH</p>
            <h2 id="surrender-title">ยืนยันการยอมแพ้?</h2>
            <p>การแข่งขันรอบนี้จะสิ้นสุด และความคืบหน้าระหว่างรอบที่ยังไม่บันทึกจะหายไป</p>
            <div className="surrender-summary"><span>รอบที่ <b>${round}</b></span><span>คะแนน <b>${decisionPoints.player} DP</b></span><span>พลังงาน <b>${energy.player} EN</b></span></div>
            <div className="surrender-actions">
              <button type="button" className="surrender-cancel" onClick=${() => setSurrenderOpen(false)}>เล่นต่อ</button>
              <button type="button" className="surrender-confirm" onClick=${() => endMatch("SURRENDER")}>ยืนยันยอมแพ้</button>
            </div>
          </section>
        </div>
      ` : null}

      <section className=${`event-panel ${eventPanelOpen ? "show" : ""}`} aria-hidden=${!eventPanelOpen}>
        <p className="map-kicker">TILE EVENT · ${currentTile.type}</p>
        <h2>${currentTile.title}</h2>
        <span className="event-tile">ช่อง ${currentTile.tileIndex + 1}</span>
        <p>${currentTile.description}</p>
        ${gamePhase === GAME_PHASES.TILE_EVENT ? html`<div className="event-loading">กำลังวิเคราะห์พื้นที่…</div>` : null}
        ${gamePhase === GAME_PHASES.ACTION_PHASE ? html`
          <div className="action-timer"><span>เวลาตัดสินใจ</span><strong>${actionSeconds}</strong><small>วินาที</small></div>
          ${currentTurn === "player" ? html`<button type="button" className="event-continue" onClick=${() => finishAction("continue")}>ดำเนินการต่อ</button>` : html`<div className="event-loading">บอทกำลังเลือกผลลัพธ์ทดสอบ…</div>`}
        ` : null}
        ${gamePhase === GAME_PHASES.TURN_END ? html`<div className="event-result">${lastActionResult || currentTile.safeResult}</div>` : null}
      </section>

      <${DistrictPanel}
        session=${districtActionSession}
        district=${actionDistrict}
        energy=${energy[currentTurn]}
        seconds=${actionSeconds}
        currentTurn=${currentTurn}
        actionUsed=${districtActionUsed}
        feedback=${districtFeedback}
        onBuild=${() => completeDistrictAction("BUILD")}
        onInfluence=${() => completeDistrictAction("INFLUENCE")}
        onSkip=${() => completeDistrictAction("SKIP")}
        onContinue=${finishDistrictAction}
      />

      <${ActionInventoryPanel}
        inventory=${inventories.player}
        districts=${districtStates}
        effects=${effects}
        energy=${energy.player}
        currentTurn=${currentTurn}
        canUse=${!matchResult && currentTurn === "player" && gamePhase === GAME_PHASES.ACTION_PHASE && !isMoving}
        cardUsed=${cardActionUsed}
        itemUsed=${itemActionUsed}
        feedback=${utilityFeedback}
        rewardNotification=${rewardNotification}
        selectedDistrictId=${selectedDistrict}
        onSelectTarget=${setSelectedDistrict}
        onUse=${(kind, instanceId, districtId) => useUtility(kind, instanceId, districtId, "player")}
      />

      <div className="selection-chip">${selectedTileData.index + 1} · ${selectedTileData.type}</div>
      ${ownershipToast ? html`<div className=${`ownership-toast ${ownershipToast.ownerId}`} role="status"><i aria-hidden="true">✦</i><span><b>${ownershipToast.districtName}</b>${ownershipToast.ownerId === "player" ? "เป็นเขตของคุณแล้ว!" : "ถูกบอทยึดครอง"}</span></div>` : null}
      ${battleVisual ? html`<div className=${`battle-visual-toast ${battleVisual.kind.toLowerCase()}`} role="status" aria-live="polite"><i aria-hidden="true">${battleVisual.kind === "BLOCKED" ? "◆" : battleVisual.kind === "ATTACK" ? "⚡" : battleVisual.kind === "CAPTURE" ? "★" : "✦"}</i><span><b>${battleVisual.title}</b>${battleVisual.label}<small>${battleVisual.detail}</small></span></div>` : null}
      <div className="map-help">ลากเพื่อหมุนฉาก • เลื่อนล้อเพื่อซูม</div>
      <${GameResultPanel}
        result=${matchResult}
        saveStatus=${saveStatus}
        onReplay=${replayMatch}
        onLobby=${() => window.location.assign("lobby.html")}
      />
    </div>
  `;
}

createRoot(document.querySelector("#map-root")).render(React.createElement(App));
