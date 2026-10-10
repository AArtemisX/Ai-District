import React, { Suspense, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { html } from "./map-3d/runtime.js";
import { BOARD_TILES, DISTRICTS, buildTilePath } from "./map-3d/board-data.js";
import { MapScene } from "./map-3d/MapScene.js";

const initialDistricts = Object.fromEntries(DISTRICTS.map((district) => [district.id, {
  status: "empty",
  owner: null,
  variant: DISTRICTS.findIndex((item) => item.id === district.id) % 3,
  modelUrl: null,
}]));

function App() {
  const [selectedTile, setSelectedTile] = useState(0);
  const [selectedDistrict, setSelectedDistrict] = useState("academy");
  const [districtStates, setDistrictStates] = useState(initialDistricts);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [botPosition, setBotPosition] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [currentTurn, setCurrentTurn] = useState("player");
  const [movement, setMovement] = useState(null);

  const selectedTileData = BOARD_TILES[selectedTile];
  const selectedDistrictData = DISTRICTS.find((district) => district.id === selectedDistrict);
  const builtCount = useMemo(() => Object.values(districtStates).filter((district) => district.status === "built").length, [districtStates]);

  function startMove(actor, steps) {
    if (isMoving) return;
    const from = actor === "player" ? playerPosition : botPosition;
    const path = buildTilePath(from, steps);
    setCurrentTurn(actor);
    setIsMoving(true);
    setMovement({ id: `${actor}-${performance.now()}`, actor, from, path });
  }

  function finishMove(actor, finalIndex) {
    if (actor === "player") setPlayerPosition(finalIndex);
    else setBotPosition(finalIndex);
    setSelectedTile(finalIndex);
    setMovement(null);
    setIsMoving(false);
    setCurrentTurn(actor === "player" ? "bot" : "player");
  }

  function toggleDistrict() {
    setDistrictStates((current) => {
      const state = current[selectedDistrict];
      return {
        ...current,
        [selectedDistrict]: state.status === "empty"
          ? { ...state, status: "built", owner: "player" }
          : { ...state, status: "empty", owner: null },
      };
    });
  }

  return html`
    <div className="map-app">
      <div className="map-canvas">
        <${Canvas}
          shadows
          dpr=${[1,1.5]}
          camera=${{ position: [18,18,18], fov: 38, near: .1, far: 80 }}
          gl=${{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        >
          <${Suspense} fallback=${null}>
            <${MapScene}
              selectedTile=${selectedTile}
              onSelectTile=${(tile) => setSelectedTile(tile.index)}
              districtStates=${districtStates}
              selectedDistrict=${selectedDistrict}
              onSelectDistrict=${setSelectedDistrict}
              playerPosition=${playerPosition}
              botPosition=${botPosition}
              movement=${movement}
              onMoveComplete=${finishMove}
            />
          </${Suspense}>
        </${Canvas}>
      </div>

      <header className="map-topbar">
        <a className="map-brand" href="lobby.html"><img src="assets/ai-district-logo.png" alt="Ai District" /><span>AI DISTRICT · 3D WORLD</span></a>
        <a className="map-back" href="ai-world.html">← กลับ AI World</a>
      </header>

      <aside className="map-panel">
        <p className="map-kicker">LOW POLY PROTOTYPE</p>
        <h1>นครลอยฟ้า AI</h1>
        <p>กระดาน 3D จริง ทุกช่องและอาคารเป็น Mesh แยกอิสระ พร้อมต่อยอดระบบ Turn-based</p>
        <div className="map-stats">
          <div className="map-stat"><span>ช่องที่เลือก</span><strong>${selectedTileData.index + 1} · ${selectedTileData.type}</strong></div>
          <div className="map-stat"><span>ตำแหน่งผู้เล่น / บอท</span><strong>${playerPosition + 1} / ${botPosition + 1}</strong></div>
          <div className="map-stat"><span>เทิร์นถัดไป</span><strong>${currentTurn === "player" ? "ผู้เล่น" : "บอท"}</strong></div>
          <div className="map-stat"><span>District</span><strong>${builtCount} / ${DISTRICTS.length} สร้างแล้ว</strong></div>
        </div>
        <div className="map-actions">
          <button type="button" disabled=${isMoving} onClick=${() => startMove("player", 1)}>ผู้เล่นเดิน +1</button>
          <button type="button" disabled=${isMoving} onClick=${() => startMove("bot", 1)}>บอทเดิน +1</button>
          <button type="button" disabled=${isMoving} onClick=${() => startMove("player", 3)}>ผู้เล่นเดิน +3</button>
          <button type="button" className="primary" disabled=${isMoving} onClick=${toggleDistrict}>
            ${districtStates[selectedDistrict].status === "empty" ? `สร้าง ${selectedDistrictData.name}` : `รื้อ ${selectedDistrictData.name}`}
          </button>
        </div>
        <p className="map-movement-status" aria-live="polite">${isMoving ? `${movement.actor === "player" ? "ผู้เล่น" : "บอท"} กำลังเดินทีละช่อง…` : "พร้อมเดิน"}</p>
        <div className="district-list">
          ${DISTRICTS.map((district)=>html`
            <button key=${district.id} type="button" className="district-row" onClick=${()=>setSelectedDistrict(district.id)} style=${{"--district-color":district.color}}>
              <i></i><span>${district.name}</span><b>${districtStates[district.id].status === "built" ? "BUILT · PLAYER" : "EMPTY"}</b>
            </button>
          `)}
        </div>
      </aside>

      <div className="selection-chip">${selectedDistrictData.name} · ${districtStates[selectedDistrict].status.toUpperCase()}</div>
      <div className="map-help">ลากเพื่อหมุน · เลื่อนล้อเพื่อซูม · คลิกช่องหรือ District เพื่อเลือก</div>
    </div>
  `;
}

createRoot(document.querySelector("#map-root")).render(React.createElement(App));
