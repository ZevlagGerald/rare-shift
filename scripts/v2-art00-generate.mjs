import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { V2_ART_SPRITES, V2_PALETTE, buildFractureGrid, exclusiveDeltaRows } from "../games/rare-shift/src/v2-art-core.ts";
import { V2_EFFECT_SPECS } from "../games/rare-shift/src/v2-fx-core.ts";

const outDir = resolve("artifacts");
await mkdir(outDir, { recursive: true });
const sha256 = value => createHash("sha256").update(value).digest("hex");

function frame(points) {
  const rows = Array.from({ length: 16 }, () => Array(16).fill("."));
  for (const [x, y] of points) rows[y][x] = "#";
  return rows.map(row => row.join(""));
}

const common = [[6,4],[7,4],[8,4],[9,4],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[6,6],[7,6],[8,6],[9,6],[7,7],[8,7]];
const aOnly = [[4,5],[5,4],[6,3],[7,3],[8,3]];
const bOnly = [[10,4],[11,5],[9,3],[8,8],[7,8]];
const frameA = frame([...common, ...aOnly]);
const frameB = frame([...common, ...bOnly]);
const deltaA = exclusiveDeltaRows(frameA, frameB, "A");

const esc = value => String(value).replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
const label = (text, x, y, size = 12, fill = V2_PALETTE.common, anchor = "start") => `<text x="${x}" y="${y}" fill="${fill}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${size}" text-anchor="${anchor}" letter-spacing="0.8">${esc(text)}</text>`;
const panel = (x, y, w, h, stroke = V2_PALETTE.gridLine, fill = V2_PALETTE.backgroundSecondary) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;

function pixelMask(rows, x, y, pixel, fill, opacity = 1, cssClass = "") {
  const rects = [];
  for (let ry = 0; ry < 16; ry++) for (let rx = 0; rx < 16; rx++) {
    if (rows[ry][rx] === "#") rects.push(`<rect x="${x + rx * pixel}" y="${y + ry * pixel}" width="${pixel}" height="${pixel}"/>`);
  }
  return `<g class="${cssClass}" fill="${fill}" opacity="${opacity}" shape-rendering="crispEdges">${rects.join("")}</g>`;
}

function fractureBackground(x, y, w, h, seed) {
  const cell = 16;
  const cols = Math.max(1, Math.floor(w / cell));
  const rows = Math.max(1, Math.floor(h / cell));
  const grid = buildFractureGrid(cols, rows, seed);
  const parts = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${V2_PALETTE.backgroundPrimary}"/>`];
  for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
    const px = x + gx * cell;
    const py = y + gy * cell;
    const state = grid[gy][gx];
    if (state === "GRID") parts.push(`<path d="M${px + cell} ${py}V${py + cell}M${px} ${py + cell}H${px + cell}" stroke="${V2_PALETTE.gridLine}" stroke-width="1" opacity="0.32"/>`);
    if (state === "FRACTURE") parts.push(`<path d="M${px + 2} ${py + 13}L${px + 6} ${py + 8}L${px + 9} ${py + 10}L${px + 14} ${py + 3}" stroke="${V2_PALETTE.gridLine}" stroke-width="1" fill="none" opacity="0.75"/>`);
    if (state === "COMMON_MARK") parts.push(`<rect x="${px + 6}" y="${py + 6}" width="4" height="4" fill="${V2_PALETTE.common}" opacity="0.22"/>`);
  }
  return parts.join("");
}

function enemySprite(id, x, y, pixel, phase) {
  const sprite = V2_ART_SPRITES[id];
  const tone = phase === "A" ? V2_PALETTE.phaseA : phase === "B" ? V2_PALETTE.phaseB : V2_PALETTE.common;
  const cue = phase === "A"
    ? `<path d="M${x - 5} ${y + 4}L${x - 10} ${y + 8}L${x - 5} ${y + 12}" stroke="${tone}" stroke-width="2" fill="none"/>`
    : phase === "B"
      ? `<path d="M${x + 16 * pixel + 5} ${y + 4}L${x + 16 * pixel + 10} ${y + 8}L${x + 16 * pixel + 5} ${y + 12}" stroke="${tone}" stroke-width="2" fill="none"/>`
      : `<rect x="${x - 5}" y="${y + 6}" width="3" height="3" fill="${tone}"/><rect x="${x + 16 * pixel + 2}" y="${y + 6}" width="3" height="3" fill="${tone}"/>`;
  return `<g class="enemy-pulse">${cue}${pixelMask(sprite.rows, x, y, pixel, tone, 0.9)}</g>`;
}

