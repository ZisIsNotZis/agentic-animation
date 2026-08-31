import React from "react";
import type { EvaluatedProp } from "../../performance";

const INK = "#272331";
const PAPER = "#fff5dc";
const GOLD = "#f2c14e";
const TEAL = "#277e83";
const RED = "#d95d4f";

type PropArtProps = { bound: boolean };

/** Deterministic, opaque prop art. Source assets are intentionally ignored so
 * performance renders never depend on unresolved filesystem URLs. */
export const PerformanceProp: React.FC<{ prop: EvaluatedProp }> = ({ prop }) => {
  const key = `${prop.id} ${prop.label ?? ""}`.toLowerCase();
  const [width, height] = prop.size;
  const kind = propKind(key);
  const bound = prop.tracks.some((track) => track.kind === "binding" && track.events.some((event) => event.active));
  const Art = PROP_ART[kind];

  return (
    <div
      data-prop-id={prop.id}
      data-prop-label={prop.label}
      data-prop-kind={kind}
      data-prop-bound={bound ? "true" : "false"}
      style={{ position: "absolute", left: prop.x - width / 2, top: prop.y - height / 2, width, height, transformOrigin: "center center", transform: `rotate(${prop.rotation}deg) scale(${prop.scale})`, zIndex: prop.z }}
    >
      <svg aria-label={prop.label ?? prop.id} viewBox="0 0 200 160" width="100%" height="100%" style={{ overflow: "visible" }}>
        <title>{prop.label ?? prop.id}</title>
        <Art bound={bound} />
        {bound ? <BindingCue /> : null}
      </svg>
    </div>
  );
};

type PropKind = "desk" | "thermos" | "scroll" | "skillBottle" | "skillCards" | "phone" | "notebook" | "mirror" | "flashlight" | "askMattSign" | "screen" | "generic";

function propKind(key: string): PropKind {
  if (key.includes("desk")) return "desk";
  if (key.includes("thermos") || key.includes("cup")) return "thermos";
  if (key.includes("scroll")) return "scroll";
  if (key.includes("skill_bottle") || key.includes("skill bottle") || key.includes("bottle")) return "skillBottle";
  if (key.includes("skill_cards") || key.includes("skill cards") || key.includes("cards")) return "skillCards";
  if (key.includes("phone") || key.includes("mobile")) return "phone";
  if (key.includes("notebook") || key.includes("document")) return "notebook";
  if (key.includes("mirror")) return "mirror";
  if (key.includes("flashlight") || key.includes("torch")) return "flashlight";
  if (key.includes("ask_matt_sign") || key.includes("ask matt sign") || key.includes("ask_matt") || key.includes("matt sign")) return "askMattSign";
  if (key.includes("screen") || key.includes("computer") || key.includes("monitor")) return "screen";
  return "generic";
}

const Desk: React.FC<PropArtProps> = () => (
  <g aria-label="desk">
    <ellipse cx="102" cy="143" rx="78" ry="9" fill="#151526" opacity=".35" />
    <path d="M13 53h174v27H13z" fill="#8e5338" stroke={INK} strokeWidth="7" />
    <path d="M20 58h160M20 73h160" stroke="#bb7950" strokeWidth="3" />
    <path d="M29 80v58M171 80v58" stroke={INK} strokeWidth="12" strokeLinecap="round" />
    <path d="M29 82v55M171 82v55" stroke="#70432f" strokeWidth="7" strokeLinecap="round" />
    <rect x="32" y="84" width="48" height="33" rx="3" fill="#70432f" stroke={INK} strokeWidth="6" />
    <path d="M38 91h36" stroke="#bb7950" strokeWidth="3" /><circle cx="56" cy="105" r="4" fill={GOLD} stroke={INK} strokeWidth="3" />
    <path d="M14 137h32m108 0h32" stroke={INK} strokeWidth="8" strokeLinecap="round" />
  </g>
);

const Thermos: React.FC<PropArtProps> = () => (
  <g aria-label="thermos">
    <ellipse cx="100" cy="143" rx="36" ry="7" fill="#151526" opacity=".3" />
    <path d="M68 38h64v77q0 17-17 17H85q-17 0-17-17z" fill={TEAL} stroke={INK} strokeWidth="8" />
    <path d="M73 61h54M73 84h54" stroke="#a6e7d9" strokeWidth="6" /><path d="M78 112q22 9 44 0" fill="none" stroke="#155d68" strokeWidth="5" />
    <rect x="78" y="22" width="44" height="23" rx="6" fill="#d1e4df" stroke={INK} strokeWidth="7" /><path d="M84 23v-9h32v9" fill={GOLD} stroke={INK} strokeWidth="7" />
    <path d="M133 54q25 0 25 22t-25 22" fill="none" stroke={INK} strokeWidth="9" /><path d="M138 62q13 1 13 14t-13 14" fill="none" stroke={RED} strokeWidth="5" />
  </g>
);

