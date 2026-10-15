import React from "react";
import {figureViewForOrientation, FIGURE_MOUTHS, type FigureArtwork} from "@anim/core/figure-artwork";
import type {EvaluatedActor} from "../../performance/types";
import type {ActorPose, FaceFamily} from "./Actor";

const markupCache = new Map<string,string>();
/** Keep resource-local defs local when the same immutable figure is reused. */
export function figureSvgMarkup(svg: string, prefix: string): string {
  const key = prefix + '\0' + svg;
  const cached = markupCache.get(key);
  if (cached !== undefined) return cached;
  const inner = svg.match(/^<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/)?.[1];
  if (inner === undefined) throw new Error("figure layer is not a validated SVG");
  const value = inner
    .replace(/\sid=(["'])([^"']+)\1/g, (_match,quote:string,id:string) => ` id=${quote}${prefix}-${id}${quote}`)
    .replace(/url\(\s*(["']?)#([^\s)'";]+)\1\s*\)/g, (_match,_quote:string,id:string) => `url(#${prefix}-${id})`);
  if (markupCache.size > 1024) markupCache.clear();
  markupCache.set(key,value);
  return value;
}

/** Rhubarb cues are seconds in the actual take, not fixed 18-frame flaps. */
export function nativeFigureViseme(actor: EvaluatedActor, pose: ActorPose): string | undefined {
  for (const track of actor.tracks) {
    if (track.kind !== "speech") continue;
    for (const event of track.events) {
      if (!event.active) continue;
      const value = (event.value && typeof event.value === "object" ? event.value : event) as Record<string,unknown>;
      const cues = value.mouth;
      if (!Array.isArray(cues) || !cues.length) continue;
      const start = Number(event.frame ?? event.startFrame ?? event.at ?? 0);
      const end = Number(event.endFrame ?? (start + Number(event.durationFrames ?? 0)));
      const seconds = event.progress * Math.max(0,end-start) / (actor.fps ?? 24);
      const cue = cues.find((c) => seconds >= c.start && seconds < c.end);
      const key = cue?.viseme ?? "X";
      if (!FIGURE_MOUTHS.includes(key)) throw new Error(`actor ${actor.id}: unsupported viseme ${key}`);
      return key;
    }
  }
  return pose.speechActive ? pose.speechOpen ? "D" : "A" : undefined;
}

export const ArtFigure: React.FC<{
  actor: EvaluatedActor;
  artwork: FigureArtwork;
  pose: ActorPose;
  family: FaceFamily;
  waistPitch: number;
  flipped: boolean;
  debugDiv?: boolean;
  handsOnly?: boolean;
}> = ({actor,artwork,pose,family,waistPitch,flipped,debugDiv,handsOnly}) => {
  const name = figureViewForOrientation(actor.orientation);
  const view = artwork.views[name];
  const sk = view.skeleton;
  const {width,height} = sk.space;
  const j = sk.joints;
  const prefix = 'af-' + [...actor.id].map((c)=>c.codePointAt(0)!.toString(16)).join('_') + (handsOnly?'-fg':'');
  const render = (svg: string, key: string) => <g key={key} data-art-part={key} dangerouslySetInnerHTML={{__html:figureSvgMarkup(svg,`${prefix}-${key}`)}}/>;
  const part = (key: keyof typeof view.parts) => render(view.parts[key],key);
  const rotate = (angle:number, point:readonly number[]) => `rotate(${angle} ${point[0]} ${point[1]})`;
  const arm = (side:'l'|'r') => {
    const a = side==='l' ? pose.armLeft : pose.armRight;
    return <g key={side} data-art-chain={`arm_${side}`} transform={rotate(a.upper,j[`shoulder_${side}`]!)}>
      {handsOnly?null:part(`arm_u_${side}`)}
      <g transform={rotate(a.lower,j[`elbow_${side}`]!)}>
        {handsOnly?null:part(`arm_l_${side}`)}
        {render(view.hands[side][a.hand],`hand_${side}`)}
      </g>
    </g>;
  };
  const leg = (side:'l'|'r') => {
    const a = side==='l' ? pose.legLeft : pose.legRight;
    return <g key={side} data-art-chain={`leg_${side}`} transform={`translate(0 ${pose.torsoY}) ${rotate(a.upper,j[`hip_${side}`]!)}`}>
      {part(`leg_u_${side}`)}
      <g transform={rotate(a.lower,j[`knee_${side}`]!)}>{part(`leg_l_${side}`)}<g transform={actor.motor?rotate(-a.upper-a.lower,j[`foot_${side}`]!):undefined}>{part(`foot_${side}`)}</g></g>
    </g>;
  };
  const W = j.waist!;
  const eyeState = pose.eyeOpen < .2 ? 'closed' : pose.eyeOpen < .6 ? 'half' : 'open';
  const viseme = nativeFigureViseme(actor,pose);
  const mouthFamily = family==='calm' ? pose.smile < -.15 ? 'somber' : pose.smile > .25 ? 'excited' : family : family;
  const mouth = viseme ? view.mouths[viseme as keyof typeof view.mouths] : view.emotionMouths[mouthFamily];
  const gazeX = Math.max(-2.5,Math.min(2.5,pose.gaze[0]/8));
  const gazeY = Math.max(-1.5,Math.min(1.5,pose.gaze[1]/10));
  const browY = -pose.browLift*.12;
  const browAngle = Math.max(0,-pose.browLift)*.7;
  const css = `.${prefix}-eyes [data-gaze-pupil]{transform:translate(${gazeX}px,${gazeY}px)}\n` +
    `.${prefix}-expression [data-face-role="brow"]{transform-box:fill-box;transform-origin:center;transform:translateY(${browY}px)}` +
    `.${prefix}-expression [data-brow-index="0"]{transform:translateY(${browY}px) rotate(${browAngle}deg)}` +
    `.${prefix}-expression [data-brow-index="1"]{transform:translateY(${browY}px) rotate(${-browAngle}deg)}` +
    (eyeState === 'open' ? '' : `.${prefix}-expression [data-face-role="eye"]{display:none}.${prefix}-blink [data-face-role="brow"]{display:none}`);
  return <div
    data-actor-id={handsOnly?undefined:actor.id} data-contact-actor-id={handsOnly?actor.id:undefined} data-expression={actor.expression.name} data-face-family={family}
    data-figure-artwork={handsOnly?undefined:'svg-bone-parts'} data-native-figure-view={name}
    data-speech-active={pose.speechActive} data-speech-open={viseme !== undefined && !['A','B','G','X'].includes(viseme)}
    data-native-viseme={viseme} data-track-count={actor.tracks.length} data-slam-peak={pose.slamPeak}
    style={{position:'absolute',left:actor.x-width/2,top:actor.y-height,width,height,
      transformOrigin:`${width/2}px ${height}px`,transform:`scale(${actor.scale*(flipped?-1:1)}, ${actor.scale}) rotate(${actor.rotation}deg)`,
      zIndex:actor.z,overflow:'visible',background:debugDiv?'rgba(255,0,0,.07)':undefined}}
  >
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{overflow:'visible'}} aria-label={`actor ${actor.id}`}>
      <style>{css}</style>
      {handsOnly?null:<>{leg('l')}{leg('r')}</>}
      <g data-art-chain="torso" transform={`translate(0 ${pose.torsoY}) ${rotate(waistPitch,W)} translate(${W[0]} ${W[1]}) scale(1 ${pose.torsoScaleY}) translate(${-W[0]} ${-W[1]})`}>
        {handsOnly?arm('r'):<>
          {view.rearArms.includes('l')?arm('l'):null}{view.rearArms.includes('r')?arm('r'):null}
          {part('torso')}{view.rearArms.includes('l')?null:arm('l')}{view.rearArms.includes('r')?null:arm('r')}
        </>}
        {handsOnly?null:<g data-art-chain="head" transform={`translate(0 ${pose.headY}) ${rotate(pose.headTilt,j.neck!)}`}>
          {part('head')}
          <g className={`${prefix}-eyes`}>
            <g className={`${prefix}-expression`}>{render(view.expressions[family],'expression')}</g>
            {eyeState==='open'?null:<g className={`${prefix}-blink`}>{render(view.eyes[eyeState],'blink')}</g>}
          </g>
          {render(mouth,'mouth')}
          {/cry|sob|weep|tear/i.test(actor.expression.name)?render(view.tears,'tears'):null}
        </g>}
      </g>
    </svg>
  </div>;
};
