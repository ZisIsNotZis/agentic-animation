import { z } from "zod";
import { IdSchema } from "./common";

export const RegistryAssetIdSchema = z.string().regex(/^(?:figure|voice|set|prop|dressing|layout)(?:\/[a-z][a-z0-9_]*)+$/, "asset identity must be a canonical library-relative path");
export type RegistryAssetId = z.infer<typeof RegistryAssetIdSchema>;
export const ProcedureIdSchema = z.string().regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/, "procedure id must be namespace.name");
export type ProcedureId = z.infer<typeof ProcedureIdSchema>;
export const RegistryAssetKindSchema = z.enum(["figure", "voice", "set", "prop", "dressing", "layout"]);
export type RegistryAssetKind = z.infer<typeof RegistryAssetKindSchema>;
export const ProcedureSubjectSchema = z.enum(["actor", "camera", "effect", "sound", "music"]);
export type ProcedureSubject = z.infer<typeof ProcedureSubjectSchema>;
export const ProcedureParamTypeSchema = z.enum(["actor", "object", "dressing", "entity", "asset", "string", "number", "boolean"]);
export type ProcedureParamType = z.infer<typeof ProcedureParamTypeSchema>;

const RegistryAssetCommonSchema = z.object({
  capabilities: z.array(z.string().min(1)).default([]),
  dependencies: z.array(z.string().min(1)).default([]),
  hash: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
}).strict();

export const RegistryAssetManifestSchema = RegistryAssetCommonSchema.extend({identity: RegistryAssetIdSchema, kind: RegistryAssetKindSchema}).strict();
export type RegistryAssetManifest = z.infer<typeof RegistryAssetManifestSchema>;
export const AssetManifestSchema = RegistryAssetManifestSchema;
export type AssetManifest = RegistryAssetManifest;

export const ParameterSchema = z.object({
  name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/),
  type: ProcedureParamTypeSchema,
  required: z.boolean().default(true),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  enum: z.array(z.union([z.string(), z.number(), z.boolean()])).min(1).optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
}).strict();
export type Parameter = z.infer<typeof ParameterSchema>;
export const ProcedureParamSchema = ParameterSchema;
export type ProcedureParam = Parameter;

const RangeSchema = z.object({min: z.number().finite(), max: z.number().finite()}).strict();
export const ProcedureRecipeSchema = z.record(z.unknown());
export type ProcedureRecipe = z.infer<typeof ProcedureRecipeSchema>;
export const ProcedureAssetSchema = z.object({
  id: ProcedureIdSchema,
  path: ProcedureIdSchema,
  version: z.number().int().positive(),
  owner: z.enum(["actor", "object", "camera", "effect", "sound"]),
  kind: z.enum(["timed", "state", "speech"]),
  subjects: z.array(ProcedureSubjectSchema).min(1),
  positional: z.array(ParameterSchema),
  modifiers: z.record(ParameterSchema).default({}),
  timing: z.object({defaultDuration: z.number().finite().positive(), scalable: z.boolean(), span: z.object({enter: RangeSchema, sustain: RangeSchema, exit: RangeSchema}).optional()}).optional(),
  claims: z.object({exclusive: z.array(z.string().min(1)).optional(), shared: z.array(z.string().min(1)).optional()}).strict().optional(),
  recipe: ProcedureRecipeSchema,
}).strict();
export type ProcedureAsset = z.infer<typeof ProcedureAssetSchema>;

const ProcedureManifestInputSchema = z.object({
  kind: z.literal("procedure"),
  id: ProcedureIdSchema,
  owner: z.enum(["actor", "object", "camera", "effect", "sound", "music"]).optional(),
  procedureKind: z.enum(["timed", "state", "speech"]).optional(),
  subjects: z.array(ProcedureSubjectSchema).min(1),
  positional: z.array(ParameterSchema).default([]),
  modifiers: z.record(ParameterSchema).default({}),
  params: z.array(ParameterSchema).optional(),
  arity: z.number().int().nonnegative().optional(),
  timing: z.object({defaultDuration: z.number().finite().positive(), scalable: z.boolean(), span: z.object({enter: RangeSchema, sustain: RangeSchema, exit: RangeSchema}).optional()}).optional(),
  claims: z.object({exclusive: z.array(z.string()).optional(), shared: z.array(z.string()).optional()}).optional(),
  recipe: ProcedureRecipeSchema.default({}),
}).strict();
export const ProcedureManifestSchema = ProcedureManifestInputSchema.transform((manifest) => ({
  ...manifest,
  owner: manifest.owner ?? (manifest.subjects[0] === "actor" ? "actor" : manifest.subjects[0]),
  procedureKind: manifest.procedureKind ?? "timed",
  positional: manifest.positional.length ? manifest.positional : manifest.params ?? [],
  params: manifest.params ?? (manifest.positional.length ? manifest.positional : []),
  arity: manifest.arity ?? manifest.positional.length,
})).superRefine((manifest, ctx) => {
  if (manifest.arity !== manifest.positional.length) ctx.addIssue({code: z.ZodIssueCode.custom, path: ["arity"], message: "arity must equal positional.length"});
});
export type ProcedureManifest = z.infer<typeof ProcedureManifestSchema>;

export const AssetRegistrySchema = z.object({kind: z.literal("registry"), assets: z.array(RegistryAssetManifestSchema).default([]), procedures: z.array(ProcedureManifestSchema).default([])}).strict();
export type AssetRegistryManifest = z.infer<typeof AssetRegistrySchema>;

export const AssetModelSchema = z.object({name: z.string().default(""), license: z.string().default("")});
export type AssetModel = z.infer<typeof AssetModelSchema>;

export const LibraryMetaSchema = z.object({
  model: AssetModelSchema.default({}),
  seeds: z.record(z.string(), z.number().int()).default({}), prompts: z.record(z.string(), z.string()).default({}),
  date: z.string().default(""), approver: z.string().default(""), grounding: z.array(z.string()).default([]), notes: z.array(z.string()).default([]),
}).strict();
export type LibraryMeta = z.infer<typeof LibraryMetaSchema>;
export const LibraryIndexEntrySchema = z.object({id: IdSchema, latest: z.number().int().positive(), versions: z.array(z.number().int().positive()).min(1)});
export type LibraryIndexEntry = z.infer<typeof LibraryIndexEntrySchema>;
export const LibraryIndexSchema = z.object({kind: z.enum(["character", "background"]), entries: z.array(LibraryIndexEntrySchema).default([])});
export type LibraryIndex = z.infer<typeof LibraryIndexSchema>;
