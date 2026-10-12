import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { html, React } from "./runtime.js";
import { DataLightPillar, DroneDock, HologramSign, LowPolyTree, PlanterBox, UtilityBox } from "./CityProps.js";

function WindowStrip({ position, size = [.12,.75,.03], color = "#65dff4" }) {
  return html`<mesh position=${position}><boxGeometry args=${size} /><meshStandardMaterial color=${color} emissive=${color} emissiveIntensity=${.5} roughness=${.3} /></mesh>`;
}

function AcademyBuilding({ accent }) {
  return html`<group>
    <mesh position=${[0,.62,0]} castShadow receiveShadow><boxGeometry args=${[2.7,1.15,1.7]} /><meshStandardMaterial color="#f8fbff" roughness=${.58} /></mesh>
    <mesh position=${[0,1.33,0]} castShadow><cylinderGeometry args=${[.86,1.16,.5,12]} /><meshStandardMaterial color="#d9f4ff" roughness=${.36} metalness=${.08} /></mesh>
    <mesh position=${[0,1.62,0]} castShadow><coneGeometry args=${[.72,.42,10]} /><meshStandardMaterial color="#f6d779" roughness=${.48} /></mesh>
    ${[-.8,0,.8].map((x)=>html`<${WindowStrip} key=${x} position=${[x,.68,.87]} size=${[.34,.55,.035]} />`)}
    <mesh position=${[0,.28,.9]}><boxGeometry args=${[.52,.56,.08]} /><meshStandardMaterial color=${accent} emissive=${accent} emissiveIntensity=${.36} /></mesh>
    <${HologramSign} position=${[-1.55,0,.5]} color=${accent} />
    <${DataLightPillar} position=${[1.5,0,.45]} color=${accent} />
  </group>`;
}

function CloudBuilding({ accent }) {
  return html`<group>
    ${[-.8,0,.8].map((x,i)=>html`<group key=${x}>
      <mesh position=${[x,.72+i*.12,0]} castShadow receiveShadow><boxGeometry args=${[.68,1.45+i*.24,1.25]} /><meshStandardMaterial color="#f8fbff" roughness=${.5} /></mesh>
      <${WindowStrip} position=${[x,.75+i*.12,.64]} size=${[.4,.95,.035]} color=${accent} />
    </group>`)}
    <mesh position=${[0,1.85,0]}><sphereGeometry args=${[.48,12,8]} /><meshStandardMaterial color="#eafaff" emissive=${accent} emissiveIntensity=${.35} roughness=${.3} /></mesh>
    <mesh position=${[0,1.85,0]} rotation=${[Math.PI/2,0,0]}><torusGeometry args=${[.76,.065,6,28]} /><meshStandardMaterial color="#f6d779" emissive="#f6d779" emissiveIntensity=${.45} /></mesh>
    <${UtilityBox} position=${[-1.45,0,.55]} color=${accent} />
    <${DataLightPillar} position=${[1.45,0,.5]} color=${accent} />
  </group>`;
}

function RobotArm({ accent }) {
  const arm = useRef();
  useFrame((state) => { if (arm.current) arm.current.rotation.y = Math.sin(state.clock.elapsedTime * .55) * .32; });
  return html`<group ref=${arm} position=${[1.22,.2,.42]}>
    <mesh position=${[0,.18,0]}><cylinderGeometry args=${[.28,.36,.36,8]} /><meshStandardMaterial color="#6d7d91" /></mesh>
    <mesh position=${[0,.72,0]} rotation=${[0,0,-.38]}><boxGeometry args=${[.24,1.05,.24]} /><meshStandardMaterial color=${accent} roughness=${.45} /></mesh>
    <mesh position=${[.34,1.12,0]} rotation=${[0,0,.72]}><boxGeometry args=${[.22,.72,.22]} /><meshStandardMaterial color="#f8fbff" roughness=${.5} /></mesh>
    <mesh position=${[.58,1.34,0]}><octahedronGeometry args=${[.18,0]} /><meshStandardMaterial color="#f6d779" /></mesh>
  </group>`;
}

function RobotBuilding({ accent }) {
  return html`<group>
    <mesh position=${[-.28,.55,0]} castShadow receiveShadow><boxGeometry args=${[2.35,1.1,1.6]} /><meshStandardMaterial color="#f8fbff" roughness=${.56} /></mesh>
    <mesh position=${[-.28,1.27,0]} castShadow><cylinderGeometry args=${[.88,1.06,.45,10]} /><meshStandardMaterial color="#eadfff" roughness=${.4} /></mesh>
    <mesh position=${[-.28,.58,.82]}><boxGeometry args=${[1.28,.42,.04]} /><meshStandardMaterial color=${accent} emissive=${accent} emissiveIntensity=${.42} /></mesh>
    <${RobotArm} accent=${accent} />
    <${DroneDock} position=${[-1.45,0,.5]} />
    <${UtilityBox} position=${[1.45,0,-.55]} color=${accent} />
  </group>`;
}

function GreenBuilding({ accent }) {
  return html`<group>
    <mesh position=${[0,.58,0]} castShadow receiveShadow><cylinderGeometry args=${[1.35,1.55,1.16,8]} /><meshStandardMaterial color="#f8fbff" roughness=${.62} /></mesh>
    <mesh position=${[0,1.34,0]} castShadow><coneGeometry args=${[1.18,.52,8]} /><meshStandardMaterial color="#91ddb8" roughness=${.6} /></mesh>
    ${[-.52,0,.52].map((x)=>html`<mesh key=${x} position=${[x,1.52,.05]} rotation=${[-.18,0,0]}><boxGeometry args=${[.42,.055,.82]} /><meshStandardMaterial color="#477fa4" metalness=${.12} roughness=${.42} /></mesh>`)}
    <mesh position=${[0,.54,1.12]}><boxGeometry args=${[.74,.7,.07]} /><meshStandardMaterial color=${accent} emissive=${accent} emissiveIntensity=${.32} /></mesh>
    <${LowPolyTree} position=${[-1.45,0,.4]} scale=${.72} />
    <${PlanterBox} position=${[1.3,0,.42]} accent="#91ddb8" />
    <${DataLightPillar} position=${[1.35,0,-.6]} color=${accent} />
  </group>`;
}

export function PrimitiveBuilding({ districtId = "academy", accent = "#65dff4" }) {
  if (districtId === "cloud") return React.createElement(CloudBuilding, { accent });
  if (districtId === "robot") return React.createElement(RobotBuilding, { accent });
  if (districtId === "green") return React.createElement(GreenBuilding, { accent });
  return React.createElement(AcademyBuilding, { accent });
}

// Keeps the district contract stable when code-built models are replaced by GLB later.
export function BuildingModelSlot({ modelUrl = null, ...props }) {
  return modelUrl ? null : React.createElement(PrimitiveBuilding, props);
}
