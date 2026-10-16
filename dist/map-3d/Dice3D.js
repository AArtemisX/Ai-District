import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Euler, Quaternion, Vector3 } from "three";
import { html } from "./runtime.js";
import { DICE_ROTATIONS } from "./dice-data.js";

const PIPS = {
  1: [[0, 0]],
  2: [[-.22, -.22], [.22, .22]],
  3: [[-.22, -.22], [0, 0], [.22, .22]],
  4: [[-.22, -.22], [.22, -.22], [-.22, .22], [.22, .22]],
  5: [[-.22, -.22], [.22, -.22], [0, 0], [-.22, .22], [.22, .22]],
  6: [[-.22, -.26], [.22, -.26], [-.22, 0], [.22, 0], [-.22, .26], [.22, .26]],
};

const FACES = [
  { value: 1, normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { value: 6, normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { value: 2, normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { value: 5, normal: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  { value: 3, normal: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { value: 4, normal: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
];

function pipPosition(face, [u, v]) {
  return face.normal.map((axis, index) => axis * .57 + face.u[index] * u + face.v[index] * v);
}

// Resting spot on the plaza road in front of the AI Core (scene-group coordinates).
const LANDING = Object.freeze([0, 1.03, 5.3]);
const GRAVITY = 30;
const FLIGHT_TIME = .55;
const ROLL_DURATION = 1.35;
const RESTING_YAW = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 5);
const RESTITUTION = .42;
const FRICTION = .18;

// Horizontal distance the die still travels after its first impact (same rules as useFrame),
// so the throw is aimed short and the bounces carry it onto LANDING instead of past it.
function driftAfterImpact(horizontalSpeed, impactSpeed) {
  let speed = horizontalSpeed * FRICTION;
  let vertical = impactSpeed * RESTITUTION;
  let distance = 0;
  while (vertical > .3) {
    distance += speed * (2 * vertical / GRAVITY);
    speed *= FRICTION;
    vertical *= RESTITUTION;
  }
  return distance;
}

const reducedMotion = () => Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
const restingRotation = (value) => RESTING_YAW.clone().multiply(new Quaternion().setFromEuler(new Euler(...DICE_ROTATIONS[value])));

// Presentation only: the rolled value always comes from rollRequest (server / turn engine).
// The die is thrown in from the right edge of the current camera view, falls under gravity,
// bounces, settles on the face for that value, and only then calls onRollComplete once.
export function Dice3D({ rollRequest, onRollComplete }) {
  const dice = useRef();
  const activeRoll = useRef(null);
  const handledRoll = useRef(null);

  // Initial pose is set once so parent re-renders never reset the face shown after a roll.
  useLayoutEffect(() => { dice.current?.quaternion.copy(restingRotation(1)); }, []);

  useEffect(() => {
    if (!rollRequest || handledRoll.current === rollRequest.id) return;
    handledRoll.current = rollRequest.id;
    activeRoll.current = { value: rollRequest.value, elapsed: 0, started: false };
  }, [rollRequest]);

  useFrame((state, rawDelta) => {
    const die = dice.current;
    const roll = activeRoll.current;
    if (!die || !roll) return;
    const delta = Math.min(rawDelta, 1 / 30);
    const landing = new Vector3(...LANDING);
    const target = restingRotation(roll.value);

    if (!roll.started) {
      roll.started = true;
      roll.still = reducedMotion();
      const right = new Vector3().setFromMatrixColumn(state.camera.matrixWorld, 0).setY(0).normalize();
      const from = landing.clone().addScaledVector(right, 13).add(new Vector3(0, 5.5, 0));
      const vy = (landing.y - from.y + .5 * GRAVITY * FLIGHT_TIME * FLIGHT_TIME) / FLIGHT_TIME;
      const impact = landing.clone().addScaledVector(right, driftAfterImpact(13 / FLIGHT_TIME, Math.abs(vy - GRAVITY * FLIGHT_TIME)));
      roll.position = from;
      roll.velocity = new Vector3((impact.x - from.x) / FLIGHT_TIME, vy, (impact.z - from.z) / FLIGHT_TIME);
      roll.spin = new Vector3(13, 9, 11);
      roll.bounces = 0;
      die.position.copy(roll.still ? landing : from);
      if (roll.still) die.quaternion.copy(target);
    }

    roll.elapsed += delta;
    if (!roll.still) {
      roll.velocity.y -= GRAVITY * delta;
      roll.position.addScaledVector(roll.velocity, delta);
      if (roll.position.y <= landing.y && roll.velocity.y < 0) {
        roll.position.y = landing.y;
        roll.velocity.y = -roll.velocity.y * RESTITUTION;
        roll.velocity.x *= FRICTION;
        roll.velocity.z *= FRICTION;
        roll.spin.multiplyScalar(.45);
        roll.bounces += 1;
      }
      const settle = Math.max(0, (roll.elapsed - FLIGHT_TIME) / (ROLL_DURATION - FLIGHT_TIME));
      die.position.copy(roll.position).lerp(landing, Math.min(1, settle * settle));
      if (roll.bounces === 0) {
        die.rotation.x += roll.spin.x * delta;
        die.rotation.y += roll.spin.y * delta;
        die.rotation.z += roll.spin.z * delta;
      } else {
        die.quaternion.slerp(target, Math.min(1, delta * (6 + settle * 18)));
      }
    }

    if (roll.elapsed < (roll.still ? .3 : ROLL_DURATION)) return;
    die.position.copy(landing);
    die.quaternion.copy(target);
    activeRoll.current = null;
    onRollComplete?.(roll.value);
  });

  return html`
    <group ref=${dice} position=${LANDING}>
      <mesh castShadow>
        <boxGeometry args=${[1.08, 1.08, 1.08, 1, 1, 1]} />
        <meshStandardMaterial color="#fff8e8" roughness=${.34} metalness=${.04} />
      </mesh>
      ${FACES.flatMap((face) => PIPS[face.value].map((pip, index) => html`
        <mesh key=${`${face.value}-${index}`} position=${pipPosition(face, pip)} castShadow>
          <sphereGeometry args=${[.075, 8, 6]} />
          <meshStandardMaterial color="#315bd4" emissive="#315bd4" emissiveIntensity=${.18} />
        </mesh>
      `))}
    </group>
  `;
}
