import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { html } from "./runtime.js";
import { BuildingModelSlot } from "./Building.js";
import { OWNER_COLORS } from "./board-data.js";

export function District({ district, state, selected, onSelect, effects = [], visualEvent = null }) {
  const ownerColor = state.ownerId ? OWNER_COLORS[state.ownerId] : district.color;
  const contested = state.status === "CONTESTED";
  const building = useRef();
  const contestRing = useRef();
  const defenseRing = useRef();
  const eventRing = useRef();
  const eventFlash = useRef();
  const eventAge = useRef(1);
  const lastVisualEventId = useRef(null);
  const previousBuilt = useRef(state.isBuilt);
  const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const defenseActive = effects.some((effect) => effect.districtId === district.id && ["FIREWALL_SHIELD", "ATTACK_BLOCK"].includes(effect.effectType));
  const eventColor = visualEvent?.kind === "ATTACK" ? "#ff5f87"
    : visualEvent?.kind === "CAPTURE" ? "#ffd44f"
      : visualEvent?.kind === "BLOCKED" ? "#62ddff" : "#af8bff";
  useEffect(() => {
    if (!previousBuilt.current && state.isBuilt && building.current && !reducedMotion) building.current.scale.setScalar(.35);
    previousBuilt.current = state.isBuilt;
  }, [state.isBuilt, reducedMotion]);
  useEffect(() => {
    if (!visualEvent || visualEvent.id === lastVisualEventId.current) return undefined;
    lastVisualEventId.current = visualEvent.id;
    eventAge.current = 0;
    if (eventRing.current) {
      eventRing.current.visible = true;
      eventRing.current.scale.setScalar(.72);
    }
    if (eventFlash.current) eventFlash.current.visible = true;
    return () => {
      if (eventRing.current) eventRing.current.visible = false;
      if (eventFlash.current) eventFlash.current.visible = false;
    };
  }, [visualEvent]);
  useFrame((frame, delta) => {
    if (building.current && state.isBuilt) {
      const next = reducedMotion ? 1 : 1 - Math.exp(-delta * 8);
      building.current.scale.x += (1 - building.current.scale.x) * next;
      building.current.scale.y += (1 - building.current.scale.y) * next;
      building.current.scale.z += (1 - building.current.scale.z) * next;
    }
    if (contestRing.current && !reducedMotion) {
      const pulse = 1 + Math.sin(frame.clock.elapsedTime * 3) * .045;
      contestRing.current.scale.setScalar(pulse);
      contestRing.current.rotation.z += delta * .18;
    }
    if (defenseRing.current && !reducedMotion) {
      const shieldPulse = 1 + Math.sin(frame.clock.elapsedTime * 4) * .035;
      defenseRing.current.scale.setScalar(shieldPulse);
      defenseRing.current.rotation.z -= delta * .22;
    }
    if (eventRing.current?.visible || eventFlash.current?.visible) {
      eventAge.current += delta;
      const duration = reducedMotion ? .12 : .65;
      const progress = Math.min(1, eventAge.current / duration);
      if (eventRing.current) eventRing.current.scale.setScalar(.72 + progress * .62);
      if (eventRing.current?.children[0]?.material) eventRing.current.children[0].material.opacity = Math.max(0, .92 * (1 - progress));
      if (eventFlash.current?.material) eventFlash.current.material.opacity = Math.max(0, .34 * (1 - progress));
      if (progress >= 1) {
        if (eventRing.current) eventRing.current.visible = false;
        if (eventFlash.current) eventFlash.current.visible = false;
      }
    }
  });
  return html`
    <group position=${district.position} rotation=${[0, district.rotation, 0]}>
      <mesh
        receiveShadow
        castShadow
        onClick=${(event) => { event.stopPropagation(); onSelect(district.id); }}
        onPointerOver=${() => { document.body.style.cursor = "pointer"; }}
        onPointerOut=${() => { document.body.style.cursor = "default"; }}
      >
        <cylinderGeometry args=${[2.35, 2.65, .52, 8]} />
        <meshStandardMaterial color=${selected ? "#fff0a8" : "#f5fbff"} roughness=${.72} emissive=${selected ? ownerColor : "#000000"} emissiveIntensity=${selected ? .16 : 0} />
      </mesh>
      <mesh position=${[0, .3, 0]} receiveShadow>
        <cylinderGeometry args=${[2.06, 2.06, .12, 8]} />
        <meshStandardMaterial color=${ownerColor} roughness=${.58} transparent opacity=${state.isBuilt ? .82 : .32} />
      </mesh>
      <mesh ref=${eventFlash} visible=${false} position=${[0,.38,0]}>
        <cylinderGeometry args=${[2.18,2.18,.16,8]} />
        <meshBasicMaterial color=${eventColor} transparent opacity=${.34} depthWrite=${false} />
      </mesh>
      <group ref=${eventRing} visible=${false} position=${[0,.5,0]} rotation=${[-Math.PI/2,0,0]}>
        <mesh><ringGeometry args=${[2.2,2.42,32]} /><meshBasicMaterial color=${eventColor} transparent opacity=${.92} depthWrite=${false} /></mesh>
      </group>
      ${defenseActive ? html`
        <group ref=${defenseRing} position=${[0,.58,0]} rotation=${[-Math.PI/2,0,0]}>
          <mesh><ringGeometry args=${[2.16,2.32,32]} /><meshBasicMaterial color="#72dcff" transparent opacity=${.68} depthWrite=${false} /></mesh>
          <mesh><ringGeometry args=${[2.4,2.47,32]} /><meshBasicMaterial color="#c69cff" transparent opacity=${.52} depthWrite=${false} /></mesh>
        </group>
      ` : null}
      ${visualEvent ? html`<${Html} center position=${[0,3.25,0]} distanceFactor=${12} zIndexRange=${[20,0]}><div className=${`district-float ${visualEvent.kind.toLowerCase()}`}>${visualEvent.ipLabel || visualEvent.label}</div></${Html}>` : null}
      ${contested ? html`
        <group ref=${contestRing} position=${[0,.43,0]} rotation=${[-Math.PI/2,0,0]}>
          <mesh><ringGeometry args=${[2.1,2.22,32]} /><meshBasicMaterial color=${OWNER_COLORS.player} transparent opacity=${.78} /></mesh>
          <mesh rotation=${[0,0,Math.PI]}><ringGeometry args=${[2.25,2.38,32,1,0,Math.PI]} /><meshBasicMaterial color=${OWNER_COLORS.bot} transparent opacity=${.86} /></mesh>
        </group>
      ` : null}
      ${state.isBuilt
        ? html`<group ref=${building} position=${[0, .38, 0]} scale=${[.72,.72,.72]}><${BuildingModelSlot} districtId=${district.id} accent=${ownerColor} modelUrl=${state.modelUrl} /></group>`
        : html`<group position=${[0, .48, 0]}>
            <mesh rotation=${[-Math.PI / 2, 0, 0]}><ringGeometry args=${[.72, 1.08, 20]} /><meshBasicMaterial color=${ownerColor} transparent opacity=${.42} /></mesh>
            <mesh position=${[0,.08,0]}><cylinderGeometry args=${[.6,.82,.12,8]} /><meshStandardMaterial color="#eefdff" emissive=${ownerColor} emissiveIntensity=${.28} transparent opacity=${.62} /></mesh>
            <mesh position=${[0, .12, 0]}><boxGeometry args=${[.12,.42,.12]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh position=${[0, .12, 0]}><boxGeometry args=${[.42,.12,.12]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </group>`}
      ${state.ownerId ? html`<group position=${[1.8,.45,-1.2]}>
        <mesh position=${[0,.46,0]}><cylinderGeometry args=${[.045,.07,.92,6]} /><meshStandardMaterial color="#708c9a" /></mesh>
        <mesh position=${[.22,.75,0]}><boxGeometry args=${[.44,.3,.035]} /><meshStandardMaterial color=${ownerColor} emissive=${ownerColor} emissiveIntensity=${.4} /></mesh>
      </group>` : null}
    </group>
  `;
}