const Scroll: React.FC<PropArtProps> = () => (
  <g aria-label="scroll">
    <ellipse cx="100" cy="130" rx="72" ry="8" fill="#151526" opacity=".3" />
    <path d="M42 43q0-13 13-13h93v76H55q-13 0-13-13z" fill={PAPER} stroke={INK} strokeWidth="8" />
    <path d="M56 49h75M56 65h61M56 81h75M56 97h45" stroke="#ae7657" strokeWidth="5" strokeLinecap="round" />
    <path d="M43 39q-18 2-18 17t18 17M148 31q18 2 18 17t-18 17" fill="#e7be83" stroke={INK} strokeWidth="8" />
    <path d="M34 48q-7 8 0 17m131-17q7 8 0 17" fill="none" stroke={GOLD} strokeWidth="5" /><path d="M102 87l12 12-12 12-12-12z" fill={RED} stroke={INK} strokeWidth="4" />
  </g>
);

const SkillBottle: React.FC<PropArtProps> = () => (
  <g aria-label="skill bottle">
    <ellipse cx="100" cy="143" rx="38" ry="7" fill="#151526" opacity=".3" />
    <path d="M80 37h40v22l18 22v42q0 14-14 14H76q-14 0-14-14V81l18-22z" fill="#704c91" stroke={INK} strokeWidth="8" />
    <path d="M69 88q31 13 62 0v33q0 9-9 9H78q-9 0-9-9z" fill={RED} /><path d="M77 103h46v22H77z" fill="#fff0c4" stroke={INK} strokeWidth="5" />
    <path d="M100 107l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill={GOLD} stroke={INK} strokeWidth="2" /><path d="M87 37v-17h26v17" fill="#d8a35c" stroke={INK} strokeWidth="7" />
    <path d="M84 20h32" stroke="#fff0c4" strokeWidth="4" /><circle cx="75" cy="74" r="5" fill="#b8f0db" stroke={INK} strokeWidth="3" /><circle cx="127" cy="68" r="4" fill="#b8f0db" stroke={INK} strokeWidth="3" />
  </g>
);

const SkillCards: React.FC<PropArtProps> = () => (
  <g aria-label="skill cards">
    <ellipse cx="104" cy="143" rx="67" ry="8" fill="#151526" opacity=".3" />
    <g transform="rotate(-15 75 92)"><rect x="24" y="28" width="88" height="105" rx="7" fill="#e9a84c" stroke={INK} strokeWidth="7" /><path d="M36 48h64M36 105h55" stroke="#fff0c4" strokeWidth="5" /><circle cx="68" cy="78" r="20" fill="#287f8f" stroke={INK} strokeWidth="5" /><path d="M68 63v30m-15-15h30" stroke="#fff5dc" strokeWidth="6" /></g>
    <g transform="rotate(8 111 87)"><rect x="69" y="20" width="88" height="105" rx="7" fill="#e7e1f4" stroke={INK} strokeWidth="7" /><path d="M81 40h64M81 103h55" stroke="#7f6aa8" strokeWidth="5" /><path d="M125 54l7 15 17 2-13 11 4 17-15-9-15 9 4-17-13-11 17-2z" fill={RED} stroke={INK} strokeWidth="4" /></g>
    <path d="M80 134h57" stroke={INK} strokeWidth="7" strokeLinecap="round" />
  </g>
);

const Phone: React.FC<PropArtProps> = () => (
  <g aria-label="phone">
    <ellipse cx="100" cy="145" rx="39" ry="6" fill="#151526" opacity=".3" /><rect x="54" y="10" width="92" height="133" rx="15" fill="#25283c" stroke={INK} strokeWidth="8" />
    <rect x="64" y="29" width="72" height="88" rx="4" fill="#b9e7e9" stroke="#101b2a" strokeWidth="5" /><path d="M73 77q12-31 27-4 14 25 30-12" fill="none" stroke={TEAL} strokeWidth="6" />
    <circle cx="100" cy="47" r="10" fill={PAPER} stroke={INK} strokeWidth="4" /><path d="M95 47h10M100 42v10" stroke={RED} strokeWidth="3" /><path d="M84 125h32M89 19h22" stroke="#aab5c9" strokeWidth="5" strokeLinecap="round" /><circle cx="100" cy="132" r="4" fill={GOLD} />
  </g>
);

const Notebook: React.FC<PropArtProps> = () => (
  <g aria-label="notebook">
    <ellipse cx="100" cy="138" rx="78" ry="8" fill="#151526" opacity=".3" /><path d="M24 35l72 10v82l-72-10z" fill="#f3d6a0" stroke={INK} strokeWidth="8" /><path d="M176 35l-72 10v82l72-10z" fill={PAPER} stroke={INK} strokeWidth="8" />
    <path d="M96 45q4 40 0 82m8-82q-4 40 0 82" fill="none" stroke="#9e644b" strokeWidth="6" /><path d="M38 60l44 6M37 78l45 6M36 96l45 6M119 60l43-6M119 78l44-6M119 96l43-6" stroke="#b9774d" strokeWidth="5" strokeLinecap="round" />
    <path d="M152 116l14 22-12-6-10 9z" fill={RED} stroke={INK} strokeWidth="4" /><path d="M160 123l-13-13" stroke={GOLD} strokeWidth="5" />
  </g>
);

