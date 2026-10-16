import { BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CylinderGeometry, DoubleSide, SRGBColorSpace } from "three";
import { useEffect, useMemo } from "react";
import { html } from "../../map-3d/runtime.js";
import { Instances } from "./instancing.js";
import { CUTAWAY } from "./PalaceStructure.js";
import { SIGNPOSTS, ZONE_BY_ID } from "../config/palace-layout.js";

const BOARD = { length: 1.7, height: .42, depth: .08, gap: .52, base: 4.0 };

// Atlas: two rows per board — arrow right (front face) and arrow left (back face) — so both sides read.
function drawAtlas(boards) {
  const canvas = document.createElement("canvas");
  const rowH = 64;
  canvas.width = 320;
  canvas.height = rowH * boards.length * 2;
  const ctx = canvas.getContext("2d");
  boards.forEach((board, i) => {
    const zone = ZONE_BY_ID[board.zone];
    for (const side of [0, 1]) {
      const y = (i * 2 + side) * rowH;
      ctx.fillStyle = "#fffaf0";
      ctx.fillRect(0, y, 320, rowH);
      ctx.fillStyle = zone.color;
      ctx.fillRect(0, y, 320, 8);
      ctx.fillRect(0, y + rowH - 8, 320, 8);
      ctx.fillStyle = "#24412c";
      ctx.textBaseline = "middle";
      ctx.font = "600 28px Kanit, sans-serif";
      const arrow = side === 0 ? "→" : "←";
      if (side === 0) { ctx.textAlign = "left"; ctx.fillText(zone.nameTh, 14, y + rowH / 2 + 1, 250); ctx.textAlign = "right"; ctx.fillText(arrow, 308, y + rowH / 2); } else { ctx.textAlign = "left"; ctx.fillText(arrow, 12, y + rowH / 2); ctx.textAlign = "right"; ctx.fillText(zone.nameTh, 306, y + rowH / 2 + 1, 250); }
    }
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// All board faces merged into one geometry (one draw call) with UVs into the atlas rows.
function faceGeometry(post) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const rows = post.boards.length * 2;
  post.boards.forEach((board, i) => {
    const y = BOARD.base - i * BOARD.gap;
    const dirX = Math.sin(board.heading);
    const dirZ = Math.cos(board.heading);
    // Board spans from the post outward along its heading; faces are offset along the normal.
    const nx = dirZ;
    const nz = -dirX;
    for (const side of [0, 1]) {
      // Viewed from −normal, "outward" runs to the viewer's right, so the front (→) face sits there.
      const sign = side === 0 ? -1 : 1;
      const off = (BOARD.depth / 2 + .002) * sign;
      const v0 = 1 - (i * 2 + side) / rows;
      const v1 = 1 - (i * 2 + side + 1) / rows;
      const base = positions.length / 3;
      const corner = (along, up) => [post.x + dirX * along + nx * off, y + up, post.z + dirZ * along + nz * off];
      // Front face: arrow (texture right) at the outer end; back face mirrored.
      const near = .15;
      const far = .15 + BOARD.length;
      const pts = side === 0
        ? [corner(near, -BOARD.height / 2), corner(far, -BOARD.height / 2), corner(far, BOARD.height / 2), corner(near, BOARD.height / 2)]
        : [corner(far, -BOARD.height / 2), corner(near, -BOARD.height / 2), corner(near, BOARD.height / 2), corner(far, BOARD.height / 2)];
      pts.forEach((p) => positions.push(...p));
      uvs.push(0, v1, 1, v1, 1, v0, 0, v0);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function boardBlocks(post) {
  return post.boards.map((board, i) => {
    const along = .15 + BOARD.length / 2;
    return {
      p: [post.x + Math.sin(board.heading) * along, BOARD.base - i * BOARD.gap, post.z + Math.cos(board.heading) * along],
      s: [BOARD.length, BOARD.height + .06, BOARD.depth],
      r: [0, board.heading - Math.PI / 2, 0],
      color: ZONE_BY_ID[board.zone].color,
    };
  });
}

export function Signposts({ fontsReady }) {
  const geo = useMemo(() => ({ box: new BoxGeometry(1, 1, 1), pole: new CylinderGeometry(.12, .15, 1, 8).translate(0, .5, 0) }), []);
  const posts = useMemo(() => SIGNPOSTS.map((post) => ({ post, faces: faceGeometry(post) })), []);
  const allBoards = useMemo(() => SIGNPOSTS.flatMap((post) => post.boards), []);
  const texture = useMemo(() => drawAtlas(allBoards), [allBoards, fontsReady]);
  useEffect(() => () => texture.dispose(), [texture]);
  const poles = useMemo(() => SIGNPOSTS.map((post) => ({ p: [post.x, 0, post.z], s: [1, BOARD.base + .5, 1] })), []);
  const blocks = useMemo(() => SIGNPOSTS.flatMap(boardBlocks), []);
  return html`<group>
    <${Instances} geometry=${geo.pole} items=${poles} color="#b98b5e" castShadow roughness=${.85} clip=${CUTAWAY} />
    <${Instances} geometry=${geo.box} items=${blocks} castShadow roughness=${.8} clip=${CUTAWAY} />
    ${posts.map(({ post, faces }) => html`<mesh key=${`${post.x},${post.z}`} geometry=${faces} raycast=${() => null}>
      <meshStandardMaterial map=${texture} roughness=${.8} side=${DoubleSide} clippingPlanes=${CUTAWAY} />
    </mesh>`)}
  </group>`;
}
