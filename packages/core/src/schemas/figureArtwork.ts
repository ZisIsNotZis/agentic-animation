import {z} from "zod";
import type {Skeleton} from "./libraryMeta";

export const FIGURE_VIEWS = ["front", "quarter", "side", "back", "quarter_back"] as const;
export type FigureView = typeof FIGURE_VIEWS[number];
export const FIGURE_PARTS = ["torso", "head", "arm_u_l", "arm_l_l", "hand_l", "arm_u_r", "arm_l_r", "hand_r", "leg_u_l", "leg_l_l", "foot_l", "leg_u_r", "leg_l_r", "foot_r"] as const;
export const FIGURE_FACES = ["calm", "shock", "fear", "desperate", "confused", "skeptical", "embarrassed", "relief", "excited", "proud", "somber"] as const;
export const FIGURE_HANDS = ["rest", "open", "point", "fist", "splayed"] as const;
export const FIGURE_MOUTHS = ["A", "B", "C", "D", "E", "F", "G", "H", "X"] as const;

const SVG_ELEMENTS = new Set(["svg", "g", "defs", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "clipPath", "linearGradient", "radialGradient", "stop"]);
const SVG_ATTRIBUTES = new Set(["id", "viewBox", "width", "height", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "fx", "fy", "d", "points", "transform", "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "stroke-opacity", "opacity", "clip-path", "clip-rule", "clipPathUnits", "gradientUnits", "gradientTransform", "spreadMethod", "offset", "stop-color", "stop-opacity"]);

// Parse a deliberately small grammar, not general XML/CSS. Reject entities and
// escapes rather than attempting browser-dependent decoding of URL spellings.
function isSelfContainedSvg(svg: string): boolean {
  if (!/^<svg\b[^>]*>[\s\S]*<\/svg>\s*$/.test(svg) || /[&\\\\]/.test(svg)) return false;
  const stack: string[] = [];
  let position = 0;
  const tags = /<\/?([A-Za-z]+)\b([^<>]*?)(\/?)>/g;
  for (const tag of svg.matchAll(tags)) {
    if (svg.slice(position, tag.index).trim()) return false;
    position = tag.index! + tag[0].length;
    const name = tag[1]!;
    const attributes = tag[2]!;
    const selfClosing = tag[3]!;
    if (!SVG_ELEMENTS.has(name)) return false;
    if (tag[0].startsWith("</")) {
      if (attributes.trim() || selfClosing || stack.pop() !== name) return false;
      continue;
    }
    if ((stack.length === 0 && (name !== "svg" || tag.index !== 0)) || (stack.length > 0 && name === "svg")) return false;
    const seen = new Set<string>();
    let rest = attributes;
    while (rest.trim()) {
      const attribute = rest.match(/^\s+([A-Za-z][\w:-]*)\s*=\s*(["'])([^<>]*?)\2/);
      if (!attribute) return false;
      const key = attribute[1]!;
      const value = attribute[3]!;
      if (seen.has(key)) return false;
      seen.add(key);
      if (key === "xmlns") {
        if (name !== "svg" || value !== "http://www.w3.org/2000/svg") return false;
      } else if (!SVG_ATTRIBUTES.has(key) && !/^data-[a-z][a-z0-9-]*$/.test(key)) return false;
      // Only paint/clip attributes can contain a URL, and only an entire local
      // fragment reference. No CSS comments, mixed tokens or remote resources.
      if (/url\s*\(/i.test(value) &&
          (!(key === "fill" || key === "stroke" || key === "clip-path") ||
           !/^url\(\s*(["']?)#[A-Za-z_][\w.-]*\1\s*\)$/.test(value))) return false;
      rest = rest.slice(attribute[0].length);
    }
    if (!selfClosing) stack.push(name);
  }
  return position > 0 && !svg.slice(position).trim() && stack.length === 0;
}

const SvgSchema = z.string().min(1).max(200_000).refine(isSelfContainedSvg,
"figure artwork must be a self-contained SVG without executable/external content");

function shapes<const K extends string>(keys: readonly K[]) {
  return z.object(Object.fromEntries(keys.map((key) => [key, SvgSchema])) as Record<K, typeof SvgSchema>).strict();
}

/** Factory avoids a runtime cycle with libraryMeta's skeleton schema. */
export function createFigureArtworkSchema(skeleton: z.ZodType<Skeleton>) {
  const view = z.object({
    skeleton,
    parts: shapes(FIGURE_PARTS),
    rearArms: z.array(z.enum(["l","r"])).default([]),
    eyes: shapes(["open", "half", "closed"]),
    expressions: shapes(FIGURE_FACES),
    emotionMouths: shapes(FIGURE_FACES),
    mouths: shapes(FIGURE_MOUTHS),
    tears: SvgSchema,
    hands: z.object({l: shapes(FIGURE_HANDS), r: shapes(FIGURE_HANDS)}).strict(),
  }).strict().superRefine((data, ctx) => {
    const joints = ["waist", "neck", ...["l", "r"].flatMap((side) => ["shoulder", "elbow", "hand", "hip", "knee", "foot"].map((stem) => `${stem}_${side}`))];
    for (const joint of joints) {
      if (!data.skeleton.joints[joint]) ctx.addIssue({code: z.ZodIssueCode.custom, path: ["skeleton", "joints", joint], message: "articulated artwork requires this joint"});
    }
    for (const [joint, point] of Object.entries(data.skeleton.joints)) {
      if (!point.every(Number.isFinite)) ctx.addIssue({code: z.ZodIssueCode.custom, path: ["skeleton", "joints", joint], message: "joint coordinates must be finite"});
    }
    const S=data.skeleton.joints.shoulder_r,E=data.skeleton.joints.elbow_r,H=data.skeleton.joints.hand_r;
    if (S && E && H) {
      for (const [key,a,b] of [["upper",S,E],["fore",E,H]] as const) {
        const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
        if (Math.abs(data.skeleton.arm[key]-length)>1e-6) ctx.addIssue({code:z.ZodIssueCode.custom,path:["skeleton","arm",key],message:"native reach length must match the declared joint vectors exactly"});
      }
    }
    const layers = [...Object.values(data.parts), ...Object.values(data.eyes), ...Object.values(data.expressions), ...Object.values(data.emotionMouths), ...Object.values(data.mouths), data.tears, ...Object.values(data.hands.l), ...Object.values(data.hands.r)];
    for (const svg of layers) {
      const box = svg.match(/\bviewBox\s*=\s*["']([^"']+)["']/)?.[1]?.trim().split(/[\s,]+/).map(Number);
      if (!box || box.length !== 4 || box[0] !== 0 || box[1] !== 0 || box[2] !== data.skeleton.space.width || box[3] !== data.skeleton.space.height) ctx.addIssue({code: z.ZodIssueCode.custom, message: "vector layers must use the declared design viewBox"});
    }
    for (const side of ["l", "r"] as const) {
      const shape = data.skeleton.parts[`hand_${side}`];
      if (!shape || !("circle" in shape) || shape.circle.at !== `hand_${side}`) ctx.addIssue({code: z.ZodIssueCode.custom, path: ["skeleton", "parts", `hand_${side}`], message: "palm contact circle must reference its hand joint"});
    }
  });
  return z.object({format: z.literal("svg-bone-parts"), views: z.object(Object.fromEntries(FIGURE_VIEWS.map((key) => [key, view])) as Record<FigureView, typeof view>).strict()}).strict().superRefine((data, ctx) => {
    const space = data.views.front.skeleton.space;
    for (const key of FIGURE_VIEWS) {
      const size = data.views[key].skeleton.space;
      if (size.width !== space.width || size.height !== space.height) ctx.addIssue({code: z.ZodIssueCode.custom, path: ["views", key, "skeleton", "space"], message: "all native drawings must share a design frame"});
      const waist = data.views[key].skeleton.joints.waist;
      const root = data.views.front.skeleton.joints.waist;
      if (waist && root && (waist[0] !== root[0] || waist[1] !== root[1])) ctx.addIssue({code: z.ZodIssueCode.custom, path: ["views", key, "skeleton", "joints", "waist"], message: "native view changes must retain the same root anchor"});
    }
  });
}
export type FigureArtwork = z.infer<ReturnType<typeof createFigureArtworkSchema>>;

export function figureViewForOrientation(orientation: string = "front"): FigureView {
  if (orientation === "front" || orientation === "back") return orientation;
  if (orientation === "left" || orientation === "right") return "side";
  if (orientation === "front-left" || orientation === "front-right") return "quarter";
  if (orientation === "back-left" || orientation === "back-right") return "quarter_back";
  throw new Error(`unknown figure orientation: ${orientation}`);
}
