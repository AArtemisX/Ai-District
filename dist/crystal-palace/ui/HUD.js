import { html, React } from "../../map-3d/runtime.js";

// Top bar (title, current zone, back-to-entrance, exit) and the bottom "E / tap to explore" prompt.
function DataChip({ palace, passport }) {
  if (palace?.status === "error") return html`<button type="button" class="cp-data-chip is-error" onClick=${palace.retry}>⚠ โหลดความก้าวหน้าไม่ได้ · ลองใหม่</button>`;
  if (!passport) return html`<span class="cp-data-chip" role="status">กำลังโหลดความก้าวหน้า…</span>`;
  return html`<span class="cp-data-chip" title="ตราประทับพาสปอร์ต">🛂 ${passport.stamps.length}/${passport.total}</span>`;
}

export function HUD({ zone, nearest, panelOpen, onExplore, onBackToEntrance, showTouchHint, palace, passport }) {
  return html`<${React.Fragment}><header class="cp-hud" aria-label="เมนู Crystal Palace">
      <div class="cp-hud-title">
        <span class="cp-hud-icon" aria-hidden="true">🏛️</span>
        <span><b>Crystal Palace</b><small>นิทรรศการ AI District</small></span>
      </div>
      <div class="cp-zone-chip" role="status" aria-live="polite" style=${{ "--zone": zone?.color || "#d9c49a" }}>
        <span class="cp-zone-dot" aria-hidden="true"></span>${zone ? zone.nameTh : "ระหว่างทาง"}
      </div>
      <${DataChip} palace=${palace} passport=${passport} />
      <nav class="cp-hud-actions">
        <button type="button" class="cp-btn cp-btn-soft" onClick=${onBackToEntrance} aria-label="กลับทางเข้า">↩ <span>กลับทางเข้า</span></button>
        <a class="cp-btn cp-btn-gold" href="lobby.html">ออกสู่ Lobby</a>
      </nav>
    </header>
    ${!panelOpen && nearest && html`<button type="button" class="cp-prompt" onClick=${onExplore}>
      <kbd>${showTouchHint ? "แตะ" : "E"}</kbd><span>สำรวจ: <b>${nearest.title}</b></span>
    </button>`}
    ${!panelOpen && !nearest && html`<p class="cp-hint" aria-hidden="true">${showTouchHint ? "ใช้จอยสติ๊กหรือแตะพื้นเพื่อเดิน" : "เดินด้วย WASD / ลูกศร หรือคลิกพื้น"}</p>`}</${React.Fragment}>`;
}
