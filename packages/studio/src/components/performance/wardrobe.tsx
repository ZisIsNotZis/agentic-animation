// Wardrobe SSOT (one wardrobe, eight views): every figure view — front,
// side, quarter-front, quarter-back, back — draws its clothing from these
// palette constants and this seeded fabric generator, so the eight direction
// views of one figure always wear the same garment (docs/WORLD_PUPPET_MOTOR.md
// §orientation). Algorithmic, SVG-only, subordinate to the ink-outline style.
import React from "react";

/** Outline ink and body colors shared by every view. */
export const INK = "#272331";
export const SKIN = "#d9a066";
export const HAIR = "#242334";
/** Robe / garment shade per role index (roleFor(actor.id) % 3). */
export const ROBES = ["#287f8f", "#a43f4f", "#6b4c91"] as const;
export const DARKS = ["#174b62", "#57243d", "#352b61"] as const;
export const LIMB_OUTLINE = 36;
export const LIMB_FILL = 25;

/** Stable per-figure seed (FNV-1a of the actor id) — same garment, same weave. */
export function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface RobeFabricProps {
  /** Actor id — seeds the weave so one figure always wears the same cloth. */
  id: string;
  role: number;
  /** Which plane of the garment: the front shows the fine weave, the back
   *  shows construction (center seam, yoke and hem bands, coarse weave). */
  side: "front" | "back";
  /** The clip path id of THIS view's robe silhouette. */
  clipId: string;
}

/**
 * Seeded algorithmic fabric, clipped to the robe silhouette of the calling
 * view. Front and back are two planes of the same garment: same palette and
 * seed, different construction marks — the back of real clothing shows the
 * center seam and finished bands, not the front print.
 */
export function RobeFabric({id, role, side, clipId}: RobeFabricProps): React.ReactElement {
  const seed = seedOf(id);
  void role;
  const marks: React.ReactElement[] = [];
  if (side === "front") {
    // Front plane: fine crosshatch weave, angle and density vary per figure.
    const angle = 38 + (seed % 5) * 5; // 38..58 deg hatch angle per figure
    const gap = 7 + (seed % 3); // 7..9 px weave density
    const opacity = 0.10 + (seed % 4) * 0.015;
    for (let y = -200; y < 540; y += gap) {
      marks.push(<line key={`a${y}`} x1="90" y1={y + 270} x2="310" y2={y + 250} stroke="#000000" strokeWidth="1.4" opacity={opacity} />);
      if (seed % 2 === 0) marks.push(<line key={`b${y}`} x1="90" y1={y + 250} x2="310" y2={y + 270} stroke="#ffffff" strokeWidth="1.1" opacity={opacity * 0.7} />);
    }
    return <g aria-label="fabric weave front" clipPath={`url(#${clipId})`}><g transform={`rotate(${angle} 200 390)`}>{marks}</g></g>;
  }
  // Back plane: construction marks of the same garment — center-back seam,
  // yoke and hem bands, and a coarser single-direction weave.
  const seamX = 196 + (seed % 9); // center seam, slight per-figure drift
  const coarseGap = 12 + (seed % 4);
  const bandOpacity = 0.22;
  const weaveOpacity = 0.09 + (seed % 3) * 0.012;
  for (let y = 262; y < 548; y += coarseGap) {
    marks.push(<line key={`c${y}`} x1="86" y1={y} x2="314" y2={y} stroke="#000000" strokeWidth="1.6" opacity={weaveOpacity} />);
  }
  // Center-back seam: a vertical stitched line with per-figure jitter.
  const seam: string[] = [];
  for (let y = 268; y <= 540; y += 34) {
    seam.push(`${y === 268 ? "M" : "L"}${seamX + ((seed >> (y % 7)) % 5) - 2} ${y}`);
  }
  marks.push(<path key="seam" d={seam.join("")} fill="none" stroke="#000000" strokeWidth="2.2" opacity={bandOpacity} strokeLinecap="round" />);
  marks.push(<path key="seam-stitch" d={seam.join("")} fill="none" stroke="#ffffff" strokeWidth="1" opacity={bandOpacity * 0.8} strokeDasharray="7 9" />);
  // Yoke band (shoulder construction) and hem band (finished lower edge).
  marks.push(<path key="yoke" d={`M110 282Q200 ${268 + (seed % 6)} 292 282`} fill="none" stroke="#000000" strokeWidth="3" opacity={bandOpacity} />);
  marks.push(<path key="hem" d={`M104 496Q200 ${524 + (seed % 8)} 298 496`} fill="none" stroke="#000000" strokeWidth="3" opacity={bandOpacity} />);
  return <g aria-label="fabric back construction" clipPath={`url(#${clipId})`}>{marks}</g>;
}
