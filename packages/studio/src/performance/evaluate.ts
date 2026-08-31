import { ease } from "../lib/interpolate";
import type {
  EvaluatedActor,
  EvaluatedCamera,
  EvaluatedExpression,
  EvaluatedGesture,
  EvaluatedProp,
  EvaluatedVfx,
  PerformanceActor,
  PerformanceCameraKey,
  PerformanceCameraTrack,
  PerformanceConstraint,
  PerformanceExpression,
  PerformanceExpressionKey,
  PerformanceFrameState,
  PerformanceGesture,
  PerformanceGestureKey,
  EvaluatedTrack,
  PerformanceGenericTrack,
  PerformanceTrackEvent,
  PerformanceManifest,
  PerformancePlacement,
  PerformancePlacementKey,
  PerformancePlacementValue,
  PerformancePresenceKey,
  PerformancePositionKey,
  PerformanceProp,
  PerformanceSubtitle,
  PerformanceStateKey,
  PerformanceVisual,
  PerformanceVfx,
  SemanticPlacement,
} from "./types";

const DEFAULT_EXPRESSION: EvaluatedExpression = {
  name: "neutral",
  smile: 0,
  brow: 0,
  eyeOpen: 1,
  lipsPart: 0,
  gaze: [0, 0],
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function numberOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function vecOr(value: [number, number] | undefined, fallback: [number, number]): [number, number] {
  return value ? [value[0], value[1]] : [fallback[0], fallback[1]];
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return value !== null && typeof value === "object" ? value as UnknownRecord : undefined;
}

function pointOf(value: unknown): [number, number] | undefined {
  return Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number"
    ? [value[0], value[1]]
    : undefined;
}

function frameOf(key: { frame?: number; t?: number; at?: number | [number, number]; startFrame?: number }): number {
  return key.frame ?? key.startFrame ?? key.t ?? (typeof key.at === "number" ? key.at : 0);
}

function trackEventStart(event: PerformanceTrackEvent): number {
  if (typeof event.frame === "number") return event.frame;
  if (typeof event.startFrame === "number") return event.startFrame;
  if (typeof event.t === "number") return event.t;
  return typeof event.at === "number" ? event.at : 0;
}

function trackEventEnd(event: PerformanceTrackEvent, start: number): number {
  return event.endFrame ?? event.end ?? (event.durationFrames ? start + event.durationFrames : event.duration ? start + event.duration : start + 1);
}

function evaluateTracks(tracks: readonly PerformanceGenericTrack[] | undefined, frame: number): EvaluatedTrack[] {
  return (tracks ?? []).map((track) => ({
    ...track,
    events: track.events.map((event) => {
      const start = trackEventStart(event);
      const end = trackEventEnd(event, start);
      return {...event, frame: start, progress: end <= start ? 1 : clamp01((frame - start) / (end - start)), active: frame >= start && frame < end};
    }),
  }));
}

function eventValue(event: PerformanceTrackEvent): UnknownRecord {
  return asRecord(event.value) ?? event as UnknownRecord;
}

function cameraKeyValue(event: PerformanceTrackEvent): UnknownRecord {
  const value = eventValue(event);
  return asRecord(value.value) ?? value;
}

function cameraTargetPoint(target: unknown, actors: readonly EvaluatedActor[], fallback: [number, number]): [number, number] {
  if (typeof target !== "string") return fallback;
  const actor = actors.find((candidate) => candidate.id === target);
  return actor ? [actor.x, actor.y - 360 * actor.scale] : fallback;
}

function cameraKeyFromEvent(
  event: PerformanceTrackEvent,
  actors: readonly EvaluatedActor[],
  previous: EvaluatedCamera,
  composition: EvaluatedCamera,
  viewport: {width: number; height: number},
): PerformanceCameraKey {
  const value = cameraKeyValue(event);
  const operation = value.operation;
  const zoom = typeof value.zoom === "number" ? value.zoom : typeof value.z === "number" ? value.z : undefined;
  const target = cameraTargetPoint(value.target, actors, [previous.x, previous.y]);
  const nextZoom = zoom === undefined ? previous.z : zoom;
  const centeredX = target[0] * nextZoom - viewport.width / 2;
  const centeredY = target[1] * nextZoom - viewport.height / 2;
  const compositionX = viewport.width * nextZoom / 2 - viewport.width / 2;
  const compositionY = viewport.height * nextZoom / 2 - viewport.height / 2;
  const x = typeof value.x === "number" ? value.x : operation === "push" ? centeredX : operation === "pull" ? composition.x : previous.x;
  const y = typeof value.y === "number" ? value.y : operation === "push" ? centeredY : operation === "pull" ? composition.y : previous.y;
  return {frame: trackEventStart(event), x, y, z: nextZoom, rotation: numberOr(value.rotation as number | undefined, previous.rotation), ease: event.ease ?? value.ease as PerformanceCameraKey["ease"]};
}

function cameraKeysFromTracks(
  tracks: readonly EvaluatedTrack[],
  actors: readonly EvaluatedActor[],
  composition: EvaluatedCamera,
  video: {width: number; height: number; fps: number},
): PerformanceCameraKey[] {
  const events = tracks.filter((track) => track.kind === "camera").flatMap((track) => track.events).sort((a, b) => trackEventStart(a) - trackEventStart(b));
  let previous = composition;
  return events.flatMap((event) => {
    const start = previous;
    const key = cameraKeyFromEvent(event, actors, previous, composition, video);
    const value = cameraKeyValue(event);
    const semantic = value.operation === "push" || value.operation === "pull" || typeof value.zoom === "number";
    const end = trackEventEnd(event, trackEventStart(event));
    previous = {x: key.x ?? previous.x, y: key.y ?? previous.y, z: key.z ?? previous.z, rotation: key.rotation ?? previous.rotation};
    return semantic && end > trackEventStart(event)
      ? [{frame: trackEventStart(event), x: start.x, y: start.y, z: start.z, rotation: start.rotation, ease: event.ease}, {...key, frame: end}]
      : [key];
  });
}

function targetPoint(target: unknown, manifest: PerformanceManifest, fallback: [number, number]): [number, number] | undefined {
  if (typeof target !== "string") return undefined;
  const actor = manifest.actors?.find((item) => item.id === target);
  if (actor) return semanticPlacement(actor.placement ?? actor.semanticPlacement ?? actor.place ?? (actor.at ? {at: actor.at} : {at: fallback}), manifest.placements ?? manifest.marks).at;
  const prop = (manifest.props ?? manifest.objects)?.find((item) => item.id === target);
  if (prop) return prop.at ?? prop.position;
  const mark = (manifest.placements ?? manifest.marks)?.[target];
  return Array.isArray(mark) ? [mark[0], mark[1]] : mark?.at ?? mark?.position;
}

function genericPlacement(tracks: readonly EvaluatedTrack[], frame: number, fallback: PerformancePlacement, manifest: PerformanceManifest): PerformancePlacement {
  const event = tracks
    .filter((track) => track.kind === "transform" || track.kind === "movement")
    .flatMap((track) => track.events)
    .filter((item) => trackEventStart(item) <= frame)
    .sort((a, b) => trackEventStart(a) - trackEventStart(b))
    .at(-1);
  if (!event) return fallback;
  const value = eventValue(event);
  const nested = asRecord(value.value);
  const transform = nested ?? value;
  const destination = targetPoint(transform.to ?? transform.target, manifest, fallback.at ?? [0, 0]);
  const start = fallback.at ?? [fallback.x ?? 0, fallback.y ?? 0];
  const end = destination ? [destination[0] + (destination[0] >= start[0] ? -170 : 170), destination[1]] as [number, number] : undefined;
  const eased = event.progress * event.progress * (3 - 2 * event.progress);
  const travelled = end ? [start[0] + (end[0] - start[0]) * eased, start[1] + (end[1] - start[1]) * eased] as [number, number] : undefined;
  const point = pointOf(transform.at) ?? pointOf(transform.position) ?? pointOf(transform.to) ?? travelled;
  const position = point ?? (typeof transform.x === "number" || typeof transform.y === "number"
    ? [typeof transform.x === "number" ? transform.x : fallback.at?.[0] ?? 0, typeof transform.y === "number" ? transform.y : fallback.at?.[1] ?? 0] as [number, number]
    : fallback.at);
  return {
    ...fallback,
    ...(position ? {at: position} : {}),
    ...(typeof transform.x === "number" ? {x: transform.x} : {}),
    ...(typeof transform.y === "number" ? {y: transform.y} : {}),
    ...(typeof transform.scale === "number" ? {scale: transform.scale} : {}),
    ...(typeof transform.rotation === "number" ? {rotation: transform.rotation} : {}),
    ...(typeof transform.flip === "boolean" ? {flip: transform.flip} : {}),
  };
}

function eventsAt(tracks: readonly EvaluatedTrack[], kind: EvaluatedTrack["kind"], frame: number): EvaluatedTrack["events"] {
  return tracks.filter((track) => track.kind === kind).flatMap((track) => track.events).filter((event) => {
    const start = trackEventStart(event);
    return frame >= start && frame < trackEventEnd(event, start);
  });
}

function intervalActive(
  value: { startFrame?: number; endFrame?: number; start?: number; end?: number; durationFrames?: number; duration?: number },
  frame: number,
): boolean {
  const start = value.startFrame ?? value.start ?? 0;
  const end = value.endFrame ?? value.end ?? (value.durationFrames ? start + value.durationFrames : value.duration ? start + value.duration : Number.POSITIVE_INFINITY);
  return frame >= start && frame < end;
}

function latestPositionKey(keys: readonly PerformancePositionKey[] | undefined, frame: number): PerformancePositionKey | undefined {
  let latest: PerformancePositionKey | undefined;
  for (const key of keys ?? []) {
    if (frameOf(key) <= frame && (!latest || frameOf(key) >= frameOf(latest))) latest = key;
  }
  return latest;
}

function positionPoint(key: PerformancePositionKey, fallback: [number, number]): [number, number] {
  const point = key.at ?? key.to;
  return point
    ? [point[0], point[1]]
    : [key.x ?? fallback[0], key.y ?? fallback[1]];
}

function semanticPlacement(
  placement: PerformanceActor["placement"],
  placements: Record<string, PerformancePlacementValue | PerformancePlacement> | undefined,
): PerformancePlacement {
  const direct = typeof placement === "string"
    ? undefined
    : placement && ("at" in placement || "position" in placement || "x" in placement || "y" in placement)
      ? placement
      : undefined;
  if (direct) {
    const at = direct.at ?? direct.position ?? [direct.x ?? 0, direct.y ?? 0];
    return {
      at: [at[0], at[1]],
      scale: numberOr(direct.scale, 1),
      rotation: numberOr(direct.rotation, 0),
      flip: direct.flip === true,
    };
  }
  const semantic = placement && typeof placement === "object" && "mark" in placement ? placement : undefined;
  const markName = typeof placement === "string" ? placement : semantic?.mark;
  const markValue = markName ? placements?.[markName] : undefined;
  const mark: PerformancePlacement | undefined = Array.isArray(markValue)
    ? { at: [markValue[0], markValue[1]] }
    : markValue;
  if (!mark) {
    // move.to() may name an actor/prop/dressing rather than a layout mark.
    // Keep the current authored placement when the semantic target is not a
    // staging mark; interaction procedures still carry the target identity.
    return {at: [0, 0], scale: 1, rotation: 0, flip: false};
  }
  const offset = semantic?.offset;
  return {
    at: [
      (mark.at ?? mark.position ?? [mark.x ?? 0, mark.y ?? 0])[0] + (offset?.[0] ?? 0),
      (mark.at ?? mark.position ?? [mark.x ?? 0, mark.y ?? 0])[1] + (offset?.[1] ?? 0),
    ],
    scale: numberOr(mark.scale, 1) * numberOr(semantic?.scale, 1),
    rotation: numberOr(mark.rotation, 0),
    flip: mark.flip === true,
  };
}

function placementAt(
  actor: PerformanceActor,
  manifest: PerformanceManifest,
  frame: number,
): PerformancePlacement {
  let base = semanticPlacement(
    actor.placement ?? actor.semanticPlacement ?? actor.place ?? (actor.at ? { at: actor.at } : { at: [0, 0] }),
    manifest.placements ?? manifest.marks,
  );
  const placementKey = latestAt(actor.placementTrack, frame);
  if (placementKey) base = semanticPlacement(placementKey.placement, manifest.placements ?? manifest.marks);
  const key = latestPositionKey(actor.positionTrack, frame);
  if (!key) return base;
  const at = positionPoint(key, base.at ?? [0, 0]);
  return { ...base, at, scale: numberOr(key.scale, numberOr(base.scale, 1)), rotation: numberOr(key.rotation, numberOr(base.rotation, 0)), flip: key.flip ?? base.flip };
}

function expressionAt(actor: PerformanceActor, frame: number): EvaluatedExpression {
  const key = latestAt((actor.expressionTrack ?? actor.expressions)?.map((item) => ({ ...item, frame: frameOf(item) })), frame);
  const current = key?.value ?? expressionValue(key) ?? actor.expression;
  return {
    ...DEFAULT_EXPRESSION,
    ...(current ? cloneExpression(current) : {}),
    gaze: vecOr(current?.gaze, DEFAULT_EXPRESSION.gaze),
  };
}

function expressionValue(key: PerformanceExpressionKey | undefined): PerformanceExpression | undefined {
  if (!key?.expression && !key?.name) return undefined;
  return typeof key.expression === "string"
    ? { name: key.expression }
    : key.expression ?? { name: key.name };
}

function cloneExpression(expression: PerformanceExpression): Partial<EvaluatedExpression> {
  if (!expression.name) return {};
  return {
    name: expression.name,
    ...(expression.smile === undefined ? {} : { smile: expression.smile }),
    ...(expression.brow === undefined ? {} : { brow: expression.brow }),
    ...(expression.eyeOpen === undefined ? {} : { eyeOpen: expression.eyeOpen }),
    ...(expression.lipsPart === undefined ? {} : { lipsPart: expression.lipsPart }),
    ...(expression.gaze === undefined ? {} : { gaze: [expression.gaze[0], expression.gaze[1]] }),
  };
}

function latestAt<T extends { frame?: number; t?: number; startFrame?: number }>(keys: readonly T[] | undefined, frame: number): T | undefined {
  let latest: T | undefined;
  for (const key of keys ?? []) {
    if (frameOf(key) <= frame && (!latest || frameOf(key) >= frameOf(latest))) latest = key;
  }
  return latest;
}

function gestureEnd(key: PerformanceGestureKey, start: number): number {
  return key.endFrame ?? key.end ?? (key.durationFrames ? start + key.durationFrames : start + 1);
}

function gestureAt(actor: PerformanceActor, frame: number): EvaluatedGesture | undefined {
  const key = (actor.gestureTrack ?? actor.gestures ?? []).map((item) => ({ ...item, frame: frameOf(item) })).find(
    (candidate) => frame >= frameOf(candidate) && frame < gestureEnd(candidate, frameOf(candidate)),
  );
  if (!key) return undefined;
  const value = gestureValue(key);
  if (!value) return undefined;
  const start = frameOf(key);
  const end = gestureEnd(key, start);
  return {
    ...value,
    progress: end <= start ? 1 : clamp01((frame - start) / (end - start)),
  };
}

function gestureValue(key: PerformanceGestureKey): PerformanceGesture | undefined {
  if (key.value) return key.value;
  if (typeof key.gesture === "string") return { name: key.gesture };
  if (key.gesture) return key.gesture;
  return key.name ? { name: key.name } : undefined;
}

function cameraKeys(value: PerformanceCameraKey[] | PerformanceCameraTrack | undefined): PerformanceCameraKey[] {
  return Array.isArray(value) ? value : value?.keys ?? [];
}

function interpolateCamera(keys: PerformanceCameraKey[] | PerformanceCameraTrack | undefined, frame: number): EvaluatedCamera {
  const source = cameraKeys(keys);
  const ordered = [...source].sort((a, b) => frameOf(a) - frameOf(b));
  if (!ordered.length) return { x: 0, y: 0, z: 1, rotation: 0 };
  if (ordered.length === 1) {
    return {
      x: sampleCameraChannel(source, frame, (key) => key.x, 0),
      y: sampleCameraChannel(source, frame, (key) => key.y, 0),
      z: sampleCameraChannel(source, frame, (key) => key.z, 1),
      rotation: sampleCameraChannel(source, frame, (key) => key.rotation, 0),
    };
  }
  if (frame <= frameOf(ordered[0]!) || frame >= frameOf(ordered.at(-1)!)) {
    return {
      x: sampleCameraChannel(source, frame, (key) => key.x, 0),
      y: sampleCameraChannel(source, frame, (key) => key.y, 0),
      z: sampleCameraChannel(source, frame, (key) => key.z, 1),
      rotation: sampleCameraChannel(source, frame, (key) => key.rotation, 0),
    };
  }
  const left = ordered.findLast((key) => frameOf(key) <= frame)!;
  const right = ordered.find((key) => frameOf(key) > frame)!;
  const progress = ease(right.ease, (frame - frameOf(left)) / (frameOf(right) - frameOf(left)));
  return {
    x: cameraChannelInSegment(ordered, left, right, frame, (key) => key.x, 0, progress),
    y: cameraChannelInSegment(ordered, left, right, frame, (key) => key.y, 0, progress),
    z: cameraChannelInSegment(ordered, left, right, frame, (key) => key.z, 1, progress),
    rotation: cameraChannelInSegment(ordered, left, right, frame, (key) => key.rotation, 0, progress),
  };
}

function cameraChannelInSegment(
  keys: readonly PerformanceCameraKey[],
  left: PerformanceCameraKey,
  right: PerformanceCameraKey,
  frame: number,
  pick: (key: PerformanceCameraKey) => number | undefined,
  fallback: number,
  progress: number,
): number {
  const leftValue = [...keys].reverse().find((key) => frameOf(key) <= frameOf(left) && pick(key) !== undefined);
  const rightValue = [...keys].reverse().find((key) => frameOf(key) <= frameOf(right) && pick(key) !== undefined);
  const start = pick(leftValue ?? rightValue ?? left) ?? fallback;
  const end = pick(rightValue ?? leftValue ?? right) ?? start;
  return start + (end - start) * progress;
}

function sampleCameraChannel(
  keys: readonly PerformanceCameraKey[],
  frame: number,
  pick: (key: PerformanceCameraKey) => number | undefined,
  fallback: number,
): number {
  const values = keys
    .map((key) => ({ frame: frameOf(key), value: pick(key) }))
    .filter((value): value is { frame: number; value: number } => value.value !== undefined)
    .sort((a, b) => a.frame - b.frame);
  const first = values[0];
  if (!first) return fallback;
  if (frame <= first.frame) return first.value;
  const last = values.at(-1)!;
  if (frame >= last.frame) return last.value;
  const right = values.find((value) => value.frame > frame)!;
  const left = values[values.indexOf(right) - 1]!;
  const progress = (frame - left.frame) / (right.frame - left.frame);
  const rightKey = keys.find((key) => frameOf(key) === right.frame);
  return left.value + (right.value - left.value) * ease(rightKey?.ease, progress);
}

function lerpDefined(a: number | undefined, b: number | undefined, fallback: number, progress: number): number {
  const start = a ?? fallback;
  const end = b ?? start;
  return start + (end - start) * progress;
}

function actorState(
  actor: PerformanceActor,
  manifest: PerformanceManifest,
  frame: number,
  extraTracks: readonly PerformanceGenericTrack[] = [],
): EvaluatedActor {
  const placement = placementAt(actor, manifest, frame);
  const visual = actor.visual;
  const assets = asRecord(manifest.assets);
  const asset = actor.asset ? asRecord(assets?.[actor.asset]) : undefined;
  const present = latestAt(actor.presentTrack, frame)?.present;
  const pose = latestAt(actor.poseTrack, frame)?.value;
  const tracks = evaluateTracks([...(actor.tracks ?? []), ...extraTracks], frame);
  const lifecycle = tracks
    .filter((track) => track.kind === "lifecycle")
    .flatMap((track) => track.events)
    .filter((event) => trackEventStart(event) <= frame)
    .sort((a, b) => trackEventStart(a) - trackEventStart(b))
    .at(-1);
  const lifecycleValue = lifecycle ? eventValue(lifecycle) : undefined;
  const lifecyclePresent = typeof lifecycleValue?.present === "boolean" ? lifecycleValue.present : undefined;
  const lifecyclePose = typeof lifecycleValue?.pose === "string" ? lifecycleValue.pose : undefined;
  const expressionTrack = tracks.filter((track) => track.kind === "expression").flatMap((track) => track.events).filter((event) => trackEventStart(event) <= frame);
  const expressionFromTrack = expressionTrack.at(-1);
  const expressionValue = expressionFromTrack ? (asRecord(eventValue(expressionFromTrack).value) ?? eventValue(expressionFromTrack)) : undefined;
  const expression = expressionValue && (expressionValue.name || expressionValue.emotion)
    ? {name: String(expressionValue.name ?? expressionValue.emotion), ...expressionValue} as PerformanceExpression
    : undefined;
  const transformed = genericPlacement(tracks, frame, placement, manifest);
  return {
    id: actor.id,
    x: transformed.at?.[0] ?? transformed.x ?? 0,
    y: transformed.at?.[1] ?? transformed.y ?? 0,
    scale: numberOr(transformed.scale, 1),
    rotation: numberOr(transformed.rotation, 0),
    flip: transformed.flip === true,
    z: numberOr(actor.z, 0),
    present: lifecyclePresent ?? present ?? actor.present !== false,
    ...(lifecyclePose ?? pose ?? actor.pose) === undefined ? {} : {pose: lifecyclePose ?? pose ?? actor.pose},
    expression: expression ? {...DEFAULT_EXPRESSION, ...expression} : expressionAt(actor, frame),
    gesture: gestureAt(actor, frame),
    tracks,
    anchors: Object.fromEntries(
      Object.entries({ ...actor.sockets, ...actor.anchors }).map(([name, point]) => [name, [point[0], point[1]]]),
    ),
    ...((actor.src ?? visual?.src ?? (typeof asset?.src === "string" ? asset.src : undefined)) === undefined ? {} : { src: actor.src ?? visual?.src ?? asset?.src as string }),
    ...((actor.width ?? visual?.width ?? (typeof asset?.width === "number" ? asset.width : undefined)) === undefined ? {} : { width: actor.width ?? visual?.width ?? asset?.width as number }),
    ...((actor.height ?? visual?.height ?? (typeof asset?.height === "number" ? asset.height : undefined)) === undefined ? {} : { height: actor.height ?? visual?.height ?? asset?.height as number }),
  };
}

function propState(prop: PerformanceProp, actors: Map<string, EvaluatedActor>, frame: number): EvaluatedProp {
  const base = prop.at ?? prop.position ?? [0, 0];
  let x = base[0];
  let y = base[1];
  let rotation = numberOr(prop.rotation, 0);
  let scale = numberOr(prop.scale, 1);
  const tracks = evaluateTracks(prop.tracks, frame);
  const transform = eventsAt(tracks, "transform", frame).at(-1) ?? eventsAt(tracks, "movement", frame).at(-1);
  if (transform) {
    const value = eventValue(transform);
    x = numberOr(value.x as number | undefined, x);
    y = numberOr(value.y as number | undefined, y);
    rotation = numberOr(value.rotation as number | undefined, rotation);
    scale = numberOr(value.scale as number | undefined, scale);
  }
  const position = latestPositionKey(prop.positionTrack, frame);
  if (position) {
    [x, y] = positionPoint(position, [x, y]);
    rotation = numberOr(position.rotation, rotation);
    scale = numberOr(position.scale, scale);
  }
  const bindingEvent = tracks
    .filter((track) => track.kind === "binding")
    .flatMap((track) => track.events)
    .filter((event) => trackEventStart(event) <= frame && frame < trackEventEnd(event, trackEventStart(event)))
    .at(-1);
  const bindingValue = bindingEvent ? eventValue(bindingEvent) : undefined;
  const genericBinding: PerformanceConstraint | undefined = bindingEvent && bindingValue ? {
    actor: String(bindingValue.actor ?? bindingValue.actorId ?? bindingValue.holder ?? bindingEvent.subject ?? ""),
    hand: String(bindingValue.hand ?? bindingValue.socket ?? "hand_r"),
    offset: pointOf(bindingValue.offset),
  } : undefined;
  const binding = prop.boundTo ?? prop.constraint ?? prop.bind;
  const activeBinding = binding && intervalActive(binding, frame) ? binding : genericBinding;
  if (activeBinding) {
    const actor = actors.get(activeBinding.actor ?? activeBinding.actorId ?? "");
    const hand = actor?.anchors[activeBinding.hand ?? activeBinding.socket ?? ""];
    if (actor && hand) {
      x = actor.x + hand[0] * actor.scale + (activeBinding.offset?.[0] ?? 0);
      y = actor.y + hand[1] * actor.scale + (activeBinding.offset?.[1] ?? 0);
      rotation += actor.rotation;
      scale *= actor.scale;
      if (actor.flip) x -= hand[0] * actor.scale * 2;
    }
  }
  return {
    id: prop.id,
    ...(prop.label === undefined ? {} : { label: prop.label }),
    x,
    y,
    rotation,
    scale,
    z: numberOr(prop.z, 0),
    size: prop.size ? [prop.size[0], prop.size[1]] : [prop.width ?? 64, prop.height ?? 64],
    ...(prop.src === undefined ? {} : { src: prop.src }),
    tracks,
  };
}

function tracksForSubject(tracks: readonly PerformanceGenericTrack[], subject: string): PerformanceGenericTrack[] {
  return tracks.filter((track) => track.subject === subject || track.target === subject);
}

function applyManifestConstraints(
  props: EvaluatedProp[],
  constraints: PerformanceConstraint[] | undefined,
  actors: Map<string, EvaluatedActor>,
  frame: number,
): EvaluatedProp[] {
  if (!constraints?.length) return props;
  const byId = new Map(props.map((prop) => [prop.id, prop]));
  for (const constraint of constraints) {
    const prop = byId.get(constraint.prop ?? constraint.object ?? "");
    const actorId = typeof constraint.actor === "string"
      ? constraint.actor
      : typeof constraint.actorId === "string" ? constraint.actorId : constraint.holder ?? "";
    const actor = actors.get(actorId);
    const hand = actor?.anchors[constraint.hand ?? constraint.socket ?? ""];
    if (!prop || !actor || !hand || !intervalActive(constraint, frame)) continue;
    prop.x = actor.x + hand[0] * actor.scale + (constraint.offset?.[0] ?? 0);
    prop.y = actor.y + hand[1] * actor.scale + (constraint.offset?.[1] ?? 0);
    prop.rotation += actor.rotation;
    prop.scale *= actor.scale;
  }
  return props;
}

function applyGenericBindings(
  props: EvaluatedProp[],
  tracks: readonly EvaluatedTrack[],
  actors: Map<string, EvaluatedActor>,
  frame: number,
): EvaluatedProp[] {
  const byId = new Map(props.map((prop) => [prop.id, prop]));
  for (const event of tracks.filter((track) => track.kind === "binding").flatMap((track) => track.events).filter((event) => trackEventStart(event) <= frame)) {
    const value = eventValue(event);
    const prop = byId.get(String(value.prop ?? value.object ?? event.target ?? ""));
    const actor = actors.get(String(value.actor ?? value.actorId ?? value.holder ?? event.subject ?? ""));
    const hand = actor?.anchors[String(value.hand ?? value.socket ?? "hand_r")];
    if (!prop || !actor || !hand) continue;
    const offset = pointOf(value.offset) ?? [0, 0];
    prop.x = actor.x + hand[0] * actor.scale + offset[0];
    prop.y = actor.y + hand[1] * actor.scale + offset[1];
    prop.rotation += actor.rotation;
    prop.scale *= actor.scale;
  }
  return props;
}

function activeSubtitles(subtitles: PerformanceSubtitle[] | undefined, frame: number): PerformanceSubtitle[] {
  return (subtitles ?? [])
    .filter((subtitle) => {
      const start = subtitle.startFrame ?? subtitle.start ?? 0;
      const end = subtitle.endFrame ?? subtitle.end ?? (subtitle.durationFrames ? start + subtitle.durationFrames : subtitle.duration ? start + subtitle.duration : Number.POSITIVE_INFINITY);
      return frame >= start && frame < end;
    })
    .map((subtitle) => ({ ...subtitle }));
}

function vfxTargetId(effect: PerformanceVfx | PerformanceTrackEvent, value: UnknownRecord): string | undefined {
  const target = value.target ?? effect.target;
  if (typeof target === "string") return target;
  const targetRecord = asRecord(target);
  if (typeof targetRecord?.id === "string") return targetRecord.id;
  return typeof value.targetId === "string" ? value.targetId : undefined;
}

function projectVfxTarget(
  effect: EvaluatedVfx,
  actors: readonly EvaluatedActor[],
  props: readonly EvaluatedProp[],
  value: UnknownRecord = effect,
): EvaluatedVfx {
  const targetId = vfxTargetId(effect, value);
  const actor = targetId ? actors.find((candidate) => candidate.id === targetId) : undefined;
  const prop = targetId ? props.find((candidate) => candidate.id === targetId) : undefined;
  const authoredPosition = pointOf(value.targetPosition) ?? pointOf(value.position);
  const position = actor
    ? [actor.x, actor.y - 360 * actor.scale] as [number, number]
    : prop
      ? [prop.x, prop.y] as [number, number]
      : authoredPosition;
  if (!position) return effect;
  const targetMeta = actor
    ? {id: actor.id, kind: "actor", position, x: actor.x, y: actor.y, scale: actor.scale}
    : prop
      ? {id: prop.id, kind: "prop", position, x: prop.x, y: prop.y, scale: prop.scale, size: prop.size}
      : undefined;
  return {
    ...effect,
    progress: effect.progress,
    ...(targetId ? {target: targetId} : {}),
    targetPosition: position,
    ...(targetMeta ? {targetMeta} : {}),
  };
}

function activeVfx(
  vfx: PerformanceVfx[] | undefined,
  frame: number,
  actors: readonly EvaluatedActor[],
  props: readonly EvaluatedProp[],
): EvaluatedVfx[] {
  return (vfx ?? [])
    .filter((effect) => {
      const start = effect.startFrame ?? effect.start ?? effect.at ?? 0;
      const end = effect.endFrame ?? effect.end ?? (effect.durationFrames ? start + effect.durationFrames : effect.duration ? start + effect.duration : start + 1);
      return frame >= start && frame < end;
    })
    .map((effect) => projectVfxTarget({
      ...effect,
      progress: (() => {
        const start = effect.startFrame ?? effect.start ?? effect.at ?? 0;
        const end = effect.endFrame ?? effect.end ?? (effect.durationFrames ? start + effect.durationFrames : effect.duration ? start + effect.duration : start + 1);
        return end > start ? clamp01((frame - start) / (end - start)) : 0;
      })(),
    } as EvaluatedVfx, actors, props));
}

function activeTrackVfx(
  tracks: readonly EvaluatedTrack[],
  frame: number,
  actors: readonly EvaluatedActor[],
  props: readonly EvaluatedProp[],
): EvaluatedVfx[] {
  return tracks
    .filter((track) => track.kind === "vfx")
    .flatMap((track, trackIndex) => track.events.map((event, eventIndex) => ({track, event, trackIndex, eventIndex})))
    .filter(({event}) => event.active)
    .map(({track, event, trackIndex, eventIndex}) => {
      const value = eventValue(event);
      const start = trackEventStart(event);
      return projectVfxTarget({
        id: `track-vfx-${trackIndex}-${eventIndex}`,
        type: String(value.type ?? value.style ?? value.effect ?? "effect"),
        startFrame: start,
        endFrame: trackEventEnd(event, start),
        progress: event.progress,
        ...value,
        ...(value.target === undefined && track.target ? {target: track.target} : {}),
      } satisfies EvaluatedVfx, actors, props, value);
    });
}

/** Pure runtime projection: the returned state depends only on manifest and frame. */
export function evaluatePerformance(manifest: PerformanceManifest, frame: number): PerformanceFrameState {
  const normalized = normalizePerformanceManifest({ ...manifest, timebase: manifest.timebase ?? "seconds" });
  const safeFrame = Number.isFinite(frame) ? Math.max(0, Math.floor(frame)) : 0;
  const tracks = (normalized.tracks ?? []).flatMap((track) => evaluateTracks([track], safeFrame));
  const actors = (normalized.actors ?? []).map((actor) => actorState(actor, normalized, safeFrame, tracksForSubject(tracks, actor.id)));
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));
  const props = (normalized.props ?? normalized.objects ?? []).map((prop) => {
    const projected = {...prop, tracks: [...(prop.tracks ?? []), ...tracksForSubject(tracks, prop.id)]};
    return propState(projected, actorById, safeFrame);
  });
  const evaluatedProps = applyManifestConstraints(
    applyGenericBindings(
      props,
      tracks,
      actorById,
      safeFrame,
    ),
    [...(normalized.constraints ?? []), ...(normalized.propConstraints ?? []), ...(normalized.bindingConstraints ?? [])],
    actorById,
    safeFrame,
  );
  const explicitCameraKeys = cameraKeys(normalized.camera ?? normalized.cameraTrack);
  const composition = interpolateCamera(explicitCameraKeys, 0);
  const projectedCameraKeys = cameraKeysFromTracks(tracks, actors, composition, normalized.video ?? {width: 1920, height: 1080, fps: 24});
  return {
    frame: safeFrame,
    camera: interpolateCamera([...explicitCameraKeys, ...projectedCameraKeys], safeFrame),
    actors,
    props: evaluatedProps,
    subtitles: activeSubtitles(normalized.subtitles ?? normalized.subtitleTrack ?? normalized.captions, safeFrame),
    vfx: [
      ...activeVfx(normalized.vfx ?? normalized.effects, safeFrame, actors, evaluatedProps),
      ...activeTrackVfx(tracks, safeFrame, actors, evaluatedProps),
    ],
    tracks,
  };
}

