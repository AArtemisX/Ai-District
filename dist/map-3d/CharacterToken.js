import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { html } from "./runtime.js";

const STEP_DURATION = .4;
const STAND_HEIGHT = 1.08;

export function CharacterToken({ tilePositions, tileIndex, moveRequest, color = "#48bfff", offset = [0, 0, 0], onMoveComplete }) {
  const ref = useRef();
  const activeMove = useRef(null);
  const handledRequest = useRef(null);
  const start = tilePositions[tileIndex];

  useEffect(() => {
    if (!ref.current || activeMove.current) return;
    const position = tilePositions[tileIndex];
    ref.current.position.set(position[0] + offset[0], position[1] + STAND_HEIGHT + offset[1], position[2] + offset[2]);
  }, [tileIndex, tilePositions, offset]);

  useEffect(() => {
    if (!moveRequest || handledRequest.current === moveRequest.id || moveRequest.path.length === 0) return;
    handledRequest.current = moveRequest.id;
    activeMove.current = {
      path: moveRequest.path,
      startIndex: moveRequest.from,
      segment: 0,
      elapsed: 0,
    };
  }, [moveRequest]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * .65;
    const movement = activeMove.current;
    if (!movement) return;

    movement.elapsed += delta;
    const progress = Math.min(1, movement.elapsed / STEP_DURATION);
    const fromIndex = movement.segment === 0 ? movement.startIndex : movement.path[movement.segment - 1];
    const toIndex = movement.path[movement.segment];
    const from = tilePositions[fromIndex];
    const to = tilePositions[toIndex];
    const eased = progress * progress * (3 - 2 * progress);
    const jump = Math.sin(Math.PI * progress) * .48;

    ref.current.position.set(
      from[0] + (to[0] - from[0]) * eased + offset[0],
      from[1] + (to[1] - from[1]) * eased + STAND_HEIGHT + offset[1] + jump,
      from[2] + (to[2] - from[2]) * eased + offset[2],
    );

    if (progress < 1) return;
    movement.segment += 1;
    movement.elapsed = 0;
    if (movement.segment < movement.path.length) return;

    const finalIndex = movement.path[movement.path.length - 1];
    activeMove.current = null;
    onMoveComplete?.(finalIndex);
  });
  return html`
    <group ref=${ref} position=${[start[0] + offset[0], start[1] + STAND_HEIGHT + offset[1], start[2] + offset[2]]}>
      <mesh castShadow><sphereGeometry args=${[.34, 16, 12]} /><meshStandardMaterial color=${color} roughness=${.35} /></mesh>
      <mesh position=${[0, -.48, 0]} castShadow><cylinderGeometry args=${[.26, .4, .62, 8]} /><meshStandardMaterial color="#ffffff" roughness=${.52} /></mesh>
      <mesh position=${[0, .05, .31]}><boxGeometry args=${[.34, .13, .05]} /><meshStandardMaterial color="#162e63" emissive=${color} emissiveIntensity=${.55} /></mesh>
    </group>
  `;
}
