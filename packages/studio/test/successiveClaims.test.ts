import {test} from 'node:test';
import assert from 'node:assert/strict';
import {artworkFixture, nativeDraftArtworkFixture} from '../../core/test/helpers/figureArtwork';
import {evaluatePerformance} from '../src/performance/evaluate';
import {solveActorFigure, deriveActorPose} from '../../core/src/motor/actorPose';
import {designHandToWorld} from '../../core/src/motor/reach';
import type {PerformanceManifest, PerformanceGenericTrack} from '../src/performance/types';
const right=['arm_u_r','arm_l_r','hand_r'];
const left=['arm_u_l','arm_l_l','hand_l'];
async function fixture(first:string[],second:string[]) {
 const artwork=await artworkFixture();
 const bone:PerformanceGenericTrack={kind:'bone',events:[
  {frame:13,durationFrames:17,value:{action:'point',parts:first}},
  {frame:26,durationFrames:17,value:{action:'point',parts:second}}]};
 return {video:{width:1280,height:720,fps:24},durationInFrames:53,actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[1050,650],scale:.6},expression:{name:'calm'},tracks:[bone]}]} as PerformanceManifest;
}
test('successive authored one/two-hand claims retain takeover pose and all-frame FK continuity',async()=>{
 for(const [first,second] of [[right,[...left,...right]],[[...left,...right],right]]) {
  const m=await fixture(first!,second!);let previous:Record<string,number[]>|undefined;
  for(let frame=0;frame<53;frame++) {
   const a=evaluatePerformance(m,frame).actors[0]!;const fig=solveActorFigure(a);
   const hands=Object.fromEntries(['hand_l','hand_r'].map(j=>[j,designHandToWorld(a,fig.solved!.joints[j]!,fig.space,fig.flipped)]));
   if(previous)for(const j of ['hand_l','hand_r'])assert.ok(Math.hypot(hands[j]![0]!-previous[j]![0]!,hands[j]![1]!-previous[j]![1]!)<=24,`${first!.length}->${second!.length}/${frame}/${j}`);
   if(frame===26) {
    const old=structuredClone(a);old.tracks[0]!.events=old.tracks[0]!.events.slice(0,1);
    assert.deepEqual(deriveActorPose(a).armRight,deriveActorPose(old).armRight,'exact current authored pose at takeover');
   }
   if(frame>=43)assert.equal(fig.pose.armRight.upper,0,'natural recovery');
   previous=hands;
  }
 }
});
test('native draft successive claims crossfade at full-size renderer geometry across duplicated bone tracks',async()=>{
 for(const [first,second] of [[right,[...left,...right]],[[...left,...right],right]]) {
  const m=await fixture(first!,second!);
  const artwork=await nativeDraftArtworkFixture();
  const actor=m.actors[0]!;
  actor.artwork=artwork;actor.skeleton=artwork.views.front.skeleton;
  actor.placement={at:[1050,650],scale:.92};
  const events=(actor.tracks[0] as PerformanceGenericTrack).events;
  actor.tracks=events.flatMap(event=>[
   {kind:'bone',events:[event]},
   {kind:'bone',events:[structuredClone(event)]},
  ]) as PerformanceGenericTrack[];
  let previous:Record<string,number[]>|undefined;
  for(let frame=0;frame<53;frame++) {
   const a=evaluatePerformance(m,frame).actors[0]!,fig=solveActorFigure(a);
   const hands=Object.fromEntries(['hand_l','hand_r'].map(j=>[j,designHandToWorld(a,fig.solved!.joints[j]!,fig.space,fig.flipped)]));
   if(previous)for(const j of ['hand_l','hand_r'])assert.ok(Math.hypot(hands[j]![0]!-previous[j]![0]!,hands[j]![1]!-previous[j]![1]!)<=24,`native ${first!.length}->${second!.length}/${frame}/${j}`);
   if(frame===26) {
    const old=structuredClone(a);old.tracks=old.tracks.filter(track=>track.events[0]?.frame===13);
    assert.deepEqual(deriveActorPose(a).armRight,deriveActorPose(old).armRight);
   }
   if(frame>=43)assert.equal(fig.pose.armRight.upper,0);
   previous=hands;
  }
 }
});
test('successive disjoint authored claims do not erase the other arm',async()=>{
 const m=await fixture(right,left);
 for(let frame=26;frame<30;frame++) {
  const a=evaluatePerformance(m,frame).actors[0]!,old=structuredClone(a);old.tracks[0]!.events=old.tracks[0]!.events.slice(0,1);
  assert.deepEqual(deriveActorPose(a).armRight,deriveActorPose(old).armRight);
 }
});
