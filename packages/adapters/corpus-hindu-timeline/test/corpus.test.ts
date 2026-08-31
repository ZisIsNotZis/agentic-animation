import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { fold, loadCatalog, loadEvents, readDoc, searchWithRoot } from "../src/index";

// The sibling corpus repo, resolved relative to this test file so the suite is
// machine-independent (assumes the documented sibling-checkout layout).
const here = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(here, "../../../../../the-Hindu-timeline");
const HAS_CORPUS = existsSync(resolve(CORPUS, "data/events.jsonl"));

const maybe = HAS_CORPUS ? test : test.skip;

test("fold strips diacritics and lowercases", () => {
  assert.equal(fold("Kṛṣṇa"), "krsna");
  assert.equal(fold("Śāntanu"), "santanu");
  assert.equal(fold("ABC"), "abc");
});

maybe("loadEvents parses the real events.jsonl", () => {
  const events = loadEvents(CORPUS);
  assert.ok(events.length > 5000, `expected thousands of events, got ${events.length}`);
  const first = events[0]!;
  for (const k of ["title", "description", "actors", "period"] as const) {
    assert.ok(k in first, `event missing ${k}`);
  }
  assert.ok(Array.isArray(first.actors));
});

maybe("loadCatalog parses the real catalog.json", () => {
  const cat = loadCatalog(CORPUS);
  assert.ok(cat.length > 500, `expected hundreds of files, got ${cat.length}`);
  assert.ok(cat.every((c) => typeof c.path === "string" && typeof c.title === "string"));
});

maybe("search returns ranked hits with citations and joinable refs", () => {
  const hits = searchWithRoot(CORPUS, "Satyavati fisher queen", { limit: 10 });
  assert.ok(hits.length > 0, "expected hits for a known corpus subject");
  for (const h of hits) {
    assert.ok(h.title.length > 0);
    assert.ok(h.citation.length > 0);
    assert.ok(typeof h.score === "number" && h.score! > 0);
  }
  // Hits are score-sorted descending.
  const scores = hits.map((h) => h.score ?? 0);
  assert.deepEqual([...scores].sort((a, b) => b - a), scores);
});

maybe("search is diacritic-insensitive (krishna matches Kṛṣṇa)", () => {
  const hits = searchWithRoot(CORPUS, "krishna", { limit: 20 });
  assert.ok(hits.length > 0, "diacritic-folded query should still match");
});

maybe("at least one search hit resolves to a readable detail file", () => {
  const hits = searchWithRoot(CORPUS, "Satyavati", { limit: 20 });
  const readable = hits.find((h) => h.ref && h.ref.endsWith(".md") && existsSync(resolve(CORPUS, h.ref)));
  assert.ok(readable, "expected a hit whose ref joins to a real markdown file");
  const doc = readDoc(CORPUS, readable!.ref);
  assert.ok(doc.title.length > 0);
  assert.ok(doc.text.length > 0);
});

maybe("readDoc parses H1, breadcrumb, bullets, sources and reliability tags", () => {
  const ref = "04-deep-dives/acchoda-satyavati-rebirth.md";
  assert.ok(existsSync(resolve(CORPUS, ref)), `fixture ${ref} must exist`);
  const doc = readDoc(CORPUS, ref);

  assert.match(doc.title, /Acchod/, "H1 title extracted");
  assert.ok(doc.breadcrumb && doc.breadcrumb.length > 0, "breadcrumb blockquote extracted");
  assert.match(doc.breadcrumb!, /Where this sits/i);

  assert.ok(doc.sections.length >= 4, `expected several sections, got ${doc.sections.length}`);
  const allBullets = doc.sections.flatMap((s) => s.bullets);
  assert.ok(allBullets.length > 10, "bullets parsed from sections");

  // Bullet convention: bold title + source parenthetical extracted.
  const withSource = allBullets.find((b) => b.source);
  assert.ok(withSource, "at least one bullet carries a (Source) clause");
  assert.ok(!withSource!.text.includes(withSource!.source!), "source stripped from bullet text");

  // Reliability tags lifted to structured fields.
  assert.ok(doc.reliability.length > 0, "document-level reliability tags aggregated");
  assert.ok(doc.reliability.includes("scholarly") || doc.reliability.includes("disputed"));
  const tagged = allBullets.find((b) => b.tags.length > 0);
  assert.ok(tagged, "at least one bullet has structured reliability tags");
  assert.ok(!tagged!.text.includes("["), "inline tags stripped from bullet text");

  // Sources section captured.
  assert.ok(doc.sourcesSection && /Purāṇa|Purana|Matsya/.test(doc.sourcesSection), "## Sources body captured");
});

maybe("readDoc rejects refs that escape the corpus root", () => {
  assert.throws(() => readDoc(CORPUS, "../../etc/passwd"), /escapes|not found/);
});