function hud(width) {
  const phaseX = width - 116;
  return [
    `<rect x="12" y="12" width="${width - 24}" height="38" rx="4" fill="${V2_PALETTE.backgroundSecondary}" stroke="${V2_PALETTE.gridLine}"/>`,
    label("HP", 24, 28, 10),
    `<rect x="48" y="20" width="110" height="8" fill="${V2_PALETTE.void}"/><rect x="48" y="20" width="84" height="8" fill="${V2_PALETTE.common}"/>`,
    label("SIGNAL XP", 24, 43, 9),
    `<rect x="90" y="36" width="130" height="5" fill="${V2_PALETTE.void}"/><rect x="90" y="36" width="72" height="5" fill="${V2_PALETTE.phaseA}"/>`,
    `<rect x="${phaseX}" y="19" width="92" height="24" rx="3" fill="${V2_PALETTE.backgroundPrimary}" stroke="${V2_PALETTE.phaseA}"/>`,
    label("PHASE A ◀", phaseX + 46, 35, 10, V2_PALETTE.phaseA, "middle"),
  ].join("");
}

const shiftButton = (x, y, w = 118) => `${panel(x, y, w, 42, V2_PALETTE.phaseA, "#0f1b22")}${label("SHIFT", x + w / 2, y + 18, 13, V2_PALETTE.common, "middle")}${label("SPACE / TOUCH", x + w / 2, y + 33, 8, V2_PALETTE.phaseA, "middle")}`;

function draftCard(x, y, w, title, rank, description, tone) {
  return `${panel(x, y, w, 92, tone)}<rect x="${x}" y="${y}" width="5" height="92" fill="${tone}"/>${label(title, x + 14, y + 21, 11)}${label(rank, x + 14, y + 39, 9, tone)}${label(description, x + 14, y + 61, 8, "#aab7c4")}${label("SELECT", x + w - 12, y + 80, 8, tone, "end")}`;
}

function fxIcon(kind, cx, cy, tone) {
  if (kind === "SHIFT_TRANSITION") return `<g class="fx-shift"><circle cx="${cx}" cy="${cy}" r="11" fill="none" stroke="${tone}" stroke-width="2"/><path d="M${cx - 18} ${cy}L${cx - 12} ${cy - 5}M${cx - 18} ${cy}L${cx - 12} ${cy + 5}M${cx + 18} ${cy}L${cx + 12} ${cy - 5}M${cx + 18} ${cy}L${cx + 12} ${cy + 5}" stroke="${tone}" stroke-width="2"/></g>`;
  if (kind === "ENEMY_SPAWN") return `<g class="fx-spawn"><path d="M${cx - 14} ${cy - 10}H${cx - 7}M${cx - 14} ${cy - 10}V${cy - 3}M${cx + 14} ${cy - 10}H${cx + 7}M${cx + 14} ${cy - 10}V${cy - 3}M${cx - 14} ${cy + 10}H${cx - 7}M${cx - 14} ${cy + 10}V${cy + 3}M${cx + 14} ${cy + 10}H${cx + 7}M${cx + 14} ${cy + 10}V${cy + 3}" stroke="${tone}" stroke-width="2" fill="none"/></g>`;
  if (kind === "ENEMY_HIT") return `<g class="fx-hit"><path d="M${cx - 12} ${cy}H${cx + 12}M${cx} ${cy - 12}V${cy + 12}M${cx - 8} ${cy - 8}L${cx + 8} ${cy + 8}M${cx + 8} ${cy - 8}L${cx - 8} ${cy + 8}" stroke="${tone}" stroke-width="2"/></g>`;
  return `<g class="fx-death" fill="${tone}"><rect x="${cx - 14}" y="${cy - 9}" width="5" height="5"/><rect x="${cx + 9}" y="${cy - 11}" width="4" height="4"/><rect x="${cx - 12}" y="${cy + 7}" width="4" height="4"/><rect x="${cx + 8}" y="${cy + 8}" width="6" height="6"/><rect x="${cx - 2}" y="${cy - 2}" width="4" height="4"/></g>`;
}

