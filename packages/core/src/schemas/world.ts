import {z} from "zod";

const Id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const Unit = z.number().finite().min(0).max(1);
export const NormalizedPointSchema = z.tuple([Unit, Unit]);
export const NormalizedSizeSchema = z.tuple([Unit, Unit]);
export const NormalizedRectSchema = z.object({at: NormalizedPointSchema, size: NormalizedSizeSchema}).strict();
const Json: z.ZodType<unknown> = z.lazy(() => z.union([z.string(), z.number().finite(), z.boolean(), z.null(), z.array(Json), z.record(Json)]));
const JsonObject = z.record(Json);

const FaceSchema = z.object({visible: z.boolean().optional(), rig: Id.optional(), overlay: Id.optional(), smile: Unit.optional(), brow: Unit.optional(), eyeOpen: Unit.optional(), lipsPart: Unit.optional(), gaze: NormalizedPointSchema.optional()}).strict();
const AssetPath = z.string().regex(/^[a-z][a-z0-9_]*(?:\/[a-z][a-z0-9_]*)+$/);
const NodeSchema = z.object({id: Id, kind: Id, asset: AssetPath, at: NormalizedPointSchema, size: NormalizedSizeSchema, layer: Id.optional(), bind: z.string().min(1).optional(), face: FaceSchema.optional()}).strict();
const LayerSchema = z.object({id: Id, order: z.number().int()}).strict();
const ConstraintSchema = z.object({node: Id, within: NormalizedRectSchema.optional(), avoid: z.array(Id).optional()}).strict();
const TrackSchema = z.object({node: Id, move: z.array(z.object({at: z.number().finite().min(0), to: NormalizedPointSchema, duration: z.number().finite().nonnegative().optional()}).strict()).optional(), gaze: z.array(z.object({at: z.number().finite().min(0), to: NormalizedPointSchema, duration: z.number().finite().nonnegative().optional()}).strict()).optional()}).strict();

const CanvasSchema = z.object({aspect: z.number().finite().positive(), nodes: z.array(NodeSchema), layers: z.array(LayerSchema).optional(), constraints: z.array(ConstraintSchema).optional(), tracks: z.array(TrackSchema).optional(), camera: z.array(z.object({at: z.number().finite().min(0), center: NormalizedPointSchema.optional(), zoom: z.number().finite().positive().optional()}).strict()).optional(), effects: z.array(z.object({at: z.number().finite().min(0), name: Id, area: NormalizedRectSchema.optional(), params: JsonObject.optional()}).strict()).optional(), sound: z.array(z.object({at: z.number().finite().min(0), asset: AssetPath, duration: z.number().finite().nonnegative().optional(), volume: Unit.optional(), loop: z.boolean().optional()}).strict()).optional(), captions: z.array(z.object({at: z.number().finite().min(0), duration: z.number().finite().nonnegative(), text: z.string().min(1), style: JsonObject.optional()}).strict()).optional()}).strict();
export const WorldSchema = z.object({canvas: CanvasSchema, plugins: z.record(Json)}).strict();
export const PluginOrderSchema = z.object({priority: z.number().finite().optional(), before: z.union([Id, z.array(Id)]).optional(), after: z.union([Id, z.array(Id)]).optional()}).strict();
export const PluginSchema = PluginOrderSchema;

export type WorldSchemaOutput = z.infer<typeof WorldSchema>;
export type PluginSchemaOutput = z.infer<typeof PluginOrderSchema>;
