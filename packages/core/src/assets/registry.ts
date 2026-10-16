import {readdir, readFile, access} from "node:fs/promises";
import {join, relative, resolve} from "node:path";
import {z} from "zod";
import {
  FigureAssetManifestSchema,
  FigureArtworkSchema,
  PropAssetManifestSchema,
  AssetRegistrySchema,
  ProcedureManifestSchema,
  RegistryAssetIdSchema,
  SupportSurfaceSchema,
  type AssetRegistryManifest,
  type ProcedureManifest,
  type ProcedureParamType,
  type RegistryAssetManifest,
  type Parameter,
} from "../schemas/libraryMeta";
import type {ProcedureCall, Scalar} from "../schemas/narrowEpisode";
import {svgGroupIds, normalizeSetWorld} from "./setWorld";
import {hashJson} from "../util/hash";

export interface RegistryLocals {
  actors: Record<string, string | {use: string; voice?: string}>;
  objects: Record<string, string | {use: string}>;
  dressing: Record<string, string | {use: string}>;
}

export interface ProcedureCallInput {
  subject: string;
  id?: string;
  name?: string;
  path?: string;
  args: (string | Scalar)[];
  kwargs?: Record<string, string | Scalar>;
}

export interface ResolvedProcedureArgument {
  name: string;
  type: ProcedureParamType;
  value: Scalar;
  local?: string;
  assetId?: string;
}

export interface ValidatedProcedureCall {
  procedure: ProcedureManifest;
  subject: string;
  args: ResolvedProcedureArgument[];
  kwargs: Record<string, Scalar>;
}

export interface AssetRegistry {
  readonly manifest: AssetRegistryManifest;
  resolveAsset(id: string): RegistryAssetManifest;
  resolveProcedure(id: string): ProcedureManifest;
  validateProcedureCall(call: ProcedureCallInput, locals: RegistryLocals): ValidatedProcedureCall;
}

export async function loadAssetRegistry(libraryRoot: string): Promise<AssetRegistry> {
  const root = resolve(libraryRoot);
  const assets = await discoverAssets(root);
  return createAssetRegistry(AssetRegistrySchema.parse({kind: "registry", assets, procedures: []}));
}
export const loadRegistry = loadAssetRegistry;

async function discoverAssets(root: string): Promise<RegistryAssetManifest[]> {
  const categories = (await readdir(root, {withFileTypes: true})).filter((entry) => entry.isDirectory() && ["figure", "voice", "set", "prop", "dressing", "layout"].includes(entry.name)).map((entry) => entry.name).sort();
  const assets: RegistryAssetManifest[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      if (!entry.isDirectory()) continue;
      const child = join(directory, entry.name);
      if (await isAssetDirectory(child)) {
        const identity = relative(root, child).replaceAll("\\", "/");
        if (RegistryAssetIdSchema.safeParse(identity).success) {
          const base: RegistryAssetManifest = {identity, kind: identity.split("/")[0] as RegistryAssetManifest["kind"], capabilities: [], dependencies: []};
          // Figure resources carry their skeleton as data (joints, part
          // shapes, reach, waist) — the engine stays figure-agnostic.
          if (base.kind === "prop") {
            // Prop resources declare their base line and support surfaces.
            try {
              const raw = JSON.parse(await readFile(join(child, "manifest.json"), "utf8")) as {placement?: unknown};
              if (raw.placement !== undefined) {
                const {placement} = PropAssetManifestSchema.parse({...base, placement: raw.placement});
                (base as {placement?: unknown}).placement = placement;
              }
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                throw new Error(`prop ${identity}: invalid manifest placement: ${(error as Error).message}`);
              }
            }
          }
          if (base.kind === "set") {
            // Set resources declare their world (layers, containment, supports)
            // in their own coordinateSpace; a set whose scene.svg paints <g id>
            // groups is world-declaring and must carry complete, valid
            // declarations — missing or invalid ones fail loading (SCHEMAS.md
            // "Set world declarations"). Legacy sets keep raw support passthrough.
            let sceneSvg: string | undefined;
            try {
              sceneSvg = await readFile(join(child, "scene.svg"), "utf8");
            } catch { /* a set may carry no scene art */ }
            // The painted groups decide world-declaring, so they are read even
            // when the manifest is missing: a world-declaring set without
            // declarations fails loading instead of silently going legacy.
            const layerGroups = sceneSvg === undefined ? [] : svgGroupIds(sceneSvg);
            let raw: Record<string, unknown> | undefined;
            try {
              raw = JSON.parse(await readFile(join(child, "manifest.json"), "utf8")) as Record<string, unknown>;
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                throw new Error(`set ${identity}: ${(error as Error).message}`);
              }
            }
            if (raw === undefined && layerGroups.length > 0) {
              throw new Error(`set ${identity}: layers are required when scene.svg paints <g id> groups`);
            }
            if (raw !== undefined) try {
              if (layerGroups.length > 0) {
                if (raw.layers === undefined) throw new Error("layers are required when scene.svg paints <g id> groups");
                if (raw.coordinateSpace === undefined) throw new Error("coordinateSpace is required when scene.svg paints <g id> groups");
                (base as {world?: unknown}).world = normalizeSetWorld({
                  manifest: {
                    coordinateSpace: raw.coordinateSpace,
                    layers: raw.layers,
                    ...(raw.safeActorArea !== undefined ? {safeActorArea: raw.safeActorArea} : {}),
                    ...(raw.supports !== undefined ? {supports: raw.supports} : {}),
                  },
                  sceneSvg: sceneSvg!,
                });
              } else if (raw.supports !== undefined) {
                const {supports} = z.object({supports: z.array(SupportSurfaceSchema)}).strict().parse({supports: raw.supports});
                (base as {supports?: unknown}).supports = supports;
              }
            } catch (error) {
              throw new Error(`set ${identity}: ${(error as Error).message}`);
            }
          }
          if (base.kind === "figure") {
            try {
              const raw = JSON.parse(await readFile(join(child, "skeleton.json"), "utf8")) as unknown;
              const {skeleton} = FigureAssetManifestSchema.parse({...base, skeleton: raw});
              (base as {skeleton?: unknown}).skeleton = skeleton;
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                throw new Error(`figure ${identity}: invalid skeleton.json: ${(error as Error).message}`);
              }
            }
            try {
              const raw = JSON.parse(await readFile(join(child, "artwork.json"), "utf8")) as unknown;
              const artwork = FigureArtworkSchema.parse(raw);
              if (base.skeleton !== undefined && hashJson(base.skeleton) !== hashJson(artwork.views.front.skeleton)) {
                throw new Error("front artwork geometry differs from declared skeleton.json");
              }
              base.artwork = artwork;
              base.skeleton = artwork.views.front.skeleton;
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                throw new Error(`figure ${identity}: invalid artwork.json: ${(error as Error).message}`);
              }
            }
          }
          assets.push(base);
        }
      } else await visit(child);
    }
  };
  for (const category of categories) await visit(join(root, category));
  return assets.sort((a, b) => a.identity.localeCompare(b.identity));
}

