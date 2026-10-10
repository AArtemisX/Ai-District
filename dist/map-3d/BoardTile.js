import { html } from "./runtime.js";

export function BoardTile({ tile, selected, onSelect }) {
  return html`
    <group position=${tile.position}>
      <mesh
        castShadow
        receiveShadow
        scale=${selected ? [1.12, 1.18, 1.12] : [1, 1, 1]}
        onClick=${(event) => { event.stopPropagation(); onSelect(tile); }}
        onPointerOver=${() => { document.body.style.cursor = "pointer"; }}
        onPointerOut=${() => { document.body.style.cursor = "default"; }}
      >
        <boxGeometry args=${[1.82, .34, 1.82]} />
        <meshStandardMaterial color=${selected ? "#fff4a8" : tile.color} roughness=${.5} metalness=${.03} emissive=${selected ? "#ffcc3d" : "#000000"} emissiveIntensity=${selected ? .28 : 0} />
      </mesh>
      <mesh position=${[0, .22, 0]} rotation=${[-Math.PI / 2, 0, 0]}>
        <ringGeometry args=${[.28, .42, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity=${.9} />
      </mesh>
    </group>
  `;
}
