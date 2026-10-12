import { html } from "./runtime.js";

export function TransitDecor() {
  return html`<group>
    <mesh position=${[0,.68,0]} rotation=${[-Math.PI/2,0,0]}>
      <torusGeometry args=${[7.2,.09,6,64]} /><meshStandardMaterial color="#7895a6" roughness=${.62} metalness=${.12} />
    </mesh>
    <mesh position=${[0,.7,0]} rotation=${[-Math.PI/2,0,0]}>
      <torusGeometry args=${[7.48,.035,5,64]} /><meshStandardMaterial color="#65dff4" emissive="#65dff4" emissiveIntensity=${.48} />
    </mesh>
    ${[0,Math.PI/2,Math.PI,Math.PI*1.5].map((angle,i)=>html`<group key=${i} position=${[Math.cos(angle)*7.35,.62,Math.sin(angle)*7.35]} rotation=${[0,-angle,0]}>
      <mesh position=${[0,.28,0]} castShadow><boxGeometry args=${[1.05,.48,.48]} /><meshStandardMaterial color="#f8fbff" roughness=${.55} /></mesh>
      <mesh position=${[0,.3,.25]}><boxGeometry args=${[.68,.2,.025]} /><meshStandardMaterial color=${i%2?"#b6a2e8":"#65dff4"} emissive=${i%2?"#8d72d0":"#29b9d8"} emissiveIntensity=${.45} /></mesh>
    </group>`)}
  </group>`;
}
