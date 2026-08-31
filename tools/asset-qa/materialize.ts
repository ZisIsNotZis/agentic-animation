import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const LIBRARY = join(ROOT, "library");
const W = 1024;
const H = 2048;
const INK = "#272331";
const PAPER = "#fff0c4";
const SKIN = "#d99b68";
const SKIN2 = "#c97d58";
const RED = "#d95d4f";
const TEAL = "#277e83";
const BLUE = "#4d9fa8";
const GOLD = "#efbd55";
const WOOD = "#70432f";

type Pt = [number, number];
type Asset = { id: string; kind: string; path: string };

const assets: Asset[] = [
  ["figure.office.aqiang.v1", "figure", "characters/aqiang/v1"],
  ["figure.office.awei.v1", "figure", "characters/awei/v1"],
  ["voice.zh.aqiang.v1", "voice", "voices/aqiang/v1"],
  ["voice.zh.awei.v1", "voice", "voices/awei/v1"],
  ["set.office.agent-stage.v1", "set", "sets/office/agent-stage/v1"],
  ["prop.office.desk.v1", "prop", "props/office/desk/v1"],
  ["prop.office.thermos.v1", "prop", "props/office/thermos/v1"],
  ["prop.office.scroll.v1", "prop", "props/office/scroll/v1"],
  ["prop.office.skill-bottle.v1", "prop", "props/office/skill-bottle/v1"],
  ["prop.office.skill-cards.v1", "prop", "props/office/skill-cards/v1"],
  ["prop.office.phone.v1", "prop", "props/office/phone/v1"],
  ["prop.office.notebook.v1", "prop", "props/office/notebook/v1"],
  ["prop.office.mirror.v1", "prop", "props/office/mirror/v1"],
  ["prop.office.flashlight.v1", "prop", "props/office/flashlight/v1"],
  ["prop.office.ask-matt-sign.v1", "prop", "props/office/ask-matt-sign/v1"],
  ["dressing.office.computer-screen.v1", "dressing", "dressing/office/computer-screen/v1"],
  ["dressing.office.keyboard.v1", "dressing", "dressing/office/keyboard/v1"],
  ["dressing.office.coffee-cup.v1", "dressing", "dressing/office/coffee-cup/v1"],
  ["dressing.office.hair-comb.v1", "dressing", "dressing/office/hair-comb/v1"],
  ["dressing.office.ai-standee.v1", "dressing", "dressing/office/ai-standee/v1"],
  ["dressing.office.engine-signs.v1", "dressing", "dressing/office/engine-signs/v1"],
  ["dressing.office.document-trees.v1", "dressing", "dressing/office/document-trees/v1"],
  ["layout.office.desk-talk.v1", "layout", "layouts/office/desk-talk/v1"],
].map(([id, kind, path]) => ({ id, kind, path }));

const VISEMES = ["A", "B", "C", "D", "E", "F", "G", "H", "X"] as const;
const PARTS = ["torso", "head", "arm_u_l", "arm_l_l", "hand_l", "arm_u_r", "arm_l_r", "hand_r", "leg_u_l", "leg_l_l", "foot_l", "leg_u_r", "leg_l_r", "foot_r"] as const;
const J = {
  shoulderL: [392, 600] as Pt, shoulderR: [632, 600] as Pt,
  elbowL: [350, 820] as Pt, elbowR: [674, 820] as Pt,
  wristL: [332, 1010] as Pt, wristR: [692, 1010] as Pt,
  hipL: [452, 1120] as Pt, hipR: [572, 1120] as Pt,
  kneeL: [448, 1470] as Pt, kneeR: [576, 1470] as Pt,
  ankleL: [448, 1780] as Pt, ankleR: [576, 1780] as Pt,
};

