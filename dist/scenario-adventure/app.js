import {BoardEventPanel} from './BoardEventPanel.js';
import {landOnTile,resolveBoardEvent,chooseEventIntent,eventSummary} from './board-events.js';
import { createRoot } from "react-dom/client";
import { requirePlayer } from "../flow-common.js";
import { readScenarioCharacterSelection, writeScenarioCharacterSelection } from "../characters/character-session.js";
import { activeSavedLoadout, readSavedLoadouts, saveLocalLoadout, validateSavedLoadout } from "./saved-loadouts.mjs";
import { readPracticeSetup } from "./practice-room.mjs";
import { ACTION_CARD_BY_ID } from "../map-3d/action-card-data.js";
import { buildTilePath } from "../map-3d/board-data.js";
import { html, React } from "../map-3d/runtime.js";
import { nextTurn, rollDie } from "../map-3d/turn-core.js";
import { ScenarioAdventureScene } from "./ScenarioAdventureScene.js";
import { cancelCardSelection, consumeSelectedCard, countDeckCards, createDeckState, prepareDeckForTurn, selectCardInstance } from "./deck-engine.js";
import { loadAdventureInventory } from "./loadout-client.js";
import { SCENARIO_LOADOUT_POLICIES, SCENARIO_LOADOUT_SIZE, maxCopiesForScenarioPolicy, validateAdventureLoadout } from "./loadout-engine.js";
import { RESPONSE_TYPES, chooseBotResponse, createResponseSelection, resolveMatchResponse } from "./response-engine.js";
import { createScenarioAdventureMatch, recordScenarioUse, selectAdventureScenario } from "./scenario-engine.js";
import { createScenarioRepository } from "./scenario-repository.js";
import { eventVisualForType } from "./event-visuals.js";

const { useEffect, useMemo, useRef, useState } = React;
const root = document.querySelector("#map-root");
const repository = createScenarioRepository();
let characterSelection = null;

function requireScenarioCharacterSelection() {
  const selection = readScenarioCharacterSelection();
  if (!selection) window.location.replace("character-selection.html");
  return selection;
}
const PHASES = Object.freeze({ WAITING: "WAITING", ROLLING: "ROLLING", MOVING: "MOVING", SCENARIO: "SCENARIO", RESPONSE_SELECTION: "RESPONSE_SELECTION", RESOLVED: "RESOLVED", TURN_END: "TURN_END" });
const PHASE_TEXT = Object.freeze({ WAITING: "พร้อมทอยลูกเต๋า", ROLLING: "กำลังทอยลูกเต๋า...", MOVING: "กำลังเดิน...", SCENARIO: "กำลังเปิดสถานการณ์", RESPONSE_SELECTION: "เลือกวิธีตอบสนอง", RESOLVED: "ตรวจสอบผลลัพธ์", TURN_END: "กำลังเปลี่ยนเทิร์น" });

function actorLabel(actor) { return actor === "player" ? "ผู้เล่น" : "บอท"; }
function cardData(cardId, inventory) { return inventory.cards.find((card) => card.id === cardId) || ACTION_CARD_BY_ID[cardId] || { id: cardId, name: cardId, description: "ไม่มีรายละเอียดการ์ด", en_cost: 0, card_type: "SUPPORT" }; }

// Presentation only: card artwork (thumbnail when available) or a type-coloured illustration.
const CARD_TYPE_ICON = { ATTACK: "⚡", DEFENSE: "🛡️", SUPPORT: "✚", STRATEGY: "🧭", UTILITY: "⚙️" };
function CardArt({ card }) {
  const src = card?.artwork?.src || card?.prototypeMetadata?.artwork?.src || null;
  const thumb = src && src.startsWith("assets/") ? `assets/thumbs/${src.slice("assets/".length)}` : src;
  const type = String(card?.card_type || card?.prototypeMetadata?.type || "").toUpperCase();
  return html`<span className="loadout-card-art" data-type=${type || "CARD"} aria-hidden="true">${thumb ? html`<img src=${thumb} alt="" loading="lazy" onError=${(event) => { if (src && event.currentTarget.src.includes("/thumbs/")) event.currentTarget.src = src; }} />` : html`<i>${CARD_TYPE_ICON[type] || "🃏"}</i>`}</span>`;
}

