import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { execa } from "execa";
import { z } from "zod";
import {
  LibraryIndexSchema,
  LibraryMetaSchema,
  PuppetSchema,
  STANDARD_PARTS,
  VISEMES,
  IdSchema,
  readJson,
  resolvePath,
  writeJson,
  type ImageGenAdapter,
  type LibraryMeta,
  type Part,
  type Puppet,
  type StandardPart,
} from "@anim/core";
import type { StageContext } from "../runtime/context";
import {
  DEFAULT_LAYOUT,
  HouseStyleSchema,
  PART_PROMPTS,
  RIG_DESIGN_SIZE,
  RIG_ROOT_ANCHOR,
  STARTER_HOUSE_STYLE,
  TARGET_SIZE,
  VISEME_PROMPTS,
  briefTemplate,
  type HouseStyle,
} from "./charDefaults";

// --- shared paths + helpers ------------------------------------------------

interface Paths {
  libraryRoot: string;
  charsRoot: string;
  charRoot: string;
  draft: string;
  styleDir: string;
  houseStyle: string;
}

function paths(ctx: StageContext, id: string): Paths {
  const libraryRoot = resolvePath(ctx.rootDir, ctx.config.paths.library);
  const charsRoot = join(libraryRoot, "characters");
  const charRoot = join(charsRoot, id);
  return {
    libraryRoot,
    charsRoot,
    charRoot,
    draft: join(charRoot, "draft"),
    styleDir: join(libraryRoot, "style"),
    houseStyle: join(libraryRoot, "style", "house-style.json"),
  };
}

function assertId(id: string): void {
  const r = IdSchema.safeParse(id);
  if (!r.success) throw new Error(`invalid character id "${id}": ${r.error.issues[0]?.message}`);
}