export function performanceMetadata(manifest: PerformanceManifest): {
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
} {
  const normalized = normalizePerformanceManifest({ ...manifest, timebase: manifest.timebase ?? "seconds" });
  return {
    durationInFrames: Math.max(
      1,
      normalized.durationInFrames ?? 1,
    ),
    fps: normalized.video!.fps,
    width: normalized.video!.width,
    height: normalized.video!.height,
  };
}

function isCompiledEpisode(manifest: PerformanceManifest): boolean {
  return Array.isArray(manifest.sceneTrack) && Array.isArray(manifest.performanceTracks) && typeof manifest.totalDuration === "number";
}

function resolvedAsset(assets: UnknownRecord | undefined, group: string, id: string): UnknownRecord | undefined {
  const entry = asRecord(asRecord(assets?.[group])?.[id]);
  return asRecord(entry?.resolved) ?? asRecord(asRecord(entry?.use)?.resolved);
}

function resolvedAssetForInstance(assets: UnknownRecord | undefined, group: string, id: string): UnknownRecord | undefined {
  const resolved = resolvedAsset(assets, group, id);
  if (resolved) return resolved;
  const entries = asRecord(assets?.[group]);
  for (const entry of Object.values(entries ?? {})) {
    const record = asRecord(entry);
    if (record?.instance === id) return asRecord(record.resolved);
  }
  return undefined;
}

