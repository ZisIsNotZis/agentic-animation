import type { Check } from "@anim/core";
import type { StageContext } from "../runtime/context";
import { problemChecks } from "../registry";
import { systemChecks } from "../runtime/systemChecks";

interface Group {
  title: string;
  checks: Check[];
}

function printChecks(group: Group): { failed: number } {
  process.stdout.write(`\n${group.title}\n`);
  let failed = 0;
  for (const c of group.checks) {
    const mark = c.ok ? "  ok  " : " FAIL ";
    process.stdout.write(`  [${mark}] ${c.name} — ${c.detail}\n`);
    if (!c.ok) {
      failed++;
      if (c.fix) process.stdout.write(`           fix: ${c.fix}\n`);
    }
  }
  return { failed };
}

/**
 * `anim doctor` — executable preflight. Aggregates system probes and every
 * registered adapter's own `doctor()` checks (ARCHITECTURE §12).
 *
 * Exit is non-zero only on hard breakage — a failing system probe or an adapter
 * that failed to *load*. An adapter reporting "not ready" (missing model/binary)
 * is a warning, not a failure, so the command is green once the environment is
 * sound even before every model is installed.
 */
export async function doctor(ctx: StageContext): Promise<void> {
  process.stdout.write("anim doctor — preflight checks\n");
  process.stdout.write(
    `config: ${ctx.configSources.length ? ctx.configSources.join(", ") : "(defaults — no anim.config.json found)"}\n`,
  );

  const sys = await systemChecks(ctx.config, ctx.rootDir);
  const sysResult = printChecks({ title: "system", checks: sys });

  // Adapter load failures are hard breakage.
  const loadProblems = problemChecks(ctx.registry.problems);

  // Each loaded adapter's own executable checks.
  const adapterChecks: Check[] = [];
  for (const d of ctx.registry.doctorables()) {
    try {
      const results = await d.doctor();
      for (const r of results) adapterChecks.push({ ...r, name: `${d.id}: ${r.name}` });
    } catch (err) {
      adapterChecks.push({
        name: `${d.id}: doctor() threw`,
        ok: false,
        detail: (err as Error).message,
        fix: `Adapter "${d.id}" has a broken doctor(); this is an adapter bug.`,
      });
    }
  }

  printChecks({ title: "adapters (load)", checks: loadProblems.length ? loadProblems : [okNote("all adapter packages loaded")] });
  printChecks({ title: "adapters (readiness)", checks: adapterChecks.length ? adapterChecks : [okNote("no adapters reported checks")] });

  const notReady = adapterChecks.filter((c) => !c.ok).length;
  const hardFailures = sysResult.failed + loadProblems.length;

  process.stdout.write(
    `\nsummary: ${hardFailures} hard failure(s), ${notReady} adapter(s) not ready.\n`,
  );
  if (hardFailures > 0) {
    process.stdout.write("doctor: environment is not ready — fix the FAIL rows above.\n");
    process.exitCode = 1;
  } else {
    process.stdout.write("doctor: environment OK.\n");
  }
}

function okNote(detail: string): Check {
  return { name: "status", ok: true, detail };
}
