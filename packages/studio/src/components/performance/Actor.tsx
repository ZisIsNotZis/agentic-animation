import React from "react";
import type {
  EvaluatedActor,
  EvaluatedProp,
} from "../../performance";
import {ArtFigure} from "./ArtFigure";

import {
  BackView,
  QuarterBackView,
  QuarterFrontView,
  SideView,
} from "./views45";

// Wardrobe SSOT: palette + seeded fabric live in wardrobe.tsx so all eight
// direction views wear the same garment.
import { INK, SKIN, HAIR, ROBES, DARKS, RobeFabric } from "./wardrobe";
const LIMB_OUTLINE = 36;
const LIMB_FILL = 25;
export const ACTOR_GEOMETRY = {
  torsoTop: 270,
  headCenterY: 182,
  headRadius: 94,
  neckTop: 244,
  neckBottom: 326,
} as const;
// React-free pose/FK is shared verbatim with compile-time continuity QA.
export {deriveActorPose, faceFamily, solveActorFigure} from "./actorPose";
export type {FaceFamily, ActorArmPose, ActorLegPose, ActorPose, ActorFigure} from "./actorPose";
import {solveActorFigure, faceFamily, roleFor, activeSpeech} from "./actorPose";
import type {Side, HandShape, ActorArmPose, ActorLegPose, ActorPose} from "./actorPose";

