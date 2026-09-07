// Quarter-view figure variants (docs/WORLD_PUPPET_MOTOR.md §orientation):
// the same procedural puppet as Actor.tsx seen from 45 degrees front or
// back, so two characters can face each other diagonally instead of both
// staring into the camera. Same 400x720 design box and proportions as
// PerformanceActor (head r~94 cy~182, torso 270..512, ground 720) so views
// can switch mid-scene without the figure jumping. Left/right is handled
// by the caller mirroring the box, like Actor.tsx.
import React from "react";

const INK = "#272331"; const SKIN = "#d9a066"; const HAIR = "#242334";
const ROBES = ["#287f8f", "#a43f4f", "#6b4c91"] as const; const DARKS = ["#174b62", "#57243d", "#352b61"] as const;
const LIMB_OUTLINE = 36; const LIMB_FILL = 25;

/** Name plate; identical placement to Actor.tsx and never mirrored. */
const Label: React.FC<{label: string}> = ({label}) => <text x="200" y="690" textAnchor="middle" fill="#fff0c4" stroke={INK} strokeWidth="5" paintOrder="stroke" fontSize="18" fontWeight="900" fontFamily="Arial, 'Noto Sans CJK SC, sans-serif'">{label}</text>;

/** Shadow + staggered legs shared by both 45-degree views (near/right foot forward). */
const Stance: React.FC<{role: number}> = ({role}) => <React.Fragment>
  <ellipse cx="200" cy="704" rx="108" ry="16" fill="#120f15" opacity=".58" />
  <g aria-label="far leg (back and up)">
    <path d="M162 500L150 606" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
    <path d="M162 500L150 606" stroke="#294052" strokeWidth={LIMB_FILL} strokeLinecap="round" />
    <path d="M150 606L122 668" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
    <path d="M150 606L122 668" stroke="#294052" strokeWidth={LIMB_FILL} strokeLinecap="round" />
    <ellipse cx="106" cy="676" rx="48" ry="18" fill="#5d3b4c" stroke={INK} strokeWidth="8" />
  </g>
  <g aria-label="near leg (forward)">
    <path d="M244 500L254 612" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
    <path d="M244 500L254 612" stroke="#294052" strokeWidth={LIMB_FILL} strokeLinecap="round" />
    <path d="M254 612L282 682" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
    <path d="M254 612L282 682" stroke="#294052" strokeWidth={LIMB_FILL} strokeLinecap="round" />
    <ellipse cx="300" cy="690" rx="50" ry="19" fill="#5d3b4c" stroke={INK} strokeWidth="8" />
  </g>
</React.Fragment>;

