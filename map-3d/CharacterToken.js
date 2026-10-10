import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import { html } from "./runtime.js";

export function CharacterToken({ position, color = "#48bfff", label = "P", offset = [0, 0, 0] }) {
  const ref = useRef();
  const target = new Vector3(position[0] + offset[0], position[1] + 1.1 + offset[1], position[2] + offset[2]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.position.lerp(target, Math.min(1, delta * 7));
    ref.current.rotation.y += delta * .9;
  });
  return html`
    <group ref=${ref} position=${target.toArray()}>
      <mesh castShadow><sphereGeometry args=${[.34, 16, 12]} /><meshStandardMaterial color=${color} roughness=${.35} /></mesh>
      <mesh position=${[0, -.48, 0]} castShadow><cylinderGeometry args=${[.26, .4, .62, 8]} /><meshStandardMaterial color="#ffffff" roughness=${.52} /></mesh>
      <mesh position=${[0, .05, .31]}><boxGeometry args=${[.34, .13, .05]} /><meshStandardMaterial color="#162e63" emissive=${color} emissiveIntensity=${.55} /></mesh>
    </group>
  `;
}
