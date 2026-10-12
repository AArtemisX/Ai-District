import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { html } from "./runtime.js";

export function AICore() {
  const rings = useRef();
  const orb = useRef();
  const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  useFrame((state, delta) => {
    if (rings.current && !reducedMotion) rings.current.rotation.z += delta * .26;
    if (orb.current) orb.current.position.y = 3.75 + (reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 1.35) * .12);
  });
  return html`
    <group>
      <mesh position=${[0, .38, 0]} receiveShadow castShadow><cylinderGeometry args=${[3.05, 3.35, .76, 16]} /><meshStandardMaterial color="#f8fbff" roughness=${.68} /></mesh>
      <mesh position=${[0,.8,0]} receiveShadow><cylinderGeometry args=${[2.18,2.48,.18,16]} /><meshStandardMaterial color="#dff5fb" roughness=${.5} /></mesh>
      <mesh position=${[0, 1.55, 0]} castShadow><cylinderGeometry args=${[.72, 1.18, 1.5, 8]} /><meshStandardMaterial color="#ffffff" roughness=${.44} /></mesh>
      <mesh position=${[0, 2.08, 0]}><cylinderGeometry args=${[.56,.56,1.35,10]} /><meshStandardMaterial color="#65dff4" emissive="#21a8d2" emissiveIntensity=${.54} /></mesh>
      <group ref=${rings} position=${[0, 3.75, 0]} rotation=${[Math.PI / 2,0,0]}>
        <mesh><torusGeometry args=${[1.32,.075,8,40]} /><meshStandardMaterial color="#f6d779" emissive="#eaa92f" emissiveIntensity=${.68} /></mesh>
        <mesh rotation=${[.35,.2,0]}><torusGeometry args=${[.94,.05,8,36]} /><meshStandardMaterial color="#f4a5c3" emissive="#d95b98" emissiveIntensity=${.58} /></mesh>
      </group>
      <mesh ref=${orb} position=${[0,3.75,0]} castShadow><icosahedronGeometry args=${[.52,1]} /><meshStandardMaterial color="#d9faff" emissive="#65dff4" emissiveIntensity=${.9} roughness=${.28} /></mesh>
      ${[0,1,2,3].map((i)=>html`<group key=${i} position=${[Math.cos(i*Math.PI/2)*2.25,.9,Math.sin(i*Math.PI/2)*2.25]}>
        <mesh castShadow><cylinderGeometry args=${[.16,.24,.95,6]} /><meshStandardMaterial color="#f8fbff" roughness=${.55} /></mesh>
        <mesh position=${[0,.2,0]}><cylinderGeometry args=${[.06,.06,.55,6]} /><meshStandardMaterial color=${i%2 ? "#b6a2e8":"#65dff4"} emissive=${i%2 ? "#8f75d1":"#2eb4d2"} emissiveIntensity=${.68} /></mesh>
      </group>`)}
    </group>
  `;
}