/** The character turned 45 degrees toward the viewer's right: far (left) shoulder pulled in, near arm at the side, face shifted right. */
export function QuarterFrontView({role, label}: {role: number; label: string}): React.ReactElement {
  return <svg aria-label={`actor ${label} quarter front`} viewBox="0 0 400 720" width={400} height={720} style={{overflow: "visible"}}>
    <Stance role={role} />
    {/* far arm, mostly occluded by the torso */}
    <path d="M176 300L164 420" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" opacity=".85" />
    <g aria-label="torso, left edge foreshortened">
      <path d="M154 270Q212 244 276 270L300 512Q212 552 128 512Z" fill={ROBES[role]} stroke={INK} strokeWidth="10" />
      <path d="M186 278L224 352L252 280" fill={DARKS[role]} stroke={INK} strokeWidth="8" />
      <path d="M162 482Q212 508 264 482" fill="none" stroke="#f2c14e" strokeWidth="12" />
      <rect x="192" y="482" width="40" height="50" rx="8" fill="#f2c14e" stroke={INK} strokeWidth="8" />
      {/* near (right) arm at rest */}
      <path d="M262 292L286 408" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M262 292L286 408" stroke={ROBES[role]} strokeWidth={LIMB_FILL} strokeLinecap="round" />
      <path d="M286 408L290 512" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M286 408L290 512" stroke="#d18b5b" strokeWidth={LIMB_FILL} strokeLinecap="round" />
      <path d="M290 512l20 10m-6-16l10 22" stroke={SKIN} strokeWidth="8" strokeLinecap="round" />
    </g>
    <g aria-label="head turned right">
      <path d="M188 244Q214 232 240 244L242 326Q214 337 186 326Z" fill={SKIN} stroke={INK} strokeWidth="9" />
      <circle cx="214" cy="182" r="94" fill={SKIN} stroke={INK} strokeWidth="10" />
      <path d="M124 182Q126 72 212 68Q298 72 304 180L276 148L252 112L230 144L206 106L180 144L156 114Z" fill={HAIR} stroke={INK} strokeWidth="10" />
      <path d="M176 146Q158 164 156 190" fill="none" stroke={HAIR} strokeWidth="14" strokeLinecap="round" />
      {/* features shifted right (three-quarter) */}
      <path d="M186 138Q208 126 228 142" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M240 132Q262 124 280 140" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="206" cy="174" rx="17" ry="12" fill="#fff" stroke={INK} strokeWidth="6" />
      <ellipse cx="256" cy="174" rx="17" ry="12" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="210" cy="174" r="6" fill={INK} />
      <circle cx="260" cy="174" r="6" fill={INK} />
      <path d="M232 196q10 8 2 14" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M212 220Q234 226 254 218" fill="none" stroke="#7a2e2e" strokeWidth="7" strokeLinecap="round" />
    </g>
    <Label label={label} />
  </svg>;
}

/** The character from behind, turned slightly toward the viewer's right: hair covers the whole head, one ear peeking, plain robe back. */
export function BackView({role, label}: {role: number; label: string}): React.ReactElement {
  return <svg aria-label={`actor ${label} back`} viewBox="0 0 400 720" width={400} height={720} style={{overflow: "visible"}}>
    <Stance role={role} />
    <g aria-label="arms at rest, both sides">
      <path d="M170 296L152 410" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M170 296L152 410" stroke={ROBES[role]} strokeWidth={LIMB_FILL} strokeLinecap="round" />
      <path d="M152 410L150 514" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M152 410L150 514" stroke="#d18b5b" strokeWidth={LIMB_FILL} strokeLinecap="round" />
      <path d="M262 292L284 406" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M262 292L284 406" stroke={ROBES[role]} strokeWidth={LIMB_FILL} strokeLinecap="round" />
      <path d="M284 406L288 510" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M284 406L288 510" stroke="#d18b5b" strokeWidth={LIMB_FILL} strokeLinecap="round" />
    </g>
    <g aria-label="torso from behind">
      <path d="M132 270Q200 244 272 270L296 512Q200 552 104 512Z" fill={ROBES[role]} stroke={INK} strokeWidth="10" />
      <path d="M136 482Q200 510 266 482" fill="none" stroke="#f2c14e" strokeWidth="12" />
      <rect x="180" y="482" width="44" height="50" rx="8" fill="#f2c14e" stroke={INK} strokeWidth="8" />
    </g>
    <g aria-label="back of head">
      <path d="M176 244Q202 234 228 244L230 326Q202 337 174 326Z" fill={SKIN} stroke={INK} strokeWidth="9" />
      <circle cx="208" cy="182" r="94" fill={SKIN} stroke={INK} strokeWidth="10" />
      {/* full hair silhouette from behind, hairline dipped low on the neck */}
      <path d="M114 186Q112 70 206 66Q300 70 302 186Q302 232 286 252L270 236L252 258L234 238L216 260L198 240L180 258L162 238Q114 232 114 186Z" fill={HAIR} stroke={INK} strokeWidth="10" />
      {/* ear on the turned (right) side */}
      <ellipse cx="296" cy="196" rx="14" ry="20" fill={SKIN} stroke={INK} strokeWidth="6" />
    </g>
    <Label label={label} />
  </svg>;
}
