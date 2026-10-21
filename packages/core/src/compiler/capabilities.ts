/**
 * Declared capability vocabulary (Wave 0, docs/ART_ASSET_PROGRAM.md).
 *
 * One home for the names three slices must spell the same way: the intent the
 * compiler accepts, the support kind a body hangs from, the prop kind a
 * projectile declares, and the events a cue attaches to. No behaviour lives
 * here — the slice that needs a capability implements it — and a declaration
 * with no implementation fails loud instead of compiling a manifest that is
 * quietly missing the capability.
 */
export interface CapabilityDeclaration {
  /** Intent name an authored call terminal spells, e.g. `action.swing`. */
  readonly intent?: string;
  /** Support kind the body attaches to (`support.kind`), when it needs one. */
  readonly support?: "hanging";
  /** Prop kind the capability acts on (`placement.kind`), when it needs one. */
  readonly prop?: "projectile";
  /** Events the capability emits; a cue attaches to one of these names. */
  readonly events: readonly string[];
  /** Wave that implements the capability; named in the fail-loud error. */
  readonly owner: string;
  /** True once the slice that owns the capability has implemented it: the
   *  declaration then describes shipped behaviour and the gate admits it. */
  readonly implemented?: boolean;
}

/** Event names: `<capability>.<beat>` in the lifecycle track's vocabulary, so
 * a cue written by one slice names the same beat another slice listens to. A
 * hanging support is passive and emits nothing itself: the swing intent that
 * attaches to it emits `swing.grip` and `swing.release`. */
export const DECLARED_CAPABILITIES = {
  hanging: {
    support: "hanging",
    events: [],
    owner: "Wave 2 (slice B, giant swing on a high bar)",
    implemented: true,
  },
  projectile: {
    prop: "projectile",
    events: ["projectile.struck", "projectile.settled"],
    owner: "Wave 2 (E1 projectile + struck contact)",
    implemented: true,
  },
  swing: {
    intent: "swing",
    support: "hanging",
    events: ["swing.grip", "swing.release"],
    owner: "Wave 2 (slice B, giant swing on a high bar)",
    implemented: true,
  },
  pour: {
    intent: "pour",
    events: ["pour.tilt", "pour.stream_start", "pour.stream_end"],
    owner: "Wave 2 (slice C, pouring tea)",
  },
} as const satisfies Record<string, CapabilityDeclaration>;

export type DeclaredCapability = keyof typeof DECLARED_CAPABILITIES;

/** The field an episode asks a capability through: the authored call terminal
 * (`intent`), the `support.kind` a body attaches to, or the `prop.kind` a
 * placed object declares. Selecting on the intent alone left the other two
 * validated by zod and ignored by the engine, which is the defect this gate
 * exists to close. */
export type CapabilitySelector = "intent" | "support" | "prop";

/** The declaration a selector and name ask for, or undefined when the
 * vocabulary does not declare that name at all — zod's literal union owns the
 * undeclared case, so nothing is refused twice. */
export function declaredCapability(selector: CapabilitySelector, name: string): CapabilityDeclaration | undefined {
  return Object.values(DECLARED_CAPABILITIES).find((capability) => (capability as Record<string, unknown>)[selector] === name);
}

/**
 * Fail loud for a capability the language names but no plugin implements yet,
 * whichever field the episode asks it through: `action.pour(...)`, a
 * `support.kind` on the set the scene stages, or a `prop.kind` on the object
 * it places. Each is a compile error naming the capability, the field, and the
 * wave that owns it — never a manifest with the beat missing or the prop
 * ignored.
 */
export function assertCapabilityImplemented(selector: CapabilitySelector, name: string, raw: string): void {
  const declared = declaredCapability(selector, name);
  if (!declared || declared.implemented) return;
  // The intent message is the one authors already read (`needs the "pour"`);
  // a kind says which field it came through, because the same name can be a
  // prop kind and an intent in a later slice.
  const field = selector === "intent" ? "" : ` ${selector}`;
  throw new Error(
    `compileEpisode: ${raw} needs the "${name}"${field} capability, which is declared but not implemented — ` +
    `${declared.owner} implements it; the contract is docs/ART_ASSET_PROGRAM.md`,
  );
}
