import { html } from "./runtime.js";

function Cloud({ position, scale = 1 }) {
  return html`
    <group position=${position} scale=${[scale,scale,scale]}>
      ${[[0,0,0,.8],[.72,.08,.1,.6],[-.72,.04,.12,.58],[.05,.28,0,.7]].map((p,i)=>html`<mesh key=${i} position=${p.slice(0,3)}><sphereGeometry args=${[p[3],12,8]} /><meshStandardMaterial color="#ffffff" transparent opacity=${.82} roughness=${1} /></mesh>`)}
    </group>
  `;
}

export function SkyDecor() {
  const clouds = [
    [-12,-1.5,-7,1.6],[11,-1.2,-5,1.3],[-10,-2,8,1.4],[12,-1.7,8,1.7],[0,-2.4,-12,1.5],
  ];
  return html`
    <group>
      ${clouds.map((c,i)=>html`<${Cloud} key=${i} position=${c.slice(0,3)} scale=${c[3]} />`)}
      ${Array.from({length:20},(_,i)=>{
        const angle=(i/20)*Math.PI*2;
        const radius=7.2+(i%3)*.55;
        return html`<mesh key=${i} position=${[Math.cos(angle)*radius,.72,Math.sin(angle)*radius]} castShadow>
          <cylinderGeometry args=${[.08,.16,.65,5]} /><meshStandardMaterial color=${i%4===0?"#ff9cc8":"#4fc98a"} roughness=${.8} />
        </mesh>`;
      })}
    </group>
  `;
}