const Mirror: React.FC<PropArtProps> = () => (
  <g aria-label="mirror">
    <ellipse cx="100" cy="145" rx="42" ry="6" fill="#151526" opacity=".3" /><path d="M100 25q-43 0-43 50 0 43 43 43t43-43q0-50-43-50z" fill="#d49b55" stroke={INK} strokeWidth="9" /><path d="M100 39q-29 0-29 36 0 29 29 29t29-29q0-36-29-36z" fill="#b9e7e9" stroke="#fff0c4" strokeWidth="6" />
    <path d="M84 70q16-24 32-4" fill="none" stroke="#e7ffff" strokeWidth="7" strokeLinecap="round" /><path d="M100 118v23M78 141h44" stroke={INK} strokeWidth="8" strokeLinecap="round" /><path d="M55 50l-12-8m14 29H43m100-21l12-8m-14 29h14" stroke={GOLD} strokeWidth="6" strokeLinecap="round" />
  </g>
);

const Flashlight: React.FC<PropArtProps> = () => (
  <g aria-label="flashlight" transform="rotate(-12 100 84)">
    <path d="M28 73h40l13-18h62l25 29-25 29H81L68 95H28z" fill="#45556d" stroke={INK} strokeWidth="8" /><path d="M82 55h61l20 29H82z" fill="#d6e0e7" stroke={INK} strokeWidth="6" /><path d="M150 61l20 23-20 23" fill="#fff0c4" stroke={GOLD} strokeWidth="8" />
    <path d="M42 75v19m12-19v19" stroke="#9fb0bf" strokeWidth="5" /><rect x="93" y="48" width="20" height="10" rx="4" fill={RED} stroke={INK} strokeWidth="4" /><path d="M176 75l18-12m-15 28h21m-24 10l18 12" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
  </g>
);

const AskMattSign: React.FC<PropArtProps> = () => (
  <g aria-label="ask matt sign">
    <ellipse cx="100" cy="145" rx="48" ry="6" fill="#151526" opacity=".3" /><path d="M100 104v37M73 141h54" stroke={INK} strokeWidth="9" strokeLinecap="round" /><path d="M22 25h156v82H22z" fill={GOLD} stroke={INK} strokeWidth="9" /><path d="M37 40h126v52H37z" fill="#fff0c4" stroke={RED} strokeWidth="5" />
    <text x="100" y="64" textAnchor="middle" fill={INK} fontSize="25" fontWeight="900" fontFamily="Arial, sans-serif">ASK</text><text x="100" y="87" textAnchor="middle" fill={RED} fontSize="21" fontWeight="900" fontFamily="Arial, sans-serif">MATT?</text><path d="M49 23l10-14m92 14l-10-14" stroke={INK} strokeWidth="6" strokeLinecap="round" />
  </g>
);

const Screen: React.FC<PropArtProps> = () => (
  <g aria-label="screen">
    <ellipse cx="100" cy="143" rx="50" ry="7" fill="#151526" opacity=".3" /><rect x="25" y="14" width="150" height="91" rx="8" fill="#202936" stroke={INK} strokeWidth="8" /><rect x="37" y="27" width="126" height="63" fill="#b9e7e9" />
    <path d="M50 77l23-25 20 17 26-31 28 36" fill="none" stroke={RED} strokeWidth="7" /><path d="M82 106h36v18H82zM64 138h72" fill="#d9e2e4" stroke={INK} strokeWidth="6" />
  </g>
);

const Generic: React.FC<PropArtProps> = () => (
  <g aria-label="generic prop"><rect x="20" y="36" width="160" height="82" rx="10" fill="#e9a84c" stroke={INK} strokeWidth="8" /><path d="M38 55h124M38 100h124" stroke="#fff0c4" strokeWidth="5" /><circle cx="100" cy="78" r="18" fill={TEAL} stroke={INK} strokeWidth="5" /></g>
);

const PROP_ART: Record<PropKind, React.FC<PropArtProps>> = {
  desk: Desk, thermos: Thermos, scroll: Scroll, skillBottle: SkillBottle, skillCards: SkillCards,
  phone: Phone, notebook: Notebook, mirror: Mirror, flashlight: Flashlight, askMattSign: AskMattSign,
  screen: Screen, generic: Generic,
};

const BindingCue: React.FC = () => (
  <g aria-label="hand bound" data-binding-cue="hand">
    <path d="M153 18q28 9 29 37" fill="none" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
    <circle cx="178" cy="58" r="11" fill={PAPER} stroke={INK} strokeWidth="4" />
    <path d="M173 58l4-5 5 5m-9 0l-4 5m13-5l4 5" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);
