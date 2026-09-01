import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const out = "/tmp/bailan-asset-concepts";
mkdirSync(out, { recursive: true });
const ink = "#252332", paper = "#fff1c7";
const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
const svg = (body: string, w = 960, h = 540) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const label = (s: string, x: number, y: number, size = 24, fill = ink) => `<text x="${x}" y="${y}" font-family="Arial,'Noto Sans CJK SC',sans-serif" font-weight="800" font-size="${size}" fill="${fill}">${esc(s)}</text>`;
const card = (title: string, art: string) => svg(`<rect width="100%" height="100%" fill="#fff8e7"/>${art}${label(title, 28, 500, 28)}`);

function person(name: string, x: number, shirt: string, hair: string, extra = ""): string {
  return `<g transform="translate(${x} 0)"><ellipse cx="0" cy="405" rx="92" ry="126" fill="${shirt}" stroke="${ink}" stroke-width="9"/><circle cx="0" cy="220" r="78" fill="#d89a6b" stroke="${ink}" stroke-width="9"/><path d="M-78 212 Q-58 120 0 124 Q60 116 79 216 L45 180 L18 145 L-8 184 L-36 146 L-62 192Z" fill="${hair}" stroke="${ink}" stroke-width="9"/><path d="M-40 224 Q-25 207 -10 224 M10 224 Q25 207 40 224" fill="none" stroke="${ink}" stroke-width="9" stroke-linecap="round"/><path d="M-24 266 Q0 280 24 266" fill="none" stroke="#74363b" stroke-width="8" stroke-linecap="round"/><path d="M-85 350 L-142 458 M85 350 L142 458" stroke="${shirt}" stroke-width="34" stroke-linecap="round"/><path d="M-42 500 L-58 735 M42 500 L58 735" stroke="#293449" stroke-width="38" stroke-linecap="round"/><ellipse cx="-68" cy="744" rx="58" ry="20" fill="#674052" stroke="${ink}" stroke-width="8"/><ellipse cx="68" cy="744" rx="58" ry="20" fill="#674052" stroke="${ink}" stroke-width="8"/>${extra}${label(name, -42, 790, 24)}</g>`;
}

const figures = [
  ["林摆摆 · exhausted outer disciple", person("林", 170, "#708f91", "#24323a", `<path d="M-55 320 Q0 350 55 320" fill="none" stroke="#d7c072" stroke-width="11"/><path d="M-42 198 Q-15 182 0 198 M10 198 Q35 182 55 198" stroke="#493642" stroke-width="11"/>`)],
  ["执事师兄 · overworked sword cultivator", person("师兄", 170, "#d9e2d7", "#292c3a", `<path d="M-90 310 H90" stroke="#9d7042" stroke-width="12"/><path d="M-42 180 Q0 150 42 180" stroke="#b7534e" stroke-width="12" fill="none"/>`)],
  ["青云长老 · controlled authority", person("长老", 170, "#343c56", "#e8e3d4", `<path d="M-62 160 Q0 112 62 160" stroke="#f0ece0" stroke-width="20" fill="none"/><path d="M105 330 V745" stroke="#8e6945" stroke-width="18"/><circle cx="105" cy="320" r="25" fill="#81c9b2" stroke="${ink}" stroke-width="8"/>`)],
  ["摆烂系统 · jade interface orb", `<g transform="translate(170 0)"><circle cx="0" cy="350" r="138" fill="#83cbb6" stroke="${ink}" stroke-width="11"/><circle cx="-45" cy="330" r="17" fill="${ink}"/><circle cx="45" cy="330" r="17" fill="${ink}"/><path d="M-55 390 Q0 430 55 390" fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round"/><path d="M0 180 V78 M-32 108 L0 78 L32 108" stroke="#dcefae" stroke-width="12" fill="none"/><circle cx="0" cy="350" r="166" fill="none" stroke="#d9f4cf" stroke-width="5" stroke-dasharray="10 16"/>${label("系统", -38, 590, 24)}</g>`],
];