export const PerformanceActor: React.FC<{
  actor: EvaluatedActor;
  props: EvaluatedProp[];
  debugDiv?: boolean;
  handsOnly?: boolean;
}> = ({ actor, props, debugDiv, handsOnly }) => {
  const role = roleFor(actor.id);
  const {
    pose,
    solved,
    flipped,
    waistPitch,
    space,
    skeleton: sk,
  } = solveActorFigure(actor);
  if (actor.artwork) return <ArtFigure actor={actor} artwork={actor.artwork} pose={pose} family={faceFamily(actor.expression.name)} waistPitch={waistPitch} flipped={flipped} debugDiv={debugDiv} handsOnly={handsOnly}/>;
  if (handsOnly) return null;
  const speaking = pose.speechActive || activeSpeech(actor);
  const expression = actor.expression.name.toLowerCase();
  const orientation = actor.orientation ?? "front";
  const heldProp = actor.holds
    ? props.find((prop) => prop.id === actor.holds)
    : undefined;
  const label = actor.id.length > 8 ? actor.id.slice(0, 8) : actor.id;
  const baseX = actor.x - (space.width / 2) * actor.scale; // The transform scales about the div's bottom edge (origin 200px 720px),
  // which keeps the design ground line at top + 720 — so the div top must be
  // actor.y - 720 (UNSCALED) for the drawn feet to stand exactly on the
  // actor's physics ground. Scaling the offset here would sink every figure
  // 720*(1-scale) px below its ground, and hands would never meet bodies.
  const baseY = actor.y - space.height;
  // 45-degree facing: diagonal orientations render the quarter-front or back
  // view (left/right = mirror); absent orientation keeps the full-front figure.
  // Eight directions, five drawings: front (1), back (1), side (+mirror),
  // quarter-front (+mirror), quarter-back (+mirror).
  const view45 =
    orientation === "back" ? (
      <BackView
        role={role}
        label={label}
        pose={pose}
        solved={solved}
        expression={expression}
      />
    ) : orientation === "left" || orientation === "right" ? (
      <SideView
        role={role}
        label={label}
        pose={pose}
        solved={solved}
        expression={expression}
      />
    ) : orientation.startsWith("back-") ? (
      <QuarterBackView
        role={role}
        label={label}
        pose={pose}
        solved={solved}
        expression={expression}
      />
    ) : orientation.startsWith("front-") ? (
      <QuarterFrontView
        role={role}
        label={label}
        pose={pose}
        solved={solved}
        expression={expression}
      />
    ) : null;
  return (
    <div
      data-actor-id={actor.id}
      data-expression={actor.expression.name}
      data-face-family={faceFamily(expression)}
      data-track-count={actor.tracks.length}
      data-pose={actor.pose}
      data-slam-peak={pose.slamPeak}
      data-speech-active={speaking}
      data-speech-open={pose.speechOpen}
      style={{
        position: "absolute",
        left: baseX,
        top: baseY,
        width: 400,
        height: 720,
        background: debugDiv ? "rgba(255,0,0,0.07)" : undefined,
        transformOrigin: "200px 720px",
        transform: `scale(${actor.scale * (flipped ? -1 : 1)}, ${actor.scale}) rotate(${actor.rotation}deg)`,
        zIndex: actor.z,
        overflow: "visible",
      }}
    >
      {view45 ?? (
        <svg
          aria-label={`actor ${label}`}
          viewBox="0 0 400 720"
          width="400"
          height="720"
          style={{ overflow: "visible" }}
        >
          {debugDiv ? (
            <g>
              <rect
                x="0"
                y="0"
                width="400"
                height="720"
                fill="none"
                stroke="#ff0000"
                strokeWidth="6"
              />
              <line
                x1="0"
                y1="709"
                x2="400"
                y2="709"
                stroke="#00ff00"
                strokeWidth="6"
              />
            </g>
          ) : null}
          <ellipse
            cx="200"
            cy="704"
            rx="108"
            ry="16"
            fill="#120f15"
            opacity=".58"
          />
          <Leg side="left" pose={pose.legLeft} role={role} />
          <Leg side="right" pose={pose.legRight} role={role} />
          <g
            aria-label="articulated torso"
            transform={`translate(0 ${pose.torsoY}) rotate(${waistPitch} ${sk?.joints.waist?.[0] ?? 200} ${sk?.joints.waist?.[1] ?? 512}) scale(1 ${pose.torsoScaleY})`}
          >
            <defs>
              <clipPath id={`robeClip-${label}`}>
                <path d="M124 270Q200 242 276 270L300 512Q200 554 100 512Z" />
              </clipPath>
            </defs>
            <path
              d="M124 270Q200 242 276 270L300 512Q200 554 100 512Z"
              fill={ROBES[role]}
              stroke={INK}
              strokeWidth="10"
            />
            <RobeFabric
              id={label}
              role={role}
              side="front"
              clipId={`robeClip-${label}`}
            />
            <path
              d="M150 278L200 350L250 278"
              fill={DARKS[role]}
              stroke={INK}
              strokeWidth="8"
            />
            <path
              d="M140 482Q200 510 260 482"
              fill="none"
              stroke="#f2c14e"
              strokeWidth="12"
            />
            <rect
              x="176"
              y="482"
              width="48"
              height="50"
              rx="8"
              fill="#f2c14e"
              stroke={INK}
              strokeWidth="8"
            />
            <Arm side="left" role={role} pose={pose.armLeft} />
            <Arm side="right" role={role} pose={pose.armRight} />
            <g
              aria-label="articulated head and neck"
              transform={`translate(0 ${pose.headY}) rotate(${pose.headTilt} 200 326)`}
            >
              <path
                aria-label="neck connection"
                d="M174 244Q200 232 226 244L230 326Q200 337 170 326Z"
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
                d="M110 180Q114 70 200 68Q286 70 290 180L258 146L236 110L214 142L190 104L164 142L140 112Z"
                fill={HAIR}
                stroke={INK}
                strokeWidth="10"
              />
              <Face expression={expression} pose={pose} />
            </g>
          </g>
          {heldProp ? (
            <HeldProp
              label={heldProp.label ?? heldProp.id}
              x={solved ? solved.hands.hand_r!.center[0] : 200 + 92}
              y={solved ? solved.hands.hand_r!.center[1] : 720 - 208}
            />
          ) : null}
          {pose.slamPeak ? <SlamImpact /> : null}
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
            fontFamily="Arial, 'Noto Sans CJK SC, sans-serif"
          >
            {label}
          </text>
        </svg>
      )}
    </div>
  );
};

