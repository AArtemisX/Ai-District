import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { html } from "./runtime.js";
import { DICE_ROTATIONS } from "./dice-data.js";
const PIPS={1:[[0,0]],2:[[-.22,-.22],[.22,.22]],3:[[-.22,-.22],[0,0],[.22,.22]],4:[[-.22,-.22],[.22,-.22],[-.22,.22],[.22,.22]],5:[[-.22,-.22],[.22,-.22],[0,0],[-.22,.22],[.22,.22]],6:[[-.22,-.26],[.22,-.26],[-.22,0],[.22,0],[-.22,.26],[.22,.26]]};
const FACES=[{value:1,normal:[0,1,0],u:[1,0,0],v:[0,0,1]},{value:6,normal:[0,-1,0],u:[1,0,0],v:[0,0,-1]},{value:2,normal:[0,0,1],u:[1,0,0],v:[0,1,0]},{value:5,normal:[0,0,-1],u:[-1,0,0],v:[0,1,0]},{value:3,normal:[1,0,0],u:[0,0,-1],v:[0,1,0]},{value:4,normal:[-1,0,0],u:[0,0,1],v:[0,1,0]}];
function pipPosition(face,[u,v]){return face.normal.map((axis,index)=>axis*.57+face.u[index]*u+face.v[index]*v);}
export function Dice3D({rollRequest,onRollComplete}){
 const dice=useRef();const activeRoll=useRef(null);const handledRoll=useRef(null);
 useEffect(()=>{if(!rollRequest||handledRoll.current===rollRequest.id)return;handledRoll.current=rollRequest.id;activeRoll.current={value:rollRequest.value,elapsed:0,duration:1.15};},[rollRequest]);
 useFrame((state,delta)=>{if(!dice.current)return;const roll=activeRoll.current;if(!roll){dice.current.position.y=6.45+Math.sin(state.clock.elapsedTime*1.4)*.08;return;}roll.elapsed+=delta;const progress=Math.min(1,roll.elapsed/roll.duration);dice.current.rotation.x+=delta*9.2;dice.current.rotation.y+=delta*11.4;dice.current.rotation.z+=delta*7.6;dice.current.position.y=6.45+Math.sin(Math.PI*progress)*1.45;if(progress<1)return;const rotation=DICE_ROTATIONS[roll.value];dice.current.rotation.set(...rotation);dice.current.position.y=6.45;activeRoll.current=null;onRollComplete?.(roll.value);});
 return html`<group ref=${dice} position=${[0,6.45,0]} rotation=${DICE_ROTATIONS[1]}><mesh castShadow><boxGeometry args=${[1.08,1.08,1.08,1,1,1]} /><meshStandardMaterial color="#fff8e8" roughness=${.34} metalness=${.04} /></mesh>${FACES.flatMap((face)=>PIPS[face.value].map((pip,index)=>html`<mesh key=${`${face.value}-${index}`} position=${pipPosition(face,pip)} castShadow><sphereGeometry args=${[.075,8,6]} /><meshStandardMaterial color="#315bd4" emissive="#315bd4" emissiveIntensity=${.18} /></mesh>`))}</group>`;
}
