import { createRoot } from "react-dom/client";
import { html, React } from "../map-3d/runtime.js";
import { ACTION_CARD_PROTOTYPES, validateActionCardDefinition } from "./card-data.js";

const { useEffect, useMemo, useRef, useState } = React;

const invalidCards = ACTION_CARD_PROTOTYPES.filter((card) => !validateActionCardDefinition(card).valid);
if (invalidCards.length) throw new Error(`Invalid prototype cards: ${invalidCards.map((card) => card.id).join(", ")}`);

// Card album: read-only browsing of the card data (Prototype Sandbox — no selection, no saving).
const TYPE_META = Object.freeze({
  DEFENSE: { label: "ป้องกัน", icon: "🛡️" },
  ATTACK: { label: "โจมตี", icon: "⚡" },
  SUPPORT: { label: "สนับสนุน", icon: "✚" },
  STRATEGY: { label: "กลยุทธ์", icon: "🧭" },
  SPECIAL: { label: "พิเศษ", icon: "★" },
});
const RARITY_META = Object.freeze({ COMMON: { label: "Common", stars: 1 }, RARE: { label: "Rare", stars: 2 }, EPIC: { label: "Epic", stars: 3 }, LEGENDARY: { label: "Legendary", stars: 4 } });
const FILTERS = Object.freeze(["ALL", ...Object.keys(TYPE_META)]);
const TIMING_LABELS = Object.freeze({ UNDEFINED: "ยังไม่กำหนด" });
const thumb = (src) => (src && src.startsWith("assets/") ? `assets/thumbs/${src.slice("assets/".length)}` : src);

function Stars({ rarity }) {
  const meta = RARITY_META[rarity] || RARITY_META.COMMON;
  return html`<span className="album-stars" aria-label=${`ความหายาก ${meta.label}`}>${"★".repeat(meta.stars)}<i>${"★".repeat(4 - meta.stars)}</i></span>`;
}

function CardArt({ card, full = false }) {
  const [stage, setStage] = useState(0); // 0: thumbnail (grid) · 1: original artwork · 2: type illustration
  const original = card.artwork.src;
  const src = stage === 0 && !full ? thumb(original) : original;
  useEffect(() => setStage(0), [original]);
  if (!original || stage === 2) return html`<div className="album-art-fallback" aria-hidden="true"><i>${TYPE_META[card.type]?.icon || "🃏"}</i></div>`;
  return html`<img src=${src} alt=${full ? card.artwork.alt : ""} loading=${full ? "eager" : "lazy"} decoding="async" onError=${() => setStage(stage === 0 && !full ? 1 : 2)} />`;
}

function AlbumCard({ card, index, onOpen }) {
  const meta = TYPE_META[card.type];
  return html`<button type="button" className=${`album-card type-${card.type.toLowerCase()} rarity-${card.rarity.toLowerCase()}`} style=${{ "--i": index }} onClick=${() => onOpen(card.id)} aria-label=${`เปิดดู ${card.name}`}>
    <span className="album-card-art"><${CardArt} card=${card} /><span className="album-type-chip">${meta.icon} ${meta.label}</span></span>
    <span className="album-card-body"><b>${card.name}</b><${Stars} rarity=${card.rarity} /></span>
  </button>`;
}

