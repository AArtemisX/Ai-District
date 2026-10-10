import { html, React } from "./runtime.js";

function Tower({ x = 0, z = 0, height = 2.2, color = "#ffffff", accent = "#ffd15c" }) {
  return html`
    <group position=${[x, height / 2, z]}>
      <mesh castShadow receiveShadow><boxGeometry args=${[.82, height, .82]} /><meshStandardMaterial color=${color} roughness=${.58} /></mesh>
      <mesh position=${[0, height / 2 + .28, 0]} castShadow><coneGeometry args=${[.58, .72, 5]} /><meshStandardMaterial color=${accent} roughness=${.4} metalness=${.12} /></mesh>
      <mesh position=${[0, .15, .43]}><boxGeometry args=${[.22, height * .7, .03]} /><meshStandardMaterial color="#58c9ff" emissive="#168bc5" emissiveIntensity=${.45} /></mesh>
    </group>
  `;
}

export function PrimitiveBuilding({ variant = 0, color = "#ffffff", accent = "#ffd15c" }) {
  if (variant === 1) {
    return html`
      <group>
        <mesh position=${[0, .65, 0]} castShadow receiveShadow><cylinderGeometry args=${[1.35, 1.65, 1.3, 8]} /><meshStandardMaterial color=${color} roughness=${.55} /></mesh>
        <mesh position=${[0, 1.52, 0]} castShadow><coneGeometry args=${[1.28, .9, 8]} /><meshStandardMaterial color=${accent} roughness=${.42} /></mesh>
        <mesh position=${[0, 1.48, 0]}><cylinderGeometry args=${[.72, .72, .2, 20]} /><meshStandardMaterial color="#62dcff" emissive="#27a6dd" emissiveIntensity=${.5} transparent opacity=${.85} /></mesh>
        ${[-1, 1].map((x) => html`<${Tower} key=${x} x=${x * 1.25} z=${.2} height=${1.45} color=${color} accent=${accent} />`)}
      </group>
    `;
  }
  if (variant === 2) {
    return html`
      <group>
        ${[-1.05, 0, 1.05].map((x, i) => html`<${Tower} key=${x} x=${x} z=${Math.abs(x) * .18} height=${2 + i * .28} color=${color} accent=${accent} />`)}
        <mesh position=${[0, .35, .5]} castShadow><boxGeometry args=${[3.25, .7, .7]} /><meshStandardMaterial color=${accent} roughness=${.5} /></mesh>
      </group>
    `;
  }
  return html`
    <group>
      <${Tower} x=${0} z=${0} height=${2.8} color=${color} accent=${accent} />
      <${Tower} x=${-1.15} z=${.45} height=${1.65} color=${color} accent=${accent} />
      <${Tower} x=${1.15} z=${.45} height=${1.65} color=${color} accent=${accent} />
    </group>
  `;
}

// Swap PrimitiveBuilding for a GLTF component later without changing District.
export function BuildingModelSlot({ modelUrl = null, ...props }) {
  return modelUrl ? null : React.createElement(PrimitiveBuilding, props);
}
