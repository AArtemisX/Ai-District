import { html } from "../../map-3d/runtime.js";
import { ZONES } from "../config/palace-layout.js";

// 2D exhibit list used when WebGL is unavailable or the 3D scene fails.
const BADGE = { locked: "🔒", available: "○", completed: "✓" };

export function FallbackList({ exhibits, states, reason, onOpen }) {
  return html`<section class="cp-fallback" aria-labelledby="cp-fallback-title">
    <h1 id="cp-fallback-title">Crystal Palace</h1>
    <p class="cp-fallback-note">${reason}</p>
    ${ZONES.filter((zone) => zone.open).map((zone) => html`<div key=${zone.id} class="cp-fallback-zone" style=${{ "--zone": zone.color }}>
      <h2>${zone.nameTh}<small>${zone.name}</small></h2>
      <ul>${exhibits.filter((item) => item.zone === zone.id).map((item) => html`<li key=${item.id}>
        <button type="button" onClick=${() => onOpen(item)}>${states?.[item.id] ? html`<span class="cp-badge" aria-hidden="true">${BADGE[states[item.id].status]}</span> ` : ""}${item.title}</button>
      </li>`)}</ul>
    </div>`)}
  </section>`;
}