function LoadoutScreen({ inventory, initialLoadout, userId }) {
  const [selected, setSelected] = useState(initialLoadout);
  const [message, setMessage] = useState(inventory.persistenceMessage?.startsWith("ฐานข้อมูล Scenario Loadout")
    ? "ชุดนี้บันทึกใน Browser เครื่องนี้ ยังไม่ Sync ข้ามเครื่อง" : inventory.persistenceMessage);
  const [saving, setSaving] = useState(false);
  const initialSaved = readSavedLoadouts(userId);
  const [presets, setPresets] = useState(initialSaved.presets);
  const [presetId, setPresetId] = useState(initialSaved.activePresetId || "");
  const [presetName, setPresetName] = useState(initialSaved.presets.find(p => p.id === initialSaved.activePresetId && p.characterId === characterSelection.characterId)?.name || "เด๊กของฉัน");
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
  const savePreset = () => {
    const selection = requireScenarioCharacterSelection();
    if (!selection) return false;
    const saved = saveLocalLoadout(userId, { name: presetName, characterId: selection.characterId, cardIds: selected }, inventory);
    setMessage(saved.ok ? `บันทึก “${saved.preset.name}” พร้อมตัวละคร ${selection.character.displayName} ใน Browser นี้แล้ว` : saved.message);
    if (saved.ok) { setPresets(readSavedLoadouts(userId).presets); setPresetId(saved.preset.id); }
    return saved.ok;
  };
  const loadPreset = () => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset || !validateSavedLoadout(preset, inventory)) return setMessage("ชุดนี้มีการ์ดที่ยังไม่มีสิทธิ์ หรือไม่ตรงกติกาปัจจุบัน กรุณาจัดชุดใหม่");
    if (!writeScenarioCharacterSelection(preset.characterId)) return setMessage("บันทึกตัวละครใน Session ไม่สำเร็จ กรุณาลองใหม่");
    characterSelection = requireScenarioCharacterSelection();
    if (!characterSelection) return;
    setSelected([...preset.cardIds]); setPresetName(preset.name);
    setMessage(`เรียกใช้ “${preset.name}” พร้อม ${characterSelection.character.displayName} แล้ว`);
  };
  const begin = async () => {
    if (!validation.valid || saving) return;
    const selection = requireScenarioCharacterSelection();
    if (!selection) return;
    characterSelection = selection;
    setSaving(true);
    const currentSelection = requireScenarioCharacterSelection();
    if (!currentSelection) { setSaving(false); return; }
    characterSelection = currentSelection;
    if (!savePreset()) { setSaving(false); return; }
    setMessage("บันทึกตัวละครและ Deck แล้ว พร้อมเลือกใช้จากเมนู Ai Word"); setSaving(false);
  };
  return html`<section className="adventure-loadout">
    <header><nav aria-label="ทางลัดก่อนเริ่มเกม"><a href="lobby.html">← กลับ Lobby</a><a href="card-inventory.html">คลังการ์ดถาวร</a><a href="character-selection.html">เปลี่ยนตัวละคร</a></nav><span>ตัวละครและเด๊กของฉัน</span></header>
    <div className="adventure-loadout-card">
      <div className="adventure-loadout-heading"><div><small>FIVE-CARD LOADOUT · ${characterSelection.character.displayName}</small><h1>จัดตัวละครและเด๊กของฉัน</h1><p>${uniqueMode ? "เลือกการ์ดที่มีสิทธิ์ใช้ 5 ใบ โดยแต่ละ Card ID ต้องไม่ซ้ำกัน" : "เลือก 5 ใบจากการ์ดที่คุณมีสิทธิ์ใช้ ซ้ำชนิดเดิมได้สูงสุด 2 ใบ"}</p></div><b>${selected.length}/5</b></div>
      <section className="saved-loadout-controls" aria-label="เด๊กที่บันทึกไว้">
        <label>ชื่อชุดของฉัน<input maxLength=${60} value=${presetName} onChange=${event => setPresetName(event.target.value)} /></label>
        <button type="button" disabled=${!validation.valid || saving} onClick=${savePreset}>บันทึกชุดในเครื่อง</button>
        <label>ชุดที่บันทึกไว้<select value=${presetId} onChange=${event => setPresetId(event.target.value)}><option value="">เลือกชุดที่บันทึก</option>${presets.map(preset => html`<option key=${preset.id} value=${preset.id}>${preset.name}</option>`)}</select></label>
        <button type="button" disabled=${!presetId || saving} onClick=${loadPreset}>เรียกใช้ชุดนี้</button>
        <p>บันทึกตัวละครและลำดับการ์ด 5 ใบ แยกตามบัญชีบน Browser นี้ ชื่อเดิมจะอัปเดตชุดเดิม · ไม่ใช่ Cloud Save ข้ามเครื่อง</p>
      </section>
      <div className="adventure-loadout-slots">${Array.from({ length: 5 }, (_, index) => {
        const id = selected[index]; const card = id ? cardData(id, inventory) : null;
        return card ? html`<button type="button" data-type=${String(card.card_type || "").toUpperCase()} onClick=${() => setSelected(selected.filter((_, slot) => slot !== index))}><span>${index + 1}</span><${CardArt} card=${card} /><strong>${card.name}</strong><small>คลิกเพื่อนำออก</small></button>` : html`<div><span>${index + 1}</span><span className="loadout-card-art is-empty" aria-hidden="true"><i>＋</i></span><strong>ช่องว่าง</strong><small>เลือกจากคลังด้านล่าง</small></div>`;
      })}</div>
      ${message ? html`<p className="adventure-warning" role="status">${message}</p>` : null}
      <div className="adventure-card-library">${inventory.cards.map((card) => {
        const prototype = card.catalogState === "PROTOTYPE"; const unlocked = !prototype && inventory.allowedIds.includes(card.id); const copies = counts.get(card.id) || 0;
        const costLabel = Number.isInteger(card.en_cost) ? `${card.en_cost} EN` : "ยังไม่กำหนดค่าใช้";
        return html`<button type="button" className=${`adventure-library-card ${unlocked ? "" : "locked"} ${prototype ? "prototype" : ""}`} disabled=${!unlocked} data-type=${String(card.card_type || "").toUpperCase()} onClick=${() => addCard(card.id)}><${CardArt} card=${card} /><span>${card.card_type} · ${costLabel}</span><strong>${card.name}</strong><p>${prototype ? "Prototype Catalog — มีข้อมูลและ Artwork แต่ยังไม่เป็นสิทธิ์สำหรับ Match" : unlocked ? card.description : "มีใน Card Catalog แต่บัญชียังไม่มีสิทธิ์ใช้งาน"}</p><small>${prototype ? "PROTOTYPE" : unlocked ? `อยู่ในชุด ${copies}/${maxCopies} ใบ` : "LOCKED"}</small></button>`;
      })}</div>
      <div className="adventure-loadout-actions">
        <button className="primary" type="button" disabled=${!validation.valid || saving} onClick=${begin}>บันทึกตัวละครและ Deck</button>
        <span>${validation.valid ? "ชุดพร้อมบันทึก · เลือกใช้ภายหลังใน Ai Word" : "เลือกการ์ดให้ครบ 5 ใบก่อนเริ่ม"}</span>
      </div>
    </div>
  </section>`;
}

