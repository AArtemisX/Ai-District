import { OrbitControls, ContactShadows } from "@react-three/drei";
import { html, React } from "./runtime.js";
import { BOARD_TILES, DISTRICTS, TILE_POSITIONS } from "./board-data.js";
import { BoardTile } from "./BoardTile.js";
import { District } from "./District.js";
import { PlayerToken } from "./PlayerToken.js";
import { BotToken } from "./BotToken.js";
import { AICore } from "./AICore.js";
import { SkyDecor } from "./SkyDecor.js";
import { Dice3D } from "./Dice3D.js";
import { CityFoundation } from "./CityFoundation.js";
import { TransitDecor } from "./TransitDecor.js";

export function MapScene({ selectedTile, onSelectTile, districtStates, selectedDistrict, onSelectDistrict, effects, battleVisual, playerPosition, botPosition, movement, onMoveComplete, rollRequest, onRollComplete }) {
  return html`
    <${React.Fragment}>
      <color attach="background" args=${["#8ed8f8"]} />
      <fog attach="fog" args=${["#dff5ff", 34, 58]} />
      <ambientLight intensity=${.78} />
      <hemisphereLight args=${["#ffffff", "#91ddb8", .88]} />
      <directionalLight position=${[11,19,9]} intensity=${2.35} castShadow shadow-mapSize-width=${1024} shadow-mapSize-height=${1024} shadow-camera-far=${45} shadow-camera-left=${-16} shadow-camera-right=${16} shadow-camera-top=${16} shadow-camera-bottom=${-16} shadow-bias=${-.00025} />

      <group position=${[0,-.15,0]}>
        <${CityFoundation} />
        <${TransitDecor} />

        ${BOARD_TILES.map((tile)=>html`<${BoardTile} key=${tile.id} tile=${tile} selected=${selectedTile===tile.index} onSelect=${onSelectTile} />`)}
        ${DISTRICTS.map((district)=>html`<${District} key=${district.id} district=${district} state=${districtStates[district.id]} selected=${selectedDistrict===district.id} onSelect=${onSelectDistrict} effects=${effects} visualEvent=${battleVisual?.districtId === district.id ? battleVisual : null} />`)}
        <${AICore} />
        <${Dice3D} rollRequest=${rollRequest} onRollComplete=${onRollComplete} />
        <${PlayerToken}
          tilePositions=${TILE_POSITIONS}
          tileIndex=${playerPosition}
          moveRequest=${movement?.actor === "player" ? movement : null}
          onMoveComplete=${(finalIndex) => onMoveComplete("player", finalIndex)}
        />
        <${BotToken}
          tilePositions=${TILE_POSITIONS}
          tileIndex=${botPosition}
          moveRequest=${movement?.actor === "bot" ? movement : null}
          onMoveComplete=${(finalIndex) => onMoveComplete("bot", finalIndex)}
        />
        <${SkyDecor} />
      </group>

      <${ContactShadows} position=${[0,-.18,0]} opacity=${.22} scale=${28} blur=${2.8} far=${10} frames=${1} />
      <${OrbitControls}
        makeDefault
        target=${[0,1.1,0]}
        minDistance=${16}
        maxDistance=${31}
        minPolarAngle=${.62}
        maxPolarAngle=${1.15}
        enablePan=${false}
        dampingFactor=${.07}
      />
    </${React.Fragment}>
  `;
}
