import type {EvaluatedActor,PerformanceManifest} from "./types";

/** Native grip plane: object between body and gripping fingers, including
 * release recovery. Legacy-only episodes keep their exact existing layers. */
export function nativeInteractionObjectIds(manifest:PerformanceManifest,actors:readonly EvaluatedActor[]):Set<string> {
  const native=new Set(actors.filter(a=>a.artwork).map(a=>a.id));
  const objects=new Set<string>();
  for(const constraint of [...(manifest.bindingConstraints??[]),...(manifest.constraints??[])]) {
    const holder=constraint.holder??constraint.actorId??constraint.actor;
    const object=constraint.object??constraint.prop;
    if(holder&&object&&native.has(holder))objects.add(object);
  }
  for(const scene of manifest.sceneTrack??[]) {
    for(const id of native) {
      for(const frame of scene.motor?.actors[id]??[]){if(frame.holds)objects.add(frame.holds);if(frame.holdsL)objects.add(frame.holdsL);}
    }
  }
  for(const actor of actors){if(actor.artwork&&actor.holds)objects.add(actor.holds);if(actor.artwork&&actor.holdsL)objects.add(actor.holdsL);}
  return objects;
}
