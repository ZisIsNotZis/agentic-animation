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
  },
  projectile: {
    prop: "projectile",
    events: ["projectile.struck", "projectile.settled"],
    owner: "Wave 2 (E1 projectile + struck contact)",
  },
  swing: {
    intent: "swing",
    support: "hanging",
    events: ["swing.grip", "swing.release"],
    owner: "Wave 2 (slice B, giant swing on a high bar)",
  },
  pour: {
    intent: "pour",
    events: ["pour.tilt", "pour.stream_start", "pour.stream_end"],
    owner: "Wave 2 (slice C, pouring tea)",
  },
} as const satisfies Record<string, CapabilityDeclaration>;

export type DeclaredCapability = keyof typeof DECLARED_CAPABILITIES;

/**
 * Fail loud for an intent the language names but no plugin implements yet: an
 * episode that asks for `swing` or `pour` is a compile error naming the
 * capability and the wave that owns it, never a manifest with the beat missing.
 */
export function assertCapabilityImplemented(terminal: string, raw: string): void {
  const declarations: readonly CapabilityDeclaration[] = Object.values(DECLARED_CAPABILITIES);
  const declared = declarations.find((capability) => capability.intent === terminal && capability.intent !== undefined);
  if (declared?.intent === undefined) return;
  throw new Error(
    `compileEpisode: ${raw} needs the "${declared.intent}" capability, which is declared but not implemented — ` +
    `${declared.owner} implements it; the contract is docs/ART_ASSET_PROGRAM.md`,
  );
}
