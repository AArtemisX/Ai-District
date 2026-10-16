import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import { useEffect, useMemo } from "react";
import { html } from "./runtime.js";
import { HologramSign, LowPolyTree, StreetLamp } from "./CityProps.js";

function useLabelTexture(label, color) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    context.fillStyle = "rgba(13, 36, 68, .86)";
    context.beginPath();
    context.roundRect(6, 6, 500, 116, 28);
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = 8;
    context.stroke();
    context.fillStyle = "#ffffff";
    context.font = "700 43px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, 256, 65);
    const next = new CanvasTexture(canvas);
    next.colorSpace = SRGBColorSpace;
    next.minFilter = LinearFilter;
    next.generateMipmaps = false;
    return next;
  }, [label, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function DistrictLabel({ position, label, color }) {
  const texture = useLabelTexture(label, color);
  return html`<sprite position=${position} scale=${[2.9, .72, 1]}>
    <spriteMaterial map=${texture} transparent depthWrite=${false} />
  </sprite>`;
}

function Tower({ position, height = 2, color = "#36c4f3", width = .8 }) {
  return html`<group position=${position}>
    <mesh position=${[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args=${[width, height, width]} />
      <meshStandardMaterial color="#f6fbff" roughness=${.58} />
    </mesh>
    <mesh position=${[0, height * .58, width / 2 + .012]}>
      <boxGeometry args=${[width * .58, height * .56, .025]} />
      <meshStandardMaterial color=${color} emissive=${color} emissiveIntensity=${.38} roughness=${.36} />
    </mesh>
    ${[.3, .62, .9].filter((level) => level * height < height - .2).map((level) => html`<mesh key=${level} position=${[width / 2 + .012, height * level, 0]}><boxGeometry args=${[.02, .08, width * .62]} /><meshBasicMaterial color="#fff3c4" toneMapped=${false} /></mesh>`)}
    <mesh position=${[0, height + .12, 0]}>
      <coneGeometry args=${[width * .34, .3, 4]} />
      <meshStandardMaterial color=${color} roughness=${.5} />
    </mesh>
  </group>`;
}

function EducationHub() {
  return html`<group position=${[-5.1, .58, -4.8]}>
    <mesh position=${[0,.26,0]} receiveShadow><boxGeometry args=${[4.35,.5,3.05]} /><meshStandardMaterial color="#eaf6ff" roughness=${.88} /></mesh>
    <${Tower} position=${[-1.35,.48,.15]} height=${1.9} color="#2388f5" width=${.92} />
    <${Tower} position=${[1.35,.48,.15]} height=${1.55} color="#56d5ff" width=${.92} />
    <mesh position=${[0,1.22,.2]} castShadow><boxGeometry args=${[1.32,1.45,1.2]} /><meshStandardMaterial color="#ffffff" roughness=${.62} /></mesh>
    <mesh position=${[0,1.28,.82]}><boxGeometry args=${[.84,.68,.03]} /><meshStandardMaterial color="#2388f5" emissive="#2388f5" emissiveIntensity=${.38} /></mesh>
    <${DistrictLabel} position=${[0,2.65,.35]} label="EDUCATION HUB" color="#46b8ff" />
  </group>`;
}

function DataCore() {
  const servers = [[-1.15,1.7],[0,2.25],[1.15,1.82]];
  return html`<group position=${[5.15,.58,-4.8]}>
    <mesh position=${[0,.26,0]} receiveShadow><boxGeometry args=${[4.35,.5,3.05]} /><meshStandardMaterial color="#edf0ff" roughness=${.88} /></mesh>
    ${servers.map(([x,height], index)=>html`<${Tower} key=${x} position=${[x,.48,.15]} height=${height} width=${.82} color=${index===1?"#925de5":"#43d8f2"} />`)}
    <${HologramSign} position=${[-1.65,.5,1]} color="#925de5" />
    <${DistrictLabel} position=${[0,2.9,.35]} label="DATA CORE" color="#b887ff" />
  </group>`;
}

function TransitNetwork() {
  return html`<group position=${[-5.1,.58,4.85]}>
    <mesh position=${[0,.26,0]} receiveShadow><boxGeometry args=${[4.35,.5,3.05]} /><meshStandardMaterial color="#eafbf2" roughness=${.88} /></mesh>
    <mesh position=${[0,1.05,0]} castShadow><boxGeometry args=${[3.4,1.05,1.2]} /><meshStandardMaterial color="#f8fbff" roughness=${.58} /></mesh>
    <mesh position=${[0,1.14,.62]}><boxGeometry args=${[2.75,.42,.03]} /><meshStandardMaterial color="#39c86a" emissive="#39c86a" emissiveIntensity=${.42} /></mesh>
    <mesh position=${[0,1.72,0]} rotation=${[0,0,Math.PI/2]}><cylinderGeometry args=${[.13,.13,3.35,8]} /><meshStandardMaterial color="#80e6ae" emissive="#39c86a" emissiveIntensity=${.35} /></mesh>
    ${[-1.3,0,1.3].map(x=>html`<mesh key=${x} position=${[x,.72,-.78]}><boxGeometry args=${[.75,.48,.62]} /><meshStandardMaterial color="#ffffff" /><mesh position=${[0,0,.325]}><boxGeometry args=${[.46,.18,.025]} /><meshBasicMaterial color="#39c86a" /></mesh></mesh>`)}
    <${DistrictLabel} position=${[0,2.45,.3]} label="TRANSIT NETWORK" color="#55dc87" />
  </group>`;
}

function CivicCenter() {
  return html`<group position=${[5.15,.58,4.85]}>
    <mesh position=${[0,.26,0]} receiveShadow><boxGeometry args=${[4.35,.5,3.05]} /><meshStandardMaterial color="#fff6e6" roughness=${.88} /></mesh>
    <mesh position=${[0,.98,0]} castShadow><cylinderGeometry args=${[1.35,1.65,1.1,10]} /><meshStandardMaterial color="#fffdf8" roughness=${.62} /></mesh>
    <mesh position=${[0,1.78,0]} castShadow><sphereGeometry args=${[.92,12,7,0,Math.PI*2,0,Math.PI/2]} /><meshStandardMaterial color="#f5a623" roughness=${.5} /></mesh>
    <mesh position=${[0,2.5,0]}><cylinderGeometry args=${[.08,.14,.7,6]} /><meshStandardMaterial color="#925de5" emissive="#925de5" emissiveIntensity=${.38} /></mesh>
    ${[-1.6,1.6].map(x=>html`<${LowPolyTree} key=${x} position=${[x,.48,.65]} scale=${.72} blossom=${true} />`)}
    <${DistrictLabel} position=${[0,2.82,.35]} label="CIVIC CENTER" color="#ffc04d" />
  </group>`;
}

export function NeoDistrict() {
  const lamps = [[-2.4,-6.7],[2.4,-6.7],[-2.4,6.7],[2.4,6.7],[-6.7,-2.4],[-6.7,2.4],[6.7,-2.4],[6.7,2.4]];
  return html`<group>
    <${EducationHub} />
    <${DataCore} />
    <${TransitNetwork} />
    <${CivicCenter} />
    ${[4.3,5,5.7,6.4].flatMap((d)=>[[0,-d],[0,d],[-d,0],[d,0]]).map(([x,z],index)=>html`<mesh key=${`link-${index}`} position=${[x,.5,z]}><boxGeometry args=${[.16,.03,.16]} /><meshBasicMaterial color=${index%2?"#b79bff":"#65dff4"} toneMapped=${false} /></mesh>`)}
    ${lamps.map((point,index)=>html`<${StreetLamp} key=${index} position=${[point[0],.55,point[1]]} color=${index%2?"#925de5":"#43d8f2"} />`)}
  </group>`;
}
