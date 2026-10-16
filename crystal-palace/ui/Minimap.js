import { useMemo } from "react";
import { html } from "../../map-3d/runtime.js";
import { minimapLayout, minimapShapes, minimapToWorld, worldToMinimap } from "../systems/minimap.js";

export const MINIMAP_SIZE = Object.freeze({ width: 176, height: 108 });
const STATUS_FILL = { completed: "#ffc93c", locked: "#9a9a8c" };

// Overview map + compass. Static shapes render once; the player arrow is moved by the frame loop
// through `markerRef` (no React re-render per frame). Tapping the map walks there.
export function Minimap({ exhibits, states, markerRef, onPick }) {
  const layout = useMemo(() => minimapLayout(MINIMAP_SIZE.width, MINIMAP_SIZE.height), []);
  const shapes = useMemo(() => minimapShapes(layout), [layout]);
  const markers = useMemo(() => exhibits.map((item) => ({ id: item.id, title: item.title, zone: item.zone, ...worldToMinimap(layout, item.x, item.z) })), [exhibits, layout]);
  const pick = (event) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const u = ((event.clientX - rect.left) / rect.width) * MINIMAP_SIZE.width;
    const v = ((event.clientY - rect.top) / rect.height) * MINIMAP_SIZE.height;
    onPick?.(minimapToWorld(layout, u, v));
  };
  return html`<figure class="cp-minimap" aria-label="แผนที่ย่อ (แตะเพื่อเดินไป)">
    <svg viewBox=${`0 0 ${MINIMAP_SIZE.width} ${MINIMAP_SIZE.height}`} onClick=${pick} role="img" aria-label="แผนที่ย่อของ Crystal Palace">
      ${shapes.zones.map((zone) => html`<rect key=${zone.id} x=${zone.x} y=${zone.y} width=${zone.width} height=${zone.height}
        fill=${zone.color} fill-opacity=${zone.open ? .28 : .12} />`)}
      ${shapes.floor.map((rect) => html`<rect key=${rect.id} x=${rect.x} y=${rect.y} width=${rect.width} height=${rect.height}
        fill="none" stroke="#b98b5e" stroke-width="1" rx="1.5" />`)}
      ${markers.map((m) => html`<circle key=${m.id} cx=${m.u} cy=${m.v} r="2.6" fill=${STATUS_FILL[states?.[m.id]?.status] || "#fffaf0"} stroke="#24412c" stroke-width=".8"><title>${m.title}</title></circle>`)}
      <g ref=${markerRef} class="cp-minimap-player">
        <circle r="7.5" fill="#1d7a86" fill-opacity=".22" />
        <path d="M0 7 L4.8 -4 L0 -1.6 L-4.8 -4 Z" fill="#1d7a86" stroke="#fff" stroke-width="1.2" />
      </g>
    </svg>
    <span class="cp-compass" aria-hidden="true"><b>N</b>▲</span>
  </figure>`;
}
