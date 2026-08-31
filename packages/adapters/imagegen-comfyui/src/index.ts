import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  notReadyCheck,
  type AdapterRegistration,
  type Check,
  type HealthReport,
  type ImageGenAdapter,
} from "@anim/core";
import { ComfyClient } from "./client";
import { placeholderPng } from "./mock";
import { buildGraph, listWorkflowIds, loadWorkflow, type WorkflowInputs } from "./workflows";

export * from "./workflows";

const ID = "comfyui";
const CLIENT_ID = "anim-imagegen";
const DEFAULT_URL = "http://127.0.0.1:8188";

/** The workflow templates every character generation pass relies on. */
export const EXPECTED_WORKFLOWS = ["anchor", "edit-turnaround", "part-sheet", "mouth-shapes"] as const;

function baseUrl(): string {
  return process.env.COMFYUI_URL ?? DEFAULT_URL;
}

function client(): ComfyClient {
  // Poll ceiling for /history. The ComfyClient's 10-min default is exceeded by
  // real MPS runs (a 1024x1536 24-step Qwen-Image gen takes ~35 min on an
  // M-series 24 GB box), so allow env override and default to 90 min here.
  const timeoutMs = Number(process.env.COMFYUI_TIMEOUT_MS ?? 90 * 60 * 1000);
  return new ComfyClient({ baseUrl: baseUrl(), clientId: CLIENT_ID, timeoutMs });
}

/**
 * Adapter control channel: keys prefixed `__` steer the adapter itself and are
 * never forwarded into a ComfyUI graph. `__mock` triggers deterministic
 * placeholder output (used by `anim char gen --dry-run`), `__mockNames` names
 * the images to emit, `__imagePath` is a local image to upload for edit graphs.
 */
interface ControlInputs {
  __mock?: boolean;
  __mockNames?: string[];
  __imagePath?: string;
}

function splitInputs(inputs: Record<string, unknown>): { wf: WorkflowInputs; ctl: ControlInputs } {
  const wf: WorkflowInputs = {};
  const ctl: ControlInputs = {};
  for (const [k, v] of Object.entries(inputs)) {
    if (k === "__mock") ctl.__mock = Boolean(v);
    else if (k === "__mockNames") ctl.__mockNames = Array.isArray(v) ? (v as string[]) : undefined;
    else if (k === "__imagePath") ctl.__imagePath = typeof v === "string" ? v : undefined;
    else if (k.startsWith("__")) continue;
    else (wf as Record<string, unknown>)[k] = v;
  }
  return { wf, ctl };
}

function emitMock(inputs: WorkflowInputs, ctl: ControlInputs, seed: number, outDir: string): string[] {
  mkdirSync(outDir, { recursive: true });
  const w = typeof inputs.width === "number" ? inputs.width : 1024;
  const h = typeof inputs.height === "number" ? inputs.height : 1024;
  const names = ctl.__mockNames?.length ? ctl.__mockNames : [inputs.filenamePrefix ?? "output"];
  return names.map((name) => {
    const dest = join(outDir, `${name}.png`);
    writeFileSync(dest, placeholderPng(w, h, seed, name));
    return dest;
  });
}

