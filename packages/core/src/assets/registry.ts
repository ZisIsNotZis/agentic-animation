import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  LibraryRegistrySchema,
  ProcedureManifestSchema,
  RegistryAssetIdSchema,
  type LibraryRegistry,
  type ProcedureManifest,
  type ProcedureParamType,
  type RegistryAssetManifest,
  type Parameter,
} from "../schemas/libraryMeta";
import type {ProcedureCall, Scalar} from "../schemas/narrowEpisode";

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
  readonly manifest: LibraryRegistry;
  resolveAsset(id: string): RegistryAssetManifest;
  resolveProcedure(id: string): ProcedureManifest;
  validateProcedureCall(call: ProcedureCallInput, locals: RegistryLocals): ValidatedProcedureCall;
}

export async function loadAssetRegistry(libraryRoot: string): Promise<AssetRegistry> {
  const manifest = LibraryRegistrySchema.parse(JSON.parse(await readFile(join(libraryRoot, "registry", "manifest.json"), "utf8")));
  for (const asset of manifest.assets) if (asset.path.startsWith("/") || asset.path.split("/").includes("..")) throw new Error(`asset path must stay inside library root: ${asset.id}`);
  return createAssetRegistry(manifest);
}
export const loadRegistry = loadAssetRegistry;

export function createAssetRegistry(manifest: LibraryRegistry): AssetRegistry {
  const assets = new Map(manifest.assets.map((asset) => [asset.id, asset]));
  if (assets.size !== manifest.assets.length) throw new Error("duplicate asset id");
  const procedures = new Map(manifest.procedures.map((procedure) => [procedure.id, procedure]));
  if (procedures.size !== manifest.procedures.length) throw new Error("duplicate procedure id");
  const resolveAsset = (id: string): RegistryAssetManifest => {
    if (!RegistryAssetIdSchema.safeParse(id).success) throw new Error(`immutable asset id required: ${id}`);
    const asset = assets.get(id);
    if (!asset) throw new Error(`unknown asset: ${id}`);
    return asset;
  };
  const resolveProcedure = (id: string): ProcedureManifest => {
    const procedure = procedures.get(id)
      ?? procedures.get(typedProcedureId(id))
      ?? procedures.get(legacyProcedureId(id));
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

function legacyProcedureId(requestedId: string): string {
  const parts = requestedId.split(".");
  const typed = parts[0] === "actor" || parts.length >= 3 ? parts.slice(-2) : parts;
  if (typed.length < 2) return requestedId;
  const aliases: Record<string, string[]> = {
    act: ["acting", "gesture", "prop", "interaction"],
    look: ["gaze"],
    voice: ["speech"],
    use: ["interaction"],
    play: ["sfx", "music"],
  };
  return aliases[typed[0]!] ? `${aliases[typed[0]!]![0]}.${typed[1]}` : `${typed[0]}.${typed[1]}`;
}

function typedProcedureId(requestedId: string): string {
  const parts = requestedId.split(".");
  const typed = parts[0] === "actor" || parts.length >= 3 ? parts.slice(-2) : parts;
  if (typed.length < 2) return requestedId;
  const aliases: Record<string, string> = {
    acting: "act", gesture: "act", prop: "act", interaction: "act",
    gaze: "look", camera: "use", vfx: "use", sfx: "play", music: "play",
    speech: "voice",
  };
  return `${aliases[typed[0]!] ?? typed[0]}.${typed[1]}`;
}

function validateScalar(param: Parameter, value: Scalar, id: string): void {
  if (param.type === "string" && value.kind !== "string") throw new Error(`${id} expects string modifier ${param.name}`);
  if (param.type === "number" && value.kind !== "number") throw new Error(`${id} expects number modifier ${param.name}`);
  if (param.type === "boolean" && value.kind !== "boolean") throw new Error(`${id} expects boolean modifier ${param.name}`);
  const primitive = value.kind === "string" || value.kind === "number" || value.kind === "boolean" ? value.value : undefined;
  if (param.enum && primitive !== undefined && !param.enum.includes(primitive)) throw new Error(`${id} has invalid value for ${param.name}`);
  if (typeof primitive === "number" && ((param.min !== undefined && primitive < param.min) || (param.max !== undefined && primitive > param.max))) throw new Error(`${id} value for ${param.name} is outside its range`);
}

function subjectTypeFor(subject: string, locals: RegistryLocals, resolveAsset: (id: string) => RegistryAssetManifest): "actor" | "camera" | "vfx" | "sfx" | "music" {
  if (subject === "camera" || subject === "vfx" || subject === "sfx" || subject === "music") return subject;
  const id = localAssetId(locals.actors[subject]);
  if (!id) throw new Error(`unknown procedure subject: ${subject}`);
  if (resolveAsset(id).kind !== "figure") throw new Error(`actor local ${subject} is not a figure asset`);
  return "actor";
}

function localAssetId(value: string | {use: string} | undefined): string | undefined { return typeof value === "string" ? value : value?.use; }
export function parseRegistryManifest(value: unknown): LibraryRegistry { return LibraryRegistrySchema.parse(value); }
export function parseProcedureManifest(value: unknown): ProcedureManifest { return ProcedureManifestSchema.parse(value); }

/** Compile-time shape check for callers that pass parsed typed calls. */
export type ParsedProcedureCall = ProcedureCall;
