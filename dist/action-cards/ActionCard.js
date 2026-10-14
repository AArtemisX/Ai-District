import { html, React } from "../map-3d/runtime.js";

const { useEffect, useState } = React;

const TYPE_META = Object.freeze({
  DEFENSE: { label: "Defense", icon: "◆" }, ATTACK: { label: "Attack", icon: "⚡" }, SUPPORT: { label: "Support", icon: "✦" }, STRATEGY: { label: "Strategy", icon: "⌁" }, SPECIAL: { label: "Special", icon: "★" },
});

export function ActionCard({ card, selected = false, disabled = false, displayState = null, onToggle = null }) {
  const [artworkFailed, setArtworkFailed] = useState(false);
  const state = displayState || (disabled || card.status !== "ACTIVE" ? "disabled" : selected ? "selected" : "default");
  const meta = TYPE_META[card.type];
  const showArtwork = Boolean(card.artwork.src) && !artworkFailed;
  useEffect(() => setArtworkFailed(false), [card.artwork.src]);
  const handleToggle = () => { if (state !== "disabled") onToggle?.(card.id); };
  return html`<article className=${`prototype-action-card type-${card.type.toLowerCase()} rarity-${card.rarity.toLowerCase()} state-${state}`} aria-disabled=${state === "disabled"} aria-selected=${selected}>
    <button type="button" className="prototype-card-hitarea" disabled=${state === "disabled"} onClick=${handleToggle} aria-label=${`${selected ? "นำ" : "เพิ่ม"} ${card.name} ${selected ? "ออกจาก" : "เข้า"}ชุด`}>
      <div className="prototype-card-frame">
        <header><span className="prototype-type-icon" aria-hidden="true">${meta.icon}</span><div><small>${meta.label}</small><strong>${card.name}</strong></div><em>${card.rarity}</em></header>
        <div className="prototype-card-art">
          ${showArtwork ? html`<img src=${card.artwork.src} alt=${card.artwork.alt} width="1122" height="1402" loading="lazy" decoding="async" onError=${() => setArtworkFailed(true)} />` : html`<div className="prototype-art-placeholder" role="img" aria-label=${`${card.artwork.alt} — ไม่สามารถโหลดภาพได้`}><i>${meta.icon}</i><span>AI DISTRICT</span><small>ARTWORK UNAVAILABLE</small></div>`}
          <span className="prototype-status-chip">${state === "disabled" ? "DISABLED" : selected ? "SELECTED" : card.type}</span>
        </div>
        <section><p>${card.description}</p><dl><div><dt>เป้าหมาย</dt><dd title=${card.target.rule}>${card.target.rule}</dd></div><div><dt>จังหวะใช้</dt><dd>${card.activationCondition.timing}</dd></div><div><dt>จำกัด</dt><dd>${card.usageLimit.perTurn}/เทิร์น</dd></div></dl></section>
        <footer><span>${card.isPrototype ? "PROTOTYPE DATA" : "ACTION CARD"}</span><b>${selected ? "เลือกแล้ว ✓" : state === "disabled" ? "ยังไม่พร้อมใช้" : "เลือกการ์ด"}</b></footer>
      </div>
    </button>
  </article>`;
}

