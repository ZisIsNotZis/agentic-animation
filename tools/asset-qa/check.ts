import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parse } from "yaml";
import sharp from "sharp";
import { assets, hashDirectory } from "./materialize";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const LIBRARY = join(ROOT, "library");
const EPISODE = join(ROOT, "episodes", "ai-work-adventure", "episode.yml");
const OUT = join(ROOT, "episodes", "ai-work-adventure", "build", "asset-qa");
const CARD_W = 320;
const CARD_H = 270;
const COLS = 5;

function fail(message: string): never { throw new Error(`asset QA: ${message}`); }
function files(dir: string): string[] {
  const result: string[] = [];
  const visit = (current: string): void => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) visit(path);
      else result.push(relative(dir, path).split("\\").join("/"));
    }
  };
  visit(dir);
  return result;
}
function episodeIds(): string[] {
  const episode = parse(readFileSync(EPISODE, "utf8")) as {
    actors: Record<string, { use: string; voice: string }>;
    locations: Record<string, { use: string }>;
    objects: Record<string, { use: string }>;
  };
  return [
    ...Object.values(episode.actors).flatMap((actor) => [actor.use, actor.voice]),
    ...Object.values(episode.locations).map((location) => location.use),
    ...Object.values(episode.objects).map((object) => object.use),
    "layout.office.desk-talk.v1",
  ];
}
function manifestHash(path: string): string {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}
function cardLabel(asset: (typeof assets)[number]): string {
  const short = asset.id.replace(/^figure\.office\./, "").replace(/^voice\.zh\./, "").replace(/^set\.office\./, "").replace(/^prop\.office\./, "").replace(/^dressing\.office\./, "").replace(/^layout\.office\./, "").replace(/\.v1$/, "");
  return `${asset.kind.toUpperCase()}  ${short}`;
}
async function main(): Promise<void> {
  const manifest = JSON.parse(readFileSync(join(LIBRARY, "registry", "manifest.json"), "utf8")) as { assets: Array<{ id: string; path: string; hash: string }> };
  const episode = episodeIds();
  if (new Set(episode).size !== 23) fail(`episode references ${new Set(episode).size} unique assets, expected 23`);
  if (assets.length !== 23) fail(`materializer declares ${assets.length} assets, expected 23`);
  const rows: Array<{ id: string; kind: string; path: string; files: number; hash: string }> = [];
  for (const asset of assets) {
    const row = manifest.assets.find((candidate) => candidate.id === asset.id);
    if (!row) fail(`missing registry row for ${asset.id}`);
    const dir = join(LIBRARY, asset.path);
    if (!existsSync(dir)) fail(`missing asset directory ${asset.path}`);
    const names = files(dir);
    if (!names.includes("preview.png")) fail(`${asset.id} has no preview.png`);
    if (row!.path !== asset.path) fail(`${asset.id} registry path is ${row!.path}, expected ${asset.path}`);
    const actual = hashDirectory(dir);
    if (row!.hash !== actual) fail(`${asset.id} hash is stale: ${row!.hash} != ${actual}`);
    for (const name of names.filter((name) => name.endsWith(".svg"))) {
      const source = readFileSync(join(dir, name), "utf8");
      if (/gradient|filter=|feGaussianBlur|image href=/i.test(source)) fail(`${asset.id}/${name} contains a forbidden gradient/filter/raster reference`);
    }
    rows.push({ id: asset.id, kind: asset.kind, path: asset.path, files: names.length, hash: actual });
  }
  const used = new Set(episode);
  if (rows.some((row) => !used.has(row.id))) fail("materializer includes an asset not referenced by episode.yml");
  const missing = episode.filter((id) => !rows.some((row) => row.id === id));
  if (missing.length) fail(`episode references missing material: ${missing.join(", ")}`);
  const manifestText = readFileSync(join(LIBRARY, "registry", "manifest.json"), "utf8");
  if (manifestText.includes("_placeholder")) fail("registry contains a placeholder reference");

  const cards = await Promise.all(assets.map(async (asset) => {
    const preview = await sharp(join(LIBRARY, asset.path, "preview.png"))
      .resize(CARD_W - 20, CARD_H - 54, { fit: "contain", background: { r: 255, g: 245, b: 220, alpha: 1 } })
      .png().toBuffer();
    const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}"><rect width="100%" height="100%" fill="#fff5dc"/><rect x="0" y="0" width="100%" height="${CARD_H - 38}" fill="#fff0c4"/><text x="10" y="${CARD_H - 16}" font-family="Arial,sans-serif" font-size="16" font-weight="800" fill="#272331">${cardLabel(asset)}</text></svg>`;
    return { input: preview, label: Buffer.from(label) };
  }));
  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync(OUT, { recursive: true });
  const rowsCount = Math.ceil(cards.length / COLS);
  const sheet = sharp({ create: { width: CARD_W * COLS, height: CARD_H * rowsCount, channels: 4, background: { r: 39, g: 35, b: 49, alpha: 1 } } });
  const composites: Array<{ input: Buffer; left: number; top: number }> = [];
  for (let i = 0; i < cards.length; i++) {
    const x = (i % COLS) * CARD_W;
    const y = Math.floor(i / COLS) * CARD_H;
    composites.push({ input: cards[i]!.label, left: x, top: y });
    composites.push({ input: cards[i]!.input, left: x + 10, top: y + 8 });
  }
  const output = join(OUT, "asset-contact-sheet.png");
  await sheet.composite(composites).png().toFile(output);
  const receipt = { generatedBy: "tools/asset-qa/check.ts", deterministic: true, episode: "ai-work-adventure", count: rows.length, output: "asset-contact-sheet.png", assets: rows };
  const receiptPath = join(OUT, "receipt.json");
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
  console.log(`asset QA passed: ${rows.length}/23 assets; ${output}`);
  console.log(`receipt: ${receiptPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error); process.exit(1); });

export { episodeIds, main };
