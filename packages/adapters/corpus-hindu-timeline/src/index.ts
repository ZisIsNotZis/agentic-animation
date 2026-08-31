import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, normalize } from "node:path";
import {
  type AdapterRegistration,
  type Check,
  type CorpusAdapter,
  type CorpusHit,
} from "@anim/core";
import { corpusExists, corpusPaths, resolveCorpusRoot } from "./root";
import { loadCatalog, loadEvents, searchCorpus, type SearchOptions } from "./search";
import { parseMarkdown } from "./parse";
import type { CorpusDocParsed } from "./types";

export * from "./types";
export * from "./search";
export * from "./parse";
export { resolveCorpusRoot, corpusPaths, corpusExists } from "./root";

const ID = "hindu-timeline";

/**
 * Resolve a corpus `ref` (a repo-root-relative path, possibly with a `#anchor`)
 * to an absolute file path inside `root`, refusing paths that escape the corpus.
 */
function resolveRef(root: string, ref: string): string {
  const clean = ref.split("#")[0]!.trim().replace(/^\.\.\//, "");
  if (!clean) throw new Error(`corpus:${ID} read: empty ref. Pass a repo-relative path like "04-deep-dives/<file>.md".`);
  if (isAbsolute(clean)) throw new Error(`corpus:${ID} read: ref must be repo-relative, not absolute ("${ref}").`);
  const abs = normalize(join(root, clean));
  if (!abs.startsWith(normalize(root))) {
    throw new Error(`corpus:${ID} read: ref "${ref}" escapes the corpus root.`);
  }
  return abs;
}

/** Read + parse a corpus document. Exported for direct/test use. */
export function readDoc(root: string, ref: string): CorpusDocParsed {
  const abs = resolveRef(root, ref);
  if (!existsSync(abs)) {
    throw new Error(
      `corpus:${ID} read: "${ref}" not found at ${abs}. ` +
        `Check the ref against data/catalog.json or an event's detail_file.`,
    );
  }
  const md = readFileSync(abs, "utf8");
  const parsed = parseMarkdown(md);
  return {
    ref,
    text: md,
    citation: parsed.title || ref,
    title: parsed.title,
    ...(parsed.breadcrumb ? { breadcrumb: parsed.breadcrumb } : {}),
    sections: parsed.sections,
    ...(parsed.sourcesSection ? { sourcesSection: parsed.sourcesSection } : {}),
    reliability: parsed.reliability,
  };
}

/** Search the corpus with an explicit root (bypasses config). For tests/tools. */
export function searchWithRoot(root: string, query: string, opts?: SearchOptions): CorpusHit[] {
  return searchCorpus(root, query, opts);
}

const adapter: CorpusAdapter = {
  id: ID,
  async search(query: string): Promise<CorpusHit[]> {
    return searchCorpus(resolveCorpusRoot(), query);
  },
  async read(ref: string): Promise<CorpusDocParsed> {
    return readDoc(resolveCorpusRoot(), ref);
  },
  async doctor(): Promise<Check[]> {
    const checks: Check[] = [];
    let root: string;
    try {
      root = resolveCorpusRoot();
    } catch (err) {
      return [
        {
          name: `corpus:${ID}: root`,
          ok: false,
          detail: `could not resolve corpus root — ${(err as Error).message}`,
          fix: `Set paths.corpus in anim.config.json (default ../the-Hindu-timeline) or export ANIM_CORPUS_ROOT.`,
        },
      ];
    }

    const paths = corpusPaths(root);
    const present = corpusExists(root);
    checks.push({
      name: `corpus:${ID}: data files`,
      ok: present,
      detail: present
        ? `found data/events.jsonl + data/catalog.json under ${root}`
        : `missing data files under ${root}`,
      ...(present
        ? {}
        : {
            fix: `Clone/checkout the-Hindu-timeline at ${root} (needs data/events.jsonl and data/catalog.json), or fix paths.corpus / ANIM_CORPUS_ROOT.`,
          }),
    });
    if (!present) return checks;

    try {
      const events = loadEvents(root);
      const catalog = loadCatalog(root);
      checks.push({
        name: `corpus:${ID}: parse`,
        ok: events.length > 0 && catalog.length > 0,
        detail: `${events.length} events, ${catalog.length} catalog files parsed`,
        ...(events.length && catalog.length
          ? {}
          : { fix: `Regenerate the data layer in the-Hindu-timeline (tools/repo_tools.py build_data).` }),
      });
    } catch (err) {
      checks.push({
        name: `corpus:${ID}: parse`,
        ok: false,
        detail: `data files present but failed to parse — ${(err as Error).message}`,
        fix: `Regenerate data/events.jsonl + data/catalog.json (tools/repo_tools.py build_data in the-Hindu-timeline).`,
      });
    }
    return checks;
  },
};

export default { kind: "corpus", adapter } satisfies AdapterRegistration;
