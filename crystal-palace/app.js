import { createRoot } from "react-dom/client";
import { html, React } from "../map-3d/runtime.js";
import { requirePlayer, supabase } from "../flow-common.js";
import { CHARACTER_BY_ID, CHARACTER_ROSTER } from "../characters/character-roster.js";
import { readScenarioCharacterSelection } from "../characters/character-session.js";
import { SPAWN, zoneAt } from "./config/palace-layout.js";
import { EXHIBIT_BY_ID, EXHIBITS } from "./config/exhibits.js";
import { validatePalaceConfig } from "./config/validate-config.js";
import { buildCollisionWorld, isWalkable } from "./systems/collision.js";
import { fetchPalaceData } from "./data/palace-data-client.js";
import { deriveArchiveCards, deriveExhibitStates, derivePassportStamps } from "./data/palace-state.js";
import { saveVisit, takeVisit } from "./data/visit-session.js";
import { directionFromJoystick, directionFromKeys, isMovementKey, stepPlayer } from "./systems/movement.js";
import { createCameraRig, focusCamera, releaseCamera, stepCameraRig } from "./systems/camera-rig.js";
import { isInteractKey, nearestExhibit } from "./systems/interaction.js";
import { PalaceScene } from "./scene/PalaceScene.js";
import { HUD } from "./ui/HUD.js";
import { ExhibitPanel } from "./ui/ExhibitPanel.js";
import { Joystick } from "./ui/Joystick.js";
import { FallbackList } from "./ui/FallbackList.js";

const { useCallback, useEffect, useMemo, useRef, useState } = React;

const media = (query) => Boolean(globalThis.matchMedia?.(query)?.matches);
const WORLD = buildCollisionWorld();

