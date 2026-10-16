// Center-screen "card table" for ACTION turns: the scenario on top and the hand fanned like a card game.
// Presentation only — selection and confirmation call the same handlers the turn popup used.
import { html } from "../map-3d/runtime.js";
import { ACTION_CARD_BY_ID } from "../map-3d/action-card-data.js";
import { ACTION_CARD_PROTOTYPES } from "../action-cards/card-data.js";
import { PROTOTYPE_TO_INVENTORY_CARD_ID } from "../action-cards/card-catalog.js";
import { cardResponseMetadata } from "./card-response-config.js";

const TYPE_META = Object.freeze({
  ATTACK: { label: "โจมตี", icon: "⚡" },
  DEFENSE: { label: "ป้องกัน", icon: "🛡️" },
  CONTROL: { label: "ควบคุม", icon: "🧭" },
  SUPPORT: { label: "สนับสนุน", icon: "✚" },
});
const ARTWORK_BY_CARD_ID = Object.freeze(Object.fromEntries(ACTION_CARD_PROTOTYPES
  .filter((prototype) => PROTOTYPE_TO_INVENTORY_CARD_ID[prototype.id] && prototype.artwork?.src)
  .map((prototype) => [PROTOTYPE_TO_INVENTORY_CARD_ID[prototype.id], prototype.artwork.src])));
const thumb = (src) => (src && src.startsWith("assets/") ? `assets/thumbs/${src.slice("assets/".length)}` : src);

function HandCard({ instance, index, count, selected, disabled, onSelect }) {
  const card = ACTION_CARD_BY_ID[instance.cardId] || { name: instance.cardId, type: "SUPPORT", cost: 0 };
  const meta = TYPE_META[card.type] || TYPE_META.SUPPORT;
  const art = thumb(ARTWORK_BY_CARD_ID[instance.cardId]);
  return html`<button type="button" className=${`ct-card type-${String(card.type).toLowerCase()} ${selected ? "is-selected" : ""}`} style=${{ "--i": index, "--n": count }} aria-pressed=${selected} disabled=${disabled} onClick=${onSelect}>
    <span className="ct-card-cost" aria-label=${`ใช้ ${card.cost ?? 0} EN`}>${card.cost ?? 0}</span>
    <span className="ct-card-art">${art ? html`<img src=${art} alt="" />` : html`<i aria-hidden="true">${meta.icon}</i>`}</span>
    <span className="ct-card-type">${meta.icon} ${meta.label}</span>
    <b className="ct-card-name">${card.name}</b>
    <small className="ct-card-text">${cardResponseMetadata(instance.cardId).summary}</small>
  </button>`;
}

export function CardTable({ scenario, deck, selected, compatibility, canRespond, onSelect, onConfirm, onHide, effectLabel }) {
  const hand = deck?.hand || [];
  const count = hand.length + 1;
  const ready = canRespond && selected && (selected === "BASIC" || compatibility?.usable);
  const hint = selected === "BASIC"
    ? scenario.basicResponse.explanation
    : compatibility ? `${effectLabel(compatibility.compatibility)} · ${compatibility.reason}` : "แตะไพ่เพื่อเลือก หรือใช้คำตอบพื้นฐานได้เสมอ";
  return html`<section className="ct-table" aria-label="เลือกการ์ดตอบสถานการณ์">
    <article className="ct-scenario">
      <span className="ct-scenario-tag">${scenario.category}${scenario.status === "DEMO_DRAFT" ? " · DEMO DRAFT" : ""}</span>
      <h2>${scenario.title}</h2>
      <p>${scenario.description}</p>
      <button type="button" className="ct-hide" onClick=${onHide}>ดูกระดาน ▾</button>
    </article>
    <div className="ct-hand" style=${{ "--n": count }}>
      ${hand.map((instance, index) => html`<${HandCard} key=${instance.instanceId} instance=${instance} index=${index} count=${count} selected=${selected === instance.instanceId} disabled=${!canRespond} onSelect=${() => onSelect(instance.instanceId)} />`)}
      <button type="button" className=${`ct-card ct-basic ${selected === "BASIC" ? "is-selected" : ""}`} style=${{ "--i": hand.length, "--n": count }} aria-pressed=${selected === "BASIC"} disabled=${!canRespond} onClick=${() => onSelect("BASIC")}>
        <span className="ct-card-art"><i aria-hidden="true">💬</i></span>
        <span className="ct-card-type">ไม่ใช้การ์ด</span>
        <b className="ct-card-name">ตอบแบบพื้นฐาน</b>
        <small className="ct-card-text">${scenario.basicResponse.label}</small>
      </button>
    </div>
    <div className="ct-actions">
      <p className="ct-hint" aria-live="polite">${hint}</p>
      <span className="ct-deck">มือ ${hand.length} · จั่ว ${deck?.drawPile?.length ?? 0} · ทิ้ง ${deck?.discard?.length ?? 0}</span>
      <button type="button" className="ct-confirm" disabled=${!ready} onClick=${onConfirm}>ยืนยันคำตอบ →</button>
    </div>
  </section>`;
}
