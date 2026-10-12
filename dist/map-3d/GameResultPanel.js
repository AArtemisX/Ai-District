import React from "react";
import { html } from "./runtime.js";

const OUTCOME_COPY = Object.freeze({
  WIN: { badge: "VICTORY", title: "คุณชนะการแข่งขัน!", icon: "★" },
  LOSE: { badge: "MATCH COMPLETE", title: "บอทเป็นผู้ชนะ", icon: "◆" },
  DRAW: { badge: "DRAW", title: "ผลการแข่งขันเสมอ", icon: "◇" },
});

function ScoreBreakdown({ label, score, tone }) {
  return html`
    <article className=${`result-score-card ${tone}`}>
      <div className="result-score-title"><span>${label}</span><strong>${score.total}</strong></div>
      <dl>
        <div><dt>เขตที่ครอบครอง</dt><dd>${score.districtCount} × 10</dd><b>${score.districtScore}</b></div>
        <div><dt>Influence รวม</dt><dd>${score.totalInfluence} IP</dd><b>${score.totalInfluence}</b></div>
        <div><dt>คะแนนการตัดสินใจ</dt><dd>${score.decisionPoints} × 2</dd><b>${score.decisionScore}</b></div>
        <div><dt>พลังงานคงเหลือ</dt><dd>${score.remainingEnergy} EN</dd><b>${score.remainingEnergy}</b></div>
      </dl>
    </article>
  `;
}

export function GameResultPanel({ result, saveStatus, onReplay, onLobby }) {
  if (!result) return null;
  const copy = OUTCOME_COPY[result.outcome];
  const learning = result.learningSummary;
  return html`
    <div className="game-result-backdrop">
      <section className=${`game-result-panel ${result.outcome.toLowerCase()}`} role="dialog" aria-modal="true" aria-labelledby="game-result-title">
        <header className="result-hero">
          <div className="result-emblem" aria-hidden="true">${copy.icon}</div>
          <div><p>${copy.badge}</p><h2 id="game-result-title">${copy.title}</h2><span>${result.endReason === "SURRENDER" ? "จบเกมจากการยอมแพ้" : `แข่งขันครบ ${result.totalRounds} รอบ`}</span></div>
        </header>

        <div className="result-score-grid">
          <${ScoreBreakdown} label="ผู้เล่น" score=${result.playerScore} tone="player" />
          <${ScoreBreakdown} label="บอท" score=${result.botScore} tone="bot" />
        </div>

        <section className="learning-summary">
          <div className="learning-heading"><div><p>LEARNING SUMMARY</p><h3>สรุปผลการเรียนรู้</h3></div><span>คะแนนการเรียนรู้แยกจากคะแนนแข่งขัน</span></div>
          ${!learning.hasData ? html`<div className="learning-empty"><i aria-hidden="true">◎</i><strong>${learning.message}</strong><span>ลองเล่นและตอบสถานการณ์ AI เพื่อรับคำแนะนำ</span></div>` : html`
            <div className="learning-metrics">
              <span><b>${learning.encountered}</b>สถานการณ์ที่พบ</span>
              <span><b>${learning.performedWell}</b>ทำได้ดี</span>
              <span><b>${learning.decisionPointsEarned}</b>DP ที่ได้รับ</span>
            </div>
            <div className="learning-topics">
              <div><b>หัวข้อที่ทำได้ดี</b><span>${learning.strongTopics.length ? learning.strongTopics.join(" · ") : "ยังไม่มีหัวข้อเด่น"}</span></div>
              <div className="review"><b>หัวข้อที่ควรทบทวน</b><span>${learning.reviewTopics.length ? learning.reviewTopics.join(" · ") : "ทำได้ดีในทุกหัวข้อที่พบ"}</span></div>
            </div>
          `}
        </section>

        <footer className="result-footer">
          <p className=${`result-save-status ${saveStatus?.status === "SAVED" ? "saved" : "local"}`} aria-live="polite"><i></i>${saveStatus?.message || "กำลังบันทึกผล…"}</p>
          <div><button type="button" className="result-lobby" onClick=${onLobby}>กลับ Lobby</button><button type="button" className="result-replay" onClick=${onReplay}>เล่นอีกครั้ง <span aria-hidden="true">↻</span></button></div>
        </footer>
      </section>
    </div>
  `;
}
