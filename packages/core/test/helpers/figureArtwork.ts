import {readFile} from "node:fs/promises";
import {SkeletonSchema, FigureArtworkSchema} from "../../src/schemas/libraryMeta";
import {FIGURE_VIEWS, FIGURE_PARTS, FIGURE_FACES, FIGURE_HANDS, FIGURE_MOUTHS, type FigureArtwork} from "../../src/schemas/figureArtwork";

const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 720"><path d="M0 0L1 1"/></svg>';
const shapes=(keys: readonly string[]) => Object.fromEntries(keys.map((key) => [key,svg]));
/** Structural fixture only, never an art/anatomy approval sample. */
export async function artworkFixture(): Promise<FigureArtwork> {
  const skeleton=SkeletonSchema.parse(JSON.parse(await readFile('library/figure/lin/skeleton.json','utf8')));
  // Legacy scalars are rounded; native artwork keeps one exact joint geometry.
  const s=skeleton.joints.shoulder_r!,e=skeleton.joints.elbow_r!,h=skeleton.joints.hand_r!;
  skeleton.arm.upper=Math.hypot(e[0]-s[0],e[1]-s[1]);
  skeleton.arm.fore=Math.hypot(h[0]-e[0],h[1]-e[1]);
  return FigureArtworkSchema.parse({format:'svg-bone-parts',views:Object.fromEntries(FIGURE_VIEWS.map((view) => [view,{skeleton,parts:shapes(FIGURE_PARTS),rearArms:[],eyes:shapes(['open','half','closed']),expressions:shapes(FIGURE_FACES),emotionMouths:shapes(FIGURE_FACES),mouths:shapes(FIGURE_MOUTHS),tears:svg,hands:{l:shapes(FIGURE_HANDS),r:shapes(FIGURE_HANDS)}}]))});
}

/** Real additive M2 draft geometry, frozen from lin_parts.py's five native views.
 * SVG placeholders keep motor/FK regression independent of generated artwork. */
export async function nativeDraftArtworkFixture(): Promise<FigureArtwork> {
  const artwork = await artworkFixture();
  const skeletons = JSON.parse(await readFile('packages/core/test/helpers/nativeDraftSkeletons.json','utf8'));
  for (const view of FIGURE_VIEWS) artwork.views[view].skeleton = SkeletonSchema.parse(skeletons[view]);
  return artwork;
}