function ScenarioPanel({ event,onEventResolve,scenario, actor, deck, inventory, selection, result, onSelectCard, onSelectBasic, onCancel, onConfirm, onContinue, phase }) {
  if(event&&event.type!=='ACTION')return html`<aside className="adventure-response-panel"><${BoardEventPanel} key=${event.id} event=${event} scenario=${scenario} deck=${deck} allowedIds=${inventory.allowedIds} canRespond=${actor==='player'&&phase===PHASES.RESPONSE_SELECTION} result=${result} onResolve=${onEventResolve} onContinue=${actor==='player'&&phase===PHASES.RESOLVED?onContinue:null}/></aside>`;
  if (!scenario) return html`<aside className="adventure-response-panel idle"><small>SCENARIO RESPONSE</small><h2>รอสถานการณ์ถัดไป</h2><p>เมื่อหยุด ระบบจะเปิด Event ประจำช่องหนึ่งครั้ง</p></aside>`;
  const isBot = actor === "bot";
  const eventVisual = eventVisualForType(event?.type || "ACTION");
  return html`<aside className="adventure-response-panel" aria-live="polite">
    <div className="scenario-meta"><small className="event-type-badge" style=${{'--event-color':eventVisual.color,'--event-dark':eventVisual.dark}}>${eventVisual.shortLabel} · ${eventVisual.label}</small><span>${scenario.category}${scenario.categoryChanged ? " · หมวดเดิมหมด เลือกเรื่องใหม่ในธีมเดียวกัน" : ""}</span><span>${scenario.difficulty}</span></div>${scenario.status==="DEMO_DRAFT" ? html`<small>DEMO_DRAFT · รอตรวจทานเนื้อหา</small>` : null}${event?.viaBonus ? html`<p className="bonus-via-note">⏩ ${event.viaBonus.title} → เปิดเหตุการณ์ช่องปลายทาง</p>` : null}<h2>${scenario.title}</h2><p className="scenario-description">${scenario.description}</p>
    <section className="response-options"><h3>${isBot ? "บอทกำลังเลือกการตอบสนอง" : "เลือกการ์ดในมือได้ 1 ใบ"}</h3>
      <div className="response-hand">${deck.hand.map((instance) => { const card = cardData(instance.cardId, inventory); const active = selection?.instanceId === instance.instanceId; return html`<button type="button" disabled=${isBot || phase !== PHASES.RESPONSE_SELECTION} className=${active ? "selected" : ""} onClick=${() => onSelectCard(instance)}><small>${card.card_type}</small><strong>${card.name}</strong><span>${card.description}</span></button>`; })}</div>
      <button type="button" className=${`basic-response ${selection?.type === RESPONSE_TYPES.BASIC ? "selected" : ""}`} disabled=${isBot || phase !== PHASES.RESPONSE_SELECTION} onClick=${onSelectBasic}><small>BASIC RESPONSE · ไม่ใช้การ์ด</small><strong>${scenario.basicResponse.label}</strong><span>${scenario.basicResponse.description}</span></button>
    </section>
    ${selection ? html`<div className=${`response-readiness ${selection.usable ? "ready" : "blocked"}`}><strong>${selection.usable ? "พร้อมใช้" : "ยังใช้ไม่ได้"}</strong><span>${selection.reason}</span></div>` : null}
    ${result ? html`<div className="response-result"><small>${result.responseType === "CARD" ? "CARD RESPONSE" : "BASIC RESPONSE"}</small><strong>${result.impact}</strong><p>${result.explanation}</p><span>${result.compatibility} · RP +${result.rpDelta} · Stability ${result.appliedStabilityDelta}</span></div>` : null}
    <div className="response-actions">${phase === PHASES.RESPONSE_SELECTION && !isBot ? html`<button type="button" onClick=${onCancel} disabled=${!selection}>ยกเลิกการเลือก</button><button type="button" className="primary" onClick=${onConfirm} disabled=${!selection?.usable}>ยืนยันการตอบสนอง</button>` : null}${phase === PHASES.RESOLVED && !isBot ? html`<button type="button" className="primary" onClick=${onContinue}>จบเทิร์น</button>` : null}</div>
  </aside>`;
}

