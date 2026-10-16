// Player movement: keyboard (WASD / arrows), virtual joystick and tap-to-walk. Pure helpers plus a
// tiny key tracker. The camera keeps a fixed heading, so "up" always walks north (−z).
import { moveWithCollision } from "./collision.js";

export const WALK_SPEED = 5.2;
export const ARRIVE_DISTANCE = .25;

const KEY_DIRECTIONS = Object.freeze({
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
});

export const isMovementKey = (code) => Object.hasOwn(KEY_DIRECTIONS, code);

export function directionFromKeys(pressed) {
  let x = 0;
  let z = 0;
  for (const code of pressed) {
    const dir = KEY_DIRECTIONS[code];
    if (!dir) continue;
    x += dir[0];
    z += dir[1];
  }
  const length = Math.hypot(x, z);
  return length ? { x: x / length, z: z / length } : { x: 0, z: 0 };
}

// Joystick vector in screen space (right = +x, down = +y), already clamped to the unit circle.
export function directionFromJoystick(jx, jy, deadZone = .15) {
  const length = Math.hypot(jx, jy);
  if (length < deadZone) return { x: 0, z: 0 };
  const scale = Math.min(1, length) / length;
  return { x: jx * scale, z: jy * scale };
}

// One movement tick. Input priority: keys/joystick → tap target. Returns the new position, heading
// and the (possibly cleared) tap target.
export function stepPlayer(world, state, { direction, target, dt }) {
  const delta = Math.min(dt, .1);
  let dir = direction && (direction.x || direction.z) ? direction : null;
  let nextTarget = dir ? null : target || null;
  if (!dir && nextTarget) {
    const dx = nextTarget.x - state.x;
    const dz = nextTarget.z - state.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= ARRIVE_DISTANCE) return { x: state.x, z: state.z, heading: state.heading, target: null, moving: false };
    const reach = Math.min(1, distance / (WALK_SPEED * delta));
    dir = { x: (dx / distance) * reach, z: (dz / distance) * reach };
  }
  if (!dir) return { x: state.x, z: state.z, heading: state.heading, target: nextTarget, moving: false };
  const moved = moveWithCollision(world, state, dir.x * WALK_SPEED * delta, dir.z * WALK_SPEED * delta);
  const progressed = Math.hypot(moved.x - state.x, moved.z - state.z);
  // A tap target that is blocked (no progress) is dropped so the avatar doesn't jitter against a wall.
  if (nextTarget && progressed < 1e-4) nextTarget = null;
  return { x: moved.x, z: moved.z, heading: Math.atan2(dir.x, dir.z), target: nextTarget, moving: progressed > 1e-4 };
}
