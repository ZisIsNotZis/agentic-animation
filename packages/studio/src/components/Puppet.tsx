/**
 * <Puppet> — renders a puppet as absolutely-positioned sprites, each placed by a
 * single CSS `matrix()` composed from the part's world transform (parent chain)
 * and the actor placement matrix. Two rig models (ARCHITECTURE §8.2):
 *
 * - **sharedFrame** — every part is a full design-canvas image; each sprite is
 *   the full designSize placed by matrix (parts share one coordinate frame).
 * - **nativeAttach** — each part is a trimmed native-size image positioned by
 *   attach-based forward kinematics; each sprite is drawn at its native pixel
 *   size. Mouth visemes are trimmed overlays centred on the head's own-space
 *   `mouth.at`; eye overlays ride the head part directly.
 *
 * The viseme sprite is chosen from the mouth cue track at the current frame; the
 * eye frame from the seeded blink track. Pure function of (props, frame) — no
 * wall clock, no randomness (ARCHITECTURE §9).
 */
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { actorAt, actorMatrix, eyeFrameAt, faceAt, partMatrices, visemeAt } from "../lib/puppetTransform";
import { localTransform, mul, toCss, translate, type Mat2D } from "../lib/matrix";
import type { RmActor } from "../model";

export const Puppet: React.FC<{ actor: RmActor }> = ({ actor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const [dw, dh] = actor.puppet.designSize;
  const native = actor.puppet.rig === "nativeAttach";
  const placedActor = { ...actor, at: actorAt(actor, t) };
  const A = actorMatrix(placedActor);
  const worlds = performanceMatrices(actor, partMatrices(actor.puppet, actor.partTracks, t), t);

  const sprite = (key: string, src: string, world: Mat2D, z: number, w: number, h: number): React.ReactNode => (
    <Img
      key={key}
      src={src}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: w,
        height: h,
        transformOrigin: "0 0",
        transform: toCss(mul(A, world)),
        zIndex: z,
      }}
    />
  );

  const parts = [...actor.puppet.parts].sort((a, b) => a.z - b.z);
  const anchorWorld = worlds.get(actor.puppet.mouth.anchor) ?? A;

  const viseme = visemeAt(actor, t);
  // Mouth overlay placement. sharedFrame: a full-canvas viseme sprite riding the
  // head world. nativeAttach: a trimmed viseme centred on the head-own-space
  // `mouth.at` (both scaled + rotated by the head's world transform).
  const mouth = actor.puppet.mouth;
  const mouthSize: [number, number] = native && mouth.size ? mouth.size : [dw, dh];
  const mouthWorld: Mat2D =
    native && mouth.at
      ? mul(anchorWorld, translate(mouth.at[0] - mouthSize[0] / 2, mouth.at[1] - mouthSize[1] / 2))
      : anchorWorld;

  const eyes = actor.puppet.eyes;
  const eyeSize: [number, number] = native && eyes?.size ? eyes.size : [dw, dh];

  // Keep the authored stage position as the single placement source. The
  // expression overlay must use the same actor matrix as the puppet sprites;
  // otherwise a camera/shot transition can make the face appear to jump.
  return (
    <AbsoluteFill>
      {parts.map((p) =>
        sprite(p.id, p.src, worlds.get(p.id) ?? A, p.z, native ? p.size[0] : dw, native ? p.size[1] : dh),
      )}
      {sprite("mouth", mouth.shapes[viseme], mouthWorld, mouth.z, mouthSize[0], mouthSize[1])}
      {/* Eyes are drawn here instead of using the static eye bitmap so gaze,
          lids, and surprise can change without leaving a fixed stare underneath. */}
      <Expression actor={placedActor} world={anchorWorld} canvas={[dw, dh]} face={faceAt(actor, t)} t={t} />
    </AbsoluteFill>
  );
};

