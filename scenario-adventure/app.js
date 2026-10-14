import { createRoot } from "react-dom/client";
import { requirePlayer } from "../flow-common.js";
import { readScenarioCharacterSelection } from "../characters/character-session.js";
import { ACTION_CARD_BY_ID } from "../map-3d/action-card-data.js";
import { buildTilePath } from "../map-3d/board-data.js";
import { html, React } from "../map-3d/runtime.js";
import { nextTurn, rollDie } from "../map-3d/turn-core.js";
import { ScenarioAdventureScene } from "./ScenarioAdventureScene.js";
import { cancelCardSelection, consumeSelectedCard, countDeckCards, createDeckState, prepareDeckForTurn, selectCardInstance } from "./deck-engine.js";
import { loadAdventureInventory, saveAdventureLoadout } from "./loadout-client.js";
import { SCENARIO_LOADOUT_POLICIES, SCENARIO_LOADOUT_SIZE, maxCopiesForScenarioPolicy, validateAdventureLoadout } from "./loadout-engine.js";
import { RESPONSE_TYPES, chooseBotResponse, createResponseSelection, resolveScenarioResponse } from "./response-engine.js";
import { createScenarioAdventureMatch, recordScenarioUse, selectAdventureScenario } from "./scenario-engine.js";
import { createScenarioRepository } from "./scenario-repository.js";

const { useEffect, useMemo, useRef, useState } = React;
const root = document.querySelector("#map-root");
const repository = createScenarioRepository();
const characterSelection = readScenarioCharacterSelection();
const PHASES = Object.freeze({ WAITING: "WAITING", ROLLING: "ROLLING", MOVING: "MOVING", SCENARIO: "SCENARIO", RESPONSE_SELECTION: "RESPONSE_SELECTION", RESOLVED: "RESOLVED", TURN_END: "TURN_END" });
const PHASE_TEXT = Object.freeze({ WAITING: "พร้อมทอยลูกเต๋า", ROLLING: "กำลังทอยลูกเต๋า...", MOVING: "กำลังเดิน...", SCENARIO: "กำลังเปิดสถานการณ์", RESPONSE_SELECTION: "เลือกวิธีตอบสนอง", RESOLVED: "ตรวจสอบผลลัพธ์", TURN_END: "กำลังเปลี่ยนเทิร์น" });

function actorLabel(actor) { return actor === "player" ? "ผู้เล่น" : "บอท"; }
function cardData(cardId, inventory) { return inventory.cards.find((card) => card.id === cardId) || ACTION_CARD_BY_ID[cardId] || { id: cardId, name: cardId, description: "ไม่มีรายละเอียดการ์ด", en_cost: 0, card_type: "SUPPORT" }; }

