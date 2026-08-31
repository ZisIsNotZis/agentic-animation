import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execa } from "execa";
import {
  notReadyCheck,
  type AdapterRegistration,
  type Check,
  type TtsAdapter,
  type VoiceInfo,
} from "@anim/core";

const ID = "kokoro";

/**
 * Kokoro TTS (Apache-2.0, en + hi) via a uv-managed Python sidecar. This TS
 * side is a thin shell: it hands the sidecar a JSON request on stdin and reads
 * a JSON result on stdout, so no Python types leak into the Node pipeline. The
 * model itself is fetched by `tools/setup-kokoro.sh` (not by this adapter).
 */
const adapter: TtsAdapter = {
  id: ID,

  async synthesize(req): Promise<{ path: string; durationSec: number }> {
    const result = await callSidecar({
      op: "synthesize",
      text: req.text,
      voice: req.voice,
      lang: req.lang,
      out_path: req.outPath,
    });
    if (!result.path || typeof result.durationSec !== "number") {
      throw new Error(`tts:kokoro — sidecar returned an unexpected result: ${JSON.stringify(result)}`);
    }
    return { path: result.path, durationSec: result.durationSec };
  },

  async listVoices(lang: string): Promise<VoiceInfo[]> {
    const result = await callSidecar({ op: "list_voices", lang });
    return (result.voices as VoiceInfo[] | undefined) ?? [];
  },

  async doctor(): Promise<Check[]> {
    const checks: Check[] = [];
    const pyDir = pyProjectDir();

    const uv = await binOk("uv", ["--version"]);
    checks.push({
      name: `tts:${ID} uv present`,
      ok: uv,
      detail: uv ? "uv available" : "uv not found on PATH",
      ...(uv ? {} : { fix: "Install uv (https://docs.astral.sh/uv/) — it manages the Python sidecar." }),
    });

    const projOk = existsSync(join(pyDir, "pyproject.toml"));
    checks.push({
      name: `tts:${ID} py project`,
      ok: projOk,
      detail: projOk ? pyDir : `no pyproject.toml at ${pyDir}`,
      ...(projOk ? {} : { fix: "Expected the uv project at py/. Set ANIM_PY_DIR if it lives elsewhere." }),
    });

    if (!uv || !projOk) return checks;

    // Ask the sidecar whether its venv + model are ready (never throws here).
    // `sync: false` keeps doctor read-only — it reports "not ready" rather than
    // installing packages, so setup-kokoro.sh remains the one place that syncs.
    try {
      const health = await callSidecar({ op: "health" }, 30_000, false);
      const ready = health.ok === true;
      checks.push({
        name: `tts:${ID} model ready`,
        ok: ready,
        detail: String(health.detail ?? (ready ? "kokoro import + model present" : "not ready")),
        ...(ready ? {} : { fix: "Run tools/setup-kokoro.sh to sync the venv and fetch the Kokoro model." }),
      });
    } catch (err) {
      checks.push(
        notReadyCheck(
          `tts:${ID}`,
          `sidecar health check failed: ${(err as Error).message}`,
          "Run tools/setup-kokoro.sh to create the venv and download the model.",
        ),
      );
    }
    return checks;
  },
};

interface SidecarResult {
  path?: string;
  durationSec?: number;
  ok?: boolean;
  detail?: string;
  voices?: unknown;
  [k: string]: unknown;
}

/**
 * Run `uv run --project py python tts_kokoro.py`, JSON in on stdin, JSON out.
 * `sync: false` adds `--no-sync` so a read-only caller (doctor) never mutates
 * the venv; the default lets the first real synthesize auto-sync.
 */
async function callSidecar(
  request: Record<string, unknown>,
  timeout = 120_000,
  sync = true,
): Promise<SidecarResult> {
  const pyDir = pyProjectDir();
  const script = join(pyDir, "tts_kokoro.py");
  if (!existsSync(script)) {
    throw new Error(`tts:kokoro — sidecar script not found at ${script}.`);
  }
  const uvArgs = ["run", "--project", pyDir, ...(sync ? [] : ["--no-sync"]), "python", script];
  let res;
  try {
    res = await execa("uv", uvArgs, {
      input: JSON.stringify(request),
      timeout,
      reject: false,
    });
  } catch (err) {
    throw new Error(`tts:kokoro — failed to launch sidecar via uv: ${(err as Error).message}`);
  }
  if (res.exitCode !== 0) {
    throw new Error(`tts:kokoro — sidecar exited ${res.exitCode}: ${res.stderr || res.stdout}`);
  }
  try {
    return JSON.parse(res.stdout) as SidecarResult;
  } catch {
    throw new Error(`tts:kokoro — sidecar did not return JSON. stdout: ${res.stdout.slice(0, 400)}`);
  }
}

/** Locate the uv project: `$ANIM_PY_DIR` or `<cwd>/py`. */
function pyProjectDir(): string {
  return process.env.ANIM_PY_DIR ? resolve(process.env.ANIM_PY_DIR) : resolve(process.cwd(), "py");
}

async function binOk(bin: string, args: string[]): Promise<boolean> {
  try {
    const r = await execa(bin, args, { reject: false });
    return r.exitCode === 0;
  } catch {
    return false;
  }
}

export default { kind: "tts", adapter } satisfies AdapterRegistration;