function webglAvailable() {
  if (new URLSearchParams(location.search).get("view") === "list") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function resolveAvatar(profile) {
  const fromSession = readScenarioCharacterSelection()?.character;
  const fromProfile = CHARACTER_BY_ID[profile?.selected_character_code];
  const character = fromSession || fromProfile || CHARACTER_ROSTER.find((item) => item.access === "FREE");
  const focusY = parseFloat(character?.portrait?.objectPosition?.split(" ")[1]) / 100;
  return {
    name: character?.displayName || "",
    portraitSrc: character ? character.artwork.src.replace(/^assets\//, "assets/thumbs/") : null,
    focusY: Number.isFinite(focusY) ? focusY : .39,
    accent: "#2aa9b8",
  };
}

class SceneBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.warn("Crystal Palace 3D scene failed; showing list view.", error); this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function createController(visit) {
  const back = visit && isWalkable(WORLD, visit.x, visit.z);
  const player = back ? { x: visit.x, z: visit.z, heading: visit.heading, moving: false } : { x: SPAWN.x, z: SPAWN.z, heading: SPAWN.facing, moving: false };
  return { player, keys: new Set(), joy: { x: 0, y: 0 }, target: null, pendingOpen: null, nearestId: null, zoneId: null, rig: createCameraRig(player) };
}

// Read-only server state: loading → ready | error. A failed load never blocks walking.
function usePalaceData(userId) {
  const [palace, setPalace] = useState({ status: "loading", data: null, error: null });
  const load = useCallback(async () => {
    setPalace((current) => ({ ...current, status: "loading" }));
    try {
      const data = await fetchPalaceData(supabase, userId);
      setPalace({ status: "ready", data, error: null });
    } catch (error) {
      console.warn("Crystal Palace: progress data unavailable", error);
      setPalace((current) => ({ status: "error", data: current.data, error }));
    }
  }, [userId]);
  useEffect(() => {
    load();
    // Coming back from a lesson via the back/forward cache: refetch instead of showing stale state.
    const onShow = (event) => { if (event.persisted) load(); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [load]);
  return { ...palace, retry: load };
}

function CrystalPalaceApp({ avatar, userId, visit }) {
  const controller = useRef(null);
  if (!controller.current) controller.current = createController(visit);
  const [reducedMotion] = useState(() => media("(prefers-reduced-motion: reduce)"));
  const [touch] = useState(() => media("(pointer: coarse)") || "ontouchstart" in window);
  const [threeD, setThreeD] = useState(webglAvailable);
  const [fontsReady, setFontsReady] = useState(false);
  const [zone, setZone] = useState(() => zoneAt(controller.current.player.x, controller.current.player.z));
  const [nearest, setNearest] = useState(null);
  const [open, setOpen] = useState(null);
  const openRef = useRef(null);
  const palace = usePalaceData(userId);
  const derived = useMemo(() => palace.data ? {
    states: deriveExhibitStates(EXHIBITS, palace.data),
    archive: deriveArchiveCards(palace.data),
    passport: derivePassportStamps(palace.data),
  } : null, [palace.data]);

  useEffect(() => { document.fonts?.ready.then(() => setFontsReady(true)); }, []);

  const openExhibit = useCallback((item) => {
    const ctrl = controller.current;
    ctrl.keys.clear();
    ctrl.joy = { x: 0, y: 0 };
    ctrl.target = null;
    ctrl.pendingOpen = null;
    ctrl.rig = focusCamera(ctrl.rig, item, ctrl.player, media("(max-width: 760px)") ? "bottom" : "side");
    openRef.current = item;
    setOpen(item);
  }, []);

  const closeExhibit = useCallback(() => {
    const ctrl = controller.current;
    ctrl.rig = releaseCamera(ctrl.rig);
    openRef.current = null;
    setOpen(null);
  }, []);

  // Re-open the exhibit the player left from, so they land back where they were.
  useEffect(() => {
    const item = visit?.exhibitId && EXHIBIT_BY_ID[visit.exhibitId];
    if (item) openExhibit(item);
  }, [visit, openExhibit]);

  const leaveForLesson = useCallback((item, href) => {
    const { x, z, heading } = controller.current.player;
    saveVisit(window.sessionStorage, { x, z, heading, exhibitId: item.id });
    location.assign(href);
  }, []);

  const backToEntrance = useCallback(() => {
    const ctrl = controller.current;
    if (openRef.current) closeExhibit();
    Object.assign(ctrl.player, { x: SPAWN.x, z: SPAWN.z, heading: SPAWN.facing, moving: false });
    ctrl.target = null;
    ctrl.pendingOpen = null;
    ctrl.rig = createCameraRig(ctrl.player);
  }, [closeExhibit]);

  const onTick = useCallback((dt) => {
    const ctrl = controller.current;
    if (!openRef.current) {
      const keyDir = directionFromKeys(ctrl.keys);
      const direction = keyDir.x || keyDir.z ? keyDir : directionFromJoystick(ctrl.joy.x, ctrl.joy.y);
      if (direction.x || direction.z) ctrl.pendingOpen = null;
      const next = stepPlayer(WORLD, ctrl.player, { direction, target: ctrl.target, dt });
      Object.assign(ctrl.player, { x: next.x, z: next.z, heading: next.heading, moving: next.moving });
      ctrl.target = next.target;
    } else {
      ctrl.player.moving = false;
    }
    const near = nearestExhibit(ctrl.player, EXHIBITS);
    if ((near?.id || null) !== ctrl.nearestId) {
      ctrl.nearestId = near?.id || null;
      setNearest(near);
    }
    const here = zoneAt(ctrl.player.x, ctrl.player.z);
    if ((here?.id || null) !== ctrl.zoneId) {
      ctrl.zoneId = here?.id || null;
      setZone(here);
    }
    if (ctrl.pendingOpen && !ctrl.target && near?.id === ctrl.pendingOpen) openExhibit(near);
    else if (ctrl.pendingOpen && !ctrl.target) ctrl.pendingOpen = null;
    ctrl.rig = stepCameraRig(ctrl.rig, { player: ctrl.player, dt, reducedMotion });
  }, [openExhibit, reducedMotion]);

  useEffect(() => {
    const ctrl = controller.current;
    const typing = (target) => target instanceof Element && target.closest("input, textarea, select");
    const onControl = (target) => target instanceof Element && target.closest("button, a");
    const down = (event) => {
      if (event.key === "Escape" && openRef.current) { closeExhibit(); return; }
      if (openRef.current || typing(event.target)) return;
      if (isMovementKey(event.code)) {
        event.preventDefault();
        ctrl.keys.add(event.code);
        ctrl.target = null;
      } else if (isInteractKey(event.code) && !(event.code === "Enter" && onControl(event.target))) {
        const near = nearestExhibit(ctrl.player, EXHIBITS);
        if (near) { event.preventDefault(); openExhibit(near); }
      }
    };
    const up = (event) => ctrl.keys.delete(event.code);
    const clear = () => { ctrl.keys.clear(); ctrl.joy = { x: 0, y: 0 }; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", clear); };
  }, [openExhibit, closeExhibit]);

  const onFloorClick = useCallback((event) => {
    if (event.delta > 8 || openRef.current) return;
    controller.current.target = { x: event.point.x, z: event.point.z };
    controller.current.pendingOpen = null;
  }, []);

  const onStandClick = useCallback((item) => {
    if (openRef.current || !item) return;
    const ctrl = controller.current;
    if (ctrl.nearestId === item.id) { openExhibit(item); return; }
    const dx = ctrl.player.x - item.x;
    const dz = ctrl.player.z - item.z;
    const length = Math.hypot(dx, dz) || 1;
    ctrl.target = { x: item.x + (dx / length) * 1.7, z: item.z + (dz / length) * 1.7 };
    ctrl.pendingOpen = item.id;
  }, [openExhibit]);

  const explore = useCallback(() => { if (nearest) openExhibit(nearest); }, [nearest, openExhibit]);

  const panelProps = {
    palace,
    lessonState: open && derived ? derived.states[open.id] || null : null,
    archive: derived?.archive || null,
    passport: derived?.passport || null,
    onLeave: leaveForLesson,
  };

  if (!threeD) {
    return html`<main class="cp-shell cp-shell-list">
      <header class="cp-hud cp-hud-static"><div class="cp-hud-title"><span class="cp-hud-icon" aria-hidden="true">🏛️</span><span><b>Crystal Palace</b><small>นิทรรศการ AI District</small></span></div>
        <nav class="cp-hud-actions"><a class="cp-btn cp-btn-gold" href="lobby.html">ออกสู่ Lobby</a></nav></header>
      <${FallbackList} exhibits=${EXHIBITS} states=${derived?.states} reason="อุปกรณ์นี้แสดงฉาก 3D ไม่ได้ จึงแสดงนิทรรศการเป็นรายการแทน" onOpen=${(item) => setOpen(item)} />
      <${ExhibitPanel} exhibit=${open} onClose=${() => setOpen(null)} ...${panelProps} />
    </main>`;
  }

  return html`<main class="cp-shell">
    <div class="cp-canvas" aria-label="ฉาก 3D ของ Crystal Palace" role="img">
      <${SceneBoundary} onFail=${() => setThreeD(false)}>
        <${PalaceScene} controller=${controller} exhibits=${EXHIBITS} exhibitStates=${derived?.states} archive=${derived?.archive} avatar=${avatar} fontsReady=${fontsReady} reducedMotion=${reducedMotion}
          onTick=${onTick} onFloorClick=${onFloorClick} onStandClick=${onStandClick} onContextLost=${() => setThreeD(false)} />
      </${SceneBoundary}>
    </div>
    <${HUD} zone=${zone} nearest=${nearest} panelOpen=${Boolean(open)} onExplore=${explore} onBackToEntrance=${backToEntrance} showTouchHint=${touch} palace=${palace} passport=${derived?.passport} />
    ${touch && !open && html`<${Joystick} controller=${controller} />`}
    <${ExhibitPanel} exhibit=${open} onClose=${closeExhibit} ...${panelProps} />
  </main>`;
}

async function boot() {
  const root = createRoot(document.querySelector("#palace-root"));
  const problems = validatePalaceConfig();
  if (problems.length) console.warn("Crystal Palace config problems:", problems);
  let profile = null;
  let user = null;
  try {
    ({ user, profile } = await requirePlayer());
  } catch (error) {
    if (error?.message === "AUTH_REQUIRED" || error?.message === "TUTORIAL_REQUIRED") return;
    root.render(html`<main class="cp-shell cp-shell-list"><section class="cp-fallback"><h1>Crystal Palace</h1><p class="cp-fallback-note">โหลดข้อมูลผู้เล่นไม่สำเร็จ ลองรีเฟรชอีกครั้ง</p><a class="cp-btn cp-btn-gold" href="lobby.html">กลับ Lobby</a></section></main>`);
    return;
  }
  document.querySelector("#palace-loading")?.remove();
  const visit = takeVisit(window.sessionStorage);
  root.render(html`<${CrystalPalaceApp} avatar=${resolveAvatar(profile)} userId=${user.id} visit=${visit} />`);
}

boot();
