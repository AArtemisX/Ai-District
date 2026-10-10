import React, { Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { html } from "./map-3d/runtime.js";
import { BOARD_TILES, DISTRICTS, buildTilePath } from "./map-3d/board-data.js";
import { MapScene } from "./map-3d/MapScene.js";
import { GAME_PHASES, PHASE_LABELS, getTileEvent, nextTurn, rollDie, transitionPhase } from "./map-3d/turn-manager.js";
import { ScenarioModal } from "./map-3d/ScenarioModal.js";
import { addDecisionPoints, chooseBotChoice, createTimeoutResult, resolveScenarioChoice, selectScenario } from "./map-3d/scenario-engine.js";

const initialDistricts = Object.fromEntries(DISTRICTS.map((district) => [district.id, {
  status: "empty",
  owner: null,
  variant: DISTRICTS.findIndex((item) => item.id === district.id) % 3,
  modelUrl: null,
}]));

function App() {
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
  const [scenarioSession, setScenarioSession] = useState(null);
  const [scenarioFeedback, setScenarioFeedback] = useState(null);
  const [scenarioHistory, setScenarioHistory] = useState([]);

  const selectedTileData = BOARD_TILES[selectedTile];
  const selectedDistrictData = DISTRICTS.find((district) => district.id === selectedDistrict);
  const activePosition = currentTurn === "player" ? playerPosition : botPosition;
  const currentTile = landedTile || getTileEvent(activePosition);
  const isScenarioTile = currentTile.type === "AI_SCENARIO";
  const eventPanelOpen = !isScenarioTile && [GAME_PHASES.TILE_EVENT, GAME_PHASES.ACTION_PHASE, GAME_PHASES.TURN_END].includes(gamePhase);
  const canPlayerRoll = currentTurn === "player" && gamePhase === GAME_PHASES.WAITING && !isMoving;

  function advancePhase(nextPhase) {
    setGamePhase((current) => transitionPhase(current, nextPhase));
  }

  function startRoll(actor) {
    if (gamePhase !== GAME_PHASES.WAITING || currentTurn !== actor || isMoving) return;
    const value = rollDie();
    setDiceResult(null);
    setLandedTile(null);
    setLastActionResult(null);
    setScenarioSession(null);
    setScenarioFeedback(null);
    setRollRequest({ id: `${actor}-${performance.now()}`, actor, value });
    advancePhase(GAME_PHASES.ROLLING);
  }

  function finishRoll(value) {
    if (gamePhase !== GAME_PHASES.ROLLING) return;
    const from = currentTurn === "player" ? playerPosition : botPosition;
    setDiceResult(value);
    setMovement({ id: `${currentTurn}-${performance.now()}`, actor: currentTurn, from, path: buildTilePath(from, value) });
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
    if (tileEvent.type === "AI_SCENARIO") {
      const scenario = selectScenario(finalIndex, scenarioHistory.map((result) => result.scenarioId));
      setScenarioSession({ id: `${actor}-${scenario.scenarioId}-${performance.now()}`, actor, scenario, status: "PENDING" });
      setScenarioFeedback(null);
      setActionSeconds(scenario.timeLimit);
    } else {
      setScenarioSession(null);
      setScenarioFeedback(null);
    }
    setMovement(null);
    setIsMoving(false);
    advancePhase(GAME_PHASES.TILE_EVENT);
  }

  function finishAction(reason = "continue") {
    if (gamePhase !== GAME_PHASES.ACTION_PHASE || !landedTile) return;
    if (landedTile.type === "AI_SCENARIO") return;
    setLastActionResult(reason === "timeout" ? landedTile.safeResult : "ดำเนินการเรียบร้อย");
    advancePhase(GAME_PHASES.TURN_END);
  }

  function recordScenarioResult(result) {
    setScenarioFeedback(result);
    setScenarioSession((current) => current ? { ...current, status: "RESULT" } : current);
    setDecisionPoints((scores) => addDecisionPoints(scores, result));
    setScenarioHistory((history) => [...history, result]);
  }

  function chooseScenario(choiceId) {
    if (gamePhase !== GAME_PHASES.ACTION_PHASE || currentTurn !== "player" || !scenarioSession || scenarioFeedback) return;
    recordScenarioResult(resolveScenarioChoice(scenarioSession.scenario, choiceId, "player"));
  }

  function finishScenarioAction() {
    if (gamePhase !== GAME_PHASES.ACTION_PHASE || !scenarioFeedback) return;
    setLastActionResult(`${scenarioFeedback.status} · +${scenarioFeedback.decisionPoints} DP`);
    advancePhase(GAME_PHASES.TURN_END);
  }

  useEffect(() => {
    if (gamePhase !== GAME_PHASES.TILE_EVENT) return undefined;
    const timer = window.setTimeout(() => advancePhase(GAME_PHASES.ACTION_PHASE), 420);
    return () => window.clearTimeout(timer);
  }, [gamePhase]);

  useEffect(() => {
    if (gamePhase !== GAME_PHASES.ACTION_PHASE || !landedTile) return undefined;
    if (landedTile.type === "AI_SCENARIO") {
      if (!scenarioSession || scenarioFeedback) return undefined;
      const duration = Math.max(30, scenarioSession.scenario.timeLimit);
      setActionSeconds(duration);
      const ticker = window.setInterval(() => setActionSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
      const timeout = window.setTimeout(() => recordScenarioResult(createTimeoutResult(scenarioSession.scenario, currentTurn)), duration * 1000);
      const botAction = currentTurn === "bot" ? window.setTimeout(() => {
        const botChoice = chooseBotChoice(scenarioSession.scenario, "standard");
        recordScenarioResult(resolveScenarioChoice(scenarioSession.scenario, botChoice.id, "bot"));
      }, 1100) : null;
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
  }, [gamePhase, landedTile, currentTurn, scenarioSession, scenarioFeedback]);

  useEffect(() => {
    if (gamePhase !== GAME_PHASES.ACTION_PHASE || !scenarioFeedback) return undefined;
    if (scenarioFeedback.actor === "player" && scenarioFeedback.status !== "TIMEOUT") return undefined;
    const timer = window.setTimeout(finishScenarioAction, 1200);
    return () => window.clearTimeout(timer);
  }, [gamePhase, scenarioFeedback]);

  useEffect(() => {
    if (gamePhase !== GAME_PHASES.TURN_END) return undefined;
    const timer = window.setTimeout(() => {
      const next = nextTurn(currentTurn);
      if (currentTurn === "bot" && next === "player") setRound((value) => value + 1);
      setCurrentTurn(next);
      setActionSeconds(0);
      setScenarioSession(null);
      setScenarioFeedback(null);
      advancePhase(GAME_PHASES.WAITING);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [gamePhase, currentTurn]);

  useEffect(() => {
    if (gamePhase !== GAME_PHASES.WAITING || currentTurn !== "bot") return undefined;
    const timer = window.setTimeout(() => startRoll("bot"), 720);
    return () => window.clearTimeout(timer);
  }, [gamePhase, currentTurn]);

  function toggleDistrict() {
    if (gamePhase !== GAME_PHASES.WAITING || currentTurn !== "player") return;
    setDistrictStates((current) => {
      const state = current[selectedDistrict];
      return {
        ...current,
        [selectedDistrict]: state.status === "empty"
          ? { ...state, status: "built", owner: "player" }
          : { ...state, status: "empty", owner: null },
      };
    });
  }

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
        <a className="map-back" href="ai-world.html">← กลับ AI World</a>
      </header>

      <aside className="map-panel">
        <p className="map-kicker">TURN-BASED DEMO · ROUND ${round}</p>
        <h1>นครลอยฟ้า AI</h1>
        <div className=${`turn-indicator ${currentTurn}`}><span>เทิร์นปัจจุบัน</span><strong>${currentTurn === "player" ? "ผู้เล่น" : "บอท"}</strong><b>${PHASE_LABELS[gamePhase]}</b></div>
        <div className="map-stats">
          <div className="map-stat"><span>ตำแหน่งผู้เล่น / บอท</span><strong>${playerPosition + 1} / ${botPosition + 1}</strong></div>
          <div className="map-stat"><span>ช่องปัจจุบัน</span><strong>${currentTile.tileIndex + 1} · ${currentTile.type}</strong></div>
          <div className="map-stat"><span>ผลลูกเต๋า</span><strong>${gamePhase === GAME_PHASES.ROLLING ? "กำลังหมุน…" : diceResult ?? "—"}</strong></div>
          <div className="map-stat"><span>Decision Points</span><strong>${decisionPoints.player} / ${decisionPoints.bot} DP</strong></div>
        </div>
        <div className="map-actions">
          <button type="button" className="primary roll-button" disabled=${!canPlayerRoll} onClick=${() => startRoll("player")}>${currentTurn === "bot" ? "บอทกำลังเล่น…" : gamePhase === GAME_PHASES.WAITING ? "ทอยลูกเต๋า" : PHASE_LABELS[gamePhase]}</button>
          <button type="button" className="build-button" disabled=${gamePhase !== GAME_PHASES.WAITING || currentTurn !== "player"} onClick=${toggleDistrict}>${districtStates[selectedDistrict].status === "empty" ? `สร้าง ${selectedDistrictData.name}` : `รื้อ ${selectedDistrictData.name}`}</button>
        </div>
        <p className="map-movement-status" aria-live="polite">${gamePhase === GAME_PHASES.MOVING ? `${currentTurn === "player" ? "ผู้เล่น" : "บอท"} กำลังเดิน ${diceResult} ช่อง…` : PHASE_LABELS[gamePhase]}</p>
        <div className="district-list">
          ${DISTRICTS.map((district)=>html`
            <button key=${district.id} type="button" className="district-row" onClick=${()=>setSelectedDistrict(district.id)} style=${{"--district-color":district.color}}>
              <i></i><span>${district.name}</span><b>${districtStates[district.id].status === "built" ? "BUILT · PLAYER" : "EMPTY"}</b>
            </button>
          `)}
        </div>
      </aside>

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

      <${ScenarioModal}
        session=${scenarioSession}
        feedback=${scenarioFeedback}
        seconds=${actionSeconds}
        gamePhase=${gamePhase}
        onChoose=${chooseScenario}
        onContinue=${finishScenarioAction}
      />

      <div className="selection-chip">${selectedTileData.index + 1} · ${selectedTileData.type}</div>
      <div className="map-help">ลากเพื่อหมุน · เลื่อนล้อเพื่อซูม · ลูกเต๋าและการเดินทำงานตาม State Machine</div>
    </div>
  `;
}

createRoot(document.querySelector("#map-root")).render(React.createElement(App));
