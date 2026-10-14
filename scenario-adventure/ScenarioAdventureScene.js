import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { html, React } from "../map-3d/runtime.js";
import { BOARD_TILES, TILE_POSITIONS } from "../map-3d/board-data.js";
import { BoardTile } from "../map-3d/BoardTile.js";
import { PlayerToken } from "../map-3d/PlayerToken.js";
import { BotToken } from "../map-3d/BotToken.js";
import { Dice3D } from "../map-3d/Dice3D.js";
import { AICore } from "../map-3d/AICore.js";
import { CityFoundation } from "../map-3d/CityFoundation.js";
import { SkyDecor } from "../map-3d/SkyDecor.js";
import { TransitDecor } from "../map-3d/TransitDecor.js";

function Scene({ selectedTile, onSelectTile, playerPosition, botPosition, movement, onMoveComplete, rollRequest, onRollComplete }) {
  return html`<${React.Fragment}>
    <color attach="background" args=${["#8ed8f8"]} />
    <fog attach="fog" args=${["#dff5ff", 34, 58]} />
    <ambientLight intensity=${.8} />
    <hemisphereLight args=${["#ffffff", "#91ddb8", .88]} />
    <directionalLight position=${[11,19,9]} intensity=${2.3} castShadow shadow-mapSize-width=${1024} shadow-mapSize-height=${1024} shadow-camera-far=${45} shadow-camera-left=${-16} shadow-camera-right=${16} shadow-camera-top=${16} shadow-camera-bottom=${-16} />
    <group position=${[0,-.15,0]}>
      <${CityFoundation} />
      <${TransitDecor} />
      ${BOARD_TILES.map((tile) => html`<${BoardTile} key=${tile.id} tile=${tile} selected=${selectedTile === tile.index} onSelect=${onSelectTile} />`)}
      <${AICore} />
      <${Dice3D} rollRequest=${rollRequest} onRollComplete=${onRollComplete} />
      <${PlayerToken} tilePositions=${TILE_POSITIONS} tileIndex=${playerPosition} moveRequest=${movement?.actor === "player" ? movement : null} onMoveComplete=${(index) => onMoveComplete("player", index)} />
      <${BotToken} tilePositions=${TILE_POSITIONS} tileIndex=${botPosition} moveRequest=${movement?.actor === "bot" ? movement : null} onMoveComplete=${(index) => onMoveComplete("bot", index)} />
      <${SkyDecor} />
    </group>
    <${ContactShadows} position=${[0,-.18,0]} opacity=${.2} scale=${28} blur=${2.8} far=${10} frames=${1} />
    <${OrbitControls} makeDefault target=${[0,1.1,0]} minDistance=${16} maxDistance=${31} minPolarAngle=${.62} maxPolarAngle=${1.15} enablePan=${false} dampingFactor=${.07} />
  </${React.Fragment}>`;
}

export function ScenarioAdventureScene(props) {
  return html`<${Canvas} shadows dpr=${[1, 1.5]} camera=${{ position: [17, 18, 21], fov: 38, near: .1, far: 100 }}>
    <${Scene} ...${props} />
  </${Canvas}>`;
}