function LoadoutScreen({ inventory, initialLoadout, onStart }) {
  const [selected, setSelected] = useState(initialLoadout);
  const [message, setMessage] = useState(inventory.persistenceMessage);
  const [saving, setSaving] = useState(false);
  const validation = validateAdventureLoadout(selected, inventory.allowedIds, { policy: inventory.loadoutPolicy });
  const maxCopies = maxCopiesForScenarioPolicy(inventory.loadoutPolicy);
  const uniqueMode = inventory.loadoutPolicy === SCENARIO_LOADOUT_POLICIES.FIVE_UNIQUE_STARTERS;
  const counts = selected.reduce((map, id) => map.set(id, (map.get(id) || 0) + 1), new Map());
  const addCard = (id) => {
    if (!inventory.allowedIds.includes(id)) return setMessage("การ์ดใบนี้ยังล็อกอยู่");
    if (selected.length >= SCENARIO_LOADOUT_SIZE) return setMessage("Loadout ครบ 5 ใบแล้ว กรุณานำการ์ดออกก่อน");
    if ((counts.get(id) || 0) >= maxCopies) return setMessage(uniqueMode ? "Scenario Loadout ใช้การ์ดแต่ละ ID ได้เพียง 1 ใบ" : "การ์ดชนิดเดียวกันใส่ได้สูงสุด 2 ใบ");
    setSelected([...selected, id]); setMessage("");
  };
  const begin = async (persist) => {
    if (!validation.valid || saving) return;
    setSaving(true);
    if (persist) {
      const saved = await saveAdventureLoadout(selected, inventory.allowedIds, inventory.loadoutPolicy);
      if (!saved.ok) { setMessage(`บันทึกไม่สำเร็จ: ${saved.message}`); setSaving(false); return; }
    }
    onStart(selected); setSaving(false);
  };
  return html`<section className="adventure-loadout">
    <header><nav aria-label="ทางลัดก่อนเริ่มเกม"><a href="ai-world.html">← กลับ AI World</a><a href="card-inventory.html">คลังการ์ดถาวร</a></nav><span>SCENARIO ADVENTURE · ROUND 2</span></header>
    <div className="adventure-loadout-card">
      <div className="adventure-loadout-heading"><div><small>FIVE-CARD LOADOUT · ${characterSelection?.character?.displayName || "S+ AGENT"}</small><h1>จัดชุดการ์ดก่อนออกผจญภัย</h1><p>${uniqueMode ? "เลือกการ์ดที่มีสิทธิ์ใช้ 5 ใบ โดยแต่ละ Card ID ต้องไม่ซ้ำกัน" : "เลือก 5 ใบจากการ์ดที่คุณมีสิทธิ์ใช้ ซ้ำชนิดเดิมได้สูงสุด 2 ใบ"}</p></div><b>${selected.length}/5</b></div>
      <div className="adventure-loadout-slots">${Array.from({ length: 5 }, (_, index) => {
        const id = selected[index]; const card = id ? cardData(id, inventory) : null;
        return card ? html`<button type="button" onClick=${() => setSelected(selected.filter((_, slot) => slot !== index))}><span>${index + 1}</span><strong>${card.name}</strong><small>คลิกเพื่อนำออก</small></button>` : html`<div><span>${index + 1}</span><strong>ช่องว่าง</strong><small>เลือกจากคลังด้านล่าง</small></div>`;
      })}</div>
      ${message ? html`<p className="adventure-warning" role="status">${message}</p>` : null}
      <div className="adventure-card-library">${inventory.cards.map((card) => {
        const prototype = card.catalogState === "PROTOTYPE"; const unlocked = !prototype && inventory.allowedIds.includes(card.id); const copies = counts.get(card.id) || 0;
        const costLabel = Number.isInteger(card.en_cost) ? `${card.en_cost} EN` : "ยังไม่กำหนดค่าใช้";
        return html`<button type="button" className=${`adventure-library-card ${unlocked ? "" : "locked"} ${prototype ? "prototype" : ""}`} disabled=${!unlocked} onClick=${() => addCard(card.id)}><span>${card.card_type} · ${costLabel}</span><strong>${card.name}</strong><p>${prototype ? "Prototype Catalog — มีข้อมูลและ Artwork แต่ยังไม่เป็นสิทธิ์สำหรับ Match" : unlocked ? card.description : "มีใน Card Catalog แต่บัญชียังไม่มีสิทธิ์ใช้งาน"}</p><small>${prototype ? "PROTOTYPE" : unlocked ? `อยู่ในชุด ${copies}/${maxCopies} ใบ` : "LOCKED"}</small></button>`;
      })}</div>
      <div className="adventure-loadout-actions">
        ${inventory.persistenceReady ? html`<button className="primary" type="button" disabled=${!validation.valid || saving} onClick=${() => begin(true)}>${saving ? "กำลังบันทึก..." : "บันทึก Loadout และเริ่มเกม"}</button>` : html`<button className="primary" type="button" disabled=${!validation.valid || saving} onClick=${() => begin(false)}>เริ่มทดสอบในแท็บนี้</button>`}
        <span>${validation.valid ? "พร้อมเริ่มเกม · มือเริ่มต้นจะสุ่ม 3 ใบ" : "เลือกการ์ดให้ครบ 5 ใบก่อนเริ่ม"}</span>
      </div>
    </div>
  </section>`;
}