function CardBook({ cards, cardId, onClose, onStep }) {
  const dialog = useRef(null);
  const index = cards.findIndex((card) => card.id === cardId);
  const card = cards[index];
  useEffect(() => {
    const element = dialog.current;
    if (card && !element.open) element.showModal();
    if (!card && element.open) element.close();
  }, [card]);
  useEffect(() => {
    const onKey = (event) => {
      if (!card) return;
      if (event.key === "ArrowRight") onStep(1);
      if (event.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, onStep]);
  const meta = card ? TYPE_META[card.type] : null;
  return html`<dialog ref=${dialog} className="album-book" aria-label=${card ? `รายละเอียด ${card.name}` : "รายละเอียดการ์ด"} onCancel=${(event) => { event.preventDefault(); onClose(); }} onClick=${(event) => { if (event.target === dialog.current) onClose(); }}>
    ${card ? html`<div key=${card.id} className=${`album-spread type-${card.type.toLowerCase()}`}>
      <section className="album-page album-page-art">
        <${CardArt} card=${card} full=${true} />
        <span className="album-page-number">${index + 1} / ${cards.length}</span>
      </section>
      <section className="album-page album-page-info">
        <button type="button" className="album-close" aria-label="ปิดสมุด" onClick=${onClose}>×</button>
        <span className="album-type-chip">${meta.icon} ${meta.label}</span>
        <h2>${card.name}</h2>
        <${Stars} rarity=${card.rarity} />
        <p className="album-description">${card.description}</p>
        <dl>
          <div><dt>ใช้กับสถานการณ์</dt><dd>${card.target.rule}</dd></div>
          <div><dt>เงื่อนไขการใช้</dt><dd>${card.activationCondition.requirement}</dd></div>
          <div><dt>จังหวะใช้</dt><dd>${TIMING_LABELS[card.activationCondition.timing] || card.activationCondition.timing}</dd></div>
          <div><dt>จำกัดการใช้</dt><dd>${card.usageLimit.perTurn} ครั้ง / เทิร์น${card.usageLimit.perMatch ? ` · ${card.usageLimit.perMatch} ครั้ง / แมตช์` : ""}</dd></div>
          <div><dt>ความหายาก</dt><dd>${RARITY_META[card.rarity]?.label || card.rarity}</dd></div>
        </dl>
        <p className="album-note">📌 ${card.effect.note}</p>
        <nav className="album-flip" aria-label="เปลี่ยนหน้า">
          <button type="button" onClick=${() => onStep(-1)} aria-label="การ์ดก่อนหน้า">‹ ก่อนหน้า</button>
          <button type="button" onClick=${() => onStep(1)} aria-label="การ์ดถัดไป">ถัดไป ›</button>
        </nav>
      </section>
    </div>` : null}
  </dialog>`;
}

function App() {
  const cards = ACTION_CARD_PROTOTYPES;
  const [filter, setFilter] = useState("ALL");
  const [openId, setOpenId] = useState(null);
  const visible = useMemo(() => (filter === "ALL" ? cards : cards.filter((card) => card.type === filter)), [cards, filter]);
  const step = React.useCallback((direction) => {
    setOpenId((current) => {
      const index = visible.findIndex((card) => card.id === current);
      if (index < 0) return current;
      return visible[(index + direction + visible.length) % visible.length].id;
    });
  }, [visible]);
  return html`<main className="album-page-shell">
    <header className="album-header">
      <a className="album-back" href="lobby.html">← กลับ Lobby</a>
      <div className="album-title"><small>AI DISTRICT · CARD ALBUM</small><h1>สมุดภาพการ์ด</h1><p>เปิดดูการ์ดทุกใบ ภาพ ความหายาก และสถานการณ์ที่ใช้ได้</p></div>
      <a className="album-link" href="card-inventory.html">🗃️ คลังการ์ดของฉัน</a>
    </header>
    <p className="album-sandbox"><strong>Prototype Sandbox</strong> · หน้านี้ใช้ดูข้อมูลการ์ดอย่างเดียว ไม่บันทึกสิทธิ์หรือ Loadout ของบัญชี</p>
    <nav className="album-tabs" aria-label="กรองประเภทการ์ด">${FILTERS.map((type) => {
      const count = type === "ALL" ? cards.length : cards.filter((card) => card.type === type).length;
      return html`<button type="button" key=${type} className=${`tab-${type.toLowerCase()}`} aria-pressed=${filter === type} onClick=${() => setFilter(type)}>${type === "ALL" ? "ทั้งหมด" : `${TYPE_META[type].icon} ${TYPE_META[type].label}`}<b>${count}</b></button>`;
    })}</nav>
    <section className="album-shelf" aria-label="การ์ดในสมุดภาพ">${visible.map((card, index) => html`<${AlbumCard} key=${card.id} card=${card} index=${index} onOpen=${setOpenId} />`)}</section>
    <footer className="album-footer">ข้อมูลความสามารถเป็นข้อมูลต้นแบบ ยังไม่มีผลกับแมตช์จริง</footer>
    <${CardBook} cards=${visible} cardId=${openId} onClose=${() => setOpenId(null)} onStep=${step} />
  </main>`;
}

createRoot(document.querySelector("#action-card-preview-root")).render(html`<${App} />`);