function Expression({ actor, world, canvas, face, t }: { actor: RmActor; world: Mat2D; canvas: [number, number]; face: ReturnType<typeof faceAt>; t: number }) {
  const e = actor.emotion;
  const [dw, dh] = canvas;
  const shock = e === "shock" || e === "panic";
  const skeptical = e === "skeptic";
  const ink = shock ? "#d62828" : "#221d25";
  const brow = face.brow || (e === "smug" ? 16 : skeptical ? -12 : shock ? -22 : 0);
  const blinkFrame = actor.puppet.eyes ? eyeFrameAt(actor, t, actor.puppet.eyes.frames.length) : 0;
  const blinkOpen = actor.puppet.eyes && actor.puppet.eyes.frames.length > 1
    ? 1 - blinkFrame / (actor.puppet.eyes.frames.length - 1)
    : 1;
  const eye = (face.eyeOpen || 1) * blinkOpen * (shock ? 1.45 : skeptical ? 0.7 : 1);
  const gx = face.gaze[0] * 18;
  const gy = face.gaze[1] * 12;
  const beat = Math.sin(t * 8.2) * (shock ? 0.7 : 0.35);
  const browL = brow + (e === "skeptic" ? -10 : beat);
  const browR = brow - (e === "skeptic" ? 22 : beat);
  const cheek = e === "smug" ? "#ef8c7b" : e === "shock" || e === "panic" ? "#f3b2a6" : "transparent";
  return <svg width={dw} height={dh} viewBox={`0 0 ${dw} ${dh}`} style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: toCss(mul(actorMatrix(actor), world)), zIndex: 100 }}>
    <ellipse cx="454" cy="400" rx={22 * eye} ry={Math.max(2, 20 * eye)} fill="#fff" stroke={ink} strokeWidth="10" />
    <ellipse cx="570" cy="400" rx={22 * eye} ry={Math.max(2, 20 * eye)} fill="#fff" stroke={ink} strokeWidth="10" />
    <circle cx={(e === "skeptic" ? 460 : 454) + gx} cy={402 + gy} r={8 * eye} fill={ink} />
    <circle cx={(e === "skeptic" ? 576 : 570) + gx} cy={402 + gy} r={8 * eye} fill={ink} />
    <path d={`M425 ${350 + browL} Q462 ${326 + browL} 490 ${350 + browL}`} fill="none" stroke={ink} strokeWidth="16" strokeLinecap="round" />
    <path d={`M534 ${350 - browR} Q568 ${326 - browR} 600 ${350 - browR}`} fill="none" stroke={ink} strokeWidth="16" strokeLinecap="round" />
    <ellipse cx="400" cy="480" rx="28" ry="14" fill={cheek} opacity="0.72" />
    <ellipse cx="624" cy="480" rx="28" ry="14" fill={cheek} opacity="0.72" />
    {e === "panic" ? <path d="M665 300 q35 28 0 58" fill="none" stroke="#4bb4d8" strokeWidth="12" strokeLinecap="round" /> : null}
    {e === "skeptic" ? <path d="M610 470 q34 -25 58 2" fill="none" stroke="#221d25" strokeWidth="10" strokeLinecap="round" /> : null}
    {shock ? <text x="512" y="270" textAnchor="middle" fontSize="96" fontWeight="900" fill="#d62828">！</text> : null}
  </svg>;
}

/**
 * Small deterministic performance accents layered over the authored clips.
 * They are deliberately bounded (no stage translation) and affect whole
 * limbs through their existing parent chain, so a character reads as acting
 * while remaining planted in the shot.
 */
function performanceMatrices(actor: RmActor, base: Map<string, Mat2D>, t: number): Map<string, Mat2D> {
  const out = new Map(base);
  const speaking = actor.mouthTrack.some((c) => t >= c.start && t < c.end);
  const phase = Math.sin(t * 7.4 + actor.id.length);
  const accent = actor.emotion === "panic" || actor.emotion === "shock" ? 1.8 : actor.emotion === "skeptic" ? 0.7 : 1;
  const head = base.get("head");
  const torso = base.get("torso");
  if (head) out.set("head", mul(head, localTransform([512, 560], phase * (speaking ? 2.4 : 1.1) * accent, 1, [0, speaking ? phase * 3 : 0])));
  if (torso) out.set("torso", mul(torso, localTransform([512, 600], phase * 0.45, 1, [0, speaking ? phase * 2 : 0])));
  const rightArm = base.get("arm_u_r");
  const leftArm = base.get("arm_u_l");
  const rightDelta = localTransform([632, 600], phase * (speaking ? 6 : 2) * accent, 1, [0, 0]);
  const leftDelta = localTransform([392, 600], -phase * (speaking ? 4 : 1.5) * accent, 1, [0, 0]);
  for (const id of ["arm_u_r", "arm_l_r", "hand_r"]) {
    const part = base.get(id); if (part) out.set(id, mul(part, rightDelta));
  }
  for (const id of ["arm_u_l", "arm_l_l", "hand_l"]) {
    const part = base.get(id); if (part) out.set(id, mul(part, leftDelta));
  }
  if (actor.emotion === "panic" || actor.emotion === "shock") {
    const legL = base.get("leg_u_l");
    const legR = base.get("leg_u_r");
    const leftLegDelta = localTransform([452, 1120], phase * 3, 1, [0, 0]);
    const rightLegDelta = localTransform([572, 1120], -phase * 3, 1, [0, 0]);
    for (const id of ["leg_u_l", "leg_l_l", "foot_l"]) {
      const part = base.get(id); if (part) out.set(id, mul(part, leftLegDelta));
    }
    for (const id of ["leg_u_r", "leg_l_r", "foot_r"]) {
      const part = base.get(id); if (part) out.set(id, mul(part, rightLegDelta));
    }
  }
  return out;
}