function assetAnchors(asset: UnknownRecord | undefined): Record<string, [number, number]> {
  const anchors = asRecord(asset?.anchors) ?? asRecord(asset?.sockets);
  return Object.fromEntries(
    Object.entries(anchors ?? {}).flatMap(([name, point]) => {
      const value = pointOf(point);
      return value ? [[name, value]] : [];
    }),
  );
}

function assetVisual(asset: UnknownRecord | undefined) {
  const visual = asRecord(asset?.visual) ?? asset;
  return {
    ...(typeof visual?.src === "string" ? {src: visual.src} : {}),
    ...(typeof visual?.width === "number" ? {width: visual.width} : {}),
    ...(typeof visual?.height === "number" ? {height: visual.height} : {}),
    ...(Array.isArray(visual?.size) ? {size: visual.size as [number, number]} : {}),
  };
}

function compiledPlacements(compiled: PerformanceManifest, assets: UnknownRecord): Record<string, PerformancePlacementValue> {
  const placements: Record<string, PerformancePlacementValue> = {};
  for (const scene of compiled.sceneTrack ?? []) {
    const layout = resolvedAsset(assets, "layouts", scene.layout);
    const marks = asRecord(layout?.marks);
    for (const [name, value] of Object.entries(marks ?? {})) {
      const point = pointOf(value);
      if (point) placements[name] = point;
      else if (asRecord(value)) placements[name] = value as PerformancePlacement;
    }
    for (const [id, actor] of Object.entries(scene.staging?.actors ?? {})) {
      placements[id] = {at: [actor.at[0], actor.at[1]], scale: actor.scale, flip: actor.flip};
    }
    for (const [id, object] of Object.entries(scene.staging?.objects ?? {})) {
      placements[id] = {at: [object.at[0], object.at[1]], scale: object.scale};
    }
  }
  return placements;
}

