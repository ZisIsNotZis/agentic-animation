// Multi-view figure variants (docs/WORLD_PUPPET_MOTOR.md §orientation):
// the same procedural puppet as Actor.tsx seen from other directions —
// quarter-front, back, side, quarter-back — so orientation changes read
// correctly. Same 400x720 design box and proportions as PerformanceActor
// (head r~94 cy~182, torso 270..512, ground y=720) so views can switch
// mid-scene without the figure jumping. The character faces the viewer's
// RIGHT by default; left/right is handled by the caller mirroring the box,
// like Actor.tsx.
//
// POSE-AWARE: every view takes the same ActorPose the front view uses, so
// motor-driven actions (walk swing, reach extension, push, carry, speech)
// are visible in every direction. Both arms always exist — the far arm is
// foreshortened and drawn behind the torso, but it is a complete limb
// ending in a visible hand. The far leg carries a small fixed offset so
// the silhouette reads as striding when the walk cycle runs.
import React from "react";
import {
  INK,
  SKIN,
  HAIR,
  ROBES,
  DARKS,
  LIMB_OUTLINE,
  LIMB_FILL,
  RobeFabric,
} from "./wardrobe";
import {
  faceFamily,
  type ActorArmPose,
  type ActorLegPose,
  type ActorPose,
} from "./Actor";

type Pt = [number, number];

/** Name plate; identical placement to Actor.tsx and never mirrored. */
const Label: React.FC<{ label: string }> = ({ label }) => (
  <text
    x="200"
    y="690"
    textAnchor="middle"
    fill="#fff0c4"
    stroke={INK}
    strokeWidth="5"
    paintOrder="stroke"
    fontSize="18"
    fontWeight="900"
    fontFamily="Arial, 'Noto Sans CJK SC, sans-serif'"
  >
    {label}
  </text>
);

/** Hand renderer mirroring Actor.tsx's Hand shapes — but "rest" still draws
 *  a visible palm blob, so a far arm never reads as a missing hand. */
const PoseHand: React.FC<{
  x: number;
  y: number;
  mirror: number;
  shape: string;
}> = ({ x, y, mirror, shape }) => {
  if (shape === "point")
    return (
      <path
        d={`M${x} ${y}l${mirror * 56} -18m${-mirror * 8} 8l${mirror * 17} 13`}
        stroke={SKIN}
        strokeWidth="14"
        strokeLinecap="round"
      />
    );
  if (shape === "splayed" || shape === "open")
    return (
      <path
        d={`M${x} ${y}l${mirror * 20} 16m${-mirror * 5} -18l${mirror * 11} 24m${-mirror * 8} -23l${mirror * 2} 26m${-mirror * 10} -20l${-mirror * 8} 18`}
        stroke={SKIN}
        strokeWidth="8"
        strokeLinecap="round"
      />
    );
  if (shape === "fist")
    return (
      <path
        d={`M${x - 15} ${y - 9}Q${x} ${y - 25} ${x + 15} ${y - 9}L${x + 13} ${y + 12}Q${x} ${y + 25} ${x - 13} ${y + 12}Z`}
        fill={SKIN}
        stroke={INK}
        strokeWidth="6"
      />
    );
  return (
    <ellipse
      cx={x + mirror * 4}
      cy={y + 6}
      rx="13"
      ry="16"
      fill={SKIN}
      stroke={INK}
      strokeWidth="6"
    />
  );
};

/** One pose-driven arm: rotate(upper) about the shoulder, rotate(lower)
 *  about the elbow, hand at the wrist. `foreshorten` pulls the far arm's
 *  segments toward the shoulder (the turned-away arm is shorter on screen
 *  but still complete). */
