/**
 * Set world declarations: load-time validation and one-shot normalization
 * (docs/SCHEMAS.md "Set world declarations"). A set is world-declaring
 * exactly when its scene.svg carries id-bearing <g> groups; legacy sets
 * without them keep the flat single-background path untouched.
 */
import {SetManifestSchema, type NormalizedSetWorld} from "../schemas/libraryMeta";

/** Support agreement: declared y vs painted data-support-top, in art units. */
export const SUPPORT_AGREEMENT_TOLERANCE = 8;

export interface SetWorldInput {
  manifest: unknown;
  sceneSvg: string;
}

/** Ids of <g> groups in scene.svg; double-quoted ids only, per the contract. */
export function svgGroupIds(sceneSvg: string): string[] {
  const ids: string[] = [];
  for (const match of sceneSvg.matchAll(/<g\b[^>]*\bid\s*=\s*"([^"]+)"/g)) {
    const id = match[1]!.trim();
    if (id) ids.push(id);
  }
  return ids;
}

/** Full text of one <g id="...">...</g> element including nested groups. */
export function svgGroupElement(sceneSvg: string, groupId: string): string | undefined {
  const open = new RegExp(`<g\\b[^>]*\\bid\\s*=\\s*"${escapeRegExp(groupId)}"[^>]*>`).exec(sceneSvg);
  if (!open) return undefined;
  const start = open.index;
  let cursor = start + open[0].length;
  if (open[0]!.endsWith("/>")) return sceneSvg.slice(start, cursor);
  let depth = 1;
  const tag = /<g\b[^>]*>|<\/g>/g;
  tag.lastIndex = cursor;
  for (let match = tag.exec(sceneSvg); match !== null; match = tag.exec(sceneSvg)) {
    if (match[0] === "</g>") depth--;
    else if (!match[0]!.endsWith("/>")) depth++;
    if (depth === 0) return sceneSvg.slice(start, match.index + match[0].length);
  }
  return undefined;
}

/** The viewBox numbers of the root <svg>, or undefined when absent. */
export function svgViewBox(sceneSvg: string): {width: number; height: number} | undefined {
  const match = sceneSvg.match(/<svg\b[^>]*\bviewBox\s*=\s*"([^"]+)"/i);
  if (!match) return undefined;
  const numbers = match[1]!.trim().split(/[\s,]+/).map(Number);
  if (numbers.length !== 4 || numbers.some((value) => !Number.isFinite(value)) || numbers[2]! <= 0 || numbers[3]! <= 0) {
    throw new Error("scene.svg has an invalid viewBox");
  }
  return {width: numbers[2]!, height: numbers[3]!};
}

/** Value of an attribute on the element with the given id, if painted. */
export function svgElementAttribute(sceneSvg: string, elementId: string, attribute: string): string | undefined {
  for (const match of sceneSvg.matchAll(new RegExp(`<([a-zA-Z][\\w:-]*)\\b[^>]*\\bid\\s*=\\s*"${escapeRegExp(elementId)}"[^>]*>`, "g"))) {
    const attributeMatch = match[0].match(new RegExp(`\\b${escapeRegExp(attribute)}\\s*=\\s*"([^"]*)"`));
    if (attributeMatch) return attributeMatch[1]!;
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate and normalize a world-declaring set. Throws on missing or invalid
 * declarations; the caller fails asset loading (no silent fallback).
 */
export function normalizeSetWorld(input: SetWorldInput): NormalizedSetWorld {
  const sceneSvg = input.sceneSvg;
  const parsed = SetManifestSchema.parse(input.manifest);
  const width = Number(parsed.coordinateSpace.split("x")[0]);
  const height = Number(parsed.coordinateSpace.split("x")[1]);
  const viewBox = svgViewBox(sceneSvg);
  if (!viewBox) throw new Error("world-declaring set needs a scene.svg viewBox");
  if (viewBox.width !== width || viewBox.height !== height) {
    throw new Error(`coordinateSpace ${parsed.coordinateSpace} disagrees with scene.svg viewBox ${viewBox.width}x${viewBox.height}`);
  }
  const painted = new Set(svgGroupIds(sceneSvg));
  const seen = new Set<string>();
  const layers = parsed.layers.map((entry) => {
    const layer = typeof entry === "string" ? {id: entry, foreground: false} : {id: entry.id, foreground: true};
    if (seen.has(layer.id)) throw new Error(`duplicate layer id: ${layer.id}`);
    seen.add(layer.id);
    if (!painted.has(layer.id)) throw new Error(`declared layer "${layer.id}" has no <g id> group in scene.svg`);
    return layer;
  });
  const supports = parsed.supports.map((surface) => {
    if (surface.x[0] > surface.x[1]) throw new Error(`support "${surface.name}" x range must be [min, max]`);
    const paintedTop = svgElementAttribute(sceneSvg, surface.paint, "data-support-top");
    if (paintedTop === undefined) throw new Error(`support "${surface.name}" paints element "${surface.paint}" without data-support-top`);
    const paintedY = Number(paintedTop);
    if (!Number.isFinite(paintedY) || Math.abs(paintedY - surface.y) > SUPPORT_AGREEMENT_TOLERANCE) {
      throw new Error(`support "${surface.name}" declared at y ${surface.y} but painted at ${paintedTop} (tolerance ${SUPPORT_AGREEMENT_TOLERANCE})`);
    }
    return {name: surface.name, x: [surface.x[0] / width, surface.x[1] / width] as [number, number], y: surface.y / height};
  });
  return {
    coordinateSpace: {width, height},
    layers,
    ...(parsed.safeActorArea ? {safeArea: {
      x: parsed.safeActorArea.x / width,
      y: parsed.safeActorArea.y / height,
      width: parsed.safeActorArea.width / width,
      height: parsed.safeActorArea.height / height,
    }} : {}),
    supports,
  };
}
