import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Directory holding the checked-in ComfyUI workflow templates (…/workflows). */
export const WORKFLOWS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "workflows");

/** Where in the graph an input value is injected: node id + field name. */
export interface InjectTarget {
  node: string;
  field: string;
}

export interface WorkflowMeta {
  workflowId: string;
  title: string;
  description: string;
  /** Model/asset files the graph needs present in ComfyUI (for doctor guidance). */
  requires: string[];
  /** input-key → target(s) the client patches before submit. */
  inject: Record<string, InjectTarget | InjectTarget[]>;
  /** Nodes whose seed field receives the run seed. */
  seedFields: InjectTarget[];
  /** Node ids that are SaveImage outputs (for provenance / mock naming). */
  saveNodes?: string[];
}

export interface WorkflowTemplate {
  _meta: WorkflowMeta;
  /** ComfyUI API-format prompt graph (node id → { class_type, inputs }). */
  prompt: Record<string, { class_type: string; inputs: Record<string, unknown> }>;
}

/** Injectable input keys that the char stages / callers may set. */
export interface WorkflowInputs {
  positive?: string;
  negative?: string;
  model?: string; // unet GGUF filename (config-chosen quant)
  clip?: string;
  vae?: string;
  width?: number;
  height?: number;
  filenamePrefix?: string;
  /** ComfyUI-side filename of an already-uploaded image (edit workflows). */
  image?: string;
  [k: string]: unknown;
}

export function listWorkflowIds(): string[] {
  if (!existsSync(WORKFLOWS_DIR)) return [];
  return readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort();
}

export function loadWorkflow(id: string): WorkflowTemplate {
  const path = join(WORKFLOWS_DIR, `${id}.json`);
  if (!existsSync(path)) {
    throw new Error(
      `imagegen:comfyui: unknown workflowId "${id}". Available: ${listWorkflowIds().join(", ") || "(none)"}.`,
    );
  }
  const tpl = JSON.parse(readFileSync(path, "utf8")) as WorkflowTemplate;
  if (!tpl._meta?.inject || !tpl.prompt) {
    throw new Error(`imagegen:comfyui: workflow "${id}" is malformed (missing _meta.inject or prompt).`);
  }
  return tpl;
}

function setField(graph: WorkflowTemplate["prompt"], target: InjectTarget, value: unknown, wfId: string): void {
  const node = graph[target.node];
  if (!node) {
    throw new Error(`imagegen:comfyui: workflow "${wfId}" inject target node "${target.node}" is missing.`);
  }
  node.inputs[target.field] = value;
}

/**
 * Deep-clone the template graph, patch every injectable input that was
 * supplied, stamp the seed into all seed fields, and return the bare graph
 * ready to POST to `/prompt`. `_meta` never leaves this module.
 */
export function buildGraph(
  tpl: WorkflowTemplate,
  inputs: WorkflowInputs,
  seed: number,
): WorkflowTemplate["prompt"] {
  const graph: WorkflowTemplate["prompt"] = JSON.parse(JSON.stringify(tpl.prompt));
  for (const [key, target] of Object.entries(tpl._meta.inject)) {
    const value = inputs[key];
    if (value === undefined) continue;
    const targets = Array.isArray(target) ? target : [target];
    for (const t of targets) setField(graph, t, value, tpl._meta.workflowId);
  }
  for (const t of tpl._meta.seedFields) setField(graph, t, seed, tpl._meta.workflowId);
  return graph;
}
