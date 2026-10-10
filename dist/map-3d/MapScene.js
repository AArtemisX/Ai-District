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

export function MapScene({ selectedTile, onSelectTile, districtStates, selectedDistrict, onSelectDistrict, playerPosition, botPosition, movement, onMoveComplete, rollRequest, onRollComplete }) {
  return html`
    <${React.Fragment}>
      <color attach="background" args=${["#c7efff"]} />
      <fog attach="fog" args=${["#dff7ff", 38, 64]} />
      <ambientLight intensity=${.72} />
      <hemisphereLight args=${["#ffffff", "#7ec4dd", 1.05]} />
      <directionalLight position=${[10,18,8]} intensity=${2.6} castShadow shadow-mapSize-width=${1024} shadow-mapSize-height=${1024} shadow-camera-far=${42} shadow-camera-left=${-15} shadow-camera-right=${15} shadow-camera-top=${15} shadow-camera-bottom=${-15} />

      <group position=${[0,-.15,0]}>
        <mesh position=${[0,-.55,0]} receiveShadow castShadow>
          <cylinderGeometry args=${[11.7,9.8,1.1,32]} />
          <meshStandardMaterial color="#eaf8fb" roughness=${.92} />
        </mesh>
        <mesh position=${[0,-1.02,0]} receiveShadow>
          <cylinderGeometry args=${[9.7,6.8,1.1,18]} />
          <meshStandardMaterial color="#b8d9dc" roughness=${1} />
        </mesh>
        <mesh position=${[0,.18,0]} receiveShadow>
          <cylinderGeometry args=${[8.1,8.1,.3,40]} />
          <meshStandardMaterial color="#d7f4f6" roughness=${.78} />
        </mesh>

        ${BOARD_TILES.map((tile)=>html`<${BoardTile} key=${tile.id} tile=${tile} selected=${selectedTile===tile.index} onSelect=${onSelectTile} />`)}
        ${DISTRICTS.map((district)=>html`<${District} key=${district.id} district=${district} state=${districtStates[district.id]} selected=${selectedDistrict===district.id} onSelect=${onSelectDistrict} />`)}
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

      <${ContactShadows} position=${[0,-.76,0]} opacity=${.28} scale=${25} blur=${2.5} far=${9} frames=${1} />
      <${OrbitControls}
        makeDefault
        target=${[0,1.2,0]}
        minDistance=${15}
        maxDistance=${34}
        minPolarAngle=${.55}
        maxPolarAngle=${1.2}
        enablePan=${false}
        dampingFactor=${.07}
      />
    </${React.Fragment}>
  `;
}