function Game({ inventory, loadout, roomName, onReplay }) {
  const matchId = useMemo(() => `scenario-${Date.now()}`, []);
  const [match, setMatch] = useState(() => createScenarioAdventureMatch()); const matchRef = useRef(match);
  const [actor, setActor] = useState("player"); const actorRef = useRef(actor);
  const [phase, setPhase] = useState(PHASES.WAITING); const phaseRef = useRef(phase);
  const [positions, setPositions] = useState({ player: 0, bot: 0 }); const positionsRef = useRef(positions);
  const [decks, setDecks] = useState(() => ({ player: createDeckState(loadout, { actorId: "player", matchId }), bot: createDeckState(loadout, { actorId: "bot", matchId }) })); const decksRef = useRef(decks);
  const [rollRequest, setRollRequest] = useState(null); const [movement, setMovement] = useState(null); const [scenario, setScenario] = useState(null); const [selection, setSelection] = useState(null); const [result, setResult] = useState(null); const [lastRoll, setLastRoll] = useState(null);
  const [event,setEvent]=useState(null);
  const actionCounter = useRef(0);
  const turnTimer=useRef(null); const openingScenario=useRef(false);
  const [scenarioError,setScenarioError]=useState("");
  const [replayError,setReplayError]=useState("");
  const [replaying,setReplaying]=useState(false);
  const changePhase=(next)=>{phaseRef.current=next;setPhase(next);};
  useEffect(()=>()=>window.clearTimeout(turnTimer.current),[]);
  useEffect(() => { matchRef.current = match; }, [match]); useEffect(() => { actorRef.current = actor; }, [actor]); useEffect(() => { phaseRef.current = phase; }, [phase]); useEffect(() => { positionsRef.current = positions; }, [positions]); useEffect(() => { decksRef.current = decks; }, [decks]);
  const commitDeck = (targetActor, updater) => { const next = { ...decksRef.current, [targetActor]: updater(decksRef.current[targetActor]) }; decksRef.current = next; setDecks(next); return next[targetActor]; };
  const startRoll = () => { if (matchRef.current.status !== "PLAYING" || phaseRef.current !== PHASES.WAITING) return; const value = rollDie(); const id = `${actorRef.current}-roll-${Date.now()}-${actionCounter.current++}`; setLastRoll(value); changePhase(PHASES.ROLLING); setRollRequest({ id, value }); };
  const onRollComplete = (value) => { if (phaseRef.current !== PHASES.ROLLING) return; const currentActor = actorRef.current; const from = positionsRef.current[currentActor]; changePhase(PHASES.MOVING); setMovement({ id: `${currentActor}-move-${Date.now()}`, actor: currentActor, from, path: buildTilePath(from, value) }); };
  const openScenario=async (movedActor,finalIndex)=>{
    if(openingScenario.current)return;openingScenario.current=true;setScenarioError("");changePhase(PHASES.SCENARIO);
    try {
      // Rule A' (v2): a BONUS tile resolves on landing; FORWARD_2 may open one destination event instead.
      const opened=await landOnTile({match:matchRef.current,actorId:movedActor,tileIndex:finalIndex});
      if(matchRef.current.status!=="PLAYING")return;
      if(opened.position!==finalIndex){const nextPositions={...positionsRef.current,[movedActor]:opened.position};positionsRef.current=nextPositions;setPositions(nextPositions);}
      matchRef.current=opened.match;setMatch(opened.match);setEvent(opened.event);
      setScenario(opened.scenario);setSelection(null);setResult(opened.result);changePhase(opened.result?PHASES.RESOLVED:PHASES.RESPONSE_SELECTION);
    }catch(error){setScenarioError(error.code==="SCENARIO_POOL_EXHAUSTED"?"ไม่มีสถานการณ์ใหม่ในธีมนี้แล้ว กลับห้องฝึกเพื่อเริ่มแมตช์ใหม่ได้ โดยไม่เสียเทิร์น":"เปิดสถานการณ์ไม่สำเร็จ กดลองใหม่ได้โดยไม่เสียเทิร์น");}finally{openingScenario.current=false;}
  };
  const onMoveComplete=(movedActor,finalIndex)=>{
    if(movedActor!==actorRef.current||phaseRef.current!==PHASES.MOVING)return;
    const nextPositions={...positionsRef.current,[movedActor]:finalIndex};positionsRef.current=nextPositions;setPositions(nextPositions);setMovement(null);
    void openScenario(movedActor,finalIndex);
  };
  const chooseCard = (instance) => { if (phaseRef.current !== PHASES.RESPONSE_SELECTION) return; const updated = commitDeck("player", (deck) => selectCardInstance(deck, instance.instanceId)); setSelection(createResponseSelection({ type: RESPONSE_TYPES.CARD, scenario, deck: updated, instanceId: instance.instanceId })); setResult(null); };
  const chooseBasic = () => { if (phaseRef.current !== PHASES.RESPONSE_SELECTION) return; commitDeck("player", cancelCardSelection); setSelection(createResponseSelection({ type: RESPONSE_TYPES.BASIC, scenario, deck: decksRef.current.player })); setResult(null); };
  const resolveForActor=(targetActor,chosen)=>{
    if(matchRef.current.status!=="PLAYING"||phaseRef.current!==PHASES.RESPONSE_SELECTION||!chosen)return false;
    changePhase(PHASES.RESOLVED);
    try {
      const intent=chosen.type?{responseType:chosen.type,instanceId:chosen.instanceId}:chosen;
      const resolved=resolveBoardEvent({match:matchRef.current,event,scenario,actorId:targetActor,deck:decksRef.current[targetActor],allowedIds:inventory.allowedIds,intent,position:positionsRef.current[targetActor]});
      const nextPositions={...positionsRef.current,[targetActor]:resolved.position};positionsRef.current=nextPositions;setPositions(nextPositions);
      if(resolved.duplicate)return false;
      matchRef.current=resolved.match;setMatch(resolved.match);commitDeck(targetActor,()=>resolved.deck);
      setSelection(chosen);setResult(resolved.result);return true;
    }catch{changePhase(PHASES.RESPONSE_SELECTION);setScenarioError("ตอบสถานการณ์ไม่สำเร็จ กรุณาเลือกการ์ดหรือ Basic Response ใหม่");return false;}
  };
  const finishTurn=()=>{
    if(matchRef.current.status!=="PLAYING"||phaseRef.current!==PHASES.RESOLVED)return;
    changePhase(PHASES.TURN_END);const upcoming=nextTurn(actorRef.current);
    const nextMatch={...matchRef.current,currentTurn:upcoming};matchRef.current=nextMatch;setMatch(nextMatch);
    commitDeck(upcoming,prepareDeckForTurn);setEvent(null);setScenario(null);setSelection(null);setResult(null);setActor(upcoming);actorRef.current=upcoming;
    turnTimer.current=window.setTimeout(()=>{if(matchRef.current.status==="PLAYING")changePhase(PHASES.WAITING);},250);
  };
  useEffect(() => { if (match.status !== "PLAYING" || actor !== "bot" || phase !== PHASES.WAITING) return undefined; const timer = window.setTimeout(startRoll, 650); return () => window.clearTimeout(timer); }, [actor, phase, match.status]);
  useEffect(() => { if (match.status !== "PLAYING" || actor !== "bot" || phase !== PHASES.RESPONSE_SELECTION || !event) return undefined; const chosen = chooseEventIntent({event,scenario,deck:decksRef.current.bot,allowedIds:inventory.allowedIds,match:matchRef.current,actorId:"bot"}); setSelection(chosen); const timer = window.setTimeout(() => resolveForActor("bot", chosen), 650); return () => window.clearTimeout(timer); }, [actor, phase, event, match.status]);
  useEffect(() => { if (match.status !== "PLAYING" || actor !== "bot" || phase !== PHASES.RESOLVED) return undefined; const timer = window.setTimeout(finishTurn, 950); return () => window.clearTimeout(timer); }, [actor, phase, match.status]);
  if(match.status==="FINISHED")return html`<main className="adventure-loadout"><header><a href="practice-room.html">กลับ Practice Room</a><span>จบแมตช์</span></header><section className="adventure-loadout-card" aria-label="ผลการแข่งขัน"><h1>${match.winner==="player"?"Victory":match.winner==="bot"?"Defeat":"Draw"}</h1><p>ตัดสินจาก RP ก่อน ถ้าเท่ากันใช้ Stability และถ้าเท่ากันทั้งหมดให้เสมอ</p><table><thead><tr><th>ฝ่าย</th><th>RP</th><th>Stability</th><th>เทิร์น</th></tr></thead><tbody>${["player","bot"].map(id=>html`<tr><td>${actorLabel(id)}</td><td>${match.scores[id].rp}</td><td>${match.scores[id].stability}/10</td><td>${match.turns[id]}/6</td></tr>`)}</tbody></table><p>เหตุการณ์ครบ ${match.responseHistory.length}/12 ครั้ง · ${new Set(match.scenarioHistory.map(r=>r.contentIdentity)).size} เนื้อหาไม่ซ้ำ</p><p>${eventSummary(match)}</p><details><summary>สถานการณ์ ACTION ในแมตช์</summary><ol>${match.scenarioHistory.map(r=>html`<li data-scenario-id=${r.scenarioId} data-content-identity=${r.contentIdentity}>${r.title}</li>`)}</ol></details><button type="button" className="primary" disabled=${replaying} onClick=${async()=>{setReplaying(true);try{await onReplay();}catch{setReplayError("ตรวจสิทธิ์ชุดเดิมไม่สำเร็จ กลับห้องฝึกแล้วลองใหม่");setReplaying(false);}}}>Replay</button><p role="status">${replayError}</p></section></main>`;
  return html`<main className="adventure-game-shell"><header className="adventure-game-header"><a href="practice-room.html">← กลับห้องฝึก</a><div><small>SCENARIO ADVENTURE · ${characterSelection.character.displayName}</small><strong>${roomName}</strong></div><span>${match.scenarioHistory.length} สถานการณ์</span></header><section className="adventure-game-grid">
    <aside className="adventure-status-panel"><small>CURRENT TURN</small><h1>${actorLabel(actor)}</h1><div className="turn-state">${PHASE_TEXT[phase] || phase}</div><dl><div><dt>RP</dt><dd>${match.scores[actor].rp}</dd></div><div><dt>Stability</dt><dd>${match.scores[actor].stability}/10</dd></div><div><dt>เทิร์น</dt><dd>${match.turns[actor]}/6</dd></div><div><dt>ผลลูกเต๋า</dt><dd>${lastRoll || "—"}</dd></div><div><dt>ตำแหน่ง</dt><dd>${positions[actor] + 1}</dd></div><div><dt>มือ</dt><dd>${decks[actor].hand.length}/3</dd></div><div><dt>กองจั่ว</dt><dd>${decks[actor].drawPile.length}</dd></div><div><dt>กองทิ้ง</dt><dd>${decks[actor].discard.length}</dd></div><div><dt>รวม</dt><dd>${countDeckCards(decks[actor])}/5</dd></div></dl><button type="button" className="roll-button" disabled=${actor !== "player" || phase !== PHASES.WAITING} onClick=${startRoll}>ทอยลูกเต๋า</button><p>ลากเพื่อหมุนฉาก • เลื่อนล้อเพื่อซูม</p></aside>
    <section className="adventure-board" aria-label="กระดาน Scenario Adventure 3D"><${ScenarioAdventureScene} selectedTile=${positions[actor]} onSelectTile=${() => {}} playerPosition=${positions.player} botPosition=${positions.bot} movement=${movement} onMoveComplete=${onMoveComplete} rollRequest=${rollRequest} onRollComplete=${onRollComplete} /></section>
    ${scenarioError ? html`<aside className="adventure-response-panel"><p role="alert">${scenarioError}</p>${phase===PHASES.SCENARIO?html`<button type="button" className="primary" onClick=${()=>openScenario(actorRef.current,positionsRef.current[actorRef.current])}>ลองเปิดสถานการณ์ใหม่</button>`:null}</aside>`:null}<${ScenarioPanel} event=${event} onEventResolve=${intent=>resolveForActor("player",intent)} scenario=${scenario} actor=${actor} deck=${decks[actor]} inventory=${inventory} selection=${selection} result=${result} phase=${phase} onSelectCard=${chooseCard} onSelectBasic=${chooseBasic} onCancel=${() => { commitDeck("player", cancelCardSelection); setSelection(null); setResult(null); }} onConfirm=${() => resolveForActor("player", selection)} onContinue=${finishTurn} />
  </section></main>`;
}