const Leg: React.FC<{ side: Side; pose: ActorLegPose; role: number }> = ({
  side,
  pose,
  role,
}) => {
  const left = side === "left";
  const hip = left ? 158 : 242;
  const knee = left ? 146 : 254;
  const foot = left ? 116 : 284;
  return (
    <g
      aria-label={`${side} articulated leg`}
      transform={`rotate(${pose.upper} ${hip} 500)`}
    >
      <path
        d={`M${hip} 500L${knee} 610`}
        stroke={DARKS[role]}
        strokeWidth={LIMB_OUTLINE}
        strokeLinecap="round"
      />
      <path
        d={`M${hip} 500L${knee} 610`}
        stroke="#294052"
        strokeWidth={LIMB_FILL}
        strokeLinecap="round"
      />
      <g transform={`rotate(${pose.lower} ${knee} 610)`}>
        <path
          d={`M${knee} 610L${foot} 682`}
          stroke={DARKS[role]}
          strokeWidth={LIMB_OUTLINE}
          strokeLinecap="round"
        />
        <path
          d={`M${knee} 610L${foot} 682`}
          stroke="#294052"
          strokeWidth={LIMB_FILL}
          strokeLinecap="round"
        />
        <ellipse
          cx={foot - (left ? 18 : -18)}
          cy="690"
          rx="50"
          ry="19"
          fill="#5d3b4c"
          stroke={INK}
          strokeWidth="8"
        />
      </g>
    </g>
  );
};
const Arm: React.FC<{ side: Side; role: number; pose: ActorArmPose }> = ({
  side,
  role,
  pose,
}) => {
  const left = side === "left";
  const shoulder = left ? 140 : 260;
  const elbow = left ? 108 : 292;
  const mirror = left ? 1 : -1;
  return (
    <g
      aria-label={`${side} articulated arm`}
      transform={`rotate(${pose.upper} ${shoulder} 286)`}
    >
      <path
        d={`M${shoulder} 286L${elbow} 408`}
        stroke={DARKS[role]}
        strokeWidth={LIMB_OUTLINE}
        strokeLinecap="round"
      />
      <path
        d={`M${shoulder} 286L${elbow} 408`}
        stroke={ROBES[role]}
        strokeWidth={LIMB_FILL}
        strokeLinecap="round"
      />
      <g transform={`rotate(${pose.lower} ${elbow} 408)`}>
        <path
          d={`M${elbow} 408L${elbow} 512`}
          stroke={DARKS[role]}
          strokeWidth={LIMB_OUTLINE}
          strokeLinecap="round"
        />
        <path
          d={`M${elbow} 408L${elbow} 512`}
          stroke="#d18b5b"
          strokeWidth={LIMB_FILL}
          strokeLinecap="round"
        />
        <Hand x={elbow} y={512} mirror={mirror} shape={pose.hand} />
      </g>
    </g>
  );
};
const Hand: React.FC<{
  x: number;
  y: number;
  mirror: number;
  shape: HandShape;
}> = ({ x, y, mirror, shape }) =>
  shape === "point" ? (
    <path
      d={`M${x} ${y}l${mirror * 56} -18m${-mirror * 8} 8l${mirror * 17} 13`}
      stroke={SKIN}
      strokeWidth="14"
      strokeLinecap="round"
    />
  ) : shape === "splayed" || shape === "open" ? (
    <path
      d={`M${x} ${y}l${mirror * 20} 16m${-mirror * 5} -18l${mirror * 11} 24m${-mirror * 8} -23l${mirror * 2} 26m${-mirror * 10} -20l${-mirror * 8} 18`}
      stroke={SKIN}
      strokeWidth="8"
      strokeLinecap="round"
    />
  ) : shape === "fist" ? (
    <path
      d={`M${x - 15} ${y - 9}Q${x} ${y - 25} ${x + 15} ${y - 9}L${x + 13} ${y + 12}Q${x} ${y + 25} ${x - 13} ${y + 12}Z`}
      fill={SKIN}
      stroke={INK}
      strokeWidth="6"
    />
  ) : null;
