import { html, React } from "../map-3d/runtime.js";
import { ActionCard } from "./ActionCard.js";
import { PREVIEW_DECK_LIMIT, togglePreviewDeck, validatePreviewDeck } from "./collection-engine.js";

const { useMemo, useState } = React;
const FILTERS = Object.freeze(["ALL", "DEFENSE", "ATTACK", "SUPPORT", "STRATEGY", "SPECIAL"]);

export function CardCollection({ cards }) {
  const [filter, setFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [message, setMessage] = useState("เลือกการ์ดได้ไม่เกิน 5 ใบ ระบบนี้ยังไม่บันทึกเข้าแมตช์จริง");
  const visible = useMemo(() => filter === "ALL" ? cards : cards.filter((card) => card.type === filter), [cards, filter]);
  const selectedCard = cards.find((card) => card.id === selectedCardId) || null;
  const validation = validatePreviewDeck(selectedIds, cards);
  const toggle = (cardId) => {
    const card = cards.find((entry) => entry.id === cardId);
    const result = togglePreviewDeck(selectedIds, cardId, { disabled: card?.status !== "ACTIVE" });
    setSelectedIds(result.selectedIds);
    if (result.reason === "ADDED") setSelectedCardId(cardId);
    if (result.reason === "REMOVED" && selectedCardId === cardId) setSelectedCardId(result.selectedIds.at(-1) || null);
    setMessage(result.reason === "DECK_FULL" ? "ชุดทดลองเต็ม 5 ใบแล้ว กรุณานำการ์ดออกก่อน" : result.reason === "CARD_DISABLED" ? "การ์ดใบนี้ปิดใช้งานอยู่" : result.reason === "REMOVED" ? "นำการ์ดออกจากชุดทดลองแล้ว" : "เพิ่มการ์ดเข้าชุดทดลองแล้ว");
  };
  return html`<section className="prototype-collection">
    <div className="prototype-toolbar"><div><small>CARD COLLECTION</small><h2>คลังการ์ดต้นแบบ</h2><p>${message}</p></div><div className="prototype-count"><strong>${selectedIds.length}</strong><span>/ ${PREVIEW_DECK_LIMIT} ใบ</span></div></div>
    <nav className="prototype-filters" aria-label="กรองประเภทการ์ด">${FILTERS.map((type) => html`<button type="button" className=${filter === type ? "active" : ""} aria-pressed=${filter === type} onClick=${() => setFilter(type)}>${type}</button>`)}</nav>
    <div className="prototype-selected-strip" aria-live="polite"><strong>ชุดทดลอง</strong>${selectedIds.length ? selectedIds.map((id) => { const card = cards.find((entry) => entry.id === id); return html`<button type="button" onClick=${() => toggle(id)}>${card.name}<span>×</span></button>`; }) : html`<span>ยังไม่ได้เลือกการ์ด</span>`}<em>${validation.valid ? "ข้อมูลชุดถูกต้อง" : validation.errors.join(", ")}</em></div>
    <aside className=${`prototype-detail-panel ${selectedCard ? `type-${selectedCard.type.toLowerCase()}` : "is-empty"}`} aria-live="polite">
      ${selectedCard ? html`<div className="prototype-detail-icon" aria-hidden="true">✦</div><div><small>SELECTED CARD DETAILS · PROTOTYPE</small><h3>${selectedCard.name}</h3><p>${selectedCard.description}</p><dl><div><dt>ประเภท / ความหายาก</dt><dd>${selectedCard.type} · ${selectedCard.rarity}</dd></div><div><dt>เป้าหมายต้นแบบ</dt><dd>${selectedCard.target.rule}</dd></div><div><dt>เงื่อนไข</dt><dd>${selectedCard.activationCondition.requirement}</dd></div><div><dt>Effect Status</dt><dd>${selectedCard.effect.note}</dd></div></dl></div>` : html`<div className="prototype-detail-icon" aria-hidden="true">◇</div><div><small>SELECTED CARD DETAILS</small><h3>เลือกการ์ดเพื่อดูรายละเอียด</h3><p>รายละเอียดทั้งหมดอ่านจาก Card Data โดยตรง และยังไม่มีผลกับแมตช์จริง</p></div>`}
    </aside>
    <div className="prototype-card-grid">${visible.map((card) => html`<${ActionCard} key=${card.id} card=${card} selected=${selectedIds.includes(card.id)} disabled=${card.status !== "ACTIVE"} onToggle=${toggle} />`)}</div>
  </section>`;
}

