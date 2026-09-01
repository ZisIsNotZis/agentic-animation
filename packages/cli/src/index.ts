import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { stage } from "./runtime/run";
import type { StageContext } from "./runtime/context";
import { doctor } from "./commands/doctor";
import { charNew, charGen, charCut, charRig, charApprove } from "./commands/char";
import { withStageLock } from "../../../tools/stage-lock/index";
import { checkYamlEpisode, makeYamlEpisode, previewYamlEpisode, renderYamlEpisode } from "./commands/yamlPipeline";

export function buildProgram(): Command {
  const program = new Command();
  program
    .name("anim")
    .description("Agent-operated toolkit: written story → narrated, deterministic 2D animated MP4.")
    .version("0.0.0")
    .option("--verbose", "verbose (debug) logging")
    .option("--cwd <dir>", "run as if invoked from this directory");

  // --- preflight ----------------------------------------------------------
  program
    .command("doctor")
    .description("executable preflight: system probes + every adapter's checks")
    .action((...args) => stage("doctor", doctor)(...args));

  // --- canonical narrow YAML route ---------------------------------------
  program
    .command("check <episode.yml>")
    .description("validate one canonical episode.yml against the library and compiler")
    .action((episodePath: string, _opts, command) =>
      stage("check", async (ctx) => { await checkYamlEpisode(ctx, episodePath); })(episodePath, _opts, command),
    );
  program
    .command("make <episode.yml>")
    .description("prepare audio-authoritative takes and compile performance.json")
    .option("--provider <id>", "override the TTS adapter id")
    .option("--voice-speed <n>", "override the TTS voice speed", (v) => Number.parseFloat(v))
    .option("--synthesize-unmatched", "synthesize exact-text misses with the selected TTS adapter")
    .action((episodePath: string, opts, command) =>
      stage("make", async (ctx) => { await makeYamlEpisode(ctx, episodePath, opts); })(episodePath, opts, command),
    );
  program
    .command("preview <episode.yml>")
    .description("prepare/check a canonical episode and render a short QA preview when supported")
    .action((episodePath: string, _opts, command) =>
      stage("preview", (ctx) =>
        withStageLock(ctx.rootDir, "render", async () => { await previewYamlEpisode(ctx, episodePath); }),
      )(episodePath, _opts, command),
    );
  program
    .command("render-yaml <episode.yml>")
    .description("prepare/check and render the canonical YAML performance manifest")
    .option("--threads <n>", "render concurrency override", (v) => Number.parseInt(v, 10))
    .option("--duration <seconds>", "render only the first N seconds", (v) => Number.parseFloat(v))
    .option("--scale <n>", "output scale, e.g. 0.6666666666666666 for 720p", (v) => Number.parseFloat(v))
    .option("--fps <n>", "frames per second override", (v) => Number.parseInt(v, 10))
    .option("--crf <n>", "x264 crf override", (v) => Number.parseInt(v, 10))
    .option("--voice-speed <n>", "override the TTS voice speed", (v) => Number.parseFloat(v))
    .option("--force", "forward the force override to the manifest renderer")
    .action((episodePath: string, opts, command) =>
      stage("render-yaml", (ctx) =>
        withStageLock(ctx.rootDir, "render", async () => { await renderYamlEpisode(ctx, episodePath, opts); }),
      )(episodePath, opts, command),
    );

  // --- pre-production: characters (workstream B) --------------------------
  const char = program.command("char").description("legacy: character pre-production");
  char
    .command("new <id>")
    .description("scaffold library/figure/<id>/draft/ (brief + house-style + gen-inputs)")
    .option("--force", "reset an existing draft")
    .action((id: string, opts, command) =>
      stage("char new", (ctx) => charNew(ctx, id, opts))(id, opts, command),
    );
  char
    .command("gen <id>")
    .description("run ComfyUI workflows: anchor → turnaround → parts → visemes (records seeds)")
    .option("--dry-run", "emit deterministic placeholder PNGs (no ComfyUI)")
    .option("--seed <n>", "base seed override", (v) => Number.parseInt(v, 10))
    .action((id: string, opts, command) =>
      stage("char gen", (ctx) =>
        // Real ComfyUI gen (~18 GB) holds the heavy-stage lock so it never runs
        // alongside a render (ARCHITECTURE §11). --dry-run is cheap → no lock.
        opts.dryRun
          ? charGen(ctx, id, opts)
          : withStageLock(ctx.rootDir, "imagegen", () => charGen(ctx, id, opts)),
      )(id, opts, command),
    );
  char
    .command("cut <id>")
    .description("background-remove + trim + pivot the generated parts")
    .option("--engine <engine>", "cutter engine: python (default) | node")
    .option("--no-rembg", "skip rembg background removal (trim only)")
    .action((id: string, opts, command) =>
      stage("char cut", (ctx) =>
        charCut(ctx, id, { engine: opts.engine, noRembg: opts.rembg === false }),
      )(id, opts, command),
    );
  char
    .command("rig <id>")
    .description("assemble + validate draft/puppet.json (all parts, 9 visemes, pivots in-bounds)")
    .action((id: string, opts, command) =>
      stage("char rig", (ctx) => charRig(ctx, id, opts))(id, opts, command),
    );
  char
    .command("approve <id>")
    .description("freeze draft → v<N>, write meta.json (model + license + seeds), reindex")
    .option("--approver <name>", "who approved this character")
    .option("--date <iso>", "approval date (defaults to ANIM_NOW or now)")
    .action((id: string, opts, command) =>
      stage("char approve", (ctx) => charApprove(ctx, id, opts))(id, opts, command),
    );

  return program;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  buildProgram()
    .parseAsync(process.argv)
    .catch((err) => {
      process.stderr.write(`anim: ${(err as Error).message}\n`);
      process.exit(1);
    });
}
