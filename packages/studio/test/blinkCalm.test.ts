import {test} from 'node:test';
import assert from 'node:assert/strict';
import {artworkFixture} from '../../core/test/helpers/figureArtwork';
import {evaluatePerformance} from '../src/performance/evaluate';
import {solveActorFigure} from '../src/components/performance/Actor';
import {designHandToWorld} from '../src/components/performance/reach';
import type {PerformanceManifest, PerformanceGenericTrack} from '../src/performance/types';

const calm: PerformanceGenericTrack = {kind:'expression',events:[{frame:0,durationFrames:8,name:'calm',intensity:.35}]};
const blink: PerformanceGenericTrack = {kind:'expression',events:[{frame:0,durationFrames:12,transient:true,eyeOpen:0}]};
async function manifest(tracks:PerformanceGenericTrack[]) {
  const artwork=await artworkFixture();
  return {video:{width:1280,height:720,fps:24},durationInFrames:24,actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.6},expression:{name:'proud',eyeOpen:1,smile:.7},tracks}]} as PerformanceManifest;
}
test('emotion.calm never claims arms or changes rendered FK, alone or overlapping authored write',async()=>{
  for(const parts of [[],['arm_u_r','arm_l_r','hand_r'],['arm_u_l','arm_l_l','hand_l','arm_u_r','arm_l_r','hand_r']]) {
    const bone:PerformanceGenericTrack={kind:'bone',events:[{frame:0,durationFrames:17,action:'write with the hand',parts}]};
    const reference=await manifest(parts.length?[bone]:[]);
    const subject=await manifest(parts.length?[bone,calm]:[calm]);
    for(let frame=0;frame<=19;frame++) {
      const a=evaluatePerformance(subject,frame).actors[0]!;
      const b=evaluatePerformance(reference,frame).actors[0]!;
      const fa=solveActorFigure(a),fb=solveActorFigure(b);
      assert.deepEqual(fa.pose.armLeft,fb.pose.armLeft,`left ${parts.length}/${frame}`);
      assert.deepEqual(fa.pose.armRight,fb.pose.armRight,`right ${parts.length}/${frame}`);
      for(const joint of ['hand_l','hand_r']) assert.deepEqual(designHandToWorld(a,fa.solved!.joints[joint]!,fa.space,fa.flipped),designHandToWorld(b,fb.solved!.joints[joint]!,fb.space,fb.flipped),`${joint}/${frame}`);
    }
  }
});
test('action.blink closes and recovers renderer eyes without replacing identity or speech',async()=>{
  const speech:PerformanceGenericTrack={kind:'speech',events:[{frame:0,endFrame:24,text:'hello',mouth:[{start:0,end:1,viseme:'A'}]}]};
  const subject=await manifest([blink,speech]),reference=await manifest([speech]);
  const eyes:number[]=[];
  for(let frame=0;frame<=13;frame++) {
    const a=evaluatePerformance(subject,frame).actors[0]!, b=evaluatePerformance(reference,frame).actors[0]!;
    const pose=solveActorFigure(a).pose,base=solveActorFigure(b).pose;
    assert.equal(a.expression.name,'proud');
    assert.equal(pose.mouthOpen,base.mouthOpen);assert.equal(pose.speechOpen,base.speechOpen);
    assert.equal(pose.smile,base.smile);
    eyes.push(pose.eyeOpen);
  }
  assert.equal(eyes[0],1); assert.ok(eyes[3]!<.6&&eyes[3]!>=.2);
  assert.ok(eyes[6]!<.2);assert.ok(eyes[9]!<.6&&eyes[9]!>=.2);
  assert.equal(eyes[12],1);assert.equal(eyes[13],1);
});
