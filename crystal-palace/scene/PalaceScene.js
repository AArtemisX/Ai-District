import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { html } from "../../map-3d/runtime.js";
import { CUTAWAY, PalaceGround, PalaceStructure } from "./PalaceStructure.js";
import { TranseptVault } from "./TranseptVault.js";
import { AtriumLandmarks, ParkTrees } from "./AtriumLandmarks.js";
import { ExhibitStands } from "./ExhibitStand.js";
import { ZoneSign } from "./ZoneSign.js";
import { PlayerAvatar } from "./PlayerAvatar.js";
import { CardGallery } from "./CardGallery.js";
import { LightShafts, SoftEnvironment } from "./Atmosphere.js";
import { Signposts } from "./Signpost.js";
import { ZONES } from "../config/palace-layout.js";

const SKY = "#bfe9f7";
const CUT_MARGIN = 1.8;

// Per-frame driver: advances movement / interaction / camera in the controller and copies the
// camera pose onto the three.js camera. Also keeps the single shadow light centred on the player.
function FrameLoop({ controller, onTick }) {
  const { camera } = useThree();
  const light = useRef();
  useFrame((_, delta) => {
    const ctrl = controller.current;
    onTick(Math.min(delta, .1));
    const { position, target } = ctrl.rig.pose;
    // Portrait phones get a wider lens so the halls don't feel cramped.
    const fov = camera.aspect < .75 ? 64 : camera.aspect < 1 ? 56 : 46;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(target.x, target.y, target.z);
    // Diorama cutaway: clip structure nearer to the camera than (look-at point − margin), measured
    // along the view direction, so columns and roofs never cover the avatar or a focused exhibit.
    let nx = target.x - position.x;
    let ny = target.y - position.y;
    let nz = target.z - position.z;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length; ny /= length; nz /= length;
    const plane = CUTAWAY[0];
    plane.normal.set(nx, ny, nz);
    plane.constant = -(nx * target.x + ny * target.y + nz * target.z) + CUT_MARGIN;
    const sun = light.current;
    if (sun) {
      sun.position.set(ctrl.player.x + 14, 26, ctrl.player.z + 10);
      sun.target.position.set(ctrl.player.x, 0, ctrl.player.z);
      sun.target.updateMatrixWorld();
    }
  });
  return html`<directionalLight ref=${light} intensity=${2.15} color="#ffe2b5" castShadow
    shadow-mapSize-width=${1024} shadow-mapSize-height=${1024} shadow-bias=${-.0006} shadow-radius=${3}
    shadow-camera-near=${1} shadow-camera-far=${70} shadow-camera-left=${-20} shadow-camera-right=${20} shadow-camera-top=${20} shadow-camera-bottom=${-20} />`;
}

function TargetMarker({ controller }) {
  const ref = useRef();
  useFrame(() => {
    const target = controller.current.target;
    if (!ref.current) return;
    ref.current.visible = Boolean(target);
    if (target) ref.current.position.set(target.x, .05, target.z);
  });
  return html`<mesh ref=${ref} rotation-x=${-Math.PI / 2} visible=${false} raycast=${() => null}>
    <ringGeometry args=${[.22, .36, 24]} />
    <meshBasicMaterial color="#2aa9b8" transparent opacity=${.85} depthWrite=${false} />
  </mesh>`;
}

export function PalaceScene({ controller, exhibits, exhibitStates, archive, avatar, fontsReady, reducedMotion, onTick, onFloorClick, onStandClick, onContextLost }) {
  const glRef = useRef();
  useEffect(() => {
    const canvas = glRef.current?.domElement;
    if (!canvas) return undefined;
    const lost = (event) => { event.preventDefault(); onContextLost?.(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  });
  const pose = controller.current.rig.pose.position;
  return html`<${Canvas} shadows dpr=${[1, 1.5]} gl=${{ antialias: true, powerPreference: "high-performance" }}
    camera=${{ position: [pose.x, pose.y, pose.z], fov: 46, near: .1, far: 260 }}
    onCreated=${(state) => { state.gl.localClippingEnabled = true; glRef.current = state.gl; }}>
    <color attach="background" args=${[SKY]} />
    <fog attach="fog" args=${[SKY, 70, 170]} />
    <${SoftEnvironment} intensity=${.32} />
    <hemisphereLight args=${["#fff3dd", "#a9d88a", .55]} />
    <ambientLight intensity=${.12} color="#ffe9c7" />
    <${FrameLoop} controller=${controller} onTick=${onTick} />
    <${PalaceGround} onFloorClick=${onFloorClick} />
    <${PalaceStructure} />
    <${TranseptVault} />
    <${LightShafts} reducedMotion=${reducedMotion} />
    <${AtriumLandmarks} reducedMotion=${reducedMotion} />
    <${ParkTrees} reducedMotion=${reducedMotion} />
    <${ExhibitStands} exhibits=${exhibits} controller=${controller} reducedMotion=${reducedMotion} onStandClick=${onStandClick} exhibitStates=${exhibitStates} />
    <${CardGallery} archive=${archive} />
    <${Signposts} fontsReady=${fontsReady} />
    ${ZONES.map((zone) => html`<${ZoneSign} key=${zone.id} zone=${zone} fontsReady=${fontsReady} controller=${controller} />`)}
    <${PlayerAvatar} controller=${controller} portraitSrc=${avatar.portraitSrc} focusY=${avatar.focusY} accent=${avatar.accent} reducedMotion=${reducedMotion} />
    <${TargetMarker} controller=${controller} />
  </${Canvas}>`;
}
