import { useState } from "react";
import { html } from "./runtime.js";

export function BoardTile({ tile, selected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const active = selected || hovered;
  return html`
    <group position=${tile.position}>
      <mesh position=${[0,-.13,0]} receiveShadow>
        <boxGeometry args=${[1.94,.2,1.94]} />
        <meshStandardMaterial color="#aabcc7" roughness=${.86} />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        scale=${selected ? [1.1, 1.15, 1.1] : hovered ? [1.04,1.08,1.04] : [1, 1, 1]}
        onClick=${(event) => { event.stopPropagation(); onSelect(tile); }}
        onPointerOver=${(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut=${() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <boxGeometry args=${[1.82, .34, 1.82]} />
        <meshStandardMaterial color=${selected ? "#fff4a8" : tile.color} roughness=${.48} metalness=${.03} emissive=${active ? (selected ? "#ffcc3d" : tile.color) : "#000000"} emissiveIntensity=${selected ? .3 : hovered ? .18 : 0} />
      </mesh>
      <mesh position=${[0, .22, 0]} rotation=${[-Math.PI / 2, 0, 0]}>
        <ringGeometry args=${[.28, .42, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity=${.9} />
      </mesh>
      <mesh position=${[0,.235,0]} rotation=${[-Math.PI/2,0,tile.index%2?Math.PI/4:0]}>
        <circleGeometry args=${[.14,tile.type==="ETHICS"?4:6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity=${.92} />
      </mesh>
      ${active ? html`<mesh position=${[0,.245,0]} rotation=${[-Math.PI/2,0,0]}><ringGeometry args=${[.7,.81,20]} /><meshBasicMaterial color=${selected?"#f6d779":"#ffffff"} transparent opacity=${selected?.95:.72} /></mesh>` : null}
    </group>
  `;
}
