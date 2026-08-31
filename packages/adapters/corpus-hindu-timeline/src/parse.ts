import { RELIABILITY_TAGS, type CorpusBullet, type CorpusSection, type ReliabilityTag } from "./types";

/**
 * The bullet convention, ported verbatim from `the-Hindu-timeline/tools/
 * repo_tools.py` (`EVENT_RE`, ~line 200): `- **Title** — rest`, where the
 * separator is an em-dash, en-dash, or hyphen. Only top-level (unindented)
 * bullets are events; indented `  - *Variant…*` lines are prose and skipped.
 */
const BULLET_RE = /^- \*\*(.+?)\*\*\s+[—–-]\s+(.*)$/;

/** Inline reliability/annotation tokens, e.g. `[disputed]`, `[scholarly]`. */
const TAG_RE = /\[([^\]]+)\]/g;

const KNOWN_TAGS = new Set<string>(RELIABILITY_TAGS);

/**
 * Extract the trailing `(…)` source clause from a bullet body. Balanced to one
 * level of nesting so `(Matsya (Reva-khanda))` stays intact. Returns the source
 * text (without the outer parens) and the body with that clause removed.
 */
function splitSource(body: string): { text: string; source?: string } {
  const trimmed = body.trimEnd();
  if (!trimmed.endsWith(")")) return { text: trimmed };
  // Walk back from the final ')' matching nested parens.
  let depth = 0;
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const ch = trimmed[i];
    if (ch === ")") depth++;
    else if (ch === "(") {
      depth--;
      if (depth === 0) {
        const source = trimmed.slice(i + 1, trimmed.length - 1).trim();
        // Only treat it as a citation if it names a source, not a stray aside.
        if (!source) return { text: trimmed };
        return { text: trimmed.slice(0, i).trimEnd(), source };
      }
    }
  }
  return { text: trimmed };
}

function extractTags(s: string): { tags: ReliabilityTag[]; tagsRaw: string[]; stripped: string } {
  const tagsRaw: string[] = [];
  const tags: ReliabilityTag[] = [];
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(s)) !== null) {
    const tok = m[1]!.trim();
    tagsRaw.push(tok);
    if (KNOWN_TAGS.has(tok) && !tags.includes(tok as ReliabilityTag)) {
      tags.push(tok as ReliabilityTag);
    }
  }
  const stripped = s.replace(TAG_RE, "").replace(/\s{2,}/g, " ").trim();
  return { tags, tagsRaw, stripped };
}

export function parseBullet(line: string): CorpusBullet | undefined {
  const m = BULLET_RE.exec(line);
  if (!m) return undefined;
  const title = m[1]!.trim();
  const rest = m[2]!.trim();
  // Tags first (they can trail the source paren), then the source clause.
  const { tags, tagsRaw, stripped } = extractTags(rest);
  const { text, source } = splitSource(stripped);
  return { title, text, ...(source ? { source } : {}), tags, tagsRaw, raw: line };
}

export interface ParsedMarkdown {
  title: string;
  breadcrumb?: string;
  sections: CorpusSection[];
  sourcesSection?: string;
  reliability: ReliabilityTag[];
}

/**
 * Parse a deep-dive markdown document into its structural parts: the H1 title,
 * the breadcrumb blockquote, `## Heading` sections with parsed bullets, and the
 * trailing `## Sources` block. Distinct reliability tags are aggregated.
 */
export function parseMarkdown(md: string): ParsedMarkdown {
  const lines = md.split("\n");
  let title = "";
  const breadcrumbLines: string[] = [];
  let breadcrumbDone = false;

  // H1 + breadcrumb (leading blockquote before the first horizontal rule/heading).
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    const h1 = /^#\s+(.*)$/.exec(line);
    if (h1 && !title) {
      title = h1[1]!.trim();
      continue;
    }
    if (!breadcrumbDone && /^>\s?/.test(line)) {
      breadcrumbLines.push(line.replace(/^>\s?/, "").trim());
      continue;
    }
    if (title && breadcrumbLines.length && line.trim() === "") continue;
    if (breadcrumbLines.length && !/^>\s?/.test(line) && line.trim() !== "") {
      breadcrumbDone = true;
      break;
    }
  }

  const sections: CorpusSection[] = [];
  let sourcesSection: string | undefined;
  let current: CorpusSection | undefined;
  let inSources = false;
  const sourcesBuf: string[] = [];

  for (; i < lines.length; i++) {
    const line = lines[i]!;
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      const heading = h2[1]!.trim();
      if (/^sources\b/i.test(heading)) {
        inSources = true;
        current = undefined;
        continue;
      }
      inSources = false;
      current = { heading, bullets: [] };
      sections.push(current);
      continue;
    }
    if (inSources) {
      sourcesBuf.push(line);
      continue;
    }
    if (current) {
      const bullet = parseBullet(line);
      if (bullet) current.bullets.push(bullet);
    }
  }

  if (sourcesBuf.length) sourcesSection = sourcesBuf.join("\n").trim();

  const reliability: ReliabilityTag[] = [];
  for (const s of sections) {
    for (const b of s.bullets) {
      for (const t of b.tags) if (!reliability.includes(t)) reliability.push(t);
    }
  }

  return {
    title,
    ...(breadcrumbLines.length ? { breadcrumb: breadcrumbLines.join(" ") } : {}),
    sections,
    ...(sourcesSection ? { sourcesSection } : {}),
    reliability,
  };
}
