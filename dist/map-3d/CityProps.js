import { html } from "./runtime.js";

export function LowPolyTree({ position = [0, 0, 0], scale = 1, blossom = false }) {
  const crown = blossom ? "#f4a5c3" : "#5cb847";
  return html`<group position=${position} scale=${[scale, scale, scale]}>
    <mesh position=${[0,.34,0]} castShadow><cylinderGeometry args=${[.09,.13,.68,6]} /><meshStandardMaterial color="#a88769" roughness=${.9} /></mesh>
    <mesh position=${[0,.88,0]} castShadow><dodecahedronGeometry args=${[.42,0]} /><meshStandardMaterial color=${crown} roughness=${.82} /></mesh>
    <mesh position=${[.18,1.03,.06]} castShadow><dodecahedronGeometry args=${[.27,0]} /><meshStandardMaterial color=${blossom ? "#ffd5e5" : "#86d064"} roughness=${.82} /></mesh>
  </group>`;
}

export function StreetLamp({ position = [0, 0, 0], color = "#65dff4" }) {
  return html`<group position=${position}>
    <mesh position=${[0,.46,0]} castShadow><cylinderGeometry args=${[.035,.065,.92,6]} /><meshStandardMaterial color="#7895a6" roughness=${.7} /></mesh>
    <mesh position=${[0,.96,0]}><octahedronGeometry args=${[.13,0]} /><meshStandardMaterial color=${color} emissive=${color} emissiveIntensity=${.7} roughness=${.35} /></mesh>
  </group>`;
}

export function Bench({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  return html`<group position=${position} rotation=${rotation}>
    <mesh position=${[0,.2,0]} castShadow><boxGeometry args=${[.72,.12,.24]} /><meshStandardMaterial color="#f6d779" roughness=${.7} /></mesh>
    ${[-.27,.27].map((x)=>html`<mesh key=${x} position=${[x,.08,0]}><boxGeometry args=${[.07,.22,.2]} /><meshStandardMaterial color="#7895a6" /></mesh>`)}
  </group>`;
}

export function PlanterBox({ position = [0, 0, 0], accent = "#91ddb8" }) {
  return html`<group position=${position}>
    <mesh position=${[0,.14,0]} castShadow><boxGeometry args=${[.72,.28,.42]} /><meshStandardMaterial color="#f8fbff" roughness=${.85} /></mesh>
    ${[-.2,0,.2].map((x)=>html`<mesh key=${x} position=${[x,.38,0]}><coneGeometry args=${[.12,.42,6]} /><meshStandardMaterial color=${accent} roughness=${.8} /></mesh>`)}
  </group>`;
}

export function HologramSign({ position = [0, 0, 0], color = "#65dff4" }) {
  return html`<group position=${position}>
    <mesh position=${[0,.3,0]}><cylinderGeometry args=${[.04,.06,.6,6]} /><meshStandardMaterial color="#718f9f" /></mesh>
    <mesh position=${[0,.72,0]}><boxGeometry args=${[.64,.38,.035]} /><meshStandardMaterial color=${color} emissive=${color} emissiveIntensity=${.45} transparent opacity=${.58} /></mesh>
  </group>`;
}

export function UtilityBox({ position = [0, 0, 0], color = "#b6a2e8" }) {
  return html`<group position=${position}>
    <mesh position=${[0,.24,0]} castShadow><boxGeometry args=${[.42,.48,.38]} /><meshStandardMaterial color="#f8fbff" roughness=${.65} /></mesh>
    <mesh position=${[0,.27,.2]}><boxGeometry args=${[.25,.2,.025]} /><meshStandardMaterial color=${color} emissive=${color} emissiveIntensity=${.35} /></mesh>
  </group>`;
}

export function DataLightPillar({ position = [0, 0, 0], color = "#65dff4" }) {
  return html`<group position=${position}>
    <mesh position=${[0,.48,0]}><cylinderGeometry args=${[.08,.12,.96,6]} /><meshStandardMaterial color="#eff9ff" roughness=${.5} /></mesh>
    <mesh position=${[0,.58,0]}><cylinderGeometry args=${[.035,.035,.64,6]} /><meshStandardMaterial color=${color} emissive=${color} emissiveIntensity=${.85} /></mesh>
  </group>`;
}

export function DroneDock({ position = [0, 0, 0] }) {
  return html`<group position=${position}>
    <mesh position=${[0,.08,0]}><cylinderGeometry args=${[.42,.48,.16,8]} /><meshStandardMaterial color="#dce9ef" roughness=${.7} /></mesh>
    <mesh position=${[0,.17,0]} rotation=${[-Math.PI/2,0,0]}><ringGeometry args=${[.2,.31,12]} /><meshBasicMaterial color="#b6a2e8" /></mesh>
  </group>`;
}
