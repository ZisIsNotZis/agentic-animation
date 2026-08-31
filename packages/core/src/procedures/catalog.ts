import type {ProcedureParamType} from "../schemas/libraryMeta";
import type {ProcedureEase, ProcedureRecipe} from "./types";

export interface ProcedureParameter {
  name: string;
  type: ProcedureParamType;
}

export interface ProcedureDefinition {
  id: string;
  durationSec: number;
  subjects: readonly ("actor" | "camera" | "vfx" | "sfx" | "music")[];
  params: readonly ProcedureParameter[];
  phases: readonly [string, string, ProcedureEase][];
  action: string;
  parts: readonly string[];
  trackKind?: "bone" | "movement";
  emotion?: {name: string; brow: string; eyes: string; mouth: string; intensity: number};
  gaze?: {target: string; lead: "eyes" | "head" | "whole-body"; hold?: number};
  camera?: {operation: "push" | "pull" | "hold"; zoom: number; target?: string};
  vfx?: {style: string; intensity: number; duration?: number; target?: string};
  audio?: {cue: string; kind: "sfx" | "music"; gain: number; duration?: number; loop?: boolean};
  /** Optional explicit recipe; otherwise the resolver expands the authored intents. */
  recipe?: ProcedureRecipe;
  actorState?: {present?: boolean; pose?: string};
  markers?: Readonly<Record<string, number>>;
}

function typedProcedurePath(id: string): string {
  const dot = id.indexOf(".");
  const namespace = dot < 0 ? id : id.slice(0, dot);
  const terminal = dot < 0 ? "" : id.slice(dot + 1);
  const typedNamespace: Record<string, string> = {
    acting: "act", gesture: "act", prop: "act", interaction: "act",
    gaze: "look", camera: "use", vfx: "use", sfx: "play", music: "play",
    speech: "voice",
  };
  return `${typedNamespace[namespace] ?? namespace}.${terminal}`;
}

function typedProcedureId(id: string): string {
  const dot = id.indexOf(".");
  const namespace = dot < 0 ? id : id.slice(0, dot);
  const terminal = dot < 0 ? "" : id.slice(dot + 1);
  const typedNamespace: Record<string, string> = {
    acting: "act", gesture: "act", prop: "act", interaction: "act",
    gaze: "look", camera: "use", vfx: "use", sfx: "play", music: "play",
    speech: "voice",
  };
  return `${typedNamespace[namespace] ?? namespace}.${terminal}`;
}

const p = (
  id: string,
  durationSec: number,
  subject: ProcedureDefinition["subjects"][number],
  action: string,
  parts: readonly string[],
  phases: readonly [string, string, ProcedureEase][],
  extra: Omit<ProcedureDefinition, "id" | "durationSec" | "subjects" | "params" | "phases" | "action" | "parts"> & {
    params?: readonly ProcedureParameter[];
  } = {},
): ProcedureDefinition => ({id: typedProcedurePath(id), durationSec, subjects: [subject], params: extra.params ?? [], phases, action, parts, ...extra});

const still = ["torso", "head"] as const;
const handR = ["arm_u_r", "arm_l_r", "hand_r"] as const;

/**
 * Authored procedure vocabulary. The registry remains the public contract;
 * this catalog supplies the deterministic implementation behind its keys.
 */
