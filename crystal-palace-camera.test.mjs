import test from "node:test";
import assert from "node:assert/strict";
import { CAMERA_STATE, FOLLOW_PITCH_DEG, TRANSITION_SECONDS, createCameraRig, focusCamera, followPose, releaseCamera, stepCameraRig } from "./crystal-palace/systems/camera-rig.js";

const player = { x: 2, z: 5 };
const exhibit = { id: "x", x: 4, z: 2 };
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const run = (rig, seconds, opts = {}) => { for (let t = 0; t < seconds; t += 1 / 60) rig = stepCameraRig(rig, { player, dt: 1 / 60, ...opts }); return rig; };

test("follow pose sits at a fixed ~50° pitch behind the player", () => {
  const pose = followPose(player);
  const dy = pose.position.y - pose.target.y + .9;
  const flat = Math.hypot(pose.position.x - player.x, pose.position.z - player.z);
  const angle = Math.atan2(dy, flat) * 180 / Math.PI;
  assert.ok(close(angle, FOLLOW_PITCH_DEG, 1e-6));
  assert.ok(pose.position.z > player.z, "camera is south of the player");
});

test("FOLLOW → FOCUS → RETURN → FOLLOW", () => {
  let rig = createCameraRig(player);
  assert.equal(rig.state, CAMERA_STATE.FOLLOW);
  rig = focusCamera(rig, exhibit, player);
  assert.equal(rig.state, CAMERA_STATE.FOCUS);
  rig = run(rig, TRANSITION_SECONDS / 2);
  assert.ok(rig.progress > 0 && rig.progress < 1, "eases mid-way");
  rig = run(rig, TRANSITION_SECONDS);
  assert.equal(rig.state, CAMERA_STATE.FOCUS, "focus holds until released");
  assert.ok(Math.hypot(rig.pose.target.x - exhibit.x, rig.pose.target.z - exhibit.z) < 1.5, "looks at the exhibit");
  const toPlayer = Math.atan2(player.z - exhibit.z, player.x - exhibit.x);
  const toCamera = Math.atan2(rig.pose.position.z - exhibit.z, rig.pose.position.x - exhibit.x);
  assert.ok(Math.abs(Math.atan2(Math.sin(toCamera - toPlayer), Math.cos(toCamera - toPlayer))) > .3, "camera swings off the player's line");
  assert.ok(rig.pose.position.y < followPose(player).position.y, "focus is lower than follow");
  rig = releaseCamera(rig);
  assert.equal(rig.state, CAMERA_STATE.RETURN);
  rig = run(rig, TRANSITION_SECONDS + .1);
  assert.equal(rig.state, CAMERA_STATE.FOLLOW);
  assert.deepEqual(rig.pose, followPose(player));
});

test("reduced motion cuts instantly in both directions", () => {
  let rig = focusCamera(createCameraRig(player), exhibit, player);
  rig = stepCameraRig(rig, { player, dt: 1 / 60, reducedMotion: true });
  assert.equal(rig.progress, 1);
  assert.deepEqual(rig.pose, rig.focus);
  rig = stepCameraRig(releaseCamera(rig), { player, dt: 1 / 60, reducedMotion: true });
  assert.equal(rig.state, CAMERA_STATE.FOLLOW);
  assert.deepEqual(rig.pose, followPose(player));
});

test("release while following is a no-op and follow converges", () => {
  const rig = createCameraRig({ x: 0, z: 0 });
  assert.equal(releaseCamera(rig), rig);
  const settled = run(rig, 3);
  assert.ok(close(settled.pose.target.x, player.x, 1e-3) && close(settled.pose.target.z, player.z, 1e-3));
});

test("bottom-sheet focus looks past the exhibit so it sits above the panel", () => {
  const side = focusCamera(createCameraRig(player), exhibit, player, "side").focus;
  const bottom = focusCamera(createCameraRig(player), exhibit, player, "bottom").focus;
  assert.deepEqual(bottom.position, side.position);
  const reach = (pose) => Math.hypot(pose.target.x - pose.position.x, pose.target.z - pose.position.z);
  assert.ok(reach(bottom) > reach(side), "looks further past the exhibit");
  assert.ok(bottom.target.y < side.target.y);
});