function esc(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function svg(inner: string, width = W, height = H): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${inner}</svg>`;
}
function line(a: Pt, b: Pt, color: string, width: number): string {
  return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}
function circle([x, y]: Pt, r: number, fill: string, stroke = INK, sw = 12): string {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}
function ellipse([x, y]: Pt, rx: number, ry: number, fill: string, stroke = INK, sw = 12): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}
function text(label: string, x: number, y: number, size: number, fill = INK, weight = 900, anchor = "middle"): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial,'Noto Sans CJK SC',sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(label)}</text>`;
}
function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}
async function writePng(path: string, content: string): Promise<void> {
  mkdirSync(dirname(path), { recursive: true });
  await sharp(Buffer.from(content)).png().toFile(path);
}
function writeSvg(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content + "\n");
}

function hair(role: "aqiang" | "awei"): string {
  return role === "aqiang"
    ? `<path d="M360 402 Q370 220 512 226 Q654 220 664 402 L625 350 L594 296 L558 345 L518 280 L478 344 L438 292 L402 350Z" fill="#202b32" stroke="${INK}" stroke-width="14"/><path d="M404 270 Q512 184 620 270" fill="none" stroke="${GOLD}" stroke-width="18"/>`
    : `<path d="M350 410 Q348 212 512 220 Q674 215 680 418 L638 354 L605 286 L572 346 L526 270 L486 344 L438 286 L398 362Z" fill="#252333" stroke="${INK}" stroke-width="14"/><path d="M372 286 Q414 210 456 232 M604 232 Q644 214 672 286" fill="none" stroke="#4b3842" stroke-width="20" stroke-linecap="round"/>`;
}
function figurePart(role: "aqiang" | "awei", part: string): string {
  const shirt = role === "aqiang" ? TEAL : RED;
  const dark = role === "aqiang" ? "#185360" : "#682b46";
  const leg = role === "aqiang" ? "#244451" : "#333047";
  const accent = role === "aqiang" ? GOLD : "#f2cf74";
  if (part === "head") {
    return `<rect x="490" y="520" width="44" height="92" rx="18" fill="${SKIN}" stroke="${INK}" stroke-width="12"/>${circle([512, 400], 150, SKIN)}<circle cx="372" cy="420" r="25" fill="${SKIN}" stroke="${INK}" stroke-width="12"/><circle cx="652" cy="420" r="25" fill="${SKIN}" stroke="${INK}" stroke-width="12"/>${hair(role)}${role === "aqiang" ? `<path d="M430 442 Q512 478 594 442" fill="none" stroke="#8c563f" stroke-width="12"/><path d="M416 470 Q512 520 608 470" fill="none" stroke="#a66e52" stroke-width="14"/>` : `<path d="M430 465 Q512 490 594 465 L575 522 Q512 552 449 522Z" fill="#fff2da" stroke="${INK}" stroke-width="10"/>`}`;
  }
  if (part === "torso") {
    const stripes = role === "aqiang"
      ? `<path d="M420 650 V1060 M466 642 V1080 M512 642 V1065 M558 642 V1080 M604 650 V1060" stroke="#f3db86" stroke-width="18"/><path d="M442 642 V1065 M488 642 V1072 M536 642 V1072 M582 642 V1065" stroke="#b85648" stroke-width="9"/>`
      : `<path d="M394 672 Q512 710 630 672" fill="none" stroke="#f6d48b" stroke-width="18"/><path d="M426 760 H598 M426 832 H598 M426 904 H598" stroke="#87334e" stroke-width="12"/>`;
    return `<path d="M390 580 Q512 540 634 580 L670 1110 Q512 1170 354 1110Z" fill="${shirt}" stroke="${INK}" stroke-width="16"/><path d="M430 590 L512 700 L594 590" fill="${dark}" stroke="${INK}" stroke-width="14"/>${stripes}<path d="M420 930 Q512 972 604 930" fill="none" stroke="${accent}" stroke-width="24"/><rect x="480" y="942" width="64" height="72" rx="12" fill="${accent}" stroke="${INK}" stroke-width="12"/>${role === "aqiang" ? `<circle cx="512" cy="972" r="10" fill="${dark}"/>` : `<path d="M492 972 H532" stroke="${dark}" stroke-width="10"/>`}<path d="M388 1080 Q512 1130 636 1080" fill="none" stroke="#f7e1a5" stroke-width="12"/>`;
  }
  const armColor = role === "aqiang" ? "#17636d" : "#7e304a";
  if (part === "arm_u_l") return `${line(J.shoulderL, J.elbowL, dark, 92)}${line(J.shoulderL, J.elbowL, armColor, 66)}${circle(J.shoulderL, 32, accent)}`;
  if (part === "arm_l_l") return `${line(J.elbowL, J.wristL, armColor, 76)}${circle(J.elbowL, 38, accent)}`;
  if (part === "hand_l") return `${circle(J.wristL, 44, SKIN, INK, 12)}<path d="M306 1010 q26 -34 52 0 q26 -34 52 0" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`;
  if (part === "arm_u_r") return `${line(J.shoulderR, J.elbowR, dark, 92)}${line(J.shoulderR, J.elbowR, armColor, 66)}${circle(J.shoulderR, 32, accent)}`;
  if (part === "arm_l_r") return `${line(J.elbowR, J.wristR, armColor, 76)}${circle(J.elbowR, 38, accent)}`;
  if (part === "hand_r") return `${circle(J.wristR, 44, SKIN, INK, 12)}<path d="M666 1010 q26 -34 52 0 q26 -34 52 0" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`;
  if (part === "leg_u_l") return `${line(J.hipL, J.kneeL, leg, 104)}${line(J.hipL, J.kneeL, dark, 76)}`;
  if (part === "leg_l_l") return `${line(J.kneeL, J.ankleL, leg, 92)}`;
  if (part === "foot_l") return ellipse([434, 1810], 78, 36, role === "aqiang" ? "#d96a45" : "#604054");
  if (part === "leg_u_r") return `${line(J.hipR, J.kneeR, leg, 104)}${line(J.hipR, J.kneeR, dark, 76)}`;
  if (part === "leg_l_r") return `${line(J.kneeR, J.ankleR, leg, 92)}`;
  if (part === "foot_r") return ellipse([590, 1810], 78, 36, role === "aqiang" ? "#d96a45" : "#604054");
  return "";
}
function eyes(state: "open" | "half" | "closed"): string {
  if (state === "closed") return `<path d="M420 400 q34 26 68 0 M536 400 q34 26 68 0" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>`;
  const ry = state === "half" ? 10 : 23;
  return `${ellipse([454, 400], 27, ry, "#fff", INK, 10)}${ellipse([570, 400], 27, ry, "#fff", INK, 10)}${circle([454, 402], state === "half" ? 8 : 10, INK, INK, 2)}${circle([570, 402], state === "half" ? 8 : 10, INK, INK, 2)}<path d="M418 348 Q454 324 488 348 M532 348 Q568 324 604 348" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>`;
}
function mouth(v: string): string {
  const sizes: Record<string, [number, number]> = { A: [44, 5], B: [42, 12], C: [38, 22], D: [34, 42], E: [35, 28], F: [25, 18], G: [38, 18], H: [33, 34], X: [44, 0] };
  const [rx, ry] = sizes[v] ?? sizes.X;
  return ry === 0 ? `<path d="M468 480 Q512 494 556 480" fill="none" stroke="#762f35" stroke-width="11" stroke-linecap="round"/>` : ellipse([512, 480], rx, ry, "#762f35", INK, 8);
}
function figurePuppet(id: string): unknown {
  const rig: Record<string, { pivot: Pt; z: number; parent: string | null; attach?: Pt }> = {
    torso: { pivot: [512, 600], z: 40, parent: null }, head: { pivot: [512, 560], z: 60, parent: "torso", attach: [512, 400] },
    arm_u_l: { pivot: J.shoulderL, z: 50, parent: "torso", attach: J.shoulderL }, arm_l_l: { pivot: J.elbowL, z: 50, parent: "arm_u_l", attach: J.elbowL }, hand_l: { pivot: J.wristL, z: 52, parent: "arm_l_l", attach: J.wristL },
    arm_u_r: { pivot: J.shoulderR, z: 50, parent: "torso", attach: J.shoulderR }, arm_l_r: { pivot: J.elbowR, z: 50, parent: "arm_u_r", attach: J.elbowR }, hand_r: { pivot: J.wristR, z: 52, parent: "arm_l_r", attach: J.wristR },
    leg_u_l: { pivot: J.hipL, z: 30, parent: "torso", attach: J.hipL }, leg_l_l: { pivot: J.kneeL, z: 30, parent: "leg_u_l", attach: J.kneeL }, foot_l: { pivot: J.ankleL, z: 31, parent: "leg_l_l", attach: J.ankleL },
    leg_u_r: { pivot: J.hipR, z: 30, parent: "torso", attach: J.hipR }, leg_l_r: { pivot: J.kneeR, z: 30, parent: "leg_u_r", attach: J.kneeR }, foot_r: { pivot: J.ankleR, z: 31, parent: "leg_l_r", attach: J.ankleR },
  };
  return { id, version: 1, rig: "sharedFrame", designSize: [W, H], parts: PARTS.map((part) => ({ id: part, image: `parts/${part}.png`, ...rig[part] })), mouth: { anchor: "head", at: [512, 480], shapes: Object.fromEntries(VISEMES.map((v) => [v, `mouth/${v}.png`])) }, eyes: { blink: ["eyes/open.png", "eyes/half.png", "eyes/closed.png"] }, meta: { grounding: "", notes: ["Hand-authored deterministic flat Chinese skit figure; separate articulated parts, face overlays, and hand sockets."] } };
}
function figurePreview(role: "aqiang" | "awei"): string {
  return svg(`${PARTS.map((p) => figurePart(role, p)).join("")}${eyes("open")}${mouth("X")}`, W, H);
}
async function makeFigure(asset: Asset, role: "aqiang" | "awei"): Promise<void> {
  const dir = join(LIBRARY, asset.path);
  for (const part of PARTS) await writePng(join(dir, "parts", `${part}.png`), svg(figurePart(role, part)));
  for (const v of VISEMES) await writePng(join(dir, "mouth", `${v}.png`), svg(mouth(v)));
  for (const state of ["open", "half", "closed"] as const) await writePng(join(dir, "eyes", `${state}.png`), svg(eyes(state)));
  await writePng(join(dir, "preview.png"), figurePreview(role));
  writeJson(join(dir, "puppet.json"), figurePuppet(asset.id.split(".")[2]!));
  writeJson(join(dir, "sockets.json"), { version: 1, coordinateSpace: "design", sockets: { hand_l: [332, 1010], hand_r: [692, 1010], propPickup: [692, 1010], propHold: [746, 918], point: [750, 780], sip: [620, 505] }, notes: ["hand_l and hand_r are independent sprites; prop actions can target these sockets without repainting the figure."] });
  writeJson(join(dir, "meta.json"), { id: asset.id.split(".v")[0], version: 1, kind: "character", model: { name: "hand-authored-svg-flat", license: "ours" }, seeds: {}, prompts: {}, date: "2026-08-31", approver: "tools/asset-qa/materialize", grounding: [], notes: ["Deterministic native SVG source rasterized to PNG; reusable articulated figure asset, not a placeholder alias."] });
}

