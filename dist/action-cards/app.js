import { createRoot } from "react-dom/client";
import { html } from "../map-3d/runtime.js";
import { ACTION_CARD_PROTOTYPES, validateActionCardDefinition } from "./card-data.js";
import { ActionCard } from "./ActionCard.js";
import { CardCollection } from "./CardCollection.js";

const invalidCards = ACTION_CARD_PROTOTYPES.filter((card) => !validateActionCardDefinition(card).valid);
if (invalidCards.length) throw new Error(`Invalid prototype cards: ${invalidCards.map((card) => card.id).join(", ")}`);

function App() {
  const preview = ACTION_CARD_PROTOTYPES[0];
  return html`<main className="prototype-page">
    <header className="prototype-page-header"><a href="lobby.html">← กลับ Lobby</a><div><small>ACTION CARD SYSTEM · FOUNDATION</small><h1>Action Card Preview</h1><p>Component และข้อมูลตัวอย่างชั่วคราว — ยังไม่เชื่อม Scenario, Battle หรือ Inventory จริง</p></div><img src="assets/ai-district-logo.png" alt="Ai District" /></header>
    <nav className="prototype-main-links" aria-label="ทางลัดระบบ Action Card"><div><strong>พื้นที่นี้เป็น Prototype Sandbox</strong><span>การเลือก 5 ใบด้านล่างไม่บันทึกสิทธิ์หรือ Loadout ของบัญชี</span></div><a href="card-inventory.html">เปิดคลังถาวร</a><a className="primary" href="map-3d.html?mode=scenario-adventure">จัด Deck 5 ใบจริง</a></nav>
    <section className="prototype-state-showcase"><div><small>COMPONENT STATES</small><h2>สถานะสำหรับพัฒนา UI</h2></div><div className="prototype-state-grid"><${ActionCard} card=${preview} displayState="default" /><${ActionCard} card=${preview} displayState="selected" selected=${true} /><${ActionCard} card=${preview} displayState="disabled" disabled=${true} /></div></section>
    <${CardCollection} cards=${ACTION_CARD_PROTOTYPES} />
    <footer className="prototype-page-footer">ข้อมูลความสามารถทั้งหมดเป็น Placeholder และไม่มีการ Resolve Effect จริง</footer>
  </main>`;
}

createRoot(document.querySelector("#action-card-preview-root")).render(html`<${App} />`);

