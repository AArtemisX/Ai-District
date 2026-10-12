import { html } from "./runtime.js";
import { Bench, LowPolyTree, PlanterBox, StreetLamp } from "./CityProps.js";

function Road({ position, size, rotation = [0, 0, 0] }) {
  return html`<group position=${position} rotation=${rotation}>
    <mesh receiveShadow><boxGeometry args=${size} /><meshStandardMaterial color="#c9d4dc" roughness=${.96} /></mesh>
    <mesh position=${[0,size[1]/2+.012,0]}><boxGeometry args=${[size[0]*.82,.025,.045]} /><meshBasicMaterial color="#f8fbff" /></mesh>
  </group>`;
}

export function CityFoundation() {
  const lamps = [[-7.2,0,-7.2],[7.2,0,-7.2],[-7.2,0,7.2],[7.2,0,7.2],[-3.1,0,-3.1],[3.1,0,-3.1],[-3.1,0,3.1],[3.1,0,3.1]];
  return html`<group>
    <mesh position=${[0,-.38,0]} receiveShadow><cylinderGeometry args=${[29,29,.35,48]} /><meshStandardMaterial color="#d7efd9" roughness=${1} /></mesh>
    <mesh position=${[0,-.05,0]} receiveShadow><cylinderGeometry args=${[12.7,13,.55,40]} /><meshStandardMaterial color="#e8f1f4" roughness=${.95} /></mesh>
    <mesh position=${[0,.27,0]} receiveShadow><cylinderGeometry args=${[11.55,11.7,.22,40]} /><meshStandardMaterial color="#f8fbff" roughness=${.9} /></mesh>
    <${Road} position=${[0,.48,-8.7]} size=${[19.4,.18,2.25]} />
    <${Road} position=${[0,.48,8.7]} size=${[19.4,.18,2.25]} />
    <${Road} position=${[-8.7,.48,0]} size=${[2.25,.18,19.4]} />
    <${Road} position=${[8.7,.48,0]} size=${[2.25,.18,19.4]} />
    <${Road} position=${[0,.43,0]} size=${[2.1,.12,13.4]} />
    <${Road} position=${[0,.43,0]} size=${[13.4,.12,2.1]} />
    <mesh position=${[0,.51,0]} receiveShadow><cylinderGeometry args=${[3.75,3.9,.16,20]} /><meshStandardMaterial color="#edf7fb" roughness=${.85} /></mesh>
    ${[[-7.3,-5.9],[7.3,-5.9],[-7.3,5.9],[7.3,5.9]].map((p,i)=>html`<group key=${i}>
      <${PlanterBox} position=${[p[0],.6,p[1]]} accent=${i%2 ? "#91ddb8" : "#f4a5c3"} />
      <${Bench} position=${[p[0]+(i%2?.75:-.75),.58,p[1]]} rotation=${[0,i%2?Math.PI:0,0]} />
    </group>`)}
    ${lamps.map((p,i)=>html`<${StreetLamp} key=${i} position=${[p[0],.57,p[2]]} color=${i%3===0?"#f6d779":"#65dff4"} />`)}
    ${[[-11.6,-8.5],[-11.6,8.5],[11.6,-8.5],[11.6,8.5],[-12.1,0],[12.1,0]].map((p,i)=>html`<${LowPolyTree} key=${i} position=${[p[0],.14,p[1]]} scale=${.9+(i%2)*.15} blossom=${i%3===0} />`)}
  </group>`;
}