function readHouseStyle(p: Paths): HouseStyle {
  if (!existsSync(p.houseStyle)) {
    throw new Error(`house style ${p.houseStyle} missing. Run 'anim char new <id>' once to create it.`);
  }
  const raw = JSON.parse(readFileSync(p.houseStyle, "utf8"));
  const parsed = HouseStyleSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`house style ${p.houseStyle} is invalid: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }
  return parsed.data;
}

/** Round a normalization scale to 4 dp so the rig JSON stays diff-stable. */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Read (width,height) from a PNG's IHDR without decoding — for the node cutter. */
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  if (buf.length < 24 || buf.readUInt32BE(12) !== 0x49484452) {
    throw new Error(`${path} is not a PNG (no IHDR).`);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function imagegen(ctx: StageContext): ImageGenAdapter {
  return ctx.registry.require("imagegen", ctx.config.adapters.imagegen) as ImageGenAdapter;
}

// --- gen-inputs (editable subject the agent fills) -------------------------

const GenInputsSchema = z.object({ subject: z.string().min(1) });
type GenInputs = z.infer<typeof GenInputsSchema>;

function readGenInputs(p: Paths, id: string): GenInputs {
  const path = join(p.draft, "gen-inputs.json");
  if (!existsSync(path)) return { subject: id.replace(/_/g, " ") };
  const parsed = GenInputsSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  return parsed.success ? parsed.data : { subject: id.replace(/_/g, " ") };
}

// --- gen-meta (seeds + prompts, frozen into meta.json on approve) ----------

const GenMetaSchema = z.object({
  model: z.object({ name: z.string(), license: z.string() }),
  seeds: z.record(z.string(), z.number().int()),
  prompts: z.record(z.string(), z.string()),
});
type GenMeta = z.infer<typeof GenMetaSchema>;

// ===========================================================================
// char new
// ===========================================================================

export interface CharNewOptions {
  force?: boolean;
}

export function charNew(ctx: StageContext, id: string, opts: CharNewOptions): void {
  assertId(id);
  const p = paths(ctx, id);

  // Seed the house style once (draft) if the library has none yet.
  if (!existsSync(p.houseStyle)) {
    writeJson(p.houseStyle, HouseStyleSchema, STARTER_HOUSE_STYLE);
    process.stdout.write(`created ${p.houseStyle} (starter Hindu-miniature style, draft)\n`);
  }
  const house = readHouseStyle(p);

  if (existsSync(p.draft) && !opts.force) {
    throw new Error(`character "${id}" already has a draft at ${p.draft}. Pass --force to reset it.`);
  }
  mkdirSync(p.draft, { recursive: true });

  writeFileSync(join(p.draft, "brief.md"), briefTemplate(id, house.style));
  writeJson(join(p.draft, "gen-inputs.json"), GenInputsSchema, {
    subject: `${id.replace(/_/g, " ")}, ${house.style}`,
  });

  ctx.log.info(`char new "${id}"`, { draft: p.draft });
  process.stdout.write(
    `character "${id}" draft scaffolded at ${p.draft}\n` +
      `  edit brief.md + gen-inputs.json, then: anim char gen ${id} --dry-run\n`,
  );
}

// ===========================================================================
// char gen
// ===========================================================================

export interface CharGenOptions {
  dryRun?: boolean;
  seed?: number;
}

interface GenJob {
  name: string;
  workflowId: string;
  positive: string;
  width: number;
  height: number;
  outDir: string;
  /** Uses the anchor as an edit source (real runs only; skipped in --dry-run). */
  fromAnchor: boolean;
}

export async function charGen(ctx: StageContext, id: string, opts: CharGenOptions): Promise<void> {
  assertId(id);
  const p = paths(ctx, id);
  if (!existsSync(p.draft)) throw new Error(`no draft for "${id}". Run 'anim char new ${id}' first.`);

  const house = readHouseStyle(p);
  const { subject } = readGenInputs(p, id);
  const model = process.env.COMFYUI_MODEL ?? house.model.name;
  const negative = house.negativePrompts.join(", ");
  const baseSeed = opts.seed ?? ctx.config.seed;
  const gen = imagegen(ctx);

  const sheets = join(p.draft, "sheets");
  const rawParts = join(p.draft, "raw-parts");
  const rawMouth = join(p.draft, "raw-mouth");

  const frag = house.promptFragments;
  const jobs: GenJob[] = [
    {
      name: "anchor",
      workflowId: "anchor",
      positive: [frag.global, frag.portrait, subject].join(", "),
      width: 1024,
      height: 1536,
      outDir: sheets,
      fromAnchor: false,
    },
    {
      name: "turnaround",
      workflowId: "edit-turnaround",
      positive: [frag.global, "three-quarter turnaround and expression sheet", subject].join(", "),
      width: 1536,
      height: 1024,
      outDir: sheets,
      fromAnchor: true,
    },
    ...STANDARD_PARTS.map((part): GenJob => ({
      name: part,
      workflowId: "part-sheet",
      positive: [frag.global, frag.partSheet, PART_PROMPTS[part], subject].join(", "),
      width: 1024,
      height: 1024,
      outDir: rawParts,
      fromAnchor: true,
    })),
    ...VISEMES.map((v): GenJob => ({
      name: v,
      workflowId: "mouth-shapes",
      positive: [frag.global, frag.mouth, VISEME_PROMPTS[v] ?? "", subject].join(", "),
      width: 512,
      height: 512,
      outDir: rawMouth,
      fromAnchor: true,
    })),
  ];

  const meta: GenMeta = { model: { name: model, license: house.model.license }, seeds: {}, prompts: {} };
  let anchorPath: string | undefined;

  for (const [i, job] of jobs.entries()) {
    const seed = baseSeed + i;
    meta.seeds[job.name] = seed;
    meta.prompts[job.name] = job.positive;

    const inputs: Record<string, unknown> = {
      positive: job.positive,
      negative,
      model,
      width: job.width,
      height: job.height,
      filenamePrefix: job.name,
    };
    if (opts.dryRun) {
      inputs.__mock = true;
      inputs.__mockNames = [job.name];
    } else if (job.fromAnchor) {
      if (!anchorPath) throw new Error("internal: anchor must be generated before edit jobs.");
      inputs.__imagePath = anchorPath;
    }

    const { images } = await gen.generate({ workflowId: job.workflowId, inputs, seed, outDir: job.outDir });
    if (!images.length) throw new Error(`char gen: workflow "${job.workflowId}" produced no image for "${job.name}".`);
    const produced = images[0]!;
    // Normalise to a stable name (mock already writes <name>.png).
    const dest = join(job.outDir, `${job.name}.png`);
    if (produced !== dest) {
      cpSync(produced, dest);
      rmSync(produced, { force: true });
    }
    if (job.name === "anchor") anchorPath = dest;

    process.stdout.write(`  gen ${opts.dryRun ? "(mock) " : ""}${job.workflowId}:${job.name} → ${basename(dest)}\n`);
  }

  writeJson(join(p.draft, "gen-meta.json"), GenMetaSchema, meta);
  ctx.log.info(`char gen "${id}"`, { images: jobs.length, dryRun: Boolean(opts.dryRun) });
  process.stdout.write(
    `char gen "${id}" wrote ${jobs.length} images${opts.dryRun ? " (placeholder)" : ""}.\n` +
      `  next: anim char cut ${id}\n`,
  );
}

// ===========================================================================
// char cut  (rembg + trim → draft/parts + draft/mouth)
// ===========================================================================

export interface CharCutOptions {
  engine?: string; // "python" (default, falls back) | "node"
  noRembg?: boolean;
}

interface CutItemOut {
  id: string;
  path: string;
  width: number;
  height: number;
  bbox: [number, number, number, number];
}

export async function charCut(ctx: StageContext, id: string, opts: CharCutOptions): Promise<void> {
  assertId(id);
  const p = paths(ctx, id);
  const rawParts = join(p.draft, "raw-parts");
  const rawMouth = join(p.draft, "raw-mouth");
  if (!existsSync(rawParts)) throw new Error(`no generated parts for "${id}". Run 'anim char gen ${id}' first.`);

  const partsOut = join(p.draft, "parts");
  const mouthOut = join(p.draft, "mouth");
  mkdirSync(partsOut, { recursive: true });
  mkdirSync(mouthOut, { recursive: true });

  const items = [
    ...STANDARD_PARTS.map((part) => ({
      id: part,
      in: join(rawParts, `${part}.png`),
      out: join(partsOut, `${part}.png`),
      kind: "part" as const,
    })),
    ...VISEMES.map((v) => ({
      id: v,
      in: join(rawMouth, `${v}.png`),
      out: join(mouthOut, `${v}.png`),
      kind: "mouth" as const,
    })),
  ];
  for (const it of items) {
    if (!existsSync(it.in)) throw new Error(`char cut: expected ${it.in} (from 'anim char gen'). Missing.`);
  }

  const usePython = opts.engine !== "node";
  let results: Record<string, CutItemOut> | undefined;
  if (usePython) {
    results = await runPythonCutter(ctx, items, !opts.noRembg);
    if (!results) process.stdout.write("  cut: python/rembg unavailable — using node passthrough (no background removal).\n");
  }
  if (!results) results = nodeCutter(items);

  const cut = {
    parts: STANDARD_PARTS.map((part) => rel(results![part]!, p.draft)),
    mouth: VISEMES.map((v) => rel(results![v]!, p.draft)),
  };
  writeJson(join(p.draft, "cut.json"), CutFileSchema, cut);
  ctx.log.info(`char cut "${id}"`, { parts: STANDARD_PARTS.length, mouth: VISEMES.length });
  process.stdout.write(`char cut "${id}" produced ${STANDARD_PARTS.length} parts + ${VISEMES.length} mouth shapes.\n  next: anim char rig ${id}\n`);
}

const CutEntrySchema = z.object({
  id: z.string().min(1), // part id (lowercase) or viseme (A–H, X, uppercase)
  path: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});
const CutFileSchema = z.object({
  parts: z.array(CutEntrySchema),
  mouth: z.array(CutEntrySchema),
});

function rel(entry: CutItemOut, draftDir: string): z.infer<typeof CutEntrySchema> {
  return {
    id: entry.id,
    path: entry.path.startsWith(draftDir) ? entry.path.slice(draftDir.length + 1) : entry.path,
    width: entry.width,
    height: entry.height,
    bbox: entry.bbox,
  };
}

/** Node passthrough: copy already-alpha PNGs, record full-frame bbox (no trim). */
function nodeCutter(items: { id: string; in: string; out: string }[]): Record<string, CutItemOut> {
  const out: Record<string, CutItemOut> = {};
  for (const it of items) {
    cpSync(it.in, it.out);
    const { width, height } = pngSize(it.out);
    out[it.id] = { id: it.id, path: it.out, width, height, bbox: [0, 0, width, height] };
  }
  return out;
}

/** Shell out to py/parts/cut.py (rembg + trim). Returns undefined if unavailable. */
async function runPythonCutter(
  ctx: StageContext,
  items: { id: string; in: string; out: string }[],
  removeBg: boolean,
): Promise<Record<string, CutItemOut> | undefined> {
  const script = resolvePath(ctx.rootDir, "py/parts/cut.py");
  if (!existsSync(script)) return undefined;
  const payload = JSON.stringify({ removeBg, items: items.map((i) => ({ id: i.id, in: i.in, out: i.out })) });
  const interpreters = [process.env.ANIM_PYTHON, "python3", "python"].filter((x): x is string => Boolean(x));
  for (const py of interpreters) {
    try {
      const { stdout } = await execa(py, [script], { input: payload, reject: true });
      const parsed = JSON.parse(stdout) as { items: CutItemOut[] };
      const out: Record<string, CutItemOut> = {};
      for (const it of parsed.items) out[it.id] = it;
      return out;
    } catch {
      // try next interpreter / fall back to node
    }
  }
  return undefined;
}

// ===========================================================================
// char rig  (assemble + validate puppet.json)
// ===========================================================================

export function charRig(ctx: StageContext, id: string, _opts: Record<string, unknown>): void {
  assertId(id);
  const p = paths(ctx, id);
  const cutPath = join(p.draft, "cut.json");
  if (!existsSync(cutPath)) throw new Error(`no cut.json for "${id}". Run 'anim char cut ${id}' first.`);
  const cut = readJson(cutPath, CutFileSchema);

  const dims = new Map<string, { w: number; h: number }>();
  const partPath = new Map<string, string>();
  for (const e of cut.parts) {
    dims.set(e.id, { w: e.width, h: e.height });
    partPath.set(e.id, e.path);
  }

  const missingParts = STANDARD_PARTS.filter((s) => !partPath.has(s));
  if (missingParts.length) throw new Error(`char rig "${id}": missing standard parts: ${missingParts.join(", ")}.`);
  const mouthById = new Map(cut.mouth.map((m) => [m.id, m.path]));
  const missingVis = VISEMES.filter((v) => !mouthById.has(v));
  if (missingVis.length) throw new Error(`char rig "${id}": missing mouth visemes: ${missingVis.join(", ")}.`);

  // nativeAttach rig: pivots are part-local (own trimmed-image pixel space);
  // `attach` for a child is a point on the PARENT in the parent's own space; the
  // root (torso) `attach` is the design-space anchor for its pivot; `norm`
  // normalizes each part's arbitrary native size onto the shared TARGET_SIZE
  // skeleton so heterogeneously-generated parts read as one figure (§8.2).
  const parts: Part[] = STANDARD_PARTS.map((partId: StandardPart) => {
    const layout = DEFAULT_LAYOUT[partId];
    const d = dims.get(partId)!;
    const target = TARGET_SIZE[partId];
    const part: Part = {
      id: partId,
      image: partPath.get(partId)!,
      pivot: [Math.round(d.w * layout.pivotFrac[0]), Math.round(d.h * layout.pivotFrac[1])],
      z: layout.z,
      parent: layout.parent,
      norm: [round4(target[0] / d.w), round4(target[1] / d.h)],
    };
    if (layout.parent) {
      const pd = dims.get(layout.parent)!;
      const af = layout.attachFrac ?? [0.5, 0.5];
      part.attach = [Math.round(pd.w * af[0]), Math.round(pd.h * af[1])];
    } else {
      part.attach = [...RIG_ROOT_ANCHOR];
    }
    return part;
  });

  const head = dims.get("head")!;
  const shapes = Object.fromEntries(VISEMES.map((v) => [v, mouthById.get(v)!])) as Record<
    (typeof VISEMES)[number],
    string
  >;

  const puppet: Puppet = {
    id,
    version: 1, // draft; bumped to the frozen N on approve
    rig: "nativeAttach",
    designSize: [...RIG_DESIGN_SIZE],
    parts,
    // `mouth.at` is in the head's OWN trimmed-image space (nativeAttach); visemes
    // are trimmed overlays centred there. Refine in the pivot-editor.
    mouth: { anchor: "head", at: [Math.round(head.w * 0.5), Math.round(head.h * 0.5)], shapes },
    skins: { default: {} },
    meta: { grounding: "draft/brief.md", notes: ["draft rig — refine pivots/z/parent/attach/norm in the pivot-editor"] },
  };

  // Schema + in-bounds validation (pivots in each part's own image space).
  const validated = PuppetSchema.parse(puppet);
  for (const part of validated.parts) {
    const d = dims.get(part.id);
    if (!d) continue;
    const [px, py] = part.pivot;
    if (px < 0 || px > d.w || py < 0 || py > d.h) {
      throw new Error(`char rig "${id}": pivot ${JSON.stringify(part.pivot)} for "${part.id}" is outside bounds ${d.w}x${d.h}.`);
    }
  }

  writeJson(join(p.draft, "puppet.json"), PuppetSchema, validated);
  ctx.log.info(`char rig "${id}"`, { parts: parts.length });
  process.stdout.write(
    `char rig "${id}" wrote draft/puppet.json (${parts.length} parts, ${VISEMES.length} visemes, validated).\n` +
      `  refine pivots: node tools/pivot-editor/server.mjs ${p.draft}\n` +
      `  then: anim char approve ${id}\n`,
  );
}

// ===========================================================================
// char approve  (draft → v<N> freeze + meta.json + index)
// ===========================================================================

export interface CharApproveOptions {
  approver?: string;
  date?: string;
}

export function charApprove(ctx: StageContext, id: string, opts: CharApproveOptions): void {
  assertId(id);
  const p = paths(ctx, id);
  const draftPuppet = join(p.draft, "puppet.json");
  if (!existsSync(draftPuppet)) throw new Error(`no draft/puppet.json for "${id}". Run 'anim char rig ${id}' first.`);
  const puppet = readJson(draftPuppet, PuppetSchema);

  const genMetaPath = join(p.draft, "gen-meta.json");
  const genMeta: GenMeta = existsSync(genMetaPath)
    ? GenMetaSchema.parse(JSON.parse(readFileSync(genMetaPath, "utf8")))
    : { model: readHouseStyle(p).model, seeds: {}, prompts: {} };

  // FLUX guard (DECISIONS.md hard rule #3) — refuse flux* unless config allows.
  if (/^flux/i.test(genMeta.model.name) && !ctx.config.allowFluxFamily) {
    throw new Error(
      `char approve "${id}": model "${genMeta.model.name}" is FLUX-family, which is non-commercial by default. ` +
        `Set allowFluxFamily:true in anim.config.json only with a valid BFL license (DECISIONS.md hard rule 3).`,
    );
  }

  const version = nextVersion(p.charRoot);
  const versionDir = join(p.charRoot, `v${version}`);
  if (existsSync(versionDir)) throw new Error(`char approve "${id}": ${versionDir} already exists (unexpected).`);

  // Freeze: copy parts, mouth, sheets + puppet.json into v<N>/.
  mkdirSync(versionDir, { recursive: true });
  for (const sub of ["parts", "mouth", "sheets"]) {
    const src = join(p.draft, sub);
    if (existsSync(src)) cpSync(src, join(versionDir, sub), { recursive: true });
  }
  writeJson(join(versionDir, "puppet.json"), PuppetSchema, { ...puppet, version });

  // meta.json — license hygiene (DECISIONS.md hard rule #2).
  // Approval is a human gate: the timestamp is legitimate wall-clock metadata,
  // not render-path output. Override with --date for reproducible fixtures.
  const meta: LibraryMeta = {
    id,
    version,
    kind: "character",
    model: genMeta.model,
    seeds: genMeta.seeds,
    prompts: genMeta.prompts,
    date: opts.date ?? new Date().toISOString(),
    approver: opts.approver ?? process.env.USER ?? "unknown",
    grounding: [],
    notes: [],
  };
  writeJson(join(versionDir, "meta.json"), LibraryMetaSchema, meta);

  regenerateIndex(p.charsRoot);

  ctx.log.info(`char approve "${id}"`, { version });
  process.stdout.write(
    `character "${id}" frozen as v${version} at ${versionDir}\n` +
      `  meta.json records model "${meta.model.name}" (${meta.model.license}), ${Object.keys(meta.seeds).length} seeds.\n` +
      `  episodes may now pin ${id}@v${version}.\n`,
  );
}

function nextVersion(charRoot: string): number {
  if (!existsSync(charRoot)) return 1;
  const versions = readdirSync(charRoot)
    .map((d) => /^v(\d+)$/.exec(d))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => Number(m[1]));
  return versions.length ? Math.max(...versions) + 1 : 1;
}

function regenerateIndex(charsRoot: string): void {
  const entries = [];
  for (const dir of existsSync(charsRoot) ? readdirSync(charsRoot) : []) {
    const abs = join(charsRoot, dir);
    let versions: number[] = [];
    try {
      versions = readdirSync(abs)
        .map((d) => /^v(\d+)$/.exec(d))
        .filter((m): m is RegExpExecArray => Boolean(m))
        .map((m) => Number(m[1]))
        .sort((a, b) => a - b);
    } catch {
      continue;
    }
    if (versions.length) {
      entries.push({ id: dir, latest: Math.max(...versions), versions });
    }
  }
  writeJson(join(charsRoot, "index.json"), LibraryIndexSchema, { kind: "character", entries });
}