function compiledStateTracks(compiled: PerformanceManifest, actorId: string, fps: number): {
  placements: PerformancePlacementKey[];
  expressions: PerformanceExpressionKey[];
  presents: PerformancePresenceKey[];
  poses: PerformanceStateKey[];
} {
  const placements: PerformancePlacementKey[] = [];
  const expressions: PerformanceExpressionKey[] = [];
  const presents: PerformancePresenceKey[] = [];
  const poses: PerformanceStateKey[] = [];
  for (const scene of compiled.sceneTrack ?? []) {
    const state = scene.initial?.actors?.[actorId];
    if (!state) continue;
    const frame = Math.round(scene.start * fps);
    const staged = scene.staging?.actors?.[actorId];
    if (staged) placements.push({frame, placement: {at: [staged.at[0], staged.at[1]], scale: staged.scale, flip: staged.flip}});
    else if (state.placement !== undefined) placements.push({frame, placement: state.placement as PerformancePlacement | SemanticPlacement | string});
    presents.push({frame, present: state.present});
    poses.push({frame, value: state.pose});
    if (state.face) expressions.push({frame, expression: state.face});
  }
  return {placements, expressions, presents, poses};
}

function projectCompiledActors(compiled: PerformanceManifest, assets: UnknownRecord, fps: number): PerformanceActor[] {
  const actorAssets = asRecord(assets.actors);
  return Object.keys(actorAssets ?? {}).map((id) => {
    const asset = resolvedAssetForInstance(assets, "actors", id);
    const stateTracks = compiledStateTracks(compiled, id, fps);
    const expressions = [...stateTracks.expressions];
    const tracks: PerformanceGenericTrack[] = [];
    for (const event of compiled.performanceTracks?.find((track) => track.subject === id)?.events ?? []) {
      if (event.kind !== "call") continue;
      const start = Math.round(event.start * fps);
      const performance = asRecord(event.performance);
      for (const track of (event.tracks ?? []) as Array<{kind?: string; target?: string; events?: UnknownRecord[]}>) {
        if (!track.kind || !Array.isArray(track.events)) continue;
        tracks.push({
          kind: track.kind as PerformanceGenericTrack["kind"],
          ...(track.target ? {target: track.target} : {}),
          events: track.events.map((item) => ({...item, frame: start + Math.round(numberOr(item.at as number | undefined, 0) * fps), durationFrames: Math.max(1, Math.round(numberOr(item.duration as number | undefined, event.end - event.start) * fps))})),
        });
        if (track.kind === "expression") {
          for (const item of track.events) expressions.push({frame: start + Math.round(numberOr(item.at as number | undefined, 0) * fps), expression: (item.value ?? item) as PerformanceExpression});
        }
      }
    }
    const visual = assetVisual(asset);
    return {
      id,
      placement: stateTracks.placements[0]?.placement,
      anchors: assetAnchors(asset),
      ...(stateTracks.placements.length ? {placementTrack: stateTracks.placements} : {}),
      ...(expressions.length ? {expressionTrack: expressions} : {}),
      ...(tracks.length ? {tracks} : {}),
      presentTrack: stateTracks.presents,
      poseTrack: stateTracks.poses,
      ...(visual.src ? {src: visual.src} : {}),
      ...(visual.width ? {width: visual.width} : {}),
      ...(visual.height ? {height: visual.height} : {}),
    };
  });
}