const PoseArm: React.FC<{
  role: number;
  arm: ActorArmPose;
  shoulder: Pt;
  elbow: Pt;
  wrist: Pt;
  mirror: number;
  ariaSide: string;
  foreshorten?: number;
}> = ({
  role,
  arm,
  shoulder,
  elbow,
  wrist,
  mirror,
  ariaSide,
  foreshorten = 1,
}) => {
  const e: Pt = [
    shoulder[0] + (elbow[0] - shoulder[0]) * foreshorten,
    shoulder[1] + (elbow[1] - shoulder[1]) * foreshorten,
  ];
  const w: Pt = [
    e[0] + (wrist[0] - elbow[0]) * foreshorten,
    e[1] + (wrist[1] - elbow[1]) * foreshorten,
  ];
  return (
    <g
      aria-label={`${ariaSide} arm`}
      transform={`rotate(${arm.upper} ${shoulder[0]} ${shoulder[1]})`}
    >
      <path
        d={`M${shoulder[0]} ${shoulder[1]}L${e[0]} ${e[1]}`}
        stroke={DARKS[role]}
        strokeWidth={LIMB_OUTLINE}
        strokeLinecap="round"
      />
      <path
        d={`M${shoulder[0]} ${shoulder[1]}L${e[0]} ${e[1]}`}
        stroke={ROBES[role]}
        strokeWidth={LIMB_FILL}
        strokeLinecap="round"
      />
      <g
        aria-label={`${ariaSide} hand`}
        transform={`rotate(${arm.lower} ${e[0]} ${e[1]})`}
      >
        <path
          d={`M${e[0]} ${e[1]}L${w[0]} ${w[1]}`}
          stroke={DARKS[role]}
          strokeWidth={LIMB_OUTLINE}
          strokeLinecap="round"
        />
        <path
          d={`M${e[0]} ${e[1]}L${w[0]} ${w[1]}`}
          stroke="#d18b5b"
          strokeWidth={LIMB_FILL}
          strokeLinecap="round"
        />
        <PoseHand x={w[0]} y={w[1]} mirror={mirror} shape={arm.hand} />
      </g>
    </g>
  );
};

/** One pose-driven leg: rotate(upper + offset) about the hip, rotate(lower)
 *  about the knee, foot ellipse at the ankle. The far leg's `extra` offset
 *  makes the walk cycle read as a stride in turned views. */
const PoseLeg: React.FC<{
  role: number;
  leg: ActorLegPose;
  hip: Pt;
  knee: Pt;
  foot: Pt;
  ariaSide: string;
  extra?: number;
}> = ({ role, leg, hip, knee, foot, ariaSide, extra = 0 }) => {
  const ku: Pt = [hip[0] + (knee[0] - hip[0]), hip[1] + (knee[1] - hip[1])];
  return (
    <g
      aria-label={`${ariaSide} leg`}
      transform={`rotate(${leg.upper + extra} ${hip[0]} ${hip[1]})`}
    >
      <path
        d={`M${hip[0]} ${hip[1]}L${ku[0]} ${ku[1]}`}
        stroke={DARKS[role]}
        strokeWidth={LIMB_OUTLINE}
        strokeLinecap="round"
      />
      <path
        d={`M${hip[0]} ${hip[1]}L${ku[0]} ${ku[1]}`}
        stroke="#294052"
        strokeWidth={LIMB_FILL}
        strokeLinecap="round"
      />
      <g transform={`rotate(${leg.lower} ${ku[0]} ${ku[1]})`}>
        <path
          d={`M${ku[0]} ${ku[1]}L${foot[0]} ${foot[1]}`}
          stroke={DARKS[role]}
          strokeWidth={LIMB_OUTLINE}
          strokeLinecap="round"
        />
        <path
          d={`M${ku[0]} ${ku[1]}L${foot[0]} ${foot[1]}`}
          stroke="#294052"
          strokeWidth={LIMB_FILL}
          strokeLinecap="round"
        />
        <ellipse
          cx={foot[0] - 16}
          cy={foot[1] + 8}
          rx="48"
          ry="18"
          fill="#5d3b4c"
          stroke={INK}
          strokeWidth="8"
        />
      </g>
    </g>
  );
};

/** Shared stance: shadow + two pose-driven legs. The far (left) leg gets a
 *  fixed −7° offset so the figure reads as mid-stride, not glued. */
const PoseStance: React.FC<{
  role: number;
  pose: ActorPose;
  far: { hip: Pt; knee: Pt; foot: Pt };
  near: { hip: Pt; knee: Pt; foot: Pt };
}> = ({ role, pose, far, near }) => (
  <React.Fragment>
    <ellipse cx="200" cy="704" rx="108" ry="16" fill="#120f15" opacity=".58" />
    <PoseLeg
      role={role}
      leg={pose.legLeft}
      hip={far.hip}
      knee={far.knee}
      foot={far.foot}
      ariaSide="far"
      extra={-7}
    />
    <PoseLeg
      role={role}
      leg={pose.legRight}
      hip={near.hip}
      knee={near.knee}
      foot={near.foot}
      ariaSide="near"
      extra={4}
    />
  </React.Fragment>
);