async function isAssetDirectory(directory: string): Promise<boolean> {
  for (const name of ["manifest.json", "puppet.json", "scene.svg"]) {
    try { await access(join(directory, name)); return true; } catch { /* continue */ }
  }
  return false;
}

async function discoverProcedures(root: string): Promise<ProcedureManifest[]> {
  try {
    const raw = JSON.parse(await readFile(join(root, "action", "manifest.json"), "utf8")) as {procedures?: unknown[]};
    return (raw.procedures ?? []).map((procedure) => ProcedureManifestSchema.parse(procedure));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [];
  }
}

export function createAssetRegistry(manifest: AssetRegistryManifest): AssetRegistry {
  const assets = new Map(manifest.assets.map((asset) => [asset.identity, asset]));
  if (assets.size !== manifest.assets.length) throw new Error("duplicate asset id");
  const procedures = new Map(manifest.procedures.map((procedure) => [procedure.id, procedure]));
  if (procedures.size !== manifest.procedures.length) throw new Error("duplicate procedure id");
  const resolveAsset = (id: string): RegistryAssetManifest => {
    const identity = id;
    if (!RegistryAssetIdSchema.safeParse(identity).success) throw new Error(`canonical asset path required: ${id}`);
    const asset = assets.get(identity);
    if (!asset) throw new Error(`unknown asset: ${id}`);
    return asset;
  };
  const resolveProcedure = (id: string): ProcedureManifest => {
    const procedure = procedures.get(id);
    if (!procedure) throw new Error(`unknown procedure: ${id}`);
    return procedure;
  };
  return {manifest, resolveAsset, resolveProcedure, validateProcedureCall(call, locals) {
    const requestedId = call.id ?? call.name ?? call.path ?? "";
    const id = requestedId;
    const procedure = resolveProcedure(id);
    const args = call.args.map(toScalar);
    const kwargs = Object.fromEntries(Object.entries(call.kwargs ?? {}).map(([key, value]) => [key, toScalar(value)])) as Record<string, Scalar>;
    const subjectType = subjectTypeFor(call.subject, locals, resolveAsset);
    if (!procedure.subjects.includes(subjectType)) throw new Error(`${procedure.id} does not allow subject ${call.subject}`);
    if (args.length !== procedure.positional.length) throw new Error(`${procedure.id} arity ${procedure.positional.length} expected, got ${args.length}`);
    const resolved = procedure.positional.map((param, index) => resolveParameter(param, args[index]!, locals, resolveAsset, procedure.id));
    for (const [key, value] of Object.entries(kwargs)) {
      if (key === "mode") {
        if (value.kind !== "string" || !["begin", "end", "nonblock"].includes(value.value)) throw new Error(`${procedure.id} has invalid compiler modifier mode`);
        continue;
      }
      if (key === "duration") {
        if (value.kind !== "number" || value.value <= 0) throw new Error(`${procedure.id} has invalid compiler modifier duration`);
        if (procedure.procedureKind === "state") throw new Error(`${procedure.id} state calls reject duration`);
        if (value && kwargs.mode?.kind === "string" && ["begin", "end"].includes(kwargs.mode.value)) throw new Error(`${procedure.id} spans reject duration`);
        continue;
      }
      const param = procedure.modifiers[key];
      if (!param) throw new Error(`${procedure.id} does not allow modifier ${key}`);
      validateScalar(param, value, procedure.id);
    }
    for (const [key, param] of Object.entries(procedure.modifiers)) if (!(key in kwargs) && param.default !== undefined) kwargs[key] = primitiveScalar(param.default);
    return {procedure, subject: call.subject, args: resolved, kwargs};
  }};
}

