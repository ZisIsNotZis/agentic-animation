// Multi-view figure variants (docs/WORLD_PUPPET_MOTOR.md §orientation):
// the same procedural puppet as Actor.tsx seen from other directions —
// quarter-front, back, side, quarter-back — so orientation changes read
// correctly. Same 400x720 design box and proportions as PerformanceActor
// (head r~94 cy~182, torso 270..512, ground y=720) so views can switch
// mid-scene without the figure jumping. The character faces the viewer's
// RIGHT by default; left/right is handled by the caller mirroring the box,
// like Actor.tsx.
import React from "react";

const INK = "#272331"; const SKIN = "#d9a066"; const HAIR = "#242334";
const ROBES = ["#287f8f", "#a43f4f", "#6b4c91"] as const; const DARKS = ["#174b62", "#57243d", "#352b61"] as const;
const LIMB_OUTLINE = 36; const LIMB_FILL = 25;

/** Name plate; identical placement to Actor.tsx and never mirrored. */
const Label: React.FC<{label: string}> = ({label}) => <text x="200" y="690" textAnchor="middle" fill="#fff0c4" stroke={INK} strokeWidth="5" paintOrder="stroke" fontSize="18" fontWeight="900" fontFamily="Arial, 'Noto Sans CJK SC, sans-serif'">{label}</text>;

/** Shadow + staggered legs shared by the 45-degree views (near/right foot forward). */
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

/** Full profile facing the viewer's right: one visible eye, nose on the profile edge, narrow torso, legs overlapping in profile. */
export function SideView({role, label}: {role: number; label: string}): React.ReactElement {
  return <svg aria-label={`actor ${label} side`} viewBox="0 0 400 720" width={400} height={720} style={{overflow: "visible"}}>
    <ellipse cx="200" cy="704" rx="108" ry="16" fill="#120f15" opacity=".58" />
    {/* profile legs: overlapping, near leg one pace forward */}
    <g aria-label="far leg (trailing)">
      <path d="M198 500L186 604" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M198 500L186 604" stroke="#294052" strokeWidth={LIMB_FILL} strokeLinecap="round" />
      <path d="M186 604L164 674" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M186 604L164 674" stroke="#294052" strokeWidth={LIMB_FILL} strokeLinecap="round" />
      <ellipse cx="148" cy="684" rx="46" ry="17" fill="#5d3b4c" stroke={INK} strokeWidth="8" />
    </g>
    <g aria-label="near leg (leading)">
      <path d="M212 500L226 608" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M212 500L226 608" stroke="#294052" strokeWidth={LIMB_FILL} strokeLinecap="round" />
      <path d="M226 608L252 678" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M226 608L252 678" stroke="#294052" strokeWidth={LIMB_FILL} strokeLinecap="round" />
      <ellipse cx="270" cy="688" rx="48" ry="18" fill="#5d3b4c" stroke={INK} strokeWidth="8" />
    </g>
    {/* far arm hinted behind the torso */}
    <path d="M182 300L172 416" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" opacity=".8" />
    {/* narrow profile torso */}
    <g aria-label="torso in profile">
      <path d="M162 272Q212 248 262 272L272 512Q210 550 152 512Z" fill={ROBES[role]} stroke={INK} strokeWidth="10" />
      <path d="M204 278L216 360L226 480" fill="none" stroke={DARKS[role]} strokeWidth="7" opacity=".8" />
      <path d="M158 482Q210 506 266 482" fill="none" stroke="#f2c14e" strokeWidth="12" />
      <rect x="190" y="482" width="42" height="50" rx="8" fill="#f2c14e" stroke={INK} strokeWidth="8" />
      {/* near arm, one pace forward */}
      <path d="M246 294L268 406" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M246 294L268 406" stroke={ROBES[role]} strokeWidth={LIMB_FILL} strokeLinecap="round" />
      <path d="M268 406L262 510" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M268 406L262 510" stroke="#d18b5b" strokeWidth={LIMB_FILL} strokeLinecap="round" />
      <path d="M262 510l18 8m-5-15l8 20" stroke={SKIN} strokeWidth="8" strokeLinecap="round" />
    </g>
    <g aria-label="head in profile">
      <path d="M190 244Q212 234 234 244L236 326Q212 337 188 326Z" fill={SKIN} stroke={INK} strokeWidth="9" />
      <circle cx="204" cy="182" r="94" fill={SKIN} stroke={INK} strokeWidth="10" />
      {/* profile hair swept back from the forehead */}
      <path d="M118 190Q120 74 204 70Q290 74 296 168L268 150L246 118L226 146L204 112L182 146L160 116Q132 140 130 192Q126 216 118 190Z" fill={HAIR} stroke={INK} strokeWidth="10" />
      {/* ear on the visible side */}
      <ellipse cx="216" cy="196" rx="15" ry="21" fill={SKIN} stroke={INK} strokeWidth="6" />
      {/* nose hint on the profile edge */}
      <path d="M292 172q16 10 8 22l-14 4" fill={SKIN} stroke={INK} strokeWidth="7" strokeLinejoin="round" />
      {/* single visible eye + brow */}
      <path d="M226 142Q248 132 266 146" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="246" cy="174" rx="16" ry="12" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="250" cy="174" r="6" fill={INK} />
      {/* mouth hint on the profile edge */}
      <path d="M272 224q-14 8 -26 2" fill="none" stroke="#7a2e2e" strokeWidth="7" strokeLinecap="round" />
    </g>
    <Label label={label} />
  </svg>;
}