const FAR_STANCE = {
  hip: [162, 500] as Pt,
  knee: [150, 606] as Pt,
  foot: [122, 668] as Pt,
};
const NEAR_STANCE = {
  hip: [244, 500] as Pt,
  knee: [254, 612] as Pt,
  foot: [282, 682] as Pt,
};

/** Torso transform shared by the turned views: torso drop/lean/squash from
 *  the same ActorPose the front view consumes (motor lean included). */
const torsoTransform = (pose: ActorPose, waist: Pt): string =>
  `translate(0 ${pose.torsoY}) rotate(${pose.torsoTilt} ${waist[0]} ${waist[1]}) scale(1 ${pose.torsoScaleY})`;
const headTransform = (pose: ActorPose): string =>
  `translate(0 ${pose.headY}) rotate(${pose.headTilt} 200 205)`;

/** Mouth for the partially-visible faces: speech opens it (pose-driven),
 *  otherwise a smile/somber curve from the shared faceFamily logic. */
const TurnedMouth: React.FC<{
  pose: ActorPose;
  expression: string;
  d: string;
}> = ({ pose, expression, d }) => {
  const family = faceFamily(expression);
  if (pose.speechOpen || pose.mouthOpen > 10)
    return (
      <path
        d={`M188 218Q200 ${218 + Math.max(14, pose.mouthOpen)} 212 218Q200 230 188 218Z`}
        fill="#7a2e2e"
        stroke="#7a2e2e"
        strokeWidth="7"
      />
    );
  if (family === "somber" || family === "desperate" || family === "embarrassed")
    return (
      <path
        d={d}
        fill="none"
        stroke="#7a2e2e"
        strokeWidth="7"
        strokeLinecap="round"
      />
    );
  return (
    <path
      d={d}
      fill="none"
      stroke="#7a2e2e"
      strokeWidth="7"
      strokeLinecap="round"
    />
  );
};

/** The character turned 45 degrees toward the viewer's right: far (left)
 *  arm foreshortened behind the torso, near arm fully articulated, face
 *  shifted right and expression-reactive. */
export function QuarterFrontView({
  role,
  label,
  pose,
  expression,
}: ViewProps): React.ReactElement {
  return (
    <svg
      aria-label={`actor ${label} quarter front`}
      viewBox="0 0 400 720"
      width={400}
      height={720}
      style={{ overflow: "visible" }}
    >
      <PoseStance role={role} pose={pose} far={FAR_STANCE} near={NEAR_STANCE} />
      {/* far (left) arm: complete but foreshortened, drawn behind the torso */}
      <PoseArm
        role={role}
        arm={pose.armLeft}
        shoulder={[168, 300]}
        elbow={[136, 420]}
        wrist={[130, 516]}
        mirror={1}
        ariaSide="far"
        foreshorten={0.82}
      />
      <g
        aria-label="torso, left edge foreshortened"
        transform={torsoTransform(pose, [212, 500])}
      >
        <defs>
          <clipPath id={`robeClip-${label}-qf`}>
            <path d="M154 270Q212 244 276 270L300 512Q212 552 128 512Z" />
          </clipPath>
        </defs>
        <path
          d="M154 270Q212 244 276 270L300 512Q212 552 128 512Z"
          fill={ROBES[role]}
          stroke={INK}
          strokeWidth="10"
        />
        <RobeFabric
          id={label}
          role={role}
          side="front"
          clipId={`robeClip-${label}-qf`}
        />
        <path
          d="M186 278L224 352L252 280"
          fill={DARKS[role]}
          stroke={INK}
          strokeWidth="8"
        />
        <path
          d="M162 482Q212 508 264 482"
          fill="none"
          stroke="#f2c14e"
          strokeWidth="12"
        />
        <rect
          x="192"
          y="482"
          width="40"
          height="50"
          rx="8"
          fill="#f2c14e"
          stroke={INK}
          strokeWidth="8"
        />
        {/* near (right) arm, fully articulated */}
        <PoseArm
          role={role}
          arm={pose.armRight}
          shoulder={[262, 292]}
          elbow={[286, 408]}
          wrist={[290, 512]}
          mirror={-1}
          ariaSide="near"
        />
      </g>
      <g aria-label="head turned right" transform={headTransform(pose)}>
        <path
          d="M188 244Q214 232 240 244L242 326Q214 337 186 326Z"
          fill={SKIN}
          stroke={INK}
          strokeWidth="9"
        />
        <circle
          cx="214"
          cy="182"
          r="94"
          fill={SKIN}
          stroke={INK}
          strokeWidth="10"
        />
        <path
          d="M124 182Q126 72 212 68Q298 72 304 180L276 148L252 112L230 144L206 106L180 144L156 114Z"
          fill={HAIR}
          stroke={INK}
          strokeWidth="10"
        />
        <path
          d="M176 146Q158 164 156 190"
          fill="none"
          stroke={HAIR}
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* features shifted right (three-quarter), expression-reactive */}
        <path
          d={`M186 ${140 + pose.browLift}Q208 ${128 + pose.browLift} 228 ${144 + pose.browLift}`}
          fill="none"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d={`M240 ${134 + pose.browLift}Q262 ${126 + pose.browLift} 280 ${142 + pose.browLift}`}
          fill="none"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <ellipse
          cx="206"
          cy="174"
          rx="17"
          ry={Math.max(3, 12 * pose.eyeOpen)}
          fill="#fff"
          stroke={INK}
          strokeWidth="6"
        />
        <ellipse
          cx="256"
          cy="174"
          rx="17"
          ry={Math.max(3, 12 * pose.eyeOpen)}
          fill="#fff"
          stroke={INK}
          strokeWidth="6"
        />
        <circle
          cx={210 + pose.gaze[0] * 0.5}
          cy={174 + pose.gaze[1] * 0.4}
          r="6"
          fill={INK}
        />
        <circle
          cx={260 + pose.gaze[0] * 0.5}
          cy={174 + pose.gaze[1] * 0.4}
          r="6"
          fill={INK}
        />
        <path
          d="M232 196q10 8 2 14"
          fill="none"
          stroke={INK}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <TurnedMouth
          pose={pose}
          expression={expression}
          d="M212 220Q234 226 254 218"
        />
      </g>
      <Label label={label} />
    </svg>
  );
}