function projectCompiledProps(compiled: PerformanceManifest, assets: UnknownRecord): PerformanceProp[] {
  const objectAssets = asRecord(assets.objects);
  return Object.keys(objectAssets ?? {}).map((id) => {
    const asset = resolvedAssetForInstance(assets, "objects", id);
    const visual = assetVisual(asset);
    const initial = compiled.sceneTrack?.find((scene) => scene.initial?.props?.[id])?.initial.props[id];
    const placement = initial?.placement;
    return {
      id,
      ...(placement === undefined ? {} : {placement: placement as PerformancePlacement | SemanticPlacement | string}),
      ...(visual.size ? {size: visual.size} : {}),
      ...(visual.src ? {src: visual.src} : {}),
      ...(visual.width ? {width: visual.width} : {}),
      ...(visual.height ? {height: visual.height} : {}),
    } satisfies PerformanceProp;
  });
}

function projectCompiledPerformance(compiled: PerformanceManifest, fps: number): Partial<PerformanceManifest> {
  const assets = asRecord(compiled.assets) ?? {};
  const subtitles: PerformanceSubtitle[] = [];
  const genericTracks: PerformanceGenericTrack[] = [];
  const camera: PerformanceCameraKey[] = [];
  let speechId = 0;
  for (const track of compiled.performanceTracks ?? []) {
    for (const event of track.events) {
      const startFrame = Math.round(event.start * fps);
      const endFrame = Math.round(event.end * fps);
      if (event.kind === "speech") {
        subtitles.push({id: `speech-${speechId++}`, startFrame, endFrame, text: event.text});
        continue;
      }
      const performance = asRecord(event.performance);
      for (const recipeTrack of (event.tracks ?? []) as Array<{kind?: string; target?: string; events?: UnknownRecord[]}>) {
        if (!recipeTrack.kind || !Array.isArray(recipeTrack.events)) continue;
        genericTracks.push({
          kind: recipeTrack.kind as PerformanceGenericTrack["kind"],
          subject: track.subject,
          ...(recipeTrack.target ? {target: recipeTrack.target} : {}),
          events: recipeTrack.events.map((item) => ({...item, frame: startFrame + Math.round(numberOr(item.at as number | undefined, 0) * fps), durationFrames: Math.max(1, Math.round(numberOr(item.duration as number | undefined, event.end - event.start) * fps))})),
        });
      }
      if (!event.tracks?.length && performance) {
        const kind = track.kind === "actor" ? "lifecycle" : track.subject === "camera" ? "camera" : track.subject === "vfx" ? "vfx" : "sfx";
        genericTracks.push({kind, subject: track.subject, events: [{frame: startFrame, endFrame, value: performance}]});
      }
      if (track.subject === "camera" && performance?.camera) {
        const value = asRecord(performance.camera);
        if (value) camera.push({frame: startFrame, ...value as PerformanceCameraKey});
      }
    }
  }
  const constraints = (compiled.bindingConstraints ?? []).map((binding) => ({
    object: binding.object,
    prop: binding.object,
    holder: binding.holder,
    actor: binding.holder,
    hand: "hand_r",
    startFrame: Math.round((binding.start ?? 0) * fps),
    endFrame: Math.round((binding.end ?? compiled.totalDuration ?? 0) * fps),
    sceneId: binding.sceneId,
    continuous: binding.continuous,
  }));
  const actors = projectCompiledActors(compiled, assets, fps);
  for (const scene of compiled.sceneTrack ?? []) {
    const staged = scene.staging?.camera;
    if (!staged) continue;
    camera.push({frame: Math.round(scene.start * fps), x: staged.center[0] - (compiled.video?.width ?? 1920) / 2, y: staged.center[1] - (compiled.video?.height ?? 1080) / 2, z: staged.zoom});
  }
  return {
    timebase: "frames",
    placements: compiledPlacements(compiled, assets),
    actors,
    props: projectCompiledProps(compiled, assets),
    subtitles,
    camera,
    tracks: genericTracks,
    constraints,
    durationInFrames: Math.round((compiled.totalDuration ?? 0) * fps),
  };
}

