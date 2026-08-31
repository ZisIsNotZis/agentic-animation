import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execa } from "execa";
import {
  MouthCueSchema,
  VISEMES,
  notReadyCheck,
  type AdapterRegistration,
  type Check,
  type LipsyncAdapter,
  type MouthCue,
} from "@anim/core";

const ID = "rhubarb";

/**
 * Rhubarb Lip Sync CLI wrapper. Emits the 9 Rhubarb visemes (A–H, X). Per
 * ARCHITECTURE §10 we ALWAYS pass `-d <dialogText>`: giving Rhubarb the known
 * transcript switches it to the phonetic recognizer path and sharply improves
 * cue accuracy. Binary is resolved from `$RHUBARB_PATH`, else the pinned vendor
 * copy (`vendor/rhubarb/rhubarb`), else `rhubarb` on PATH.
 */
const adapter: LipsyncAdapter = {
  id: ID,

  async analyze(req): Promise<MouthCue[]> {
    const bin = resolveBinary();
    if (!bin) {
      throw new Error(
        "lipsync:rhubarb — Rhubarb binary not found. Run tools/fetch-rhubarb.sh " +
          "(installs vendor/rhubarb/), or set RHUBARB_PATH.",
      );
    }
    if (!existsSync(req.audioPath)) {
      throw new Error(`lipsync:rhubarb — audio not found: ${req.audioPath}`);
    }

    const args = ["-f", "json", "-r", "phonetic"];
    let dialogFile: string | undefined;
    if (req.dialogText && req.dialogText.trim()) {
      const dir = mkdtempSync(join(tmpdir(), "rhubarb-"));
      dialogFile = join(dir, "dialog.txt");
      writeFileSync(dialogFile, req.dialogText.trim() + "\n");
      args.push("-d", dialogFile);
    }
    args.push(req.audioPath);

    const res = await execa(bin, args, { reject: false });
    if (res.exitCode !== 0) {
      throw new Error(`lipsync:rhubarb — exited ${res.exitCode}: ${res.stderr || res.stdout}`);
    }

    let parsed: { mouthCues?: { start: number; end: number; value: string }[] };
    try {
      parsed = JSON.parse(res.stdout) as typeof parsed;
    } catch {
      throw new Error(`lipsync:rhubarb — non-JSON output: ${res.stdout.slice(0, 300)}`);
    }
    const cues: MouthCue[] = [];
    for (const c of parsed.mouthCues ?? []) {
      const cue = MouthCueSchema.safeParse({ start: c.start, end: c.end, viseme: c.value });
      if (!cue.success) {
        throw new Error(`lipsync:rhubarb — unexpected viseme "${c.value}" (expected ${VISEMES.join(",")})`);
      }
      cues.push(cue.data);
    }
    return cues;
  },

  async doctor(): Promise<Check[]> {
    const bin = resolveBinary();
    if (!bin) {
      return [
        notReadyCheck(
          `lipsync:${ID}`,
          "Rhubarb binary not found (checked $RHUBARB_PATH, vendor/rhubarb/, PATH).",
          "Run tools/fetch-rhubarb.sh to install vendor/rhubarb/ (1.14.0).",
        ),
      ];
    }
    const checks: Check[] = [];
    const ver = await execa(bin, ["--version"], { reject: false });
    const ok = ver.exitCode === 0;
    checks.push({
      name: `lipsync:${ID} binary`,
      ok,
      detail: ok ? `${bin} — ${(ver.stdout || ver.stderr).split("\n")[0]}` : `found but not runnable: ${bin}`,
      ...(ok ? {} : { fix: "The Rhubarb binary is present but failed to run — re-run tools/fetch-rhubarb.sh." }),
    });
    // Apple Silicon note: the official 1.14.0 mac build is x64 (runs under
    // Rosetta 2). Surface it so a missing Rosetta reads as a clear cause.
    if (process.platform === "darwin" && process.arch === "arm64") {
      const fileType = await execa("file", ["-b", bin], { reject: false });
      const x64 = /x86_64/.test(fileType.stdout);
      checks.push({
        name: `lipsync:${ID} arch`,
        ok: true,
        detail: x64
          ? "x86_64 binary on arm64 — runs under Rosetta 2 (expected for the official build)"
          : `${process.arch} native`,
        ...(x64 ? { fix: "If it fails to launch, install Rosetta: softwareupdate --install-rosetta --agree-to-license" } : {}),
      });
    }
    return checks;
  },
};

/** `$RHUBARB_PATH` → `<cwd>/vendor/rhubarb/rhubarb` → `rhubarb` on PATH. */
function resolveBinary(): string | null {
  if (process.env.RHUBARB_PATH && existsSync(process.env.RHUBARB_PATH)) {
    return resolve(process.env.RHUBARB_PATH);
  }
  const vendored = resolve(process.cwd(), "vendor", "rhubarb", "rhubarb");
  if (existsSync(vendored)) return vendored;
  return whichSync("rhubarb");
}

/** Minimal synchronous PATH lookup (no execa needed for the fast path). */
function whichSync(bin: string): string | null {
  const paths = (process.env.PATH ?? "").split(":");
  for (const p of paths) {
    if (!p) continue;
    const candidate = join(p, bin);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export default { kind: "lipsync", adapter } satisfies AdapterRegistration;