/** The character from behind, turned slightly toward the viewer's right:
 *  hair covers the whole head (no face), BOTH arms articulated at the
 *  sides, plain robe back. */
export function BackView({ role, label, pose }: ViewProps): React.ReactElement {
  return (
    <svg
      aria-label={`actor ${label} back`}
      viewBox="0 0 400 720"
      width={400}
      height={720}
      style={{ overflow: "visible" }}
    >
      <PoseStance role={role} pose={pose} far={FAR_STANCE} near={NEAR_STANCE} />
      <g
        aria-label="torso from behind"
        transform={torsoTransform(pose, [200, 500])}
      >
        <defs>
          <clipPath id={`robeClip-${label}-back`}>
            <path d="M132 270Q200 244 272 270L296 512Q200 552 104 512Z" />
          </clipPath>
        </defs>
        {/* From behind, the figure's right arm is on the viewer's left;
            both arms fully visible and symmetric about x=200. */}
        <PoseArm
          role={role}
          arm={pose.armRight}
          shoulder={[138, 292]}
          elbow={[116, 406]}
          wrist={[112, 510]}
          mirror={1}
          ariaSide="left"
          foreshorten={1}
        />
        <path
          d="M132 270Q200 244 272 270L296 512Q200 552 104 512Z"
          fill={ROBES[role]}
          stroke={INK}
          strokeWidth="10"
        />
        <RobeFabric
          id={label}
          role={role}
          side="back"
          clipId={`robeClip-${label}-back`}
        />
        <path
          d="M136 482Q200 510 266 482"
          fill="none"
          stroke="#f2c14e"
          strokeWidth="12"
        />
        <rect
          x="180"
          y="482"
          width="44"
          height="50"
          rx="8"
          fill="#f2c14e"
          stroke={INK}
          strokeWidth="8"
        />
        <PoseArm
          role={role}
          arm={pose.armLeft}
          shoulder={[262, 292]}
          elbow={[284, 406]}
          wrist={[288, 510]}
          mirror={-1}
          ariaSide="right"
          foreshorten={1}
        />
      </g>
      <g aria-label="back of head" transform={headTransform(pose)}>
        <path
          d="M176 244Q202 234 228 244L230 326Q202 337 174 326Z"
          fill={SKIN}
          stroke={INK}
          strokeWidth="9"
        />
        <circle
          cx="200"
          cy="182"
          r="94"
          fill={SKIN}
          stroke={INK}
          strokeWidth="10"
        />
        <path
          d="M107 186Q105 70 199 66Q293 70 295 186Q295 232 279 252L263 236L245 258L227 238L209 260L191 240L173 258L155 238Q107 232 107 186Z"
          fill={HAIR}
          stroke={INK}
          strokeWidth="10"
        />
      </g>
      <Label label={label} />
    </svg>
  );
}