const propLabels: Record<string, { label: string; color: string; shape: string }> = {
  desk: { label: "办公桌", color: "#a96842", shape: `<path d="M22 72 H218 V112 H22Z" fill="#a96842" stroke="${INK}" stroke-width="10"/><path d="M42 112 V170 M198 112 V170" stroke="${INK}" stroke-width="14"/>` },
  thermos: { label: "保温杯", color: TEAL, shape: `<path d="M78 50 H162 V154 Q120 176 78 154Z" fill="${TEAL}" stroke="${INK}" stroke-width="10"/><path d="M84 50 V30 H156 V50" fill="${GOLD}" stroke="${INK}" stroke-width="10"/><path d="M162 75 q44 0 28 45 q-8 17 -28 8" fill="none" stroke="${INK}" stroke-width="12"/>` },
  scroll: { label: "规矩卷轴", color: PAPER, shape: `<path d="M48 42 Q92 24 178 42 V150 Q96 134 48 150Z" fill="${PAPER}" stroke="${INK}" stroke-width="10"/><circle cx="48" cy="96" r="22" fill="#d49a54" stroke="${INK}" stroke-width="9"/><circle cx="178" cy="96" r="22" fill="#d49a54" stroke="${INK}" stroke-width="9"/><path d="M76 72 H156 M76 98 H150 M76 124 H136" stroke="#a84b3e" stroke-width="8"/>` },
  "skill-bottle": { label: "技能瓶", color: "#70c5b0", shape: `<path d="M98 38 H142 V64 L160 88 V152 Q120 174 80 152 V88 L98 64Z" fill="#70c5b0" stroke="${INK}" stroke-width="10"/><path d="M98 38 H142" stroke="${GOLD}" stroke-width="14"/><path d="M96 112 Q120 94 144 112 Q120 132 96 112Z" fill="${PAPER}" stroke="${INK}" stroke-width="7"/>` },
  "skill-cards": { label: "技能卡片", color: "#f0c85c", shape: `<rect x="54" y="42" width="116" height="126" rx="5" fill="#f0c85c" stroke="${INK}" stroke-width="10" transform="rotate(-10 112 105)"/><rect x="74" y="30" width="116" height="126" rx="5" fill="#b9d9d0" stroke="${INK}" stroke-width="10" transform="rotate(8 132 92)"/><path d="M98 72 H160 M92 98 H158 M88 124 H140" stroke="#4d6e68" stroke-width="8"/>` },
  phone: { label: "手机", color: "#263243", shape: `<rect x="74" y="24" width="92" height="152" rx="16" fill="#263243" stroke="${INK}" stroke-width="10"/><rect x="86" y="46" width="68" height="104" fill="#a9dfdf" stroke="#dfe9e7" stroke-width="6"/><circle cx="120" cy="161" r="6" fill="#fff0c4"/>` },
  notebook: { label: "记事本", color: "#d9a066", shape: `<rect x="42" y="34" width="156" height="142" rx="8" fill="#d9a066" stroke="${INK}" stroke-width="10"/><path d="M68 42 V168 M88 58 H176 M88 88 H176 M88 118 H160" stroke="#7b4937" stroke-width="8"/>` },
  mirror: { label: "小镜子", color: "#9bd6d6", shape: `<ellipse cx="120" cy="76" rx="66" ry="58" fill="#9bd6d6" stroke="${INK}" stroke-width="10"/><path d="M120 134 V168 M82 168 H158" stroke="#a96b47" stroke-width="14" stroke-linecap="round"/><path d="M84 60 Q120 36 150 58" fill="none" stroke="#fff0c4" stroke-width="10"/>` },
  flashlight: { label: "手电筒", color: "#e2a34f", shape: `<path d="M52 72 H152 L188 94 L152 116 H52Z" fill="#e2a34f" stroke="${INK}" stroke-width="10"/><path d="M84 72 V116 M106 72 V116" stroke="#80513b" stroke-width="8"/><path d="M188 94 L218 74 M188 94 L218 94 M188 94 L218 114" stroke="#f4dc83" stroke-width="8"/>` },
  "ask-matt-sign": { label: "问 Matt", color: "#5e89a4", shape: `<path d="M42 54 H198 V142 H42Z" fill="#5e89a4" stroke="${INK}" stroke-width="10"/><path d="M72 142 V174 M168 142 V174" stroke="${INK}" stroke-width="10"/>${text("问 Matt", 120, 110, 25, PAPER)}` },
};
function propSvg(key: string): string { const p = propLabels[key]!; return svg(`${p.shape}${text(p.label, 120, 202, 24, INK)}`, 240, 220); }
async function makeProp(asset: Asset): Promise<void> {
  const key = asset.id.replace("prop.office.", "").replace(".v1", "");
  const dir = join(LIBRARY, asset.path); const art = propSvg(key);
  writeSvg(join(dir, "art.svg"), art); await writePng(join(dir, "preview.png"), art);
  writeJson(join(dir, "asset.json"), { id: asset.id, version: 1, kind: "prop", source: "art.svg", preview: "preview.png", interaction: { pickup: [120, 108], hold: [120, 84], ground: [120, 174] }, notes: ["Opaque flat-color prop with explicit interaction sockets."] });
}

