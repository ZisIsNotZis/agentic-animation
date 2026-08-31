import { readFileSync } from "node:fs";
import type { CorpusHit } from "@anim/core";
import { corpusPaths } from "./root";

/** One row of `data/events.jsonl`. */
export interface CorpusEvent {
  title: string;
  description: string;
  actors: string[];
  period: string;
  source: string | null;
  detail_file: string | null;
}

/** One row of `data/catalog.json`'s `catalog[]`. */
export interface CatalogEntry {
  path: string;
  title: string;
  section: string;
  word_count: number;
  is_index: boolean;
}

interface CatalogFile {
  catalog: CatalogEntry[];
}

/** Fold diacritics so `krishna` matches `Kṛṣṇa` (NFD + strip combining marks). */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function terms(query: string): string[] {
  return fold(query)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

// Parsed corpus files are small and immutable for a CLI run; cache per root.
const eventCache = new Map<string, CorpusEvent[]>();
const catalogCache = new Map<string, CatalogEntry[]>();

export function loadEvents(root: string): CorpusEvent[] {
  const cached = eventCache.get(root);
  if (cached) return cached;
  const { events } = corpusPaths(root);
  const out: CorpusEvent[] = [];
  const text = readFileSync(events, "utf8");
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    out.push(JSON.parse(line) as CorpusEvent);
  }
  eventCache.set(root, out);
  return out;
}

export function loadCatalog(root: string): CatalogEntry[] {
  const cached = catalogCache.get(root);
  if (cached) return cached;
  const { catalog } = corpusPaths(root);
  const parsed = JSON.parse(readFileSync(catalog, "utf8")) as CatalogFile;
  const entries = parsed.catalog ?? [];
  catalogCache.set(root, entries);
  return entries;
}

/** Count matches of `term` in the folded haystack, weighted by `weight`. */
function scoreField(haystack: string, term: string, weight: number): number {
  if (!haystack) return 0;
  let count = 0;
  let i = haystack.indexOf(term);
  while (i !== -1) {
    count++;
    i = haystack.indexOf(term, i + term.length);
  }
  return count * weight;
}

function scoreEvent(ev: CorpusEvent, qterms: string[]): number {
  const title = fold(ev.title);
  const actors = fold(ev.actors.join(" "));
  const body = fold(`${ev.description} ${ev.source ?? ""} ${ev.period}`);
  let score = 0;
  for (const t of qterms) {
    score += scoreField(title, t, 6) + scoreField(actors, t, 4) + scoreField(body, t, 1);
  }
  return score;
}

function scoreCatalog(entry: CatalogEntry, qterms: string[]): number {
  const title = fold(entry.title);
  const path = fold(entry.path);
  let score = 0;
  for (const t of qterms) {
    score += scoreField(title, t, 5) + scoreField(path, t, 2);
  }
  // Prefer real deep-dive content over index/README hubs.
  if (score > 0 && !entry.is_index) score += 0.5;
  return score;
}

function truncate(s: string, n = 240): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export interface SearchOptions {
  /** Max hits returned (default 15). */
  limit?: number;
}

/**
 * Rank corpus events + catalog files against `query`, diacritic-insensitively.
 * Event hits carry `source` as the citation and join to their `detail_file`;
 * file hits carry the file title. Merged, sorted by score, capped at `limit`.
 */
export function searchCorpus(root: string, query: string, opts: SearchOptions = {}): CorpusHit[] {
  const limit = opts.limit ?? 15;
  const qterms = terms(query);
  if (qterms.length === 0) return [];

  const hits: CorpusHit[] = [];

  for (const ev of loadEvents(root)) {
    const score = scoreEvent(ev, qterms);
    if (score <= 0) continue;
    const cite = ev.source ? `${ev.source} — ${ev.period}` : ev.period;
    hits.push({
      ref: ev.detail_file ?? "",
      title: ev.title,
      snippet: truncate(ev.description || ev.title),
      citation: cite,
      score,
    });
  }

  for (const entry of loadCatalog(root)) {
    const score = scoreCatalog(entry, qterms);
    if (score <= 0) continue;
    hits.push({
      ref: entry.path,
      title: entry.title,
      snippet: truncate(`${entry.section} · ${entry.word_count} words`),
      citation: `${entry.title} — ${entry.path}`,
      score,
    });
  }

  hits.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return hits.slice(0, limit);
}