/** Full profile facing the viewer's right: one expression-reactive eye,
 *  speech-reactive mouth on the profile edge, narrow torso, both arms
 *  articulated (far arm foreshortened behind the torso). */
export function SideView({
  role,
  label,
  pose,
  expression,
}: ViewProps): React.ReactElement {
  return (
    <svg
      aria-label={`actor ${label} side`}
      viewBox="0 0 400 720"
      width={400}
      height={720}
      style={{ overflow: "visible" }}
    >
      <ellipse
        cx="200"
        cy="704"
        rx="108"
        ry="16"
        fill="#120f15"
        opacity=".58"
      />
      <PoseLeg
        role={role}
        leg={pose.legLeft}
        hip={[198, 500]}
        knee={[186, 604]}
        foot={[164, 674]}
        ariaSide="far"
        extra={-7}
      />
      <PoseLeg
        role={role}
        leg={pose.legRight}
        hip={[212, 500]}
        knee={[226, 608]}
        foot={[252, 678]}
        ariaSide="near"
        extra={4}
      />
      <g
        aria-label="torso in profile"
        transform={torsoTransform(pose, [212, 500])}
      >
        <defs>
          <clipPath id={`robeClip-${label}-side`}>
            <path d="M162 272Q212 248 262 272L272 512Q210 550 152 512Z" />
          </clipPath>
        </defs>
        {/* far (left) arm foreshortened behind the narrow torso */}
        <PoseArm
          role={role}
          arm={pose.armLeft}
          shoulder={[174, 300]}
          elbow={[142, 416]}
          wrist={[138, 512]}
          mirror={1}
          ariaSide="far"
          foreshorten={0.7}
        />
        <path
          d="M162 272Q212 248 262 272L272 512Q210 550 152 512Z"
          fill={ROBES[role]}
          stroke={INK}
          strokeWidth="10"
        />
        <RobeFabric
          id={label}
          role={role}
          side="back"
          clipId={`robeClip-${label}-side`}
        />
        <path
          d="M204 278L216 360L226 480"
          fill="none"
          stroke={DARKS[role]}
          strokeWidth="7"
          opacity=".8"
        />
        <path
          d="M158 482Q210 506 266 482"
          fill="none"
          stroke="#f2c14e"
          strokeWidth="12"
        />
        <rect
          x="190"
          y="482"
          width="42"
          height="50"
          rx="8"
          fill="#f2c14e"
          stroke={INK}
          strokeWidth="8"
        />
        <PoseArm
          role={role}
          arm={pose.armRight}
          shoulder={[246, 294]}
          elbow={[268, 406]}
          wrist={[262, 510]}
          mirror={-1}
          ariaSide="near"
        />
      </g>
      <g aria-label="head in profile" transform={headTransform(pose)}>
        <path
          d="M190 244Q212 234 234 244L236 326Q212 337 188 326Z"
          fill={SKIN}
          stroke={INK}
          strokeWidth="9"
        />
        <circle
          cx="204"
          cy="182"
          r="94"
          fill={SKIN}
          stroke={INK}
          strokeWidth="10"
        />
        <path
          d="M118 190Q120 74 204 70Q290 74 296 168L268 150L246 118L226 146L204 112L182 146L160 116Q132 140 130 192Q126 216 118 190Z"
          fill={HAIR}
          stroke={INK}
          strokeWidth="10"
        />
        <ellipse
          cx="216"
          cy="196"
          rx="15"
          ry="21"
          fill={SKIN}
          stroke={INK}
          strokeWidth="6"
        />
        <path
          d="M292 172q16 10 8 22l-14 4"
          fill={SKIN}
          stroke={INK}
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d={`M226 ${144 + pose.browLift}Q248 ${134 + pose.browLift} 266 ${148 + pose.browLift}`}
          fill="none"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <ellipse
          cx="246"
          cy="174"
          rx="16"
          ry={Math.max(3, 12 * pose.eyeOpen)}
          fill="#fff"
          stroke={INK}
          strokeWidth="6"
        />
        <circle
          cx={250 + pose.gaze[0] * 0.4}
          cy={174 + pose.gaze[1] * 0.4}
          r="6"
          fill={INK}
        />
        {pose.speechOpen || pose.mouthOpen > 10 ? (
          <ellipse
            cx="270"
            cy="224"
            rx="9"
            ry={Math.max(6, pose.mouthOpen * 0.5)}
            fill="#7a2e2e"
            stroke="#7a2e2e"
            strokeWidth="6"
          />
        ) : (
          <path
            d="M272 224q-14 8 -26 2"
            fill="none"
            stroke="#7a2e2e"
            strokeWidth="7"
            strokeLinecap="round"
          />
        )}
      </g>
      <Label label={label} />
    </svg>
  );
}

