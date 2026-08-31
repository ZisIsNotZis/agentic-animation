import type { CorpusDoc } from "@anim/core";

/**
 * The reliability tags the corpus embeds inline (e.g. `[disputed]`,
 * `[scholarly]`). Closed set as of 2026-07 — verified by a sweep of
 * `04-deep-dives/` (see docs/PIPELINE.md, corpus stage). Unknown tags are
 * preserved verbatim in `RawBullet.tagsRaw` but not lifted into this union.
 */
export const RELIABILITY_TAGS = [
  "disputed",
  "folk tradition",
  "late text",
  "scholarly",
  "regional",
] as const;
export type ReliabilityTag = (typeof RELIABILITY_TAGS)[number];

/**
 * One parsed timeline/deep-dive bullet following the corpus convention
 * `- **Title** — rest (Source)` (the regex ported from
 * `the-Hindu-timeline/tools/repo_tools.py`, `EVENT_RE`, ~line 200). Inline
 * reliability tags are lifted into structured fields; the source parenthetical
 * is split out; `text` is the remaining prose with both stripped.
 */
export interface CorpusBullet {
  /** The bold lead-in (`**Title**`). */
  title: string;
  /** Prose after the em/en/hyphen separator, source + tags removed. */
  text: string;
  /** Trailing `(…)` citation clause, if present. */
  source?: string;
  /** Recognised reliability tags found inline on this bullet. */
  tags: ReliabilityTag[];
  /** Every inline `[…]` token verbatim (superset of `tags`). */
  tagsRaw: string[];
  /** Raw bullet line, unmodified — for callers that want to re-render it. */
  raw: string;
}

/** A `## Heading` section of a deep-dive with its top-level bullets parsed. */
export interface CorpusSection {
  heading: string;
  bullets: CorpusBullet[];
}

/**
 * The rich parse `read()` actually returns. It is a structural **superset** of
 * `@anim/core`'s frozen `CorpusDoc` (`{ ref, text, citation }`), so it satisfies
 * the `CorpusAdapter.read` contract while carrying the extra structure the
 * make-episode skill needs. Consumers typed against `CorpusDoc` see only the
 * three base fields; cast to `CorpusDocParsed` to read the rest.
 */
export interface CorpusDocParsed extends CorpusDoc {
  /** The H1 title (`# …`). */
  title: string;
  /** The breadcrumb blockquote under the H1 (`> Where this sits: …`), joined. */
  breadcrumb?: string;
  /** `## Heading` sections with parsed bullets (excludes the Sources section). */
  sections: CorpusSection[];
  /** Raw body of the trailing `## Sources` section, if present. */
  sourcesSection?: string;
  /** Distinct reliability tags seen anywhere in the document. */
  reliability: ReliabilityTag[];
}