const adapter: ImageGenAdapter = {
  id: ID,

  async generate(req): Promise<{ images: string[] }> {
    const { wf, ctl } = splitInputs(req.inputs);
    if (ctl.__mock) {
      return { images: emitMock(wf, ctl, req.seed, req.outDir) };
    }

    const tpl = loadWorkflow(req.workflowId);
    const c = client();
    if (ctl.__imagePath) {
      wf.image = await c.uploadImage(ctl.__imagePath);
    } else if (Object.prototype.hasOwnProperty.call(tpl._meta.inject, "image") && !wf.image) {
      throw new Error(
        `imagegen:comfyui: workflow "${req.workflowId}" needs a source image — pass inputs.__imagePath (the anchor).`,
      );
    }

    const graph = buildGraph(tpl, wf, req.seed);
    const promptId = await c.submit(graph);
    const refs = await c.awaitImages(promptId);
    const prefix = wf.filenamePrefix ?? req.workflowId;
    const images: string[] = [];
    for (const [i, ref] of refs.entries()) {
      images.push(await c.download(ref, req.outDir, `${prefix}_${String(i).padStart(3, "0")}.png`));
    }
    return { images };
  },

  async health(): Promise<HealthReport> {
    try {
      const info = await client().systemStats();
      return { ok: true, detail: `ComfyUI reachable at ${baseUrl()}`, info };
    } catch (err) {
      return {
        ok: false,
        detail: `ComfyUI not reachable at ${baseUrl()} — ${(err as Error).message}`,
      };
    }
  },

  async doctor(): Promise<Check[]> {
    const checks: Check[] = [];

    const present = listWorkflowIds();
    const missing = EXPECTED_WORKFLOWS.filter((w) => !present.includes(w));
    checks.push({
      name: "workflow templates",
      ok: missing.length === 0,
      detail:
        missing.length === 0
          ? `all present (${present.join(", ")})`
          : `missing: ${missing.join(", ")}`,
      ...(missing.length ? { fix: "Restore the workflow JSONs under packages/adapters/imagegen-comfyui/workflows/." } : {}),
    });

    const h = await this.health();
    checks.push(
      h.ok
        ? { name: "ComfyUI server", ok: true, detail: h.detail }
        : notReadyCheck(
            "imagegen:comfyui ComfyUI server",
            h.detail,
            `Run tools/setup-comfyui.sh to install ComfyUI + Qwen-Image-Edit GGUF, then start it (default ${DEFAULT_URL}; override with COMFYUI_URL). Char stages run offline with 'anim char gen --dry-run'.`,
          ),
    );

    // Model files ARE probeable over HTTP: each loader node's /object_info
    // lists the files ComfyUI sees in its models folder. Verify the anchor
    // workflow's unet/clip/vae (env COMFYUI_MODEL overrides the unet, matching
    // char gen's injection).
    const MODELS_FIX =
      "tools/setup-comfyui.sh downloads Qwen-Image-Edit Q4_K_M (QuantStack) + encoder + VAE and installs the ComfyUI-GGUF node.";
    if (!h.ok) {
      checks.push(
        notReadyCheck(
          "imagegen:comfyui models",
          "ComfyUI is not reachable, so model presence cannot be verified.",
          MODELS_FIX,
        ),
      );
      return checks;
    }
    try {
      const tpl = loadWorkflow("anchor");
      const wanted: Array<[nodeClass: string, field: string, file: string]> = [
        ["UnetLoaderGGUF", "unet_name", process.env.COMFYUI_MODEL ?? String(tpl.prompt.unet?.inputs.unet_name)],
        ["CLIPLoader", "clip_name", String(tpl.prompt.clip?.inputs.clip_name)],
        ["VAELoader", "vae_name", String(tpl.prompt.vae?.inputs.vae_name)],
      ];
      const c = client();
      const missing: string[] = [];
      for (const [nodeClass, field, file] of wanted) {
        const info = (await c.objectInfo(nodeClass)) as Record<
          string,
          { input?: { required?: Record<string, unknown[]> } } | undefined
        >;
        const options = info[nodeClass]?.input?.required?.[field]?.[0];
        if (!Array.isArray(options) || !options.includes(file)) missing.push(`${file} (${nodeClass})`);
      }
      checks.push({
        name: "imagegen:comfyui models",
        ok: missing.length === 0,
        detail:
          missing.length === 0
            ? `unet + text encoder + VAE visible to ComfyUI (${wanted.map(([, , f]) => f).join(", ")})`
            : `missing from ComfyUI's model folders: ${missing.join(", ")}`,
        ...(missing.length ? { fix: MODELS_FIX } : {}),
      });
    } catch (err) {
      checks.push(
        notReadyCheck("imagegen:comfyui models", `model probe failed: ${(err as Error).message}`, MODELS_FIX),
      );
    }

    return checks;
  },
};

export default { kind: "imagegen", adapter } satisfies AdapterRegistration;