/** Rear three-quarter turned toward the viewer's right: asymmetric back
 *  plane, near arm dominant, both arms articulated, sliver of cheek on the
 *  right edge. */
export function QuarterBackView({
  role,
  label,
  pose,
}: ViewProps): React.ReactElement {
  return (
    <svg
      aria-label={`actor ${label} quarter back`}
      viewBox="0 0 400 720"
      width={400}
      height={720}
      style={{ overflow: "visible" }}
    >
      <PoseStance role={role} pose={pose} far={FAR_STANCE} near={NEAR_STANCE} />
      <g
        aria-label="torso, asymmetric back plane"
        transform={torsoTransform(pose, [204, 500])}
      >
        <defs>
          <clipPath id={`robeClip-${label}-qb`}>
            <path d="M148 270Q206 246 268 272L284 512Q202 550 120 510Z" />
          </clipPath>
        </defs>
        {/* far (left) arm barely visible behind the near edge, complete */}
        <PoseArm
          role={role}
          arm={pose.armLeft}
          shoulder={[142, 292]}
          elbow={[116, 408]}
          wrist={[112, 510]}
          mirror={1}
          ariaSide="far"
          foreshorten={0.68}
        />
        <path
          d="M148 270Q206 246 268 272L284 512Q202 550 120 510Z"
          fill={ROBES[role]}
          stroke={INK}
          strokeWidth="10"
        />
        <RobeFabric
          id={label}
          role={role}
          side="back"
          clipId={`robeClip-${label}-qb`}
        />
        <path
          d="M206 254L268 272L284 512Q240 536 196 542Z"
          fill={DARKS[role]}
          stroke="none"
          opacity=".55"
        />
        <path
          d="M132 482Q204 508 268 484"
          fill="none"
          stroke="#f2c14e"
          strokeWidth="12"
        />
        <rect
          x="176"
          y="482"
          width="42"
          height="50"
          rx="8"
          fill="#f2c14e"
          stroke={INK}
          strokeWidth="8"
        />
        <PoseArm
          role={role}
          arm={pose.armLeft}
          shoulder={[268, 292]}
          elbow={[294, 408]}
          wrist={[298, 510]}
          mirror={-1}
          ariaSide="right"
          foreshorten={1}
        />
      </g>
      <g
        aria-label="back of head, turned right"
        transform={headTransform(pose)}
      >
        <path
          d="M182 244Q208 234 234 244L236 326Q208 337 180 326Z"
          fill={SKIN}
          stroke={INK}
          strokeWidth="9"
        />
        <circle
          cx="212"
          cy="182"
          r="94"
          fill={SKIN}
          stroke={INK}
          strokeWidth="10"
        />
        <path
          d="M120 190Q118 72 210 68Q302 72 306 188Q306 232 290 250L272 234L254 256L236 236L218 258L200 238L182 256L164 236Q120 234 120 190Z"
          fill={HAIR}
          stroke={INK}
          strokeWidth="10"
        />
        <ellipse
          cx="298"
          cy="198"
          rx="14"
          ry="20"
          fill={SKIN}
          stroke={INK}
          strokeWidth="6"
        />
        <path
          d="M304 208q14 18 6 40l-16 -6q8 -16 2 -32Z"
          fill={SKIN}
          stroke={INK}
          strokeWidth="6"
          strokeLinejoin="round"
        />
      </g>
      <Label label={label} />
    </svg>
  );
}

/** Props every variant view accepts: the same ActorPose the front view
 *  consumes, plus the solved skeleton (kept for call-site uniformity and
 *  future grip alignment) and the expression string for the visible faces. */
export interface ViewProps {
  role: number;
  label: string;
  pose: ActorPose;
  solved: unknown;
  expression: string;
}
