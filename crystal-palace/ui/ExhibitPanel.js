import { useEffect, useRef, useState } from "react";
import { html, React } from "../../map-3d/runtime.js";
import { ZONE_BY_ID } from "../config/palace-layout.js";
import { CARD_TYPE_ART, LESSON_STATUS } from "../data/palace-state.js";
import { palaceLessonHref } from "../return-param.js";

// Read-only view of server state. Nothing here records progress, stamps a passport or unlocks a card:
// the only action is a link into the existing lesson flow.
const STATUS_META = Object.freeze({
  [LESSON_STATUS.LOCKED]: { label: "ยังไม่เปิด", icon: "🔒" },
  [LESSON_STATUS.AVAILABLE]: { label: "เรียนได้", icon: "○" },
  progress: { label: "กำลังเรียน", icon: "↻" },
  [LESSON_STATUS.COMPLETED]: { label: "เรียนจบแล้ว", icon: "✓" },
});

function DataNotice({ palace }) {
  if (palace.status === "loading" && !palace.data) return html`<p class="cp-data-note" role="status">กำลังโหลดความก้าวหน้าของคุณ…</p>`;
  if (palace.status === "error") return html`<div class="cp-data-note is-error" role="alert">
    <span>โหลดความก้าวหน้าไม่สำเร็จ${palace.data ? " (แสดงข้อมูลล่าสุดที่โหลดได้)" : ""}</span>
    <button type="button" class="cp-btn cp-btn-soft" onClick=${palace.retry}>ลองอีกครั้ง</button>
  </div>`;
  return null;
}

function LessonBlock({ exhibit, state, palace, onLeave }) {
  if (!state) return html`<${DataNotice} palace=${palace} />`;
  const meta = state.status === LESSON_STATUS.AVAILABLE && state.inProgress ? STATUS_META.progress : STATUS_META[state.status];
  const href = state.lesson ? palaceLessonHref(state.lesson.code) : null;
  const cta = state.status === LESSON_STATUS.COMPLETED ? "ทบทวนบทเรียน" : state.inProgress ? "เรียนต่อ" : "เริ่มบทเรียน";
  return html`<div class=${`cp-lesson-state is-${state.inProgress && state.status === LESSON_STATUS.AVAILABLE ? "progress" : state.status}`}>
      <div class="cp-lesson-row"><span class="cp-status-chip">${meta.icon} ${meta.label}</span><code>${exhibit.lessonCode}</code></div>
      ${state.lesson && html`<b>${state.lesson.title}</b>`}
      ${state.status === LESSON_STATUS.LOCKED && html`<small>บทเรียนนี้ยังไม่เปิดในระบบ</small>`}
      ${state.reward && html`<div class=${`cp-reward ${state.reward.unlocked ? "is-unlocked" : ""}`}>
        <span class="cp-reward-icon" aria-hidden="true">${CARD_TYPE_ART[state.reward.type]?.icon || "🃏"}</span>
        <span><small>${state.reward.unlocked ? "ได้รับการ์ดแล้ว" : `การ์ดรางวัล · ผ่าน Quiz ≥ ${state.reward.minimumScore}`}</small><b>${state.reward.name}</b></span>
      </div>`}
      ${state.status !== LESSON_STATUS.LOCKED && href && html`<button type="button" class="cp-btn cp-btn-gold" onClick=${() => onLeave(exhibit, href)}>${cta} →</button>`}
    </div>
    <${DataNotice} palace=${palace} />`;
}

function CardFrame({ card }) {
  const [failed, setFailed] = useState(false);
  const type = CARD_TYPE_ART[card.type];
  return html`<li class=${`cp-card ${card.unlocked ? "is-unlocked" : "is-locked"}`} style=${{ "--type": type?.color || "#b9a98a" }}>
    <span class="cp-card-art">
      ${card.unlocked && card.art && !failed
        ? html`<img src=${card.art} alt="" loading="lazy" onError=${() => setFailed(true)} />`
        : html`<i aria-hidden="true">${card.unlocked ? type?.icon || "🃏" : "?"}</i>`}
    </span>
    <b>${card.unlocked ? card.name : "การ์ดปริศนา"}</b>
    <small>${card.unlocked ? type?.label || "การ์ด" : card.hint ? `ผ่าน Quiz "${card.hint.lessonTitle}" (≥ ${card.hint.minimumScore})${card.hint.more > 0 ? ` หรืออีก ${card.hint.more} บทเรียน` : ""}` : "ยังไม่ได้รับ"}</small>
  </li>`;
}