/** Normalize alternate compiled time fields once at the composition boundary. */
export function normalizePerformanceManifest(manifest: PerformanceManifest): PerformanceManifest {
  const video = manifest.video ?? {width: 1920, height: 1080, fps: 24};
  const fps = video.fps;
  const projected = isCompiledEpisode(manifest) ? projectCompiledPerformance(manifest, fps) : {};
  const source = {...manifest, ...projected, video, timebase: projected.timebase ?? manifest.timebase};
  const toFrames = (value: number | undefined): number | undefined =>
    value === undefined ? undefined : source.timebase === "seconds" ? Math.round(value * fps) : value;
  const cameraValue = source.camera ?? source.cameraTrack;
  const camera = Array.isArray(cameraValue) ? cameraValue : cameraValue?.keys;
  return {
    ...source,
    video,
    durationInFrames: source.durationInFrames ?? toFrames(source.duration ?? source.total),
    actors: (source.actors ?? []).map((actor) => ({
      ...actor,
      tracks: actor.tracks,
      expressionTrack: (actor.expressionTrack ?? actor.expressions)?.map((key) => ({ ...key, frame: frameOf(key) })),
      gestureTrack: (actor.gestureTrack ?? actor.gestures)?.map((key) => ({ ...key, frame: frameOf(key) })),
      presentTrack: actor.presentTrack?.map((key) => ({...key, frame: frameOf(key)})),
      poseTrack: actor.poseTrack?.map((key) => ({...key, frame: frameOf(key)})),
      placementTrack: actor.placementTrack?.map((key) => ({...key, frame: frameOf(key)})),
    })),
    camera: camera?.map((key) => ({ ...key, frame: frameOf(key) })),
    props: (source.props ?? source.objects)?.map((prop) => ({
      ...prop,
      positionTrack: prop.positionTrack?.map((key) => ({ ...key, frame: frameOf(key) })),
    })),
    subtitles: (source.subtitles ?? source.subtitleTrack ?? source.captions)?.map((cue) => ({
      ...cue,
      startFrame: cue.startFrame ?? toFrames(cue.start),
      endFrame: cue.endFrame ?? toFrames(cue.end),
    })),
    vfx: (source.vfx ?? source.effects)?.map((effect) => ({
      ...effect,
      startFrame: effect.startFrame ?? toFrames(effect.start ?? effect.at),
      endFrame: effect.endFrame ?? toFrames(effect.end),
    })),
  };
}

export function gestureProgress(key: PerformanceGestureKey, frame: number): number {
  const start = frameOf(key);
  const end = gestureEnd(key, start);
  return end <= start ? 1 : clamp01((frame - start) / (end - start));
}