function toScalar(value: string | Scalar): Scalar {
  if (typeof value !== "string") return value;
  if (value === "true" || value === "false") return {kind: "boolean", value: value === "true"};
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) return {kind: "number", value: Number(value)};
  return {kind: "ref", value};
}

function primitiveScalar(value: string | number | boolean): Scalar {
  if (typeof value === "boolean") return {kind: "boolean", value};
  if (typeof value === "number") return {kind: "number", value};
  return {kind: "string", value};
}

function resolveParameter(param: Parameter, value: Scalar, locals: RegistryLocals, resolveAsset: (id: string) => RegistryAssetManifest, id: string): ResolvedProcedureArgument {
  validateScalar(param, value, id);
  if (param.type === "string" || param.type === "number" || param.type === "boolean") return {name: param.name, type: param.type, value};
  if (value.kind !== "ref") throw new Error(`${id} expects ${param.type} reference ${param.name}`);
  const local = value.value;
  const assetId = param.type === "actor" ? localAssetId(locals.actors[local]) : param.type === "object" ? localAssetId(locals.objects[local]) : param.type === "dressing" ? localAssetId(locals.objects[local]) ?? localAssetId(locals.dressing[local]) : param.type === "entity" ? localAssetId(locals.actors[local]) ?? localAssetId(locals.objects[local]) ?? localAssetId(locals.dressing[local]) : local;
  if (!assetId) {
    const knownKind = local in locals.actors ? "actor" : local in locals.objects ? "object" : local in locals.dressing ? "dressing" : "local";
    throw new Error(`unknown local reference for ${id}; expects ${param.type} argument ${param.name}: ${local} (known ${knownKind})`);
  }
  const asset = resolveAsset(assetId);
  const expected = param.type === "actor" ? "figure" : param.type === "object" ? "prop" : param.type === "dressing" ? "dressing" : undefined;
  if (expected && asset.kind !== expected) throw new Error(`${id} expects ${param.type} argument ${param.name}: ${local}`);
  return {name: param.name, type: param.type, value, local, assetId};
}


function validateScalar(param: Parameter, value: Scalar, id: string): void {
  if (param.type === "string" && value.kind !== "string") throw new Error(`${id} expects string modifier ${param.name}`);
  if (param.type === "number" && value.kind !== "number") throw new Error(`${id} expects number modifier ${param.name}`);
  if (param.type === "boolean" && value.kind !== "boolean") throw new Error(`${id} expects boolean modifier ${param.name}`);
  const primitive = value.kind === "string" || value.kind === "number" || value.kind === "boolean" ? value.value : undefined;
  if (param.enum && primitive !== undefined && !param.enum.includes(primitive)) throw new Error(`${id} has invalid value for ${param.name}`);
  if (typeof primitive === "number" && ((param.min !== undefined && primitive < param.min) || (param.max !== undefined && primitive > param.max))) throw new Error(`${id} value for ${param.name} is outside its range`);
}

function subjectTypeFor(subject: string, locals: RegistryLocals, resolveAsset: (id: string) => RegistryAssetManifest): "actor" | "camera" | "effect" | "sound" | "music" {
  if (subject === "camera" || subject === "effect" || subject === "sound" || subject === "music") return subject;
  const id = localAssetId(locals.actors[subject]);
  if (!id) throw new Error(`unknown procedure subject: ${subject}`);
  if (resolveAsset(id).kind !== "figure") throw new Error(`actor local ${subject} is not a figure asset`);
  return "actor";
}

function localAssetId(value: string | {use: string} | undefined): string | undefined { return typeof value === "string" ? value : value?.use; }
export function parseProcedureManifest(value: unknown): ProcedureManifest { return ProcedureManifestSchema.parse(value); }

/** Compile-time shape check for callers that pass parsed typed calls. */
export type ParsedProcedureCall = ProcedureCall;
