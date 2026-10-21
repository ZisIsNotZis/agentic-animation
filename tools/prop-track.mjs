// Print one prop's per-frame path from a baked performance.json, and the turning
// points of its y — the mechanical check behind any "it does / does not bounce"
// claim. Usage: node tools/prop-track.mjs <performance.json> <propId> [fromSec] [toSec]
import { readFileSync } from "node:fs";

const [file, prop, fromArg, toArg] = process.argv.slice(2);
if (!file || !prop) {
  console.error("usage: node tools/prop-track.mjs <performance.json> <propId> [fromSec] [toSec]");
  process.exit(2);
}

const perf = JSON.parse(readFileSync(file, "utf8"));
const scene = perf.sceneTrack?.[0];
const track = scene?.motor?.props?.[prop];
if (!track) {
  console.error(`no motor track for prop "${prop}" in ${file}`);
  console.error(`props present: ${Object.keys(scene?.motor?.props ?? {}).join(", ") || "none"}`);
  process.exit(1);
}

const fps = perf.video?.fps ?? 24;
const from = fromArg ? Number(fromArg) : 0;
const to = toArg ? Number(toArg) : Infinity;

console.log(`# ${prop}: ${track.length} frames @ ${fps} fps, floor painted/tracked at y ${track[0]?.y}`);
for (const ev of scene.motor.events ?? []) {
  if (ev.prop === prop) console.log(`# event ${ev.kind} at ${ev.at}s ${JSON.stringify(ev.velocity ?? ev.position ?? {})}`);
}
console.log("frame   t      x        y       dy");
for (let i = 0; i < track.length; i++) {
  const t = i / fps;
  if (t < from || t > to) continue;
  const prev = i === 0 ? undefined : track[i - 1].y;
  const dy = prev === undefined ? "" : (track[i].y - prev).toFixed(2).padStart(7);
  console.log(`${String(i).padStart(5)} ${t.toFixed(3)} ${track[i].x.toFixed(2).padStart(8)} ${track[i].y.toFixed(2).padStart(8)} ${dy}`);
}

console.log("\n# turning points of y (a minimum is an apex, a maximum is a floor contact)");
for (let i = 1; i < track.length - 1; i++) {
  const [a, b, c] = [track[i - 1].y, track[i].y, track[i + 1].y];
  if ((b <= a && b < c) || (b >= a && b > c)) {
    console.log(`  frame ${i} t=${(i / fps).toFixed(3)}s y=${b.toFixed(2)}  apex-or-contact=${b <= a ? "apex" : "contact"}`);
  }
}
