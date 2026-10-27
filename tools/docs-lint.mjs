// Documentation lint: the shape rules of docs/ in one command.
//
// A rule that no check observes is a rule agents re-derive wrongly. This tool
// observes the four that can be observed mechanically:
//   1. every document under docs/ is named <level>_<NAME>.md or INDEX.md, and
//      every level document's H1s are the source zones, ordered;
//   2. every document under docs/ stays below the 200-line ceiling;
//   3. a level document carries no event date and no commit-hash diary line —
//      dates belong to the evidence capture, not to the fact;
//   4. every relative link in every authored Markdown resolves.
//
// Usage: node tools/docs-lint.mjs [--quiet]
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "..");
const ZONES = ["EXPLICIT", "CONFIRMED", "INFERRED"];
const LIMIT = 200;

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
};

const problems = [];
const fail = (file, message) => problems.push(`${path.relative(repo, file)}: ${message}`);

// Every authored Markdown file, excluding third-party and generated trees.
const authored = execSync("git ls-files '*.md'", { encoding: "utf8", cwd: repo })
  .split("\n")
  .filter(Boolean)
  .filter((f) => !f.startsWith("vendor/") && !f.startsWith("node_modules/") && !f.startsWith("py/.venv/"));

const anchor = (heading) =>
  heading
    .toLowerCase()
    .replace(/[`*_[\]()]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");

const headingsOf = (text) =>
  text
    .split("\n")
    .filter((l) => /^#{1,6} /.test(l))
    .map((l) => l.replace(/^#+ /, ""));

for (const file of authored) {
  const abs = path.join(repo, file);
  if (!existsSync(abs)) continue;
  const text = readFileSync(abs, "utf8");
  const lines = text.split("\n");

  if (file.startsWith("docs/") && !file.startsWith("docs/schemas/")) {
    const base = path.basename(file);
    if (base !== "INDEX.md" && !/^\d+_[A-Z0-9_]+\.md$/.test(base)) {
      fail(abs, `name is neither INDEX.md nor <level>_<NAME>.md`);
    }
    if (lines.length > LIMIT) fail(abs, `${lines.length} lines exceeds ${LIMIT}`);
    if (/^\d+_/.test(base)) {
      const h1 = lines.filter((l) => /^# /.test(l)).map((l) => l.slice(2).trim());
      if (h1.length === 0 || h1.length > ZONES.length) {
        fail(abs, `expected source zone H1s, found ${JSON.stringify(h1)}`);
      } else {
        const indexes = h1.map((h) => ZONES.indexOf(h));
        if (indexes.some((i) => i < 0)) fail(abs, `H1 is not a source zone: ${JSON.stringify(h1)}`);
        if (indexes.some((i, k) => k > 0 && i <= indexes[k - 1]))
          fail(abs, `source zones out of order: ${JSON.stringify(h1)}`);
      }
      const dated = lines.findIndex(
        (l) => /\b20\d{2}-\d{2}-\d{2}\b|\b20\d{6}T\d{4}\b|`[0-9a-f]{7}`/.test(l),
      );
      if (dated >= 0) fail(abs, `line ${dated + 1} carries an event date or commit hash`);
    }
  }

  // relative links resolve, and an in-repo fragment names a real heading
  const dir = path.dirname(abs);
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|#|data:)/.test(target)) continue;
    const [p, frag] = target.split("#");
    if (!p || !p.endsWith(".md")) continue;
    const resolved = path.resolve(dir, p);
    if (!existsSync(resolved)) {
      fail(abs, `link target does not exist: ${target}`);
      continue;
    }
    if (frag) {
      const heads = headingsOf(readFileSync(resolved, "utf8")).map(anchor);
      if (!heads.includes(frag)) fail(abs, `link fragment not found: ${target}`);
    }
  }
}

// A second state home is the defect this lint exists to prevent.
for (const stale of [".scratch/active-work.md", "docs/STATUS.md"]) {
  if (existsSync(path.join(repo, stale))) fail(path.join(repo, stale), "second state home must not exist");
}

if (problems.length) {
  console.error(`docs-lint: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`docs-lint: clean (${authored.length} authored Markdown files)`);