const dressingLabels: Record<string, { label: string; art: string }> = {
  "computer-screen": { label: "电脑屏幕", art: `<rect x="18" y="22" width="204" height="122" fill="#252a38" stroke="${INK}" stroke-width="10"/><rect x="34" y="38" width="172" height="88" fill="#b9e7e9" stroke="#d8f0e8" stroke-width="5"/><path d="M52 62 H176 M52 84 H144 M52 106 H184" stroke="#d95d4f" stroke-width="8"/><path d="M120 144 V184 M78 190 H162" stroke="${INK}" stroke-width="12"/>` },
  keyboard: { label: "键盘", art: `<rect x="18" y="46" width="204" height="110" rx="12" fill="#b7bbc4" stroke="${INK}" stroke-width="10"/>${Array.from({ length: 24 }, (_, i) => `<rect x="${34 + (i % 8) * 21}" y="${Math.floor(i / 8) * 22 + 64}" width="14" height="12" fill="#4b5360"/>`).join("")}` },
  "coffee-cup": { label: "咖啡杯", art: `<path d="M64 64 H164 V144 Q114 166 64 144Z" fill="#d69a63" stroke="${INK}" stroke-width="10"/><path d="M164 82 q54 0 32 44 q-12 18 -32 8" fill="none" stroke="${INK}" stroke-width="12"/><path d="M86 50 q0 -28 18 0 M122 50 q0 -28 18 0" fill="none" stroke="#fff0c4" stroke-width="8"/>` },
  "hair-comb": { label: "掉发梳子", art: `<path d="M38 98 Q120 38 204 98" fill="none" stroke="#d9a066" stroke-width="20" stroke-linecap="round"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${50 + i * 18} ${88 - Math.abs(4 - i) * 4} V${154 - Math.abs(4 - i) * 2}" stroke="${INK}" stroke-width="7"/>`).join("")}<path d="M62 162 q20 18 42 0 M146 162 q20 18 42 0" fill="none" stroke="#d95d4f" stroke-width="8"/>` },
  "ai-standee": { label: "AI 立牌", art: `<path d="M38 24 H202 V164 H38Z" fill="#87b8b0" stroke="${INK}" stroke-width="10"/><circle cx="88" cy="84" r="16" fill="${INK}"/><circle cx="152" cy="84" r="16" fill="${INK}"/><path d="M78 122 Q120 148 162 122" fill="none" stroke="${INK}" stroke-width="10"/><path d="M100 164 V198 M140 164 V198" stroke="${INK}" stroke-width="10"/>` },
  "engine-signs": { label: "引擎牌", art: `<rect x="20" y="38" width="200" height="124" fill="#d95d4f" stroke="${INK}" stroke-width="10"/>${text("ENGINE", 120, 94, 28, PAPER)}${text("原生能力", 120, 132, 22, INK)}` },
  "document-trees": { label: "文档树", art: `<path d="M120 166 V72 M120 108 L72 74 M120 120 L172 82" stroke="${WOOD}" stroke-width="12"/><circle cx="68" cy="68" r="32" fill="#76ad72" stroke="${INK}" stroke-width="9"/><circle cx="176" cy="76" r="32" fill="#70a967" stroke="${INK}" stroke-width="9"/><circle cx="120" cy="48" r="35" fill="#8bc27e" stroke="${INK}" stroke-width="9"/><rect x="92" y="166" width="56" height="32" fill="${WOOD}" stroke="${INK}" stroke-width="8"/>` },
};
async function makeDressing(asset: Asset): Promise<void> { const key = asset.id.replace("dressing.office.", "").replace(".v1", ""); const d = dressingLabels[key]!; const art = svg(`${d.art}${text(d.label, 120, 216, 22, INK)}`, 240, 240); const dir = join(LIBRARY, asset.path); writeSvg(join(dir, "art.svg"), art); await writePng(join(dir, "preview.png"), art); writeJson(join(dir, "asset.json"), { id: asset.id, version: 1, kind: "dressing", source: "art.svg", preview: "preview.png", semanticRole: key, notes: ["Hard-edge office dressing; can be placed independently from the set background."] }); }

function officeSvg(): string {
  return svg(`<rect width="1920" height="1080" fill="#382c2b"/><rect y="720" width="1920" height="360" fill="#20191a"/><rect x="58" y="110" width="520" height="318" fill="#b9e7e9" stroke="${INK}" stroke-width="18"/><path d="M318 110 V428 M58 269 H578" stroke="#6d4638" stroke-width="16"/><path d="M76 380 Q180 270 268 370 T568 354 V428 H76Z" fill="#79aaa8" stroke="#557b7a" stroke-width="8"/><rect x="748" y="94" width="736" height="296" fill="#b9774d" stroke="${INK}" stroke-width="18"/><rect x="776" y="122" width="680" height="242" fill="#d69a63" stroke="#873f32" stroke-width="12"/>${text("AI 项目作战墙", 1116, 168, 38, PAPER)}<rect x="808" y="202" width="180" height="114" fill="#fff5dc" transform="rotate(-3 898 259)"/>${text("先复述目标", 898, 250, 22, INK)}<rect x="1034" y="206" width="160" height="110" fill="#c8e6d0" transform="rotate(4 1114 261)"/>${text("正例 / 反例", 1114, 258, 21, "#315b4c")}<rect x="1240" y="202" width="176" height="116" fill="#f1c85f" transform="rotate(-2 1328 260)"/>${text("最小权限", 1328, 258, 22, "#674333")}<rect x="92" y="510" width="760" height="46" fill="${WOOD}" stroke="${INK}" stroke-width="10"/><rect x="138" y="556" width="48" height="164" fill="${WOOD}" stroke="${INK}" stroke-width="8"/><rect x="758" y="556" width="48" height="164" fill="${WOOD}" stroke="${INK}" stroke-width="8"/><rect x="1080" y="500" width="690" height="54" fill="${WOOD}" stroke="${INK}" stroke-width="10"/><rect x="1130" y="554" width="48" height="166" fill="${WOOD}" stroke="${INK}" stroke-width="8"/><rect x="1660" y="554" width="48" height="166" fill="${WOOD}" stroke="${INK}" stroke-width="8"/><rect x="0" y="710" width="1920" height="34" fill="#a45f3e"/><rect x="0" y="744" width="1920" height="14" fill="${GOLD}"/>${text("办公区 · Agent 作战台", 88, 66, 36, PAPER, 900, "start")}${text("人定规则 · AI 执行", 1824, 66, 26, "#d9e6d9", 800, "end")}`, 1920, 1080);
}
async function makeSet(asset: Asset): Promise<void> { const dir = join(LIBRARY, asset.path); const art = officeSvg(); writeSvg(join(dir, "scene.svg"), art); await writePng(join(dir, "preview.png"), art); writeJson(join(dir, "asset.json"), { id: asset.id, version: 1, kind: "set", source: "scene.svg", preview: "preview.png", coordinateSpace: "1920x1080", layers: ["back-wall", "window", "project-board", "desk-left", "desk-right", "floor"], safeActorArea: { x: 300, y: 250, width: 1320, height: 700 }, notes: ["Detailed office stage in hard-edged flat fills; dressing remains replaceable by semantic id."] }); }
function layoutSvg(): string { return svg(`<rect width="960" height="540" fill="#fff5dc" stroke="${INK}" stroke-width="8"/><rect x="28" y="30" width="904" height="370" fill="#382c2b" stroke="${INK}" stroke-width="8"/><rect x="76" y="90" width="250" height="140" fill="#b9e7e9" stroke="#6d4638" stroke-width="12"/><rect x="108" y="306" width="330" height="22" fill="${WOOD}"/><rect x="522" y="306" width="330" height="22" fill="${WOOD}"/><circle cx="360" cy="246" r="20" fill="#277e83" stroke="${INK}" stroke-width="7"/>${text("阿伟", 360, 282, 20, PAPER)}<circle cx="600" cy="246" r="20" fill="#d95d4f" stroke="${INK}" stroke-width="7"/>${text("阿强", 600, 282, 20, PAPER)}<rect x="442" y="290" width="76" height="32" fill="#a96842" stroke="${INK}" stroke-width="7"/>${text("语义布局 · desk-talk", 480, 470, 28, INK)}`, 960, 540); }
async function makeLayout(asset: Asset): Promise<void> { const dir = join(LIBRARY, asset.path); const preview = layoutSvg(); writeSvg(join(dir, "preview.svg"), preview); await writePng(join(dir, "preview.png"), preview); writeJson(join(dir, "layout.json"), { id: asset.id, version: 1, coordinateSpace: [1920, 1080], anchors: { desk: [960, 720], awei: [720, 820], aqiang: [1210, 820], screen: [1550, 520], aiStandee: [360, 410], captionSafe: [80, 860, 1760, 160] }, actors: { 阿伟: { anchor: "awei", facing: 1, handSockets: ["hand_l", "hand_r"] }, 阿强: { anchor: "aqiang", facing: -1, handSockets: ["hand_l", "hand_r"] } }, objectPlacements: { 办公桌: { anchor: "desk", z: 20 }, 电脑屏幕: { anchor: [1510, 500], z: 30 }, AI立牌: { anchor: "aiStandee", z: 30 } }, notes: ["Semantic placement separates authored intent from renderer coordinates; interaction uses figure hand sockets."] }); }
async function makeVoice(asset: Asset, role: "aqiang" | "awei"): Promise<void> { const dir = join(LIBRARY, asset.path); const profile = role === "aqiang" ? { register: "稳重、带点看透一切的干练", pitch: "中低", pace: "中速", energy: "收敛但有 punchline", pronunciation: "清晰，短句落点重" } : { register: "焦虑、碎碎念、突然爆发", pitch: "中高", pace: "偏快，惊慌处加速", energy: "外放，反应先于思考", pronunciation: "口语化，吐槽词清楚" }; writeJson(join(dir, "profile.json"), { id: asset.id, version: 1, kind: "voice", language: "zh-CN", provider: "recording-or-configured-tts", license: "ours", profile, delivery: { breathPauses: true, punchlinePauseMs: 180, avoidSinging: true }, notes: ["Metadata only: no unlicensed cloned voice or generated audio is checked in."] }); await writePng(join(dir, "preview.png"), svg(`<rect width="480" height="240" fill="#382c2b"/><circle cx="110" cy="112" r="58" fill="${role === "aqiang" ? TEAL : RED}" stroke="${INK}" stroke-width="10"/>${text(role === "aqiang" ? "强" : "伟", 110, 130, 54, PAPER)}${text(role === "aqiang" ? "稳重 punchline" : "焦虑吐槽", 300, 124, 28, PAPER)}`, 480, 240)); }

function hashDirectory(dir: string): string { const files: string[] = []; const visit = (current: string): void => { for (const name of readdirSync(current).sort()) { const path = join(current, name); if (statSync(path).isDirectory()) visit(path); else files.push(relative(dir, path).split("\\").join("/")); } }; visit(dir); const hash = createHash("sha256"); for (const file of files) { hash.update(file); hash.update("\0"); hash.update(readFileSync(join(dir, file))); hash.update("\0"); } return `sha256:${hash.digest("hex")}`; }
async function main(): Promise<void> {
  for (const asset of assets) {
    if (asset.kind === "figure") await makeFigure(asset, asset.id.includes("aqiang") ? "aqiang" : "awei");
    else if (asset.kind === "voice") await makeVoice(asset, asset.id.includes("aqiang") ? "aqiang" : "awei");
    else if (asset.kind === "set") await makeSet(asset);
    else if (asset.kind === "prop") await makeProp(asset);
    else if (asset.kind === "dressing") await makeDressing(asset);
    else await makeLayout(asset);
  }
  const manifestPath = join(LIBRARY, "registry", "manifest.json"); const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { assets: Array<Record<string, unknown>> };
  for (const asset of assets) { const row = manifest.assets.find((candidate) => candidate.id === asset.id); if (!row) throw new Error(`missing registry row: ${asset.id}`); row.hash = hashDirectory(join(LIBRARY, asset.path)); }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  process.stdout.write(`materialized ${assets.length} immutable assets\n`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error); process.exit(1); });
export { assets, hashDirectory };
