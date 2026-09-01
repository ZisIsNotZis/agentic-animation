import {existsSync, lstatSync, readFileSync, readdirSync} from "node:fs";
import {dirname, join, resolve} from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const skillsRoot = join(root, ".agents", "skills");
const errors = [];
const names = new Set();

function fail(message) { errors.push(message); }
function checkMarkdown(path, label, unique = true, skill = true) {
  const lines = readFileSync(path, "utf8").split("\n");
  if (lines.length - 1 > 200 && !path.endsWith("/README.md")) fail(`${label}: exceeds 200 lines`);
  if (!skill) return;
  if (lines[0]?.trim() !== "---") fail(`${label}: missing frontmatter`);
  const end = lines.indexOf("---", 1);
  if (end < 0) fail(`${label}: unterminated frontmatter`);
  const name = end > 0 ? lines.slice(1, end).find((line) => line.startsWith("name:"))?.slice(5).trim() : undefined;
  if (!name) fail(`${label}: missing name`);
  else if (unique && names.has(name)) fail(`${label}: duplicate name ${name}`);
  else if (unique) names.add(name);
  for (const line of lines) {
    for (const match of line.matchAll(/\]\(([^)#]+)(?:#[^)]+)?\)/g)) {
      const target = match[1];
      if (/^(https?:|mailto:)/.test(target)) continue;
      if (!existsSync(resolve(dirname(path), target))) fail(`${label}: broken link ${target}`);
    }
  }
}

for (const entry of readdirSync(skillsRoot, {withFileTypes: true})) {
  const path = join(skillsRoot, entry.name);
  if (entry.isSymbolicLink()) {
    if (!existsSync(path)) fail(`broken skill symlink ${entry.name}`);
  } else if (entry.isDirectory()) {
    const skill = join(path, "SKILL.md");
    if (!existsSync(skill)) fail(`${entry.name}: missing SKILL.md`);
    else checkMarkdown(skill, entry.name);
  }
}
const knowledge = join(root, ".agents", "knowledge");
for (const entry of readdirSync(knowledge, {withFileTypes: true})) if (entry.isFile() && entry.name.endsWith(".md")) checkMarkdown(join(knowledge, entry.name), `knowledge/${entry.name}`, false, false);
for (const entry of readdirSync(skillsRoot, {withFileTypes: true})) if (entry.isDirectory() && !lstatSync(join(skillsRoot, entry.name)).isSymbolicLink()) {
  const text = readFileSync(join(skillsRoot, entry.name, "SKILL.md"), "utf8");
  for (const token of ["episode.json", "storyboard.json", "anim voice", "anim lipsync", "NotImplementedError"]) if (text.includes(token)) fail(`${entry.name}: stale reference ${token}`);
}
if (!existsSync(join(skillsRoot, "agentic-animation", "SKILL.md"))) fail("router skill missing");
if (errors.length) { console.error(errors.map((error) => `skill-audit: ${error}`).join("\n")); process.exit(1); }
console.log(`skill-audit: OK (${names.size} authored skills)`);
