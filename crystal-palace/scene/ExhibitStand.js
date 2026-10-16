import { CylinderGeometry, Object3D, OctahedronGeometry } from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { html } from "../../map-3d/runtime.js";
import { Instances } from "./instancing.js";
import { ZONE_BY_ID } from "../config/palace-layout.js";
import { STAND_RADIUS } from "../config/exhibits.js";

const CRYSTAL_Y = 1.75;

// All exhibit stands: one instanced plinth set + one instanced crystal set (tinted per zone), plus a
// single gold ring that marks the exhibit currently in reach.
// Crystal tint by lesson state: gold = completed, grey = not open yet, zone colour otherwise.
const STATUS_TINT = { completed: "#ffc93c", locked: "#9a9a8c" };

export function ExhibitStands({ exhibits, controller, reducedMotion, onStandClick, exhibitStates }) {
  const stands = useMemo(() => exhibits.filter((item) => item.obstacle !== false), [exhibits]);
  const geo = useMemo(() => ({ plinth: new CylinderGeometry(STAND_RADIUS * .82, STAND_RADIUS, 1.1, 8).translate(0, .55, 0), crystal: new OctahedronGeometry(.42, 0) }), []);
  const plinths = useMemo(() => stands.map((item) => ({ p: [item.x, 0, item.z], s: [1, 1, 1] })), [stands]);
  const crystals = useMemo(() => stands.map((item) => ({ p: [item.x, CRYSTAL_Y, item.z], s: [1, 1.5, 1], color: STATUS_TINT[exhibitStates?.[item.id]?.status] || ZONE_BY_ID[item.zone]?.color })), [stands, exhibitStates]);
  const crystalRef = useRef();
  const ringRef = useRef();
  const dummy = useMemo(() => new Object3D(), []);

  useFrame(({ clock }) => {
    const nearestId = controller.current.nearestId;
    const ring = ringRef.current;
    const near = exhibits.find((item) => item.id === nearestId);
    if (ring) {
      ring.visible = Boolean(near);
      if (near) ring.position.set(near.x, .04, near.z);
      const scale = near?.obstacle === false ? 2.7 : 1;
      ring.scale.setScalar(scale);
    }
    const mesh = crystalRef.current;
    if (!mesh || reducedMotion) return;
    const t = clock.elapsedTime;
    stands.forEach((item, index) => {
      const active = item.id === nearestId;
      dummy.position.set(item.x, CRYSTAL_Y + Math.sin(t * 1.6 + index) * .08 + (active ? .12 : 0), item.z);
      dummy.rotation.set(0, t * (active ? 1.4 : .5) + index, 0);
      // Lessons you can still take breathe gently so they read as "available".
      const pulse = exhibitStates?.[item.id]?.status === "available" ? 1 + Math.sin(t * 2.4 + index) * .1 : 1;
      dummy.scale.set((active ? 1.2 : 1) * pulse, (active ? 1.8 : 1.5) * pulse, (active ? 1.2 : 1) * pulse);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  const click = (event) => {
    if (event.delta > 8 || event.instanceId === undefined) return;
    event.stopPropagation();
    onStandClick?.(stands[event.instanceId]);
  };

  return html`<group>
    <${Instances} geometry=${geo.plinth} items=${plinths} color="#fff4dc" castShadow receiveShadow roughness=${.75} onClick=${click} />
    <${Instances} meshRef=${crystalRef} geometry=${geo.crystal} items=${crystals} roughness=${.25} onClick=${click} />
    <mesh ref=${ringRef} rotation-x=${-Math.PI / 2} visible=${false} raycast=${() => null}>
      <ringGeometry args=${[STAND_RADIUS + .25, STAND_RADIUS + .45, 32]} />
      <meshBasicMaterial color="#ffc93c" />
    </mesh>
  </group>`;
}