/** Rear three-quarter turned toward the viewer's right: asymmetric back plane, near arm dominant, sliver of cheek on the right edge. */
export function QuarterBackView({role, label}: {role: number; label: string}): React.ReactElement {
  return <svg aria-label={`actor ${label} quarter back`} viewBox="0 0 400 720" width={400} height={720} style={{overflow: "visible"}}>
    <Stance role={role} />
    {/* far (left) arm barely visible behind the near edge */}
    <path d="M158 302L146 414" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" opacity=".7" />
    <g aria-label="torso, asymmetric back plane">
      <path d="M148 270Q206 246 268 272L284 512Q202 550 120 510Z" fill={ROBES[role]} stroke={INK} strokeWidth="10" />
      {/* near-side shaded panel: the back turned away from the light */}
      <path d="M206 254L268 272L284 512Q240 536 196 542Z" fill={DARKS[role]} stroke="none" opacity=".55" />
      <path d="M132 482Q204 508 268 484" fill="none" stroke="#f2c14e" strokeWidth="12" />
      <rect x="176" y="482" width="42" height="50" rx="8" fill="#f2c14e" stroke={INK} strokeWidth="8" />
      {/* near (right) arm, clearly separated from the body */}
      <path d="M270 292L296 404" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M270 292L296 404" stroke={ROBES[role]} strokeWidth={LIMB_FILL} strokeLinecap="round" />
      <path d="M296 404L302 508" stroke={DARKS[role]} strokeWidth={LIMB_OUTLINE} strokeLinecap="round" />
      <path d="M296 404L302 508" stroke="#d18b5b" strokeWidth={LIMB_FILL} strokeLinecap="round" />
      <path d="M302 508l20 10m-6-16l10 22" stroke={SKIN} strokeWidth="8" strokeLinecap="round" />
    </g>
    <g aria-label="back of head, turned right">
      <path d="M182 244Q208 234 234 244L236 326Q208 337 180 326Z" fill={SKIN} stroke={INK} strokeWidth="9" />
      <circle cx="212" cy="182" r="94" fill={SKIN} stroke={INK} strokeWidth="10" />
      {/* hair from behind, silhouette shifted right with the turn */}
      <path d="M120 190Q118 72 210 68Q302 72 306 188Q306 232 290 250L272 234L254 256L236 236L218 258L200 238L182 256L164 236Q120 234 120 190Z" fill={HAIR} stroke={INK} strokeWidth="10" />
      {/* ear peeking on the turned right side */}
      <ellipse cx="298" cy="198" rx="14" ry="20" fill={SKIN} stroke={INK} strokeWidth="6" />
      {/* sliver of cheek/jaw showing past the hair on the right edge */}
      <path d="M304 208q14 18 6 40l-16 -6q8 -16 2 -32Z" fill={SKIN} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    </g>
    <Label label={label} />
  </svg>;
}