const HeldProp: React.FC<{ label: string; x: number; y: number }> = ({
  label,
  x,
  y,
}) => (
  <g aria-label={`held ${label}`} transform={`translate(${x - 30} ${y - 12})`}>
    <rect
      width="60"
      height="24"
      rx="4"
      fill="#fff5dc"
      stroke={INK}
      strokeWidth="6"
    />
    <text
      x="30"
      y="17"
      textAnchor="middle"
      fill={INK}
      fontSize="10"
      fontWeight="900"
    >
      {label.slice(0, 5)}
    </text>
  </g>
);
const Face: React.FC<{ expression: string; pose: ActorPose }> = ({
  expression,
  pose,
}) => {
  const family = faceFamily(expression);
  const open = pose.speechActive ? pose.speechOpen : pose.mouthOpen > 10;
  const eye = pose.eyeOpen;
  const gx = pose.gaze[0] * 0.6;
  const gy = pose.gaze[1] * 0.6;
  const familySmile =
    family === "relief" || family === "excited" || family === "proud"
      ? 0.8
      : pose.smile;
  const eyes =
    family === "shock" || family === "excited" ? (
      <>
        <ellipse
          cx="164"
          cy="172"
          rx="22"
          ry={18 * eye}
          fill="#fff"
          stroke={INK}
          strokeWidth="6"
        />
        <ellipse
          cx="236"
          cy="172"
          rx="22"
          ry={18 * eye}
          fill="#fff"
          stroke={INK}
          strokeWidth="6"
        />
        <circle cx={164 + gx} cy={172 + gy} r="7" fill={INK} />
        <circle cx={236 + gx} cy={172 + gy} r="7" fill={INK} />
      </>
    ) : family === "fear" || family === "desperate" ? (
      <>
        <ellipse
          cx="164"
          cy="174"
          rx="16"
          ry={23 * eye}
          fill="#fff"
          stroke={INK}
          strokeWidth="6"
        />
        <ellipse
          cx="236"
          cy="174"
          rx="16"
          ry={23 * eye}
          fill="#fff"
          stroke={INK}
          strokeWidth="6"
        />
        <ellipse cx={164 + gx} cy={174 + gy} rx="5" ry="9" fill={INK} />
        <ellipse cx={236 + gx} cy={174 + gy} rx="5" ry="9" fill={INK} />
      </>
    ) : family === "skeptical" || family === "proud" ? (
      <>
        <path
          d="M142 174Q164 161 186 174Q164 188 142 174Z"
          fill="#fff"
          stroke={INK}
          strokeWidth="6"
        />
        <path
          d="M214 174Q236 161 258 174Q236 188 214 174Z"
          fill="#fff"
          stroke={INK}
          strokeWidth="6"
        />
        <circle cx={164 + gx} cy="174" r="6" fill={INK} />
        <circle cx={236 + gx} cy="174" r="6" fill={INK} />
      </>
    ) : family === "relief" ? (
      <>
        <path
          d="M144 176Q164 160 184 176M216 176Q236 160 256 176"
          fill="none"
          stroke={INK}
          strokeWidth="8"
          strokeLinecap="round"
        />
      </>
    ) : family === "embarrassed" ? (
      <>
        <path
          d="M143 173Q164 186 185 173M215 173Q236 186 257 173"
          fill="none"
          stroke={INK}
          strokeWidth="8"
          strokeLinecap="round"
        />
      </>
    ) : (
      <>
        <ellipse
          cx="164"
          cy="174"
          rx="19"
          ry={Math.max(4, 13 * eye)}
          fill="#fff"
          stroke={INK}
          strokeWidth="6"
        />
        <ellipse
          cx="236"
          cy="174"
          rx="19"
          ry={Math.max(4, 13 * eye)}
          fill="#fff"
          stroke={INK}
          strokeWidth="6"
        />
        <circle cx={164 + gx} cy={174 + gy} r="6" fill={INK} />
        <circle cx={236 + gx} cy={174 + gy} r="6" fill={INK} />
      </>
    );
  const brows =
    family === "confused" ? (
      <>
        <path
          d="M140 138Q164 118 188 142M214 145Q238 154 260 143"
          fill="none"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
      </>
    ) : family === "skeptical" ? (
      <>
        <path
          d="M140 136Q164 124 187 141M214 124Q238 112 260 132"
          fill="none"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
      </>
    ) : family === "somber" ? (
      <>
        <path
          d="M140 134Q164 151 187 143M213 143Q236 151 260 134"
          fill="none"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
      </>
    ) : (
      <>
        <path
          d={`M140 ${143 + pose.browLift}Q164 ${128 + pose.browLift} 186 ${143 + pose.browLift}`}
          fill="none"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d={`M214 ${143 + pose.browLift}Q236 ${128 + pose.browLift} 260 ${143 + pose.browLift}`}
          fill="none"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
      </>
    );
  const mouth = open ? (
    <path
      d={`M188 218Q200 ${218 + Math.max(14, pose.mouthOpen)} 212 218Q200 230 188 218Z`}
      fill="#7a2e2e"
      stroke="#7a2e2e"
      strokeWidth="7"
    />
  ) : family === "somber" || family === "desperate" ? (
    <path
      d="M178 224Q200 210 222 224"
      fill="none"
      stroke="#7a2e2e"
      strokeWidth="7"
      strokeLinecap="round"
    />
  ) : family === "confused" ? (
    <path
      d="M180 220Q200 228 220 216"
      fill="none"
      stroke="#7a2e2e"
      strokeWidth="7"
      strokeLinecap="round"
    />
  ) : family === "shock" || family === "fear" ? (
    <path
      d="M188 221Q200 216 212 221"
      fill="none"
      stroke="#7a2e2e"
      strokeWidth="7"
      strokeLinecap="round"
    />
  ) : (
    <path
      d={`M176 216Q200 ${216 + 10 * Math.max(0, familySmile)} 224 216`}
      fill="none"
      stroke="#7a2e2e"
      strokeWidth="7"
      strokeLinecap="round"
    />
  );
  return (
    <g
      data-face-expression={expression}
      data-face-family={family}
      data-mouth-open={open}
    >
      {eyes}
      {brows}
      {family === "embarrassed" ? (
        <>
          <ellipse
            cx="137"
            cy="210"
            rx="15"
            ry="7"
            fill="#df6d68"
            opacity=".65"
          />
          <ellipse
            cx="263"
            cy="210"
            rx="15"
            ry="7"
            fill="#df6d68"
            opacity=".65"
          />
        </>
      ) : null}
      {/cry|sob|weep|tear/.test(expression) ? (
        <g aria-label="tears">
          <path
            d="M158 196q-6 14 0 20 7-4 4-20z"
            fill="#8fd0e8"
            stroke="#4a86a3"
            strokeWidth="3"
          />
          <path
            d="M242 196q6 14 0 20-7-4-4-20z"
            fill="#8fd0e8"
            stroke="#4a86a3"
            strokeWidth="3"
          />
        </g>
      ) : null}
      {mouth}
    </g>
  );
};
const SlamImpact: React.FC = () => (
  <g aria-label="slam impact" transform="translate(300 526)">
    <path
      d="M0 -42L10 -13L40 -18L18 2L38 25L8 17L0 48L-9 17L-39 25L-18 2L-40 -18L-10 -13Z"
      fill="#f2c14e"
      stroke={INK}
      strokeWidth="7"
    />
  </g>
);