const AUTHORED_PROCEDURE_DEFINITIONS: Readonly<Record<string, ProcedureDefinition>> = {
  "acting.collapse": p("acting.collapse", 1.2, "actor", "fold into a guarded collapse", ["torso", "head", "leg_u_l", "leg_u_r"], [["brace", "lock the torso before losing height", "in"], ["collapse", "bend knees and sink the shoulders", "io"], ["rest", "settle weight low with head dipped", "out"]], {actorState: {pose: "collapsed"}}),
  "acting.enter": p("acting.enter", 1.1, "actor", "step into the scene and find eyeline", ["leg_u_l", "leg_u_r", "torso", "head"], [["approach", "walk on with measured stride", "out"], ["arrive", "plant the leading foot", "io"], ["acknowledge", "lift the head toward the scene", "out"]], {actorState: {present: true}}),
  "acting.exit": p("acting.exit", 1, "actor", "break eyeline and leave frame", ["head", "torso", "leg_u_l", "leg_u_r"], [["decide", "turn attention away", "in"], ["turn", "rotate the torso toward the exit", "io"], ["depart", "take two clean steps out", "out"]], {actorState: {present: false}}),
  "acting.stand": p("acting.stand", 0.9, "actor", "recover to an attentive standing pose", ["leg_u_l", "leg_u_r", "torso", "head"], [["plant", "set both feet under the hips", "in"], ["rise", "stack the torso over the legs", "out"], ["settle", "release shoulders into neutral", "io"]], {actorState: {pose: "standing"}}),

  "camera.punch_in": p("camera.punch_in", 0.65, "camera", "draw the viewer into the target reaction", [], [["acquire", "center the target", "in"], ["punch", "snap to an intimate reaction size", "back"], ["hold", "hold the motivated close framing", "out"]], {params: [{name: "target", type: "actor"}], camera: {operation: "push", zoom: 1.35, target: "target"}}),
  "camera.wide": p("camera.wide", 0.8, "camera", "reveal the whole spatial relationship", [], [["open", "pull back to establish geography", "out"], ["compose", "hold actors and working area together", "io"]], {camera: {operation: "pull", zoom: 0.72}}),

  "face.calm": p("face.calm", 0.35, "actor", "return to an even, listening face", still, [["release", "soften brow and jaw", "out"], ["hold", "keep a quiet attentive mask", "io"]], {emotion: {name: "calm", brow: "level", eyes: "steady", mouth: "closed-soft", intensity: 0.35}}),
  "face.confused": p("face.confused", 0.55, "actor", "search for an explanation", ["head", "arm_u_l"], [["notice", "pause the blink and lift one brow", "in"], ["search", "cant the head while eyes scan", "io"], ["hold", "leave the question unresolved", "out"]], {emotion: {name: "confused", brow: "asymmetric-raised", eyes: "searching", mouth: "parted", intensity: 0.8}}),
  "face.desperate": p("face.desperate", 0.7, "actor", "plead without words", ["head", "torso", "hand_l", "hand_r"], [["break", "draw breath into the chest", "in"], ["plead", "raise brows and open the mouth", "io"], ["hold", "keep the appeal exposed", "out"]], {emotion: {name: "desperate", brow: "pinched-high", eyes: "wide-wet", mouth: "open-pleading", intensity: 1}}),
  "face.embarrassed": p("face.embarrassed", 0.6, "actor", "hide a caught reaction", ["head", "hand_l"], [["realize", "eyes widen at the mistake", "in"], ["hide", "drop gaze and pinch the mouth", "io"], ["recover", "peek back up cautiously", "out"]], {emotion: {name: "embarrassed", brow: "raised", eyes: "downcast", mouth: "tight", intensity: 0.75}}),
  "face.excited": p("face.excited", 0.6, "actor", "let anticipation brighten the face", ["head", "torso", "hand_l", "hand_r"], [["spark", "eyes catch the idea", "in"], ["brighten", "lift cheeks and brows", "out"], ["hold", "share the eager look", "io"]], {emotion: {name: "excited", brow: "high", eyes: "bright-wide", mouth: "smile-open", intensity: 0.9}}),
  "face.fearful": p("face.fearful", 0.65, "actor", "freeze around a threat", ["head", "torso", "hand_l", "hand_r"], [["sense", "stop the breath", "in"], ["freeze", "widen eyes and pull the chin back", "io"], ["hold", "keep the threat in peripheral focus", "out"]], {emotion: {name: "fearful", brow: "high-pinched", eyes: "wide", mouth: "small-open", intensity: 0.95}}),
  "face.laughing": p("face.laughing", 0.8, "actor", "break into an unguarded laugh", ["head", "torso", "hand_l", "hand_r"], [["tickle", "eyes crinkle before the sound", "in"], ["laugh", "open the mouth and bounce the shoulders", "io"], ["settle", "come down smiling", "out"]], {emotion: {name: "laughing", brow: "relaxed", eyes: "crinkled", mouth: "open-smile", intensity: 0.9}, audio: {cue: "laugh", kind: "sfx", gain: 0.28, duration: 0.45}}),
  "face.proud": p("face.proud", 0.55, "actor", "claim the credit with contained pride", ["torso", "head", "arm_u_l"], [["lift", "raise the sternum", "out"], ["claim", "chin rises into the eyeline", "io"], ["hold", "keep the smile controlled", "out"]], {emotion: {name: "proud", brow: "smooth", eyes: "direct", mouth: "closed-smile", intensity: 0.75}}),
  "face.relief": p("face.relief", 0.7, "actor", "exhale after danger passes", ["torso", "head"], [["release", "drop the held breath", "out"], ["soften", "unclench eyes and jaw", "io"], ["rest", "remain safely present", "out"]], {emotion: {name: "relief", brow: "smooth", eyes: "soft", mouth: "exhale", intensity: 0.8}}),
  "face.relieved": p("face.relieved", 0.7, "actor", "exhale after danger passes", ["torso", "head"], [["release", "drop the held breath", "out"], ["soften", "unclench eyes and jaw", "io"], ["rest", "remain safely present", "out"]], {emotion: {name: "relieved", brow: "smooth", eyes: "soft", mouth: "exhale", intensity: 0.8}}),
  "face.satisfied": p("face.satisfied", 0.55, "actor", "enjoy a result that went to plan", ["head", "torso"], [["recognize", "eyes settle on the result", "in"], ["savor", "close the mouth into a knowing smile", "out"], ["hold", "keep the private satisfaction", "io"]], {emotion: {name: "satisfied", brow: "level", eyes: "narrow-warm", mouth: "knowing-smile", intensity: 0.72}}),
  "face.secretive": p("face.secretive", 0.6, "actor", "guard a secret while inviting complicity", ["head", "hand_l"], [["check", "look toward the listener", "in"], ["conceal", "lower voice-face and narrow the eyes", "io"], ["invite", "finish with a tiny side smile", "out"]], {emotion: {name: "secretive", brow: "angled", eyes: "sidelong", mouth: "pressed-smile", intensity: 0.78}}),
  "face.shocked": p("face.shocked", 0.5, "actor", "register an impossible revelation", ["head", "torso", "hand_l", "hand_r"], [["impact", "stop the body on the discovery", "back"], ["open", "eyes and mouth spring wide", "out"], ["hold", "let the audience read the shock", "io"]], {emotion: {name: "shocked", brow: "high", eyes: "wide", mouth: "round-open", intensity: 1}, vfx: {style: "manga-impact-lines", intensity: 0.7, duration: 0.3}}),
  "face.skeptical": p("face.skeptical", 0.6, "actor", "question a claim without buying it", ["head", "arm_u_l"], [["listen", "hold the mouth neutral", "in"], ["doubt", "raise one brow and cant the head", "io"], ["judge", "pin the speaker with a side-eye", "out"]], {emotion: {name: "skeptical", brow: "one-raised", eyes: "side-eye", mouth: "flat", intensity: 0.8}}),
  "face.somber": p("face.somber", 0.65, "actor", "let difficult news lower the room", ["head", "torso"], [["receive", "eyes lose their sparkle", "in"], ["sink", "lower chin and mouth corners", "io"], ["hold", "stay with the weight of it", "out"]], {emotion: {name: "somber", brow: "low", eyes: "downcast", mouth: "downturned", intensity: 0.82}}),
  "face.thoughtful": p("face.thoughtful", 0.7, "actor", "turn inward to solve the problem", ["head", "hand_l", "torso"], [["focus", "quiet the face", "in"], ["consider", "eyes move off-axis while brow gathers", "io"], ["return", "bring attention back with a decision", "out"]], {emotion: {name: "thoughtful", brow: "knit", eyes: "off-axis", mouth: "pressed", intensity: 0.7}}),

  "gaze.at": p("gaze.at", 0.35, "actor", "establish a deliberate eyeline", ["head"], [["lead", "eyes travel first", "out"], ["land", "head follows to the target", "io"], ["hold", "maintain connection", "out"]], {params: [{name: "target", type: "actor"}], gaze: {target: "target", lead: "eyes", hold: 0.25}}),
  "gaze.audience": p("gaze.audience", 0.35, "actor", "break the fourth wall", ["head"], [["turn", "eyes leave the scene", "out"], ["address", "head settles on the audience", "io"], ["hold", "invite the viewer in", "out"]], {gaze: {target: "audience", lead: "head", hold: 0.3}}),

  "gesture.bow": p("gesture.bow", 0.9, "actor", "offer a courteous bow", ["torso", "head", "arm_u_l", "arm_u_r"], [["prepare", "draw feet together and lengthen spine", "in"], ["bow", "hinge from the hips with eyes down", "out"], ["rise", "return to the audience with dignity", "io"]]),
  "gesture.check_watch": p("gesture.check_watch", 0.75, "actor", "check time with practiced impatience", ["arm_u_l", "arm_l_l", "hand_l", "head"], [["lift", "bring the wrist into view", "out"], ["read", "drop gaze to the watch", "in"], ["decide", "look up with a time-conscious beat", "io"]]),
  "gesture.close": p("gesture.close", 0.8, "actor", "close the target with careful pressure", handR, [["reach", "align hand with the target", "out"], ["close", "press the moving piece shut", "in"], ["confirm", "withdraw after the click", "io"]], {params: [{name: "target", type: "object"}], audio: {cue: "close-click", kind: "sfx", gain: 0.7, duration: 0.12}}),
  "gesture.count_money": p("gesture.count_money", 1.1, "actor", "count bills with greedy precision", ["arm_u_l", "arm_l_l", "hand_l", "arm_u_r", "hand_r", "head"], [["fan", "spread the stack between both hands", "out"], ["count", "flick one bill at a time with the thumb", "io"], ["pocket", "square the stack and guard it", "in"]]),
  "gesture.count_three": p("gesture.count_three", 0.9, "actor", "enumerate three points for the listener", handR, [["one", "raise the index finger", "out"], ["two", "add the middle finger", "out"], ["three", "add the ring finger and present the count", "io"]]),
  "gesture.cover_mouth": p("gesture.cover_mouth", 0.65, "actor", "cover a secret reaction", ["arm_u_l", "arm_l_l", "hand_l", "head"], [["notice", "eyes catch the target's reaction", "in"], ["cover", "bring palm to mouth", "out"], ["peek", "look past the hand", "io"]], {params: [{name: "target", type: "actor"}], emotion: {name: "suppressed", brow: "raised", eyes: "bright", mouth: "covered", intensity: 0.7}}),
  "gesture.discard": p("gesture.discard", 0.75, "actor", "reject the object with a sharp discard", ["arm_u_r", "arm_l_r", "hand_r", "torso"], [["grip", "secure the object", "in"], ["flick", "send it away from the body", "back"], ["dismiss", "leave the hand open and empty", "out"]], {params: [{name: "target", type: "object"}], vfx: {style: "manga-speed-lines", intensity: 0.65, duration: 0.25}, audio: {cue: "object-whoosh", kind: "sfx", gain: 0.55, duration: 0.22}}),
  "gesture.dismiss": p("gesture.dismiss", 0.65, "actor", "wave an objection out of the room", handR, [["load", "draw elbow beside the torso", "in"], ["wave", "cut the hand outward twice", "io"], ["drop", "return to neutral without discussion", "out"]]),
  "gesture.laugh": p("gesture.laugh", 0.8, "actor", "laugh with a full shoulder bounce", ["head", "torso", "arm_u_l", "arm_u_r"], [["spark", "smile arrives before the sound", "in"], ["laugh", "bounce shoulders and open the chest", "io"], ["settle", "wipe the laugh into a grin", "out"]], {emotion: {name: "amused", brow: "relaxed", eyes: "crinkled", mouth: "open-smile", intensity: 0.88}, audio: {cue: "laugh", kind: "sfx", gain: 0.3, duration: 0.5}}),
  "gesture.nod": p("gesture.nod", 0.45, "actor", "give two clear confirming nods", ["head", "torso"], [["dip", "first small nod acknowledges", "in"], ["confirm", "second nod commits the answer", "out"], ["hold", "keep the eyeline steady", "io"]]),
  "gesture.pat": p("gesture.pat", 0.8, "actor", "comfort the target with two gentle pats", ["arm_u_r", "arm_l_r", "hand_r", "head"], [["approach", "reach toward the target's shoulder", "out"], ["pat", "land two light reassuring taps", "io"], ["reassure", "leave the hand warm before withdrawing", "out"]], {params: [{name: "target", type: "actor"}]}),
  "gesture.point": p("gesture.point", 0.65, "actor", "direct attention to the target", ["arm_u_r", "arm_l_r", "hand_r", "head"], [["aim", "turn head toward the target", "out"], ["point", "extend one finger with a clean line", "in"], ["hold", "keep the accusation readable", "io"]], {params: [{name: "target", type: "entity"}], gaze: {target: "target", lead: "head", hold: 0.35}}),
  "gesture.present": p("gesture.present", 0.9, "actor", "present the target as a reveal", ["arm_u_l", "arm_l_l", "hand_l", "torso", "head"], [["frame", "draw both hands around the target", "out"], ["reveal", "open the arms and lift the chin", "back"], ["offer", "hold the display for the audience", "io"]], {params: [{name: "target", type: "entity"}], vfx: {style: "manga-reveal-burst", intensity: 0.6, duration: 0.28}, audio: {cue: "reveal-chime", kind: "sfx", gain: 0.45, duration: 0.3}}),
  "gesture.push": p("gesture.push", 0.85, "actor", "push the target decisively", ["arm_u_r", "arm_l_r", "hand_r", "torso", "leg_u_r"], [["brace", "set the rear foot and load the shoulder", "in"], ["push", "drive the palm through the target", "io"], ["recoil", "return weight to a stable stance", "out"]], {params: [{name: "target", type: "dressing"}], vfx: {style: "impact-burst", intensity: 0.65, duration: 0.2}, audio: {cue: "push-thump", kind: "sfx", gain: 0.65, duration: 0.18}}),
  "gesture.raise_hand": p("gesture.raise_hand", 0.75, "actor", "raise a hand to claim the floor", ["arm_u_r", "arm_l_r", "hand_r", "head"], [["signal", "catch the listener's eye", "out"], ["raise", "lift the hand above shoulder height", "io"], ["wait", "hold patiently for recognition", "out"]]),
  "gesture.scatter": p("gesture.scatter", 0.95, "actor", "scatter the target across the work area", ["arm_u_r", "arm_l_r", "hand_r", "torso"], [["gather", "cup the object near the centerline", "in"], ["scatter", "sweep the hand through a broad arc", "back"], ["release", "leave the fingers splayed after the throw", "out"]], {params: [{name: "target", type: "object"}], vfx: {style: "manga-scatter-lines", intensity: 0.75, duration: 0.3}, audio: {cue: "paper-rattle", kind: "sfx", gain: 0.7, duration: 0.35}}),
  "gesture.scratch_head": p("gesture.scratch_head", 0.8, "actor", "scratch the head while stuck", ["arm_u_r", "arm_l_r", "hand_r", "head"], [["search", "eyes look up for an answer", "in"], ["scratch", "fingers rub behind the head", "io"], ["admit", "return with an apologetic shrug", "out"]], {emotion: {name: "awkward", brow: "knit", eyes: "upward", mouth: "small", intensity: 0.55}}),
  "gesture.shiver": p("gesture.shiver", 0.7, "actor", "shiver through a sudden chill", ["torso", "head", "arm_u_l", "arm_u_r"], [["shock", "shoulders rise toward the ears", "back"], ["shiver", "rattle the torso in two quick pulses", "io"], ["warm", "wrap arms closer and breathe out", "out"]], {vfx: {style: "manga-chill-lines", intensity: 0.58, duration: 0.35}, audio: {cue: "shiver-rattle", kind: "sfx", gain: 0.3, duration: 0.3}}),
  "gesture.sip": p("gesture.sip", 0.9, "actor", "take a measured sip from the target", ["arm_u_r", "arm_l_r", "hand_r", "head"], [["reach", "lift the target from below", "out"], ["sip", "tilt it to the mouth and drink", "in"], ["lower", "return it with a satisfied breath", "io"]], {params: [{name: "target", type: "object"}], audio: {cue: "sip", kind: "sfx", gain: 0.22, duration: 0.3}}),
  "gesture.slam": p("gesture.slam", 0.65, "actor", "slam the target to punctuate the point", ["arm_u_r", "arm_l_r", "hand_r", "torso"], [["load", "lift the target with angry control", "in"], ["slam", "drive it down on the surface", "back"], ["hold", "freeze over the impact", "io"]], {params: [{name: "target", type: "object"}], vfx: {style: "manga-impact-star", intensity: 1, duration: 0.24}, audio: {cue: "desk-slam", kind: "sfx", gain: 0.95, duration: 0.2}}),
  "gesture.tap_head": p("gesture.tap_head", 0.7, "actor", "tap the head to wake an idea", ["arm_u_r", "arm_l_r", "hand_r", "head"], [["lift", "bring knuckles beside the temple", "out"], ["tap", "land two quick taps", "in"], ["spark", "look up as the idea arrives", "back"]], {vfx: {style: "manga-idea-spark", intensity: 0.55, duration: 0.3}}),
  "gesture.think": p("gesture.think", 0.9, "actor", "think with chin and hand engaged", ["head", "arm_u_l", "arm_l_l", "hand_l"], [["focus", "narrow attention away from the room", "in"], ["consider", "support chin with one hand", "io"], ["resolve", "lift eyes when the answer forms", "out"]], {emotion: {name: "thinking", brow: "knit", eyes: "off-axis", mouth: "pressed", intensity: 0.7}}),
  "gesture.touch_hair": p("gesture.touch_hair", 0.75, "actor", "smooth hair before answering", ["arm_u_r", "arm_l_r", "hand_r", "head"], [["reach", "hand rises to the hairline", "out"], ["smooth", "fingers make one deliberate pass", "io"], ["answer", "hand drops as eye contact returns", "out"]]),
  "gesture.type": p("gesture.type", 1, "actor", "type a short urgent message", ["arm_u_l", "arm_l_l", "hand_l", "arm_u_r", "arm_l_r", "hand_r", "head"], [["ready", "hover both hands over the target", "out"], ["type", "alternate fingers in a brisk rhythm", "linear"], ["send", "stop and look to the screen", "in"]], {params: [{name: "target", type: "dressing"}], audio: {cue: "keyboard-taps", kind: "sfx", gain: 0.42, duration: 0.75}}),
  "gesture.unroll": p("gesture.unroll", 1.1, "actor", "unroll the target across the surface", ["arm_u_l", "arm_l_l", "hand_l", "arm_u_r", "arm_l_r", "hand_r", "torso"], [["grip", "catch both ends of the roll", "in"], ["unroll", "draw hands apart in one continuous sweep", "out"], ["flatten", "press the far edge flat", "io"]], {params: [{name: "target", type: "object"}], audio: {cue: "paper-unroll", kind: "sfx", gain: 0.65, duration: 0.7}}),
  "gesture.write": p("gesture.write", 1, "actor", "write a deliberate note on the target", ["arm_u_r", "arm_l_r", "hand_r", "head", "torso"], [["position", "anchor the target with the free hand", "out"], ["write", "move the wrist through legible strokes", "linear"], ["finish", "lift the pen and inspect the line", "in"]], {params: [{name: "target", type: "object"}], audio: {cue: "pen-scratch", kind: "sfx", gain: 0.35, duration: 0.65}}),

  "interaction.illuminate": p("interaction.illuminate", 0.85, "actor", "use the object to illuminate the target", ["arm_u_r", "arm_l_r", "hand_r", "head", "torso"], [["aim", "raise the object toward the target", "out"], ["illuminate", "hold a focused beam on the target", "io"], ["reveal", "turn attention to what the light found", "out"]], {params: [{name: "object", type: "object"}, {name: "target", type: "actor"}], vfx: {style: "manga-light-cone", intensity: 0.8, duration: 0.45}, audio: {cue: "flashlight-click", kind: "sfx", gain: 0.5, duration: 0.12}, gaze: {target: "target", lead: "head", hold: 0.4}}),
  "move.to": p("move.to", 1.4, "actor", "walk with purpose to the target", ["leg_u_l", "leg_l_l", "foot_l", "leg_u_r", "leg_l_r", "foot_r", "torso", "head"], [["orient", "turn hips and find the route", "out"], ["travel", "take two even steps toward the target", "linear"], ["arrive", "plant and restore the eyeline", "io"]], {params: [{name: "target", type: "entity"}], trackKind: "movement", actorState: {pose: "standing"}}),

  "music.ending": p("music.ending", 2.8, "music", "resolve the score into a warm ending", [], [["resolve", "thin the harmony toward the tonic", "out"], ["cadence", "land the final phrase", "io"], ["tail", "leave a clean reverberant tail", "out"]], {audio: {cue: "ending-cadence", kind: "music", gain: 0.72, duration: 2.8}}),
  "prop.handover": p("prop.handover", 1.15, "actor", "transfer the object into the receiver's hands", ["arm_u_r", "arm_l_r", "hand_r", "torso", "head"], [["offer", "extend the object and meet the receiver's eyes", "out"], ["handover", "receiver's grip takes the weight", "io"], ["release", "open the fingers and return to neutral", "out"]], {params: [{name: "object", type: "object"}, {name: "target", type: "actor"}], markers: {handover: 0.68}, gaze: {target: "target", lead: "head", hold: 0.42}}),
  "prop.pickup": p("prop.pickup", 0.95, "actor", "reach down and secure the object", ["torso", "head", "arm_u_r", "arm_l_r", "hand_r", "leg_u_r"], [["reach", "lower center of mass toward the object", "out"], ["grasp", "close fingers around the object", "in"], ["lift", "stand with the weight secure", "io"]], {params: [{name: "target", type: "object"}], markers: {bind: 0.58, grasp: 0.58}}),
  "prop.putdown": p("prop.putdown", 1, "actor", "place the object down and let it settle", ["arm_u_r", "arm_l_r", "hand_r", "torso", "head"], [["position", "lower the object toward its support", "out"], ["release", "open fingers just above the surface", "in"], ["settle", "withdraw and let the object land", "io"]], {params: [{name: "object", type: "object"}, {name: "target", type: "object"}], markers: {release: 0.62, settle: 0.94}}),

  "sfx.error_burst": p("sfx.error_burst", 0.45, "sfx", "punctuate failure with a clipped error burst", [], [["hit", "announce the error", "back"], ["tail", "cut the resonance quickly", "out"]], {audio: {cue: "error-burst", kind: "sfx", gain: 0.85, duration: 0.45}, vfx: {style: "manga-error-rays", intensity: 0.72, duration: 0.28}}),
  "sfx.light_switch": p("sfx.light_switch", 0.18, "sfx", "click a physical light switch", [], [["click", "snap the switch state", "back"], ["tail", "leave a tiny room tone", "out"]], {audio: {cue: "light-switch", kind: "sfx", gain: 0.6, duration: 0.18}}),
  "sfx.paper_snap": p("sfx.paper_snap", 0.3, "sfx", "snap a sheet taut", [], [["load", "draw the paper tight", "in"], ["snap", "release the sharp paper crack", "back"], ["tail", "decay into room tone", "out"]], {audio: {cue: "paper-snap", kind: "sfx", gain: 0.72, duration: 0.3}}),
  "sfx.static_buzz": p("sfx.static_buzz", 0.6, "sfx", "fill the signal with unstable static", [], [["rise", "introduce the electrical grit", "in"], ["buzz", "hold an uneven interference bed", "linear"], ["cut", "drop the signal cleanly", "out"]], {audio: {cue: "static-buzz", kind: "sfx", gain: 0.58, duration: 0.6}, vfx: {style: "manga-scanline", intensity: 0.55, duration: 0.6}}),
  "speech.interrupt": p("speech.interrupt", 0.25, "actor", "cut into the target's sentence", ["head", "torso", "hand_r"], [["catch", "turn sharply to the speaker", "back"], ["cut", "raise a stop hand over the line", "io"]], {params: [{name: "target", type: "actor"}], emotion: {name: "urgent", brow: "raised", eyes: "direct", mouth: "open-cutoff", intensity: 0.8}}),
  "vfx.ai_glitch": p("vfx.ai_glitch", 0.9, "vfx", "corrupt the target with a digital glitch", [], [["flicker", "break the image into offset slices", "in"], ["glitch", "hold chromatic displacement and scanlines", "linear"], ["restore", "snap the target back into registration", "out"]], {params: [{name: "target", type: "dressing"}], vfx: {style: "ai-glitch-chromatic", target: "target", intensity: 0.95, duration: 0.8}, audio: {cue: "digital-glitch", kind: "sfx", gain: 0.62, duration: 0.55}}),
  "vfx.lights_down": p("vfx.lights_down", 0.7, "vfx", "drop the room into a motivated blackout", [], [["dim", "pull practical light toward half", "in"], ["down", "cut the remaining room wash", "io"], ["hold", "leave the scene in controlled dark", "out"]], {vfx: {style: "lighting-dim", intensity: 0.9, duration: 0.7}, audio: {cue: "power-down", kind: "sfx", gain: 0.42, duration: 0.25}}),
  "vfx.lights_up": p("vfx.lights_up", 0.7, "vfx", "restore the room's motivated light", [], [["wake", "bring practicals up from black", "in"], ["up", "restore the room wash", "out"], ["hold", "settle exposure on the action", "io"]], {vfx: {style: "lighting-rise", intensity: 0.9, duration: 0.7}, audio: {cue: "power-up", kind: "sfx", gain: 0.35, duration: 0.22}}),
  "vfx.screen_error": p("vfx.screen_error", 0.8, "vfx", "turn the target display into a visible error state", [], [["warn", "flash an amber warning state", "in"], ["error", "hold the red failure panel", "back"], ["persist", "leave the error readable", "out"]], {params: [{name: "target", type: "dressing"}], vfx: {style: "screen-error-red", target: "target", intensity: 0.88, duration: 0.7}, audio: {cue: "error-chime", kind: "sfx", gain: 0.65, duration: 0.35}}),
};

export const PROCEDURE_DEFINITIONS: Readonly<Record<string, ProcedureDefinition>> = Object.freeze(
  Object.fromEntries(Object.values(AUTHORED_PROCEDURE_DEFINITIONS).map((definition) => [definition.id, definition])),
) as Readonly<Record<string, ProcedureDefinition>>;

export const PROCEDURE_IDS = Object.freeze(Object.keys(PROCEDURE_DEFINITIONS));
