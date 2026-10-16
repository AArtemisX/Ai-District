import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { html, React } from "../map-3d/runtime.js";
import { BOARD_TILES, TILE_POSITIONS } from "../map-3d/board-data.js";
import { BoardTile } from "../map-3d/BoardTile.js";
import { CharacterToken } from "../map-3d/CharacterToken.js";
import { PlayerToken } from "../map-3d/PlayerToken.js";
import { BotToken } from "../map-3d/BotToken.js";
import { Dice3D } from "../map-3d/Dice3D.js";
import { AICore } from "../map-3d/AICore.js";
import { CityFoundation } from "../map-3d/CityFoundation.js";
import { SkyDecor } from "../map-3d/SkyDecor.js";
import { TransitDecor } from "../map-3d/TransitDecor.js";
import { NeoDistrict } from "../map-3d/NeoDistrict.js";
import { NatureDecor } from "../map-3d/NatureDecor.js";
import { eventTypeForTile } from "./board-events.js";
import { eventVisualForType } from "./event-visuals.js";

function Scene({ selectedTile, onSelectTile, playerPosition, botPosition, movement, onMoveComplete, rollRequest, onRollComplete, extraActors = [] }) {
  return html`<${React.Fragment}>
    <color attach="background" args=${["#9fdcf2"]} />
    <fog attach="fog" args=${["#cfeedd", 38, 66]} />
    <ambientLight intensity=${.62} />
    <hemisphereLight args=${["#eef8ff", "#7cc46a", .9]} />
    <directionalLight position=${[-14,9,-10]} intensity=${.38} color="#c9b8ff" />
    <directionalLight position=${[11,19,9]} intensity=${2.25} color="#fff0d6" castShadow shadow-mapSize-width=${1024} shadow-mapSize-height=${1024} shadow-camera-far=${45} shadow-camera-left=${-20} shadow-camera-right=${20} shadow-camera-top=${20} shadow-camera-bottom=${-20} />
    <group position=${[0,-.15,0]}>
      <${CityFoundation} />
      <${TransitDecor} />
      <${NeoDistrict} />
      <${NatureDecor} />
      ${BOARD_TILES.map((tile) => {
        const eventType = eventTypeForTile(tile.index);
        return html`<${BoardTile} key=${tile.id} tile=${tile} eventType=${eventType} visual=${eventVisualForType(eventType)} selected=${selectedTile === tile.index} onSelect=${onSelectTile} />`;
      })}
      <${AICore} />
      <${Dice3D} rollRequest=${rollRequest} onRollComplete=${onRollComplete} />
      <${PlayerToken} tilePositions=${TILE_POSITIONS} tileIndex=${playerPosition} moveRequest=${movement?.actor === "player" ? movement : null} onMoveComplete=${(index) => onMoveComplete("player", index)} />
      <${BotToken} tilePositions=${TILE_POSITIONS} tileIndex=${botPosition} moveRequest=${movement?.actor === "bot" ? movement : null} onMoveComplete=${(index) => onMoveComplete("bot", index)} />
      ${extraActors.map((actor,index)=>html`<${CharacterToken} key=${actor.role} tilePositions=${TILE_POSITIONS} tileIndex=${actor.position} color=${index===0?"#72c76d":"#b184ed"} offset=${index===0?[-.44,0,-.34]:[.44,0,.34]} moveRequest=${movement?.actor===actor.role?movement:null} onMoveComplete=${(position)=>onMoveComplete(actor.role,position)} />`)}
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