function ArchiveBlock({ archive, palace }) {
  if (!archive) return html`<${DataNotice} palace=${palace} />`;
  const owned = archive.filter((card) => card.unlocked).length;
  return html`<${React.Fragment}>
    <p class="cp-count">ได้รับแล้ว <b>${owned}</b> / ${archive.length} ใบ</p>
    ${archive.length ? html`<ul class="cp-card-wall">${archive.map((card) => html`<${CardFrame} key=${card.cardId} card=${card} />`)}</ul>` : html`<p class="cp-data-note">ยังไม่มีการ์ดรางวัลในระบบ</p>`}
    <${DataNotice} palace=${palace} />
  </${React.Fragment}>`;
}

function PassportBlock({ passport, palace }) {
  if (!passport) return html`<${DataNotice} palace=${palace} />`;
  const stamped = new Map(passport.stamps.map((stamp) => [stamp.code, stamp]));
  return html`<${React.Fragment}>
    <p class="cp-count">ตราประทับ <b>${passport.stamps.length}</b> / ${passport.total}</p>
    <ul class="cp-stamps">${passport.codes.map((code) => {
      const stamp = stamped.get(code);
      return html`<li key=${code} class=${stamp ? `is-stamped ${stamp.category}` : ""} title=${stamp ? stamp.title : code}>
        <span aria-hidden="true">${stamp ? (stamp.category === "impact" ? "🌏" : "⚖️") : "·"}</span>
        <small>${stamp ? stamp.title : "ยังไม่ประทับ"}</small>
      </li>`;
    })}</ul>
    ${passport.stamps.length === 0 && html`<p class="cp-data-note">เรียนบทเรียนในหอจริยธรรมหรือศาลาผลกระทบให้จบ แล้วตราประทับจะปรากฏที่นี่</p>`}
    <${DataNotice} palace=${palace} />
  </${React.Fragment}>`;
}

export function ExhibitPanel({ exhibit, onClose, palace = { status: "idle" }, lessonState = null, archive = null, passport = null, onLeave }) {
  const closeRef = useRef();
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, [exhibit?.id]);
  if (!exhibit) return null;
  const zone = ZONE_BY_ID[exhibit.zone];
  return html`<aside class="cp-panel" role="dialog" aria-modal="false" aria-labelledby="cp-panel-title" style=${{ "--zone": zone?.color }}>
    <div class="cp-panel-head">
      <span class="cp-panel-zone">${zone?.nameTh}</span>
      <button ref=${closeRef} type="button" class="cp-panel-close" onClick=${onClose} aria-label="ปิดและกลับไปเดินต่อ">×</button>
    </div>
    <h2 id="cp-panel-title">${exhibit.title}</h2>
    <p>${exhibit.summary}</p>
    ${exhibit.points.length > 0 && html`<ul>${exhibit.points.map((point) => html`<li key=${point}>${point}</li>`)}</ul>`}
    ${exhibit.lessonCode && html`<${LessonBlock} exhibit=${exhibit} state=${lessonState} palace=${palace} onLeave=${onLeave} />`}
    ${exhibit.panel === "archive" && html`<${ArchiveBlock} archive=${archive} palace=${palace} />`}
    ${exhibit.panel === "passport" && html`<${PassportBlock} passport=${passport} palace=${palace} />`}
    <div class="cp-panel-actions">
      ${exhibit.link && html`<a class="cp-btn cp-btn-soft" href=${exhibit.link.href}>${exhibit.link.label}</a>`}
      <button type="button" class="cp-btn cp-btn-leaf" onClick=${onClose}>เดินต่อ</button>
    </div>
  </aside>`;
}
