import { html } from "./runtime.js";
import { BuildingModelSlot } from "./Building.js";
import { OWNER_COLORS } from "./board-data.js";

export function District({ district, state, selected, onSelect }) {
  const ownerColor = state.owner ? OWNER_COLORS[state.owner] : district.color;
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
        <meshStandardMaterial color=${ownerColor} roughness=${.58} transparent opacity=${state.status === "built" ? .72 : .32} />
      </mesh>
      ${state.status === "built"
        ? html`<group position=${[0, .38, 0]} scale=${[.72,.72,.72]}><${BuildingModelSlot} variant=${state.variant} color="#f9fcff" accent=${ownerColor} modelUrl=${state.modelUrl} /></group>`
        : html`<group position=${[0, .48, 0]}>
            <mesh rotation=${[-Math.PI / 2, 0, 0]}><ringGeometry args=${[.72, 1.08, 20]} /><meshBasicMaterial color=${ownerColor} transparent opacity=${.64} /></mesh>
            <mesh position=${[0, .12, 0]}><boxGeometry args=${[.12,.42,.12]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh position=${[0, .12, 0]}><boxGeometry args=${[.42,.12,.12]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </group>`}
    </group>
  `;
}