function ScenarioPanel({ scenario, actor, deck, inventory, selection, result, onSelectCard, onSelectBasic, onCancel, onConfirm, onContinue, phase }) {
  if (!scenario) return html`<aside className="adventure-response-panel idle"><small>SCENARIO RESPONSE</small><h2>รอสถานการณ์ถัดไป</h2><p>เมื่อหยุดที่ช่องใด ระบบจะเปิดสถานการณ์จาก Scenario Engine โดยอัตโนมัติ</p></aside>`;
  const isBot = actor === "bot";
  return html`<aside className="adventure-response-panel" aria-live="polite">
    <div className="scenario-meta"><span>${scenario.category}</span><span>${scenario.difficulty}</span></div><h2>${scenario.title}</h2><p className="scenario-description">${scenario.description}</p>
    <section className="response-options"><h3>${isBot ? "บอทกำลังเลือกการตอบสนอง" : "เลือกการ์ดในมือได้ 1 ใบ"}</h3>
      <div className="response-hand">${deck.hand.map((instance) => { const card = cardData(instance.cardId, inventory); const active = selection?.instanceId === instance.instanceId; return html`<button type="button" disabled=${isBot || phase !== PHASES.RESPONSE_SELECTION} className=${active ? "selected" : ""} onClick=${() => onSelectCard(instance)}><small>${card.card_type} · ${card.en_cost} EN</small><strong>${card.name}</strong><span>${card.description}</span></button>`; })}</div>
      <button type="button" className=${`basic-response ${selection?.type === RESPONSE_TYPES.BASIC ? "selected" : ""}`} disabled=${isBot || phase !== PHASES.RESPONSE_SELECTION} onClick=${onSelectBasic}><small>BASIC RESPONSE · ไม่ใช้การ์ด</small><strong>${scenario.basicResponse.label}</strong><span>${scenario.basicResponse.description}</span></button>
    </section>
    ${selection ? html`<div className=${`response-readiness ${selection.usable ? "ready" : "blocked"}`}><strong>${selection.usable ? "พร้อมใช้" : "ยังใช้ไม่ได้"}</strong><span>${selection.reason}</span></div>` : null}
    ${result ? html`<div className="response-result"><small>${result.responseType === "CARD" ? "CARD RESPONSE" : "BASIC RESPONSE"}</small><strong>${result.impact}</strong><p>${result.explanation}</p><span>Temporary Response Resolver · ไม่มีผลต่อ IP หรือ District</span></div>` : null}
    <div className="response-actions">${phase === PHASES.RESPONSE_SELECTION && !isBot ? html`<button type="button" onClick=${onCancel} disabled=${!selection}>ยกเลิกการเลือก</button><button type="button" className="primary" onClick=${onConfirm} disabled=${!selection?.usable}>ยืนยันการตอบสนอง</button>` : null}${phase === PHASES.RESOLVED && !isBot ? html`<button type="button" className="primary" onClick=${onContinue}>จบเทิร์น</button>` : null}</div>
  </aside>`;
}