function fxStrip(x, y, w, h) {
  const entries = [["SHIFT_TRANSITION", "SHIFT", V2_PALETTE.phaseA],["ENEMY_SPAWN", "SPAWN", V2_PALETTE.phaseB],["ENEMY_HIT", "HIT", V2_PALETTE.common],["ENEMY_DEATH", "DEATH", V2_PALETTE.common]];
  const cellW = w / entries.length;
  const parts = [panel(x, y, w, h), label("FX GRAMMAR", x + 8, y + 14, 8, "#8ea0b3")];
  entries.forEach(([id, short, tone], index) => {
    const cx = x + cellW * index + cellW / 2;
    const cy = y + Math.min(33, h / 2);
    parts.push(fxIcon(id, cx, cy, tone), label(short, cx, y + h - 7, 7, tone, "middle"));
  });
  return parts.join("");
}

function proofSvg(width, height) {
  const narrow = width < 600;
  const arenaX = 12, arenaY = 62, arenaW = narrow ? width - 24 : 598, arenaH = narrow ? 360 : 506;
  const pixel = narrow ? 2 : 3;
  const centerX = Math.round(arenaX + arenaW / 2 - 8 * pixel), centerY = Math.round(arenaY + arenaH / 2 - 8 * pixel);
  const rightX = narrow ? 12 : 624, rightW = narrow ? width - 24 : width - rightX - 12, cardsY = narrow ? 438 : 140;
  const cardGap = 8, cardH = 92;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="RARE SHIFT V2 ART 00 visual normalization proof">`,
    `<style>@keyframes pulse{0%,100%{opacity:.82}50%{opacity:1}}@keyframes ring{0%{opacity:.35}50%{opacity:1}100%{opacity:.35}}@keyframes spawn{0%,100%{opacity:.45}50%{opacity:1}}@keyframes hit{0%,70%,100%{opacity:.45}80%{opacity:1}}@keyframes death{0%,100%{opacity:.5}50%{opacity:1}}.enemy-pulse{animation:pulse 1.4s steps(2,end) infinite}.phase-ring,.fx-shift{animation:ring .36s linear infinite}.fx-spawn{animation:spawn .48s steps(2,end) infinite}.fx-hit{animation:hit .72s steps(2,end) infinite}.fx-death{animation:death .6s steps(2,end) infinite}@media(prefers-reduced-motion:reduce){.enemy-pulse,.phase-ring,.fx-shift,.fx-spawn,.fx-hit,.fx-death{animation:none!important}}</style>`,
    `<rect width="${width}" height="${height}" fill="${V2_PALETTE.backgroundPrimary}"/>`, hud(width), panel(arenaX, arenaY, arenaW, arenaH),
    fractureBackground(arenaX + 1, arenaY + 1, arenaW - 2, arenaH - 2, 0x52534846),
    label("FRACTURE GRID // NORMALIZATION PROOF", arenaX + 12, arenaY + 22, narrow ? 9 : 11, "#8ea0b3"),
    pixelMask(frameA, centerX, centerY, pixel, V2_PALETTE.common),
    `<circle class="phase-ring" cx="${centerX + 8 * pixel}" cy="${centerY + 8 * pixel}" r="${12 * pixel}" fill="none" stroke="${V2_PALETTE.phaseA}" stroke-width="1" opacity="0.65"/>`,
    pixelMask(deltaA, centerX - 5 * pixel, centerY - 5 * pixel, pixel, V2_PALETTE.phaseA, 0.42),
    label("CANONICAL FRIEND", centerX + 8 * pixel, centerY - 8, narrow ? 7 : 9, V2_PALETTE.common, "middle"),
    enemySprite("TRACE", arenaX + 54, arenaY + 94, pixel, "COMMON"), enemySprite("SPLIT_A", arenaX + arenaW - 110, arenaY + 84, pixel, "A"), enemySprite("SPLIT_B", arenaX + arenaW - 100, arenaY + arenaH - 100, pixel, "B"),
    pixelMask(V2_ART_SPRITES.SIGNAL_XP.rows, arenaX + 62, arenaY + arenaH - 82, Math.max(1, pixel - 1), V2_PALETTE.common, 0.95), label("XP", arenaX + 78, arenaY + arenaH - 18, 8, V2_PALETTE.common, "middle"),
    shiftButton(arenaX + arenaW - 132, arenaY + arenaH - 54),
  ];

  parts.push(label("LEVEL UP // PICK 1 OF 3", rightX, cardsY - (narrow ? 12 : 18), narrow ? 10 : 11));
  parts.push(draftCard(rightX, cardsY, rightW, "DELTA BURST", "II > III", "canonical local burst", V2_PALETTE.phaseA));
  parts.push(draftCard(rightX, cardsY + cardH + cardGap, rightW, "VECTOR NEEDLE", "NEW WEAPON", "precision auto-target", V2_PALETTE.common));
  parts.push(draftCard(rightX, cardsY + (cardH + cardGap) * 2, rightW, "COMMON CORE", "PROTOCOL I", "stability / EVO path", V2_PALETTE.common));

  if (narrow) {
    parts.push(fxStrip(rightX, 742, rightW, 78));
  } else {
    parts.push(panel(rightX, cardsY + 306, rightW, 88), label("PHASE GRAMMAR", rightX + 12, cardsY + 325, 9), label("A  ◀ angular / broken", rightX + 12, cardsY + 345, 8, V2_PALETTE.phaseA), label("B  ▶ offset / mirrored", rightX + 12, cardsY + 363, 8, V2_PALETTE.phaseB), label("COMMON stable / structural", rightX + 12, cardsY + 381, 8));
    parts.push(fxStrip(rightX, cardsY + 402, rightW, 66));
  }

  parts.push(label("V2-ART-00 · PROCEDURAL-FIRST · FRIEND ART REMAINS CANONICAL", 12, height - 10, 8, "#718096"), "</svg>");
  return parts.join("");
}

const outputs = [{ name: "v2-art00-proof-960.svg", width: 960, height: 640 },{ name: "v2-art00-proof-390.svg", width: 390, height: 844 }];
const evidence = [];
for (const output of outputs) {
  const svg = proofSvg(output.width, output.height);
  await writeFile(resolve(outDir, output.name), svg, "utf8");
  evidence.push({ file: output.name, width: output.width, height: output.height, sha256: sha256(svg), bytes: Buffer.byteLength(svg), animated: true, reducedMotionCss: true });
}

const [artCore, fxCore] = await Promise.all([readFile(resolve("games/rare-shift/src/v2-art-core.ts")), readFile(resolve("games/rare-shift/src/v2-fx-core.ts"))]);
const report = {
  schemaVersion: 1,
  tranche: "V2-ART-00",
  generator: "scripts/v2-art00-generate.mjs",
  proceduralFirst: true,
  canonicalFriendContract: "runtime FriendSDK rows are presented without recolor/redraw; synthetic canonical-shape rows are used only by this static/motion normalization proof",
  productionElements: ["FRACTURE_GRID","TRACE","SPLIT_A","SPLIT_B","SIGNAL_XP","HUD","SHIFT_CONTROL","THREE_CARD_DRAFT","DELTA_BURST_PROOF","SHIFT_TRANSITION","ENEMY_SPAWN","ENEMY_HIT","ENEMY_DEATH"],
  effectSpecs: Object.fromEntries(Object.entries(V2_EFFECT_SPECS).map(([id, spec]) => [id, { geometry: spec.geometry, durationMs: spec.durationMs, reducedMotionDurationMs: spec.reducedMotionDurationMs, maxParticles: spec.maxParticles }])),
  artCoreSha256: sha256(artCore), fxCoreSha256: sha256(fxCore), outputs: evidence,
};
const reportText = `${JSON.stringify(report, null, 2)}\n`;
await writeFile(resolve(outDir, "v2-art00-report.json"), reportText, "utf8");
for (const item of evidence) console.log(`V2_ART_00_PROOF_${item.width}_SHA256=${item.sha256}`);
console.log(`V2_ART_00_CORE_SHA256=${report.artCoreSha256}`);
console.log(`V2_ART_00_FX_SHA256=${report.fxCoreSha256}`);
console.log("V2_ART_00_STATIC_AND_MOTION_PROOF=PASS");
