// Print one prop's per-frame path from a baked performance.json, and the turning
// points of its y — the mechanical check behind any "it does / does not bounce"
// and "it does / does not land" claim.
// Usage: node tools/prop-track.mjs <performance.json> <propId> [fromSec] [toSec]
//
// The floor this compares against comes from the SET (`scene.supportSurfaces`,
// in the set's 1920x1080 stage frame), never from the prop: a prop's first
// frame is where the prop was staged, so using it as "the floor" would pass a
// projectile that floats above the painted floor whenever it was staged there.
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

console.log(`# ${prop}: ${track.length} frames @ ${fps} fps`);
console.log(`# prop at frame 0: y ${track[0]?.y?.toFixed(2)} — the line this prop was STAGED on, not the floor`);

// The set's declared surfaces are normalized against the set's own stage frame.
const stageHeight = scene?.setViewBox?.[1] ?? 1080;
const surfaces = (scene?.supportSurfaces ?? []).map((surface) => ({name: surface.name, x: surface.x, y: surface.y * stageHeight}));
const floor = surfaces.reduce((lowest, surface) => (surface.y > lowest.y ? surface : lowest), {name: "none", x: [0, 0], y: -Infinity});
if (surfaces.length) {
  console.log(`# set surfaces: ${surfaces.map((s) => `${s.name} at y ${s.y.toFixed(2)} (x ${s.x.map((v) => Math.round(v * (scene.setViewBox?.[0] ?? 1920))).join("-")})`).join(", ")}`);
  console.log(`# SET FLOOR: ${floor.name} at y ${floor.y.toFixed(2)} — the line a prop on the ground must touch`);
} else {
  console.log("# this performance.json records no set support surface: the floor is UNKNOWN here, and a");
  console.log("# landing claim cannot be checked from this file alone.");
}

for (const ev of scene.motor.events ?? []) {
  if (ev.prop === prop) console.log(`# event ${ev.kind} at ${ev.at}s ${JSON.stringify(ev.velocity ?? ev.position ?? {})}`);
}
console.log("frame   t      x        y       dy      above-floor");
for (let i = 0; i < track.length; i++) {
  const t = i / fps;
  if (t < from || t > to) continue;
  const prev = i === 0 ? undefined : track[i - 1].y;
  const dy = prev === undefined ? "" : (track[i].y - prev).toFixed(2).padStart(7);
  const gap = Number.isFinite(floor.y) ? (floor.y - track[i].y).toFixed(2).padStart(8) : "   n/a";
  console.log(`${String(i).padStart(5)} ${t.toFixed(3)} ${track[i].x.toFixed(2).padStart(8)} ${track[i].y.toFixed(2).padStart(8)} ${dy.padEnd(7)} ${gap}`);
}

console.log("\n# turning points of y (a minimum is an apex, a maximum is a floor contact)");
for (let i = 1; i < track.length - 1; i++) {
  const [a, b, c] = [track[i - 1].y, track[i].y, track[i + 1].y];
  if ((b <= a && b < c) || (b >= a && b > c)) {
    const which = b <= a ? "apex" : "contact";
    const gap = Number.isFinite(floor.y) ? `, ${(floor.y - b).toFixed(2)} px above the floor` : "";
    console.log(`  frame ${i} t=${(i / fps).toFixed(3)}s y=${b.toFixed(2)}  ${which}${which === "contact" ? gap : ""}`);
  }
}

if (Number.isFinite(floor.y)) {
  const rest = track[track.length - 1];
  const gap = floor.y - rest.y;
  const verdict = Math.abs(gap) <= 1 ? "ON the floor line" : `${gap.toFixed(2)} px ABOVE the floor line`;
  console.log(`\n# rest (last frame, t=${((track.length - 1) / fps).toFixed(3)}s): y ${rest.y.toFixed(2)} — ${verdict} ${floor.y.toFixed(2)}`);
  const landings = track.filter((frame, i) => i > 0 && i < track.length - 1 && frame.y >= track[i - 1].y && frame.y > track[i + 1].y);
  if (landings.length) {
    console.log(`# landings: ${landings.map((frame) => `${(frame.y).toFixed(2)} (${(floor.y - frame.y).toFixed(2)} px above)`).join(", ")}`);
  } else {
    console.log("# landings: none — the prop never comes down to a turning point");
  }
}
