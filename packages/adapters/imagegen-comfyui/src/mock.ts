import { encodePng } from "./png";

/**
 * Deterministic placeholder art for the adapter's --dry-run mode. Draws a
 * seeded, filled ellipse (real alpha channel, transparent outside) so the whole
 * character pipeline — cut → rig → approve → render — runs without ComfyUI.
 * Same (seed, label, size) → byte-identical PNG.
 */

function hueToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Stable 32-bit hash of a string (FNV-1a) so labels seed a stable hue. */
function labelHash(label: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function placeholderPng(width: number, height: number, seed: number, label: string): Buffer {
  const hue = (labelHash(label) + seed) % 360;
  const [r, g, b] = hueToRgb(hue, 0.5, 0.55);
  const [br, bg, bb] = hueToRgb(hue, 0.6, 0.3); // border

  const cx = width / 2;
  const cy = height / 2;
  const rx = (width * 0.42) ** 2;
  const ry = (height * 0.42) ** 2;
  const rxIn = (width * 0.36) ** 2;
  const ryIn = (height * 0.36) ** 2;

  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x + 0.5 - cx) ** 2;
      const dy = (y + 0.5 - cy) ** 2;
      const inside = dx / rx + dy / ry <= 1;
      const core = dx / rxIn + dy / ryIn <= 1;
      const i = (y * width + x) * 4;
      if (!inside) {
        rgba[i + 3] = 0; // transparent
      } else if (core) {
        rgba[i] = r;
        rgba[i + 1] = g;
        rgba[i + 2] = b;
        rgba[i + 3] = 255;
      } else {
        rgba[i] = br;
        rgba[i + 1] = bg;
        rgba[i + 2] = bb;
        rgba[i + 3] = 255;
      }
    }
  }
  return encodePng(width, height, rgba);
}