function App({ inventory, userId, practice }) {
  const [replayKey,setReplayKey]=useState(0);
  const [verifiedInventory,setVerifiedInventory]=useState(inventory);
  const replay=async()=>{
    const {user}=await requirePlayer();if(user.id!==userId)throw new Error("ACCOUNT_CHANGED");
    const fresh=await loadAdventureInventory(userId);
    const selected=readScenarioCharacterSelection();
    if(!selected||selected.characterId!==characterSelection.characterId||!validateAdventureLoadout(practice.cardIds,fresh.allowedIds,{policy:fresh.loadoutPolicy}).valid)throw new Error("SETUP_NOT_ELIGIBLE");
    setVerifiedInventory(fresh);setReplayKey(key=>key+1);
  };

  return practice ? html`<${Game} key=${replayKey} inventory=${verifiedInventory} loadout=${practice.cardIds} roomName=${practice.roomName} onReplay=${replay} />`
    : html`<${LoadoutScreen} inventory=${inventory} initialLoadout=${inventory.loadout} userId=${userId} />`;
}

try {
  const { user } = await requirePlayer();
  characterSelection = requireScenarioCharacterSelection();
  if (characterSelection) {
    const inventory = await loadAdventureInventory(user.id);
    characterSelection = requireScenarioCharacterSelection();
    if (characterSelection) {
      const saved = activeSavedLoadout(user.id, characterSelection.characterId, inventory);
      if (saved) inventory.loadout = [...saved.cardIds];
      else {
        const local = readSavedLoadouts(user.id);
        const active = local.presets.find(p => p.id === local.activePresetId);
        if (active?.characterId === characterSelection.characterId) inventory.persistenceMessage = "ชุดที่บันทึกไว้ไม่ตรงสิทธิ์หรือกติกาปัจจุบัน จึงยังไม่ได้เรียกใช้ กรุณาตรวจและจัดชุดใหม่";
      }
      const wantsPractice = new URLSearchParams(window.location.search).get("practice") === "1";
      const practice = wantsPractice ? readPracticeSetup(user.id, inventory) : null;
      if (wantsPractice && (!practice || practice.status !== "STARTED" || practice.characterId !== characterSelection.characterId)) window.location.replace("practice-room.html");
      else createRoot(root).render(html`<${App} inventory=${inventory} userId=${user.id} practice=${practice} />`);
    }
  }
}
catch (error) { if (!error.message.endsWith("REQUIRED")) root.innerHTML = `<p class="scenario-foundation-error">${String(error.message).replace(/[&<>'"]/g, "")}</p>`; }

