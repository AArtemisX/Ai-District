import React from "react";
import { html } from "./runtime.js";

export function ScenarioModal({ session, feedback, seconds, gamePhase, onChoose, onContinue }) {
  if (!session) return null;
  const { scenario, actor } = session;
  const choosing = gamePhase === "ACTION_PHASE" && !feedback;
  const isBot = actor === "bot";
  return html`
    <section className="scenario-modal" role="dialog" aria-modal="false" aria-labelledby="scenario-title">
      <div className="scenario-heading">
        <div><p className="map-kicker">AI SCENARIO · ${scenario.topic}</p><span>${scenario.difficulty}</span></div>
        <div className=${`scenario-clock ${seconds <= 10 ? "urgent" : ""}`}><strong>${seconds}</strong><small>วินาที</small></div>
      </div>
      <h2 id="scenario-title">${scenario.title}</h2>
      <p className="scenario-description">${scenario.description}</p>
      ${!feedback ? html`
        <div className="scenario-choices">
          ${scenario.choices.map((item, index) => html`
            <button key=${item.id} type="button" disabled=${!choosing || isBot} onClick=${() => onChoose(item.id)}>
              <b>${index + 1}</b><span>${item.label}</span>
            </button>
          `)}
        </div>
        ${isBot ? html`<div className="event-loading">บอทกำลังประเมินผลกระทบและตัดสินใจ…</div>` : null}
        ${gamePhase === "TILE_EVENT" ? html`<div className="event-loading">กำลังโหลดสถานการณ์…</div>` : null}
      ` : html`
        <div className=${`scenario-feedback ${feedback.status === "TIMEOUT" ? "timeout" : feedback.quality.toLowerCase()}`}>
          <div className="dp-award"><span>${feedback.status === "TIMEOUT" ? "TIMEOUT" : feedback.quality}</span><strong>+${feedback.decisionPoints} DP</strong></div>
          <h3>${feedback.impact}</h3>
          <p>${feedback.explanation}</p>
          <div className="learning-note"><b>สิ่งที่เรียนรู้</b><span>${feedback.learningSummary}</span></div>
          <div className="future-effects"><span>เตรียมไว้สำหรับ Phase 4</span><b>Insight ${feedback.futureEffects.resources.insight >= 0 ? "+" : ""}${feedback.futureEffects.resources.insight}</b><b>Trust ${feedback.futureEffects.resources.trust >= 0 ? "+" : ""}${feedback.futureEffects.resources.trust}</b><b>สิทธิ์สร้าง +${feedback.futureEffects.buildRights}</b></div>
        </div>
        ${actor === "player" && feedback.status !== "TIMEOUT" ? html`<button type="button" className="event-continue" onClick=${onContinue}>รับผลลัพธ์และจบ Action</button>` : html`<div className="event-loading">กำลังบันทึกผลและจบเทิร์น…</div>`}
      `}
    </section>
  `;
}