function Game({ inventory, loadout }) {
  const matchId = useMemo(() => `scenario-${Date.now()}`, []);
  const [match, setMatch] = useState(() => createScenarioAdventureMatch()); const matchRef = useRef(match);
  const [actor, setActor] = useState("player"); const actorRef = useRef(actor);
  const [phase, setPhase] = useState(PHASES.WAITING); const phaseRef = useRef(phase);
  const [positions, setPositions] = useState({ player: 0, bot: 0 }); const positionsRef = useRef(positions);
  const [decks, setDecks] = useState(() => ({ player: createDeckState(loadout, { actorId: "player", matchId }), bot: createDeckState(loadout, { actorId: "bot", matchId }) })); const decksRef = useRef(decks);
  const [rollRequest, setRollRequest] = useState(null); const [movement, setMovement] = useState(null); const [scenario, setScenario] = useState(null); const [selection, setSelection] = useState(null); const [result, setResult] = useState(null); const [lastRoll, setLastRoll] = useState(null);
  const resolvedIds = useRef([]); const actionCounter = useRef(0);
  useEffect(() => { matchRef.current = match; }, [match]); useEffect(() => { actorRef.current = actor; }, [actor]); useEffect(() => { phaseRef.current = phase; }, [phase]); useEffect(() => { positionsRef.current = positions; }, [positions]); useEffect(() => { decksRef.current = decks; }, [decks]);
  const commitDeck = (targetActor, updater) => { const next = { ...decksRef.current, [targetActor]: updater(decksRef.current[targetActor]) }; decksRef.current = next; setDecks(next); return next[targetActor]; };
  const startRoll = () => { if (phaseRef.current !== PHASES.WAITING) return; const value = rollDie(); const id = `${actorRef.current}-roll-${Date.now()}-${actionCounter.current++}`; setLastRoll(value); setPhase(PHASES.ROLLING); setRollRequest({ id, value }); };
  const onRollComplete = (value) => { if (phaseRef.current !== PHASES.ROLLING) return; const currentActor = actorRef.current; const from = positionsRef.current[currentActor]; setPhase(PHASES.MOVING); setMovement({ id: `${currentActor}-move-${Date.now()}`, actor: currentActor, from, path: buildTilePath(from, value) }); };
  const onMoveComplete = async (movedActor, finalIndex) => { if (movedActor !== actorRef.current || phaseRef.current !== PHASES.MOVING) return; const nextPositions = { ...positionsRef.current, [movedActor]: finalIndex }; positionsRef.current = nextPositions; setPositions(nextPositions); setMovement(null); setPhase(PHASES.SCENARIO); const selectedScenario = await selectAdventureScenario({ repository, themeId: matchRef.current.themeId, tileIndex: finalIndex, history: matchRef.current.scenarioHistory }); const history = recordScenarioUse(matchRef.current.scenarioHistory, { scenario: selectedScenario, actorId: movedActor, tileIndex: finalIndex, turnNumber: matchRef.current.scenarioHistory.length + 1 }); const nextMatch = { ...matchRef.current, scenarioHistory: history }; matchRef.current = nextMatch; setMatch(nextMatch); setScenario(selectedScenario); setSelection(null); setResult(null); setPhase(PHASES.RESPONSE_SELECTION); };
  const chooseCard = (instance) => { if (phaseRef.current !== PHASES.RESPONSE_SELECTION) return; const updated = commitDeck("player", (deck) => selectCardInstance(deck, instance.instanceId)); setSelection(createResponseSelection({ type: RESPONSE_TYPES.CARD, scenario, deck: updated, instanceId: instance.instanceId })); setResult(null); };
  const chooseBasic = () => { if (phaseRef.current !== PHASES.RESPONSE_SELECTION) return; commitDeck("player", cancelCardSelection); setSelection(createResponseSelection({ type: RESPONSE_TYPES.BASIC, scenario, deck: decksRef.current.player })); setResult(null); };
  const resolveForActor = (targetActor, chosen) => { if (phaseRef.current !== PHASES.RESPONSE_SELECTION || !chosen?.usable) return false; const actionId = `${matchId}:${targetActor}:${actionCounter.current++}`; const resolved = resolveScenarioResponse({ scenario, actorId: targetActor, selection: chosen, actionId, resolvedActionIds: resolvedIds.current }); if (resolved.duplicate) return false; resolvedIds.current = resolved.resolvedActionIds; if (chosen.type === RESPONSE_TYPES.CARD) commitDeck(targetActor, (deck) => consumeSelectedCard(selectCardInstance(deck, chosen.instanceId), { actionId, successful: true }).deck); setSelection(chosen); setResult(resolved.result); setPhase(PHASES.RESOLVED); return true; };
  const finishTurn = () => { if (phaseRef.current !== PHASES.RESOLVED) return; setPhase(PHASES.TURN_END); const upcoming = nextTurn(actorRef.current); commitDeck(upcoming, (deck) => prepareDeckForTurn(deck)); setScenario(null); setSelection(null); setResult(null); setActor(upcoming); actorRef.current = upcoming; window.setTimeout(() => setPhase(PHASES.WAITING), 250); };
  useEffect(() => { if (actor !== "bot" || phase !== PHASES.WAITING) return undefined; const timer = window.setTimeout(startRoll, 650); return () => window.clearTimeout(timer); }, [actor, phase]);
  useEffect(() => { if (actor !== "bot" || phase !== PHASES.RESPONSE_SELECTION || !scenario) return undefined; const chosen = chooseBotResponse({ scenario, deck: decksRef.current.bot }); setSelection(chosen); const timer = window.setTimeout(() => resolveForActor("bot", chosen), 650); return () => window.clearTimeout(timer); }, [actor, phase, scenario]);
  useEffect(() => { if (actor !== "bot" || phase !== PHASES.RESOLVED) return undefined; const timer = window.setTimeout(finishTurn, 950); return () => window.clearTimeout(timer); }, [actor, phase]);
  return html`<main className="adventure-game-shell"><header className="adventure-game-header"><a href="ai-world.html">← ออกจากการผจญภัย</a><div><small>SCENARIO ADVENTURE · ${characterSelection?.character?.displayName || "S+ AGENT"}</small><strong>นครลอยฟ้า AI District</strong></div><span>${match.scenarioHistory.length} สถานการณ์</span></header><section className="adventure-game-grid">
    <aside className="adventure-status-panel"><small>CURRENT TURN</small><h1>${actorLabel(actor)}</h1><div className="turn-state">${PHASE_TEXT[phase] || phase}</div><dl><div><dt>ผลลูกเต๋า</dt><dd>${lastRoll || "—"}</dd></div><div><dt>ตำแหน่ง</dt><dd>${positions[actor] + 1}</dd></div><div><dt>มือ</dt><dd>${decks[actor].hand.length}/3</dd></div><div><dt>กองจั่ว</dt><dd>${decks[actor].drawPile.length}</dd></div><div><dt>กองทิ้ง</dt><dd>${decks[actor].discard.length}</dd></div><div><dt>รวม</dt><dd>${countDeckCards(decks[actor])}/5</dd></div></dl><button type="button" className="roll-button" disabled=${actor !== "player" || phase !== PHASES.WAITING} onClick=${startRoll}>ทอยลูกเต๋า</button><p>ลากเพื่อหมุนฉาก • เลื่อนล้อเพื่อซูม</p></aside>
    <section className="adventure-board" aria-label="กระดาน Scenario Adventure 3D"><${ScenarioAdventureScene} selectedTile=${positions[actor]} onSelectTile=${() => {}} playerPosition=${positions.player} botPosition=${positions.bot} movement=${movement} onMoveComplete=${onMoveComplete} rollRequest=${rollRequest} onRollComplete=${onRollComplete} /></section>
    <${ScenarioPanel} scenario=${scenario} actor=${actor} deck=${decks[actor]} inventory=${inventory} selection=${selection} result=${result} phase=${phase} onSelectCard=${chooseCard} onSelectBasic=${chooseBasic} onCancel=${() => { commitDeck("player", cancelCardSelection); setSelection(null); setResult(null); }} onConfirm=${() => resolveForActor("player", selection)} onContinue=${finishTurn} />
  </section></main>`;
}

function App({ inventory }) { const [loadout, setLoadout] = useState(null); return loadout ? html`<${Game} inventory=${inventory} loadout=${loadout} />` : html`<${LoadoutScreen} inventory=${inventory} initialLoadout=${inventory.loadout} onStart=${setLoadout} />`; }

try { const { user } = await requirePlayer(); const inventory = await loadAdventureInventory(user.id); createRoot(root).render(html`<${App} inventory=${inventory} />`); }
catch (error) { if (!error.message.endsWith("REQUIRED")) root.innerHTML = `<p class="scenario-foundation-error">${String(error.message).replace(/[&<>'"]/g, "")}</p>`; }

