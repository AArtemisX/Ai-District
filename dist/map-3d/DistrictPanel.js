import { html } from "./runtime.js";
import { DISTRICT_RULES, canBuildDistrict, canIncreaseInfluence } from "./district-engine.js";

const ownerLabel = (ownerId) => ownerId === "player" ? "ผู้เล่น" : ownerId === "bot" ? "บอท" : "ยังไม่มีเจ้าของ";
const statusLabel = (status) => ({ NEUTRAL: "ยังไม่มีเจ้าของ", OWNED: "มีเจ้าของแล้ว", CONTESTED: "กำลังแย่งชิง" }[status] || status);

export function DistrictPanel({ session, district, energy, seconds, currentTurn, actionUsed, feedback, onBuild, onInfluence, onSkip, onContinue }) {
  if (!session || !district) return null;
  const canBuild = canBuildDistrict(district, currentTurn, energy, true, actionUsed);
  const canInfluence = canIncreaseInfluence(district, currentTurn, energy, true, actionUsed);
  const pending = !feedback;
  return html`
    <section className="district-panel" role="dialog" aria-modal="false" aria-labelledby="district-title">
      <div className="district-panel-heading">
        <div><p className="map-kicker">จัดการเขต · ${session.source.toUpperCase()}</p><span className=${`district-status ${district.status.toLowerCase()}`}>${statusLabel(district.status)}</span></div>
        <div className=${`scenario-clock ${seconds <= 10 ? "urgent" : ""}`}><strong>${seconds}</strong><small>วินาที</small></div>
      </div>
      <h2 id="district-title">${district.districtName}</h2>
      <div className="district-summary">
        <div><span>เจ้าของปัจจุบัน</span><strong>${ownerLabel(district.ownerId)}</strong></div>
        <div><span>Energy ของ${currentTurn === "player" ? "ผู้เล่น" : "บอท"}</span><strong>${energy} / ${DISTRICT_RULES.MAX_ENERGY} EN</strong></div>
      </div>
      <div className="influence-bars">
        ${["player", "bot"].map((actor) => html`
          <div key=${actor} className=${`influence-row ${actor}`}>
            <span>${actor === "player" ? "ผู้เล่น" : "บอท"}</span>
            <div><i style=${{ width: `${((district.influenceByPlayer[actor] || 0) / DISTRICT_RULES.MAX_INFLUENCE) * 100}%` }}></i></div>
            <strong>${district.influenceByPlayer[actor] || 0} IP</strong>
          </div>
        `)}
      </div>
      ${pending ? html`
        <div className="district-actions">
          ${!district.isBuilt ? html`<button type="button" className="build" disabled=${!canBuild || currentTurn === "bot"} onClick=${onBuild}><b>สร้าง District</b><span>-${DISTRICT_RULES.BUILD_COST} EN · เริ่มต้น ${DISTRICT_RULES.BUILD_INFLUENCE} IP</span></button>` : null}
          ${district.isBuilt ? html`<button type="button" className="influence" disabled=${!canInfluence || currentTurn === "bot"} onClick=${onInfluence}><b>เพิ่ม Influence</b><span>-${DISTRICT_RULES.INFLUENCE_COST} EN · +${DISTRICT_RULES.INFLUENCE_GAIN} IP</span></button>` : null}
          <button type="button" className="skip" disabled=${currentTurn === "bot"} onClick=${onSkip}><b>ข้าม Action</b><span>ไม่เสีย Energy</span></button>
        </div>
        ${currentTurn === "bot" ? html`<div className="event-loading">บอทกำลังประเมินการสร้างและ Influence…</div>` : null}
        ${!canBuild && !district.isBuilt ? html`<p className="district-warning">ต้องมีอย่างน้อย ${DISTRICT_RULES.BUILD_COST} EN เพื่อสร้างเขตนี้</p>` : null}
        ${!canInfluence && district.isBuilt && energy < DISTRICT_RULES.INFLUENCE_COST ? html`<p className="district-warning">Energy ไม่พอสำหรับเพิ่ม Influence</p>` : null}
      ` : html`
        <div className=${`district-feedback ${feedback.ownerChanged ? "captured" : ""}`}>
          <strong>${feedback.message}</strong>
          <span>${feedback.type === "SKIP" ? "เทิร์นดำเนินต่อโดยไม่มีการเปลี่ยนแปลง" : `คงเหลือ ${feedback.energy} EN`}</span>
        </div>
        ${currentTurn === "player" && feedback.type !== "TIMEOUT" ? html`<button type="button" className="event-continue" onClick=${onContinue}>ยืนยันและจบการจัดการเขต</button>` : html`<div className="event-loading">กำลังบันทึกผลและจบเทิร์น…</div>`}
      `}
    </section>
  `;
}
