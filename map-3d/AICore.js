import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { html } from "./runtime.js";

export function AICore() {
  const rings = useRef();
  const orb = useRef();
  useFrame((state, delta) => {
    if (rings.current) rings.current.rotation.z += delta * .35;
    if (orb.current) orb.current.position.y = 4.8 + Math.sin(state.clock.elapsedTime * 1.5) * .18;
  });
  return html`
    <group>
      <mesh position=${[0, .35, 0]} receiveShadow castShadow><cylinderGeometry args=${[3.15, 3.55, .7, 12]} /><meshStandardMaterial color="#f9fcff" roughness=${.65} /></mesh>
      <mesh position=${[0, 1.65, 0]} castShadow><cylinderGeometry args=${[.78, 1.24, 2.6, 8]} /><meshStandardMaterial color="#ffffff" roughness=${.45} /></mesh>
      <mesh position=${[0, 2.35, 0]}><cylinderGeometry args=${[.62,.62,1.9,10]} /><meshStandardMaterial color="#5bcfff" emissive="#168fd1" emissiveIntensity=${.62} /></mesh>
      <group ref=${rings} position=${[0, 4.8, 0]} rotation=${[Math.PI / 2,0,0]}>
        <mesh><torusGeometry args=${[1.45,.08,8,48]} /><meshStandardMaterial color="#ffca58" emissive="#ff9b2f" emissiveIntensity=${.85} /></mesh>
        <mesh rotation=${[.35,.2,0]}><torusGeometry args=${[1.05,.055,8,48]} /><meshStandardMaterial color="#ff7ed0" emissive="#d244b0" emissiveIntensity=${.78} /></mesh>
      </group>
      <mesh ref=${orb} position=${[0,4.8,0]} castShadow><icosahedronGeometry args=${[.58,1]} /><meshStandardMaterial color="#c9f7ff" emissive="#4bc8ff" emissiveIntensity=${1.2} roughness=${.25} /></mesh>
      ${[0,1,2,3].map((i)=>html`<mesh key=${i} position=${[Math.cos(i*Math.PI/2)*2.25,.92,Math.sin(i*Math.PI/2)*2.25]} castShadow><coneGeometry args=${[.34,1.2,5]} /><meshStandardMaterial color=${i%2 ? "#b58aff":"#ff82bd"} roughness=${.45} /></mesh>`)}
    </group>
  `;
}
