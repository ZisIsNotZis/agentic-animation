// Dry-run keypoint dump: prints per-frame positions of every actor and prop
// straight from a compiled performance.json — no rendering — and flags
// single-frame discontinuities (teleporting props, jumping actors).
// Usage: npx tsx scripts/keypoints.mts <performance.json> [--every N] [--threshold P]
import { readFileSync } from "node:fs";
import { evaluatePerformance } from "../packages/studio/src/performance/evaluate.ts";

const args = process.argv.slice(2);
const manifestPath = args[0];
if (!manifestPath) {
  console.error("usage: npx tsx scripts/keypoints.mts <performance.json> [--every N] [--threshold P]");
  process.exit(2);
}
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const every = Number(flag("--every") ?? 0);
const threshold = Number(flag("--threshold") ?? 60);

type Manifest = {durationInFrames?: number; totalDuration?: number; timebase?: string};
const manifest: Manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const frames = manifest.durationInFrames ?? Math.round((manifest.totalDuration ?? 0) * 24);

type Point = {x: number; y: number};
let previous = new Map<string, Point>();
let flagged = 0;
console.log(`keypoints: ${manifestPath} — ${frames} frames, threshold ${threshold}px${every ? `, sampling every ${every}` : ""}`);
for (let f = 0; f < frames; f++) {
  const state = evaluatePerformance(manifest as never, f);
  const current = new Map<string, Point>();
  for (const actor of state.actors) current.set(`actor ${actor.id}`, {x: actor.x, y: actor.y});
  for (const prop of state.props) current.set(`prop ${prop.id}`, {x: prop.x, y: prop.y});
  if (f === 0) console.log(`objects: ${current.size} (${state.actors.length} actors, ${state.props.length} props)`);
  const lines: string[] = [];
  for (const [id, at] of current) {
    const before = previous.get(id);
    if (!before) continue;
    const delta = Math.hypot(at.x - before.x, at.y - before.y);
    if (delta > threshold) {
      flagged++;
      lines.push(`${id}: ${Math.round(before.x)},${Math.round(before.y)} -> ${Math.round(at.x)},${Math.round(at.y)} (delta ${Math.round(delta)})`);
    }
  }
  if (lines.length) console.log(`f${f}: ${lines.join(" | ")}`);
  else if (every && f % every === 0) {
    const summary = [...current.entries()].map(([id, at]) => `${id.replace(/^(actor|prop) /, "")}:${Math.round(at.x)},${Math.round(at.y)}`).join(" | ");
    console.log(`f${f}: ${summary}`);
  }
  previous = current;
}
console.log(`done: ${flagged} discontinuit${flagged === 1 ? "y" : "ies"} over ${frames} frames`);
