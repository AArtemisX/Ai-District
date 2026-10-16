import { html } from "./runtime.js";
import { Bench, LowPolyTree, PlanterBox, StreetLamp } from "./CityProps.js";

function Road({ position, size, rotation = [0, 0, 0], color = "#f3e9d2" }) {
  return html`<group position=${position} rotation=${rotation}>
    <mesh receiveShadow><boxGeometry args=${size} /><meshStandardMaterial color=${color} roughness=${.96} /></mesh>
    <mesh position=${[0,size[1]/2+.012,0]}><boxGeometry args=${[size[0]*.82,.025,.045]} /><meshBasicMaterial color="#fffaf0" /></mesh>
  </group>`;
}

export function CityFoundation() {
  const lamps = [[-7.2,0,-7.2],[7.2,0,-7.2],[-7.2,0,7.2],[7.2,0,7.2],[-3.1,0,-3.1],[3.1,0,-3.1],[-3.1,0,3.1],[3.1,0,3.1]];
  return html`<group>
    <mesh position=${[0,-.38,0]} receiveShadow><boxGeometry args=${[38,.42,34]} /><meshStandardMaterial color="#6fb84e" roughness=${1} /></mesh>
    <mesh position=${[0,-.13,0]} receiveShadow><boxGeometry args=${[27,.18,25]} /><meshStandardMaterial color="#86c95f" roughness=${.96} /></mesh>
    <mesh position=${[0,.02,0]} receiveShadow><boxGeometry args=${[22.6,.18,22.6]} /><meshStandardMaterial color="#9fd877" roughness=${.91} /></mesh>
    <mesh position=${[0,.12,0]} rotation=${[-Math.PI/2,0,0]}><ringGeometry args=${[10.85,11.1,4]} /><meshBasicMaterial color="#f6edd6" transparent opacity=${.8} /></mesh>
    <${Road} position=${[0,.48,-8.7]} size=${[19.4,.18,2.25]} />
    <${Road} position=${[0,.48,8.7]} size=${[19.4,.18,2.25]} />
    <${Road} position=${[-8.7,.48,0]} size=${[2.25,.18,19.4]} />
    <${Road} position=${[8.7,.48,0]} size=${[2.25,.18,19.4]} />
    <${Road} position=${[0,.43,0]} size=${[2.1,.12,13.4]} color="#ead8b0" />
    <${Road} position=${[0,.43,0]} size=${[13.4,.12,2.1]} color="#ead8b0" />
    <mesh position=${[0,.51,0]} receiveShadow><cylinderGeometry args=${[3.75,3.9,.16,20]} /><meshStandardMaterial color="#edf7fb" roughness=${.85} /></mesh>
    ${[[-7.3,-5.9],[7.3,-5.9],[-7.3,5.9],[7.3,5.9]].map((p,i)=>html`<group key=${i}>
      <${PlanterBox} position=${[p[0],.6,p[1]]} accent=${i%2 ? "#91ddb8" : "#f4a5c3"} />
      <${Bench} position=${[p[0]+(i%2?.75:-.75),.58,p[1]]} rotation=${[0,i%2?Math.PI:0,0]} />
    </group>`)}
    ${lamps.map((p,i)=>html`<${StreetLamp} key=${i} position=${[p[0],.57,p[2]]} color=${i%3===0?"#f6d779":"#65dff4"} />`)}
    ${[[-11.6,-8.5],[-11.6,8.5],[11.6,-8.5],[11.6,8.5],[-12.1,0],[12.1,0]].map((p,i)=>html`<${LowPolyTree} key=${i} position=${[p[0],.14,p[1]]} scale=${.9+(i%2)*.15} blossom=${i%3===0} />`)}
  </group>`;
}
