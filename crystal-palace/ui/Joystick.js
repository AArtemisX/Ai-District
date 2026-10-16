import { useRef, useState } from "react";
import { html } from "../../map-3d/runtime.js";

const RADIUS = 46;

// Thumb joystick for touch screens. Writes a unit vector (screen space) into controller.joy.
export function Joystick({ controller }) {
  const base = useRef();
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointer = useRef(null);
  const update = (event) => {
    const rect = base.current.getBoundingClientRect();
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > RADIUS) { dx = (dx / length) * RADIUS; dy = (dy / length) * RADIUS; }
    setKnob({ x: dx, y: dy });
    controller.current.joy = { x: dx / RADIUS, y: dy / RADIUS };
    controller.current.target = null;
  };
  const release = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    controller.current.joy = { x: 0, y: 0 };
  };
  return html`<div ref=${base} class="cp-joystick" aria-hidden="true"
    onPointerDown=${(event) => { pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); update(event); }}
    onPointerMove=${(event) => { if (pointer.current === event.pointerId) update(event); }}
    onPointerUp=${release} onPointerCancel=${release} onLostPointerCapture=${release}>
    <span class="cp-joystick-knob" style=${{ transform: `translate(${knob.x}px, ${knob.y}px)` }}></span>
  </div>`;
}