const sets = [
  ["Qingyun dormitory", `<rect width="960" height="540" fill="#80684f"/><rect x="40" y="55" width="880" height="380" fill="#dcc79b" stroke="${ink}" stroke-width="10"/><rect x="95" y="160" width="250" height="190" fill="#a9d3d1" stroke="${ink}" stroke-width="9"/><path d="M95 160 L220 90 L345 160" fill="#b34f4f" stroke="${ink}" stroke-width="9"/><rect x="460" y="300" width="360" height="50" fill="#704631" stroke="${ink}" stroke-width="9"/><path d="M490 350 V435 M790 350 V435" stroke="${ink}" stroke-width="15"/><rect x="630" y="120" width="85" height="110" fill="#f1c969" stroke="${ink}" stroke-width="9"/><path d="M672 100 V55 M650 75 H694" stroke="#e6bd66" stroke-width="10"/>${label("外门弟子房 · 可修桌与低床", 70, 480, 25)}`],
  ["Qingyun courtyard", `<rect width="960" height="540" fill="#9ed4cf"/><path d="M0 310 Q160 220 330 300 T650 280 T960 300 V540 H0Z" fill="#699a78"/><path d="M0 430 Q220 350 480 430 T960 410 V540 H0Z" fill="#d7b878"/><circle cx="170" cy="180" r="105" fill="#4c7952" stroke="${ink}" stroke-width="10"/><path d="M170 170 V420 M170 230 L80 175 M170 260 L265 190" stroke="#674b37" stroke-width="18"/><circle cx="490" cy="420" r="105" fill="none" stroke="#74583e" stroke-width="18"/><circle cx="490" cy="420" r="62" fill="none" stroke="#d7c78e" stroke-width="8"/><rect x="700" y="150" width="180" height="155" fill="#d6bd89" stroke="${ink}" stroke-width="10"/><path d="M700 150 L790 92 L880 150" fill="#9d4f4d" stroke="${ink}" stroke-width="10"/>${label("青云外院 · 练功环与告示墙", 70, 480, 25)}`],
  ["Qingyun arena", `<rect width="960" height="540" fill="#526a83"/><path d="M0 180 L210 72 L390 180 L610 65 L960 185 V540 H0Z" fill="#8ba8b1"/><path d="M0 300 H960 V540 H0Z" fill="#b18c62"/><path d="M100 540 L260 300 H700 L860 540Z" fill="#d4b77d" stroke="${ink}" stroke-width="10"/><path d="M260 300 H700 M315 360 H645 M365 420 H595" stroke="#765c45" stroke-width="18"/><circle cx="480" cy="380" r="84" fill="none" stroke="#e7d998" stroke-width="10" stroke-dasharray="18 12"/>${label("青云演武台 · 中央决斗空间", 70, 480, 25)}`],
];

async function main() {
  const all: string[] = [];
  for (const [title, art] of figures) { const name = String(title).split(" ")[0]!.replaceAll("·", ""); const path = join(out, `figure-${name}.png`); await sharp(Buffer.from(card(String(title), art as string))).png().toFile(path); all.push(path); }
  for (const [title, art] of sets) { const name = String(title).split(" ")[1]!; const path = join(out, `set-${name}.png`); await sharp(Buffer.from(card(String(title), art as string))).png().toFile(path); all.push(path); }
  const cols = 2, cw = 480, ch = 300;
  const sheet = await sharp({ create: { width: cw * cols, height: ch * Math.ceil(all.length / cols), channels: 4, background: "#fff8e7" } })
    .composite(all.map((path, i) => ({ input: readFileSync(path), left: (i % cols) * cw, top: Math.floor(i / cols) * ch })))
    .png().toFile(join(out, "contact-sheet.png"));
  writeFileSync(join(out, "README.txt"), "Disposable review concepts only. Not registered production assets. Generated deterministically from native SVG; ComfyUI was unavailable.\n");
  console.log(out);
}
main().catch((e) => { console.error(e); process.exit(1); });
