import { html, React } from "./runtime.js";
import { ACTION_CARD_BY_ID, CARD_TYPES } from "./action-card-data.js";
import { ITEM_BY_ID } from "./item-data.js";
import { INVENTORY_RULES } from "./action-engine.js";

const { useEffect, useState } = React;
const TYPE_LABELS = { ATTACK: "โจมตี", DEFENSE: "ป้องกัน", CONTROL: "ควบคุม", SUPPORT: "สนับสนุน" };
const ICONS = { ATTACK: "⚡", DEFENSE: "◆", CONTROL: "⌁", SUPPORT: "✦", ITEM: "◇" };

function districtValid(targetType, district, actorId) {
  if (!district?.isBuilt) return false;
  if (targetType === "OWNED_DISTRICT") return district.ownerId === actorId;
  if (targetType === "OPPONENT_DISTRICT") return (district.influenceByPlayer[actorId === "player" ? "bot" : "player"] || 0) > 0;
  return true;
}

export function ActionInventoryPanel({ inventory, districts, effects, currentTurn, canUse, cardUsed, itemUsed, feedback, rewardNotification, onUse }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("cards");
  const [selected, setSelected] = useState(null);
  const [targetDistrictId, setTargetDistrictId] = useState(null);

  useEffect(() => {
    if (!canUse) {
      setSelected(null);
      setTargetDistrictId(null);
    }
  }, [canUse, currentTurn]);

  const selectedInstance = selected?.kind === "CARD"
    ? inventory.hand.find((item) => item.instanceId === selected.instanceId)
    : inventory.items.find((item) => item.instanceId === selected?.instanceId);
  const definition = selectedInstance
    ? (selected.kind === "CARD" ? ACTION_CARD_BY_ID[selectedInstance.cardId] : ITEM_BY_ID[selectedInstance.itemId])
    : null;
  const needsTarget = definition && definition.targetType !== "SELF";
  const confirmDisabled = !canUse || !definition || (selected.kind === "CARD" ? cardUsed : itemUsed) || (needsTarget && !targetDistrictId);
  const playerEffects = effects.filter((effect) => effect.targetPlayerId === "player");

  function pick(kind, instanceId) {
    setSelected({ kind, instanceId });
    setTargetDistrictId(null);
  }

  function confirm() {
    if (confirmDisabled) return;
    onUse(selected.kind, selected.instanceId, targetDistrictId);
    setSelected(null);
    setTargetDistrictId(null);
  }

  return html`
    <section className=${`utility-dock ${open ? "open" : ""}`} aria-label="การ์ดและไอเทม">
      <div className="utility-tabs">
        <button type="button" className=${tab === "cards" ? "active" : ""} onClick=${()=>{setTab("cards");setOpen(true)}}><span>✦</span> การ์ด ${inventory.hand.length}/${INVENTORY_RULES.MAX_HAND}</button>
        <button type="button" className=${tab === "items" ? "active" : ""} onClick=${()=>{setTab("items");setOpen(true)}}><span>◇</span> ไอเทม ${inventory.items.length}/${INVENTORY_RULES.MAX_ITEMS}</button>
        <button type="button" className="utility-toggle" onClick=${()=>setOpen((value)=>!value)} aria-label=${open ? "ปิดแผง" : "เปิดแผง"}>${open ? "×" : "⌃"}</button>
      </div>
      ${open ? html`
        <div className="utility-body">
          <div className="utility-list">
            ${tab === "cards" ? inventory.hand.map((instance)=>{
              const card = ACTION_CARD_BY_ID[instance.cardId];
              return html`<button key=${instance.instanceId} type="button" className=${`utility-card ${selected?.instanceId === instance.instanceId ? "selected" : ""} ${card.type.toLowerCase()}`} disabled=${cardUsed || currentTurn !== "player"} onClick=${()=>pick("CARD",instance.instanceId)}><i>${ICONS[card.type]}</i><span><b>${card.name}</b><small>${TYPE_LABELS[card.type]} · ${card.cost} EN</small></span></button>`;
            }) : inventory.items.map((instance)=>{
              const item = ITEM_BY_ID[instance.itemId];
              return html`<button key=${instance.instanceId} type="button" className=${`utility-card item ${selected?.instanceId === instance.instanceId ? "selected" : ""}`} disabled=${itemUsed || currentTurn !== "player"} onClick=${()=>pick("ITEM",instance.instanceId)}><i>${ICONS.ITEM}</i><span><b>${item.name}</b><small>Consumable</small></span></button>`;
            })}
            ${tab === "cards" && !inventory.hand.length ? html`<p className="utility-empty">ไม่มีการ์ดในมือ · Discard ${inventory.discard.length}</p>` : null}
            ${tab === "items" && !inventory.items.length ? html`<p className="utility-empty">ไม่มีไอเทม</p>` : null}
          </div>
          <div className="utility-preview">
            ${definition ? html`
              <div className=${`preview-icon ${selected.kind.toLowerCase()}`}>${selected.kind === "CARD" ? ICONS[definition.type] : ICONS.ITEM}</div>
              <div><p>${selected.kind === "CARD" ? `${TYPE_LABELS[definition.type]} · ${definition.cost} EN` : "CONSUMABLE ITEM"}</p><h3>${definition.name}</h3><span>${definition.description}</span></div>
              ${needsTarget ? html`<div className="target-grid"><small>เลือก District เป้าหมาย</small>${Object.values(districts).map((district)=>html`<button key=${district.districtId} type="button" className=${targetDistrictId === district.districtId ? "selected" : ""} disabled=${!districtValid(definition.targetType,district,"player")} onClick=${()=>setTargetDistrictId(district.districtId)}>${district.districtName}<b>${district.influenceByPlayer.player}/${district.influenceByPlayer.bot} IP</b></button>`)}</div>` : null}
              <button type="button" className="utility-confirm" disabled=${confirmDisabled} onClick=${confirm}>ยืนยันการใช้</button>
            ` : html`<div className="preview-placeholder"><strong>เลือก${tab === "cards" ? "การ์ด" : "ไอเทม"}</strong><span>ดูรายละเอียด เลือกเป้าหมาย และยืนยันการใช้งาน</span></div>`}
          </div>
        </div>
      ` : null}
      <div className="utility-status">
        <span className=${cardUsed ? "used" : ""}>Card Action ${cardUsed ? "ใช้แล้ว" : "พร้อม"}</span>
        <span className=${itemUsed ? "used" : ""}>Item Action ${itemUsed ? "ใช้แล้ว" : "พร้อม"}</span>
        ${playerEffects.map((effect)=>html`<b key=${effect.effectId}>${effect.effectType.replaceAll("_"," ")}</b>`)}
      </div>
      ${feedback ? html`<div className=${`utility-feedback ${feedback.success ? "success" : "error"}`}>${feedback.message}${feedback.scan ? ` · PLAYER ${feedback.scan.influenceByPlayer.player} / BOT ${feedback.scan.influenceByPlayer.bot} IP` : ""}</div>` : null}
      ${rewardNotification ? html`<div className=${`reward-notification ${rewardNotification.success ? "success" : "full"}`}><b>${rewardNotification.success ? "ได้รับรางวัล" : "รางวัลยังไม่ถูกเพิ่ม"}</b><span>${rewardNotification.message}</span></div>` : null}
    </section>
  `;
}

