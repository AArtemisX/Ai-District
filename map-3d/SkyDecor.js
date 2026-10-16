import { html } from "./runtime.js";
import { HologramSign, LowPolyTree, StreetLamp } from "./CityProps.js";

function BackgroundBuilding({ position, height, accent }) {
  return html`<group position=${position}>
    <mesh position=${[0,height/2,0]} castShadow><boxGeometry args=${[1.15,height,1.15]} /><meshStandardMaterial color="#eef7fa" roughness=${.78} /></mesh>
    <mesh position=${[0,height+.18,0]}><coneGeometry args=${[.48,.42,5]} /><meshStandardMaterial color=${accent} roughness=${.55} /></mesh>
    ${[-.28,0,.28].map((x)=>html`<mesh key=${x} position=${[x,height*.55,.58]}><boxGeometry args=${[.12,height*.48,.025]} /><meshStandardMaterial color=${accent} emissive=${accent} emissiveIntensity=${.22} /></mesh>`)}
  </group>`;
}

export function SkyDecor() {
  const skyline = [
    [-14,.05,-10,2.2],[-11,.05,-13,3.1],[-6,.05,-14,2.5],[6,.05,-14,3.2],[11,.05,-13,2.4],[14,.05,-9,3],
  ];
  return html`<group>
    ${skyline.map((p,i)=>html`<${BackgroundBuilding} key=${i} position=${p.slice(0,3)} height=${p[3]} accent=${i%3===0?"#f6d779":i%3===1?"#b6a2e8":"#65dff4"} />`)}
    ${Array.from({length:12},(_,i)=>{
      const angle=(i/12)*Math.PI*2;
      const radius=12.9+(i%2)*.8;
      return html`<${LowPolyTree} key=${i} position=${[Math.cos(angle)*radius,.05,Math.sin(angle)*radius]} scale=${.7+(i%3)*.12} blossom=${i%4===0} />`;
    })}
    ${[[-10,.5,0],[10,.5,0],[0,.5,-10],[0,.5,10]].map((p,i)=>html`<${HologramSign} key=${i} position=${p} color=${i%2?"#b6a2e8":"#65dff4"} />`)}
    ${[[-10,.55,-5],[10,.55,-5],[-10,.55,5],[10,.55,5]].map((p,i)=>html`<${StreetLamp} key=${i} position=${p} />`)}
  </group>`;
}
