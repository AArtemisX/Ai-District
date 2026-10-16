// Camera rig state machine: FOLLOW → FOCUS → RETURN → FOLLOW. Pure: the scene feeds in the player
// position and dt each frame and copies `pose` onto the three.js camera.

export const CAMERA_STATE = Object.freeze({ FOLLOW: "FOLLOW", FOCUS: "FOCUS", RETURN: "RETURN" });

export const FOLLOW_PITCH_DEG = 50;
export const FOLLOW_DISTANCE = 16;
export const TRANSITION_SECONDS = .85;
const FOLLOW_SMOOTHING = 6;

const pitch = (FOLLOW_PITCH_DEG * Math.PI) / 180;
export const FOLLOW_OFFSET = Object.freeze({ x: 0, y: FOLLOW_DISTANCE * Math.sin(pitch), z: FOLLOW_DISTANCE * Math.cos(pitch) });

export function followPose(player) {
  return {
    position: { x: player.x + FOLLOW_OFFSET.x, y: FOLLOW_OFFSET.y, z: player.z + FOLLOW_OFFSET.z },
    target: { x: player.x, y: .9, z: player.z },
  };
}

// Frame an exhibit from the player's side, swung off-axis so the avatar doesn't block it, and with the
// look-at point nudged so the exhibit stays clear of the info panel: right of it for the desktop side
// panel ("side"), below it for the phone bottom sheet ("bottom") so the exhibit rides high on screen.
export const FOCUS_SWING = .65;
export function focusPose(exhibit, player, panel = "side") {
  const { distance = 5.6, height = 3.6, lookY = 1.5 } = exhibit.focus || {};
  let dx = player.x - exhibit.x;
  let dz = player.z - exhibit.z;
  const length = Math.hypot(dx, dz);
  if (length < .1) { dx = 0; dz = 1; } else { dx /= length; dz /= length; }
  const c = Math.cos(FOCUS_SWING);
  const s = Math.sin(FOCUS_SWING);
  const ox = dx * c - dz * s;
  const oz = dx * s + dz * c;
  // Camera looks along (−ox, −oz); its right-hand vector on the floor is (oz, −ox).
  const position = { x: exhibit.x + ox * distance, y: height, z: exhibit.z + oz * distance };
  if (panel === "bottom") {
    const drop = distance * .32;
    return { position, target: { x: exhibit.x - ox * drop, y: lookY - drop * .6, z: exhibit.z - oz * drop } };
  }
  const shift = distance * .22;
  return { position, target: { x: exhibit.x + oz * shift, y: lookY, z: exhibit.z - ox * shift } };
}

const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });
const lerpPose = (a, b, t) => ({ position: lerp3(a.position, b.position, t), target: lerp3(a.target, b.target, t) });
const smoothstep = (t) => t * t * (3 - 2 * t);

export function createCameraRig(player) {
  return { state: CAMERA_STATE.FOLLOW, progress: 1, from: null, focus: null, pose: followPose(player) };
}

export function focusCamera(rig, exhibit, player, panel = "side") {
  return { ...rig, state: CAMERA_STATE.FOCUS, progress: 0, from: rig.pose, focus: focusPose(exhibit, player, panel), exhibitId: exhibit.id };
}

export function releaseCamera(rig) {
  if (rig.state === CAMERA_STATE.FOLLOW) return rig;
  return { ...rig, state: CAMERA_STATE.RETURN, progress: 0, from: rig.pose, focus: null, exhibitId: null };
}

// Advance one frame. reducedMotion = instant cut (no easing, no follow lag).
export function stepCameraRig(rig, { player, dt, reducedMotion = false }) {
  const advance = reducedMotion ? 1 : Math.min(1, rig.progress + dt / TRANSITION_SECONDS);
  if (rig.state === CAMERA_STATE.FOCUS) {
    const pose = advance >= 1 ? rig.focus : lerpPose(rig.from, rig.focus, smoothstep(advance));
    return { ...rig, progress: advance, pose };
  }
  const goal = followPose(player);
  if (rig.state === CAMERA_STATE.RETURN) {
    if (advance >= 1) return { ...rig, state: CAMERA_STATE.FOLLOW, progress: 1, from: null, pose: goal };
    return { ...rig, progress: advance, pose: lerpPose(rig.from, goal, smoothstep(advance)) };
  }
  if (reducedMotion) return { ...rig, pose: goal };
  const t = 1 - Math.exp(-FOLLOW_SMOOTHING * dt);
  return { ...rig, pose: lerpPose(rig.pose, goal, t) };
}
