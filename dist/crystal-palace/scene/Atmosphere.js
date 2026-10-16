import { AdditiveBlending, BackSide, BufferAttribute, CanvasTexture, Color, DoubleSide, Mesh, MeshBasicMaterial, PMREMGenerator, PlaneGeometry, Scene, SphereGeometry, SRGBColorSpace } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { html } from "../../map-3d/runtime.js";
import { Instances } from "./instancing.js";
import { CUTAWAY } from "./PalaceStructure.js";
import { TRANSEPT_VAULT } from "../config/palace-layout.js";

// Soft daylight environment, generated procedurally once (no HDR download): a warm sky dome over a
// meadow-green ground with a bright sun patch. Gives glass and iron a gentle sheen without
// transmission, and fills shadows with warm bounce light.
export function SoftEnvironment({ intensity = .55 }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const env = new Scene();
    const dome = new SphereGeometry(10, 32, 16);
    const colors = [];
    const top = new Color("#fff1d6");
    const sky = new Color("#bfe9f7");
    const horizon = new Color("#fffaf0");
    const ground = new Color("#9ccf7a");
    const position = dome.getAttribute("position");
    for (let i = 0; i < position.count; i += 1) {
      const y = position.getY(i) / 10;
      const c = y > .35 ? sky.clone().lerp(top, (y - .35) / .65) : y > 0 ? horizon.clone().lerp(sky, y / .35) : horizon.clone().lerp(ground, Math.min(1, -y * 3));
      colors.push(c.r, c.g, c.b);
    }
    dome.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
    env.add(new Mesh(dome, new MeshBasicMaterial({ vertexColors: true, side: BackSide })));
    const sun = new Mesh(new SphereGeometry(1.4, 12, 8), new MeshBasicMaterial({ color: new Color("#fff2cf").multiplyScalar(6) }));
    sun.position.set(5, 7, 4);
    env.add(sun);
    const pmrem = new PMREMGenerator(gl);
    const target = pmrem.fromScene(env, .04);
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
    pmrem.dispose();
    dome.dispose();
    return () => {
      if (scene.environment === target.texture) scene.environment = null;
      target.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

function shaftTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const vertical = ctx.createLinearGradient(0, 0, 0, 256);
  vertical.addColorStop(0, "rgba(255,236,196,0.9)");
  vertical.addColorStop(.6, "rgba(255,226,170,0.35)");
  vertical.addColorStop(1, "rgba(255,220,160,0)");
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, 64, 256);
  // Soft side falloff.
  ctx.globalCompositeOperation = "destination-in";
  const horizontal = ctx.createLinearGradient(0, 0, 64, 0);
  horizontal.addColorStop(0, "rgba(0,0,0,0)");
  horizontal.addColorStop(.5, "rgba(0,0,0,1)");
  horizontal.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, 0, 64, 256);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

// Warm light shafts falling through the barrel vault onto the transept floor: one instanced set of
// crossed, additive quads (a single draw call), slowly breathing unless reduced motion is on.
export function LightShafts({ reducedMotion }) {
  const material = useRef();
  const geo = useMemo(() => new PlaneGeometry(1, 1).translate(0, -.5, 0), []);
  const texture = useMemo(shaftTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const items = useMemo(() => {
    const top = TRANSEPT_VAULT.springHeight + TRANSEPT_VAULT.radius - .6;
    const list = [];
    [-19, -11, -3, 5, 13].forEach((z, i) => {
      const x = (i % 2 ? 1.4 : -1.2);
      const width = 2.2 + (i % 3) * .5;
      for (const twist of [0, Math.PI / 2]) list.push({ p: [x, top, z], s: [width, top, 1], r: [0, twist + .35, -.22] });
    });
    return list;
  }, []);
  useFrame(({ clock }) => {
    if (!material.current || reducedMotion) return;
    material.current.opacity = .2 + Math.sin(clock.elapsedTime * .5) * .05;
  });
  useEffect(() => { if (material.current) material.current.opacity = .2; }, [reducedMotion]);
  return html`<${ShaftMesh} geo=${geo} items=${items} texture=${texture} materialRef=${material} />`;
}

function ShaftMesh({ geo, items, texture, materialRef }) {
  return html`<${Instances} geometry=${geo} items=${items} material="basic" opacity=${.2} side=${DoubleSide} clip=${CUTAWAY}
    materialProps=${{ map: texture, blending: AdditiveBlending, fog: false, toneMapped: false, ref: materialRef }} />`;
}
