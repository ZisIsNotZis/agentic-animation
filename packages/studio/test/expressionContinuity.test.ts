import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {nativeDraftArtworkFixture} from '../../core/test/helpers/figureArtwork';
import {evaluatePerformance} from '../src/performance/evaluate';
import {detectPropDiscontinuities} from '../src/performance/teleports';
import {deriveActorPose} from '../../core/src/motor/actorPose';
import type {PerformanceManifest} from '../src/performance/types';
export async function nativeActingFixture(orientation='front'):Promise<PerformanceManifest> {
 const original=JSON.parse(await readFile('packages/core/test/helpers/nativeActingTracks.json','utf8'));
 const artwork=await nativeDraftArtworkFixture();
 return {video:{width:1280,height:720,fps:24},durationInFrames:original.durationInFrames,
 actors:[{id:'lin',...original,artwork,skeleton:artwork.views.front.skeleton,
 tracks:[...original.tracks,{kind:'bone',events:[{frame:0,durationFrames:1,value:{orientation}}]}]}]} as PerformanceManifest;
}
test('original full native acting retains all-frame joint and segment continuity in eight orientations',async()=>{
 for(const orientation of ['front','front-left','left','back-left','back','back-right','right','front-right']) {
  const manifest=await nativeActingFixture(orientation);
  assert.equal(evaluatePerformance(manifest,50).actors[0]!.orientation,orientation);
  assert.deepEqual(detectPropDiscontinuities(manifest),[],orientation);
 }
});
test('facial prose and phase labels cannot claim arm/body actions while deliberate claims remain',async()=>{
 const m=await nativeActingFixture();const a=evaluatePerformance(m,0).actors[0]!;
 for(const [action,phase,parts] of [
 ['eyes and mouth spring wide','open',['head','torso','hand_l','hand_r']],
 ['stop the body on the discovery','impact',['head','torso','hand_l','hand_r']],
 ['raise one brow','claim',['head','arm_u_l']],
 ['lift cheeks and brows','lift',['head','torso','hand_l','hand_r']],
 ['drop gaze','hide',['head','hand_l']],
 ['drop the held breath','release',['torso','head']],
 ['remain safely present','rest',['torso','head']],
 ] as const) {
 const pose=deriveActorPose({...a,tracks:[{kind:'bone',events:[{active:true,progress:.5,frame:0,endFrame:12,value:{action,phase,parts}}]}]});
 assert.equal(pose.armLeft.upper,0,action);assert.equal(pose.armRight.upper,0,action);
 assert.ok(pose.torsoY<5,action);
 }
 for(const parts of [['arm_u_r'],['arm_u_l','arm_u_r']]) {
 const pose=deriveActorPose({...a,tracks:[{kind:'bone',events:[{active:true,progress:.5,frame:0,endFrame:24,value:{action:'raise arms',parts}}]}]});
 assert.ok(pose.armRight.upper< -50);assert.equal(pose.armLeft.upper>50,parts.length===2);
 }
});
test('native deliberate arm and crouch recipes have complete onset peak recovery and adjacent terminal continuity',async()=>{
 const m=await nativeActingFixture();const original=evaluatePerformance(m,0).actors[0]!;
 for(const [action,parts] of [['raise arms',['arm_u_r']],['crouch body',['torso','head']]] as const) {
 const poses=[];
 for(let frame=0;frame<=48;frame++) {
  const tracks=[{kind:'bone',events:[0,24].map(start=>({frame:start,endFrame:start+24,
   active:frame>=start&&frame<start+24,progress:(frame-start)/24,value:{action,parts}}))}];
  poses.push(deriveActorPose({...original,tracks}));
 }
 for(const frame of [0,24,48]) {assert.equal(Math.abs(poses[frame]!.armRight.upper),0);assert.equal(poses[frame]!.torsoY,0);}
 if(action==='raise arms') {assert.ok(poses[12]!.armRight.upper< -100);assert.equal(poses[12]!.armLeft.upper,0);}
 else assert.ok(poses[12]!.torsoY>20);
 }
});
test('exact operational recipe phases preserve shiver write sip present, never facial aliases or unowned arms',async()=>{
 const m=await nativeActingFixture(),a=evaluatePerformance(m,0).actors[0]!;
 for(const [phase,action] of [['shiver','rattle the torso in two quick pulses'],['write','move the wrist through legible strokes'],['sip','tilt it to the mouth and drink'],['offer','hold the display for the audience']]) {
  const pose=deriveActorPose({...a,tracks:[{kind:'bone',events:[{active:true,progress:.4,frame:0,endFrame:36,value:{phase,action,parts:['torso','head','arm_u_r','arm_l_r','hand_r']}}]}]});
  assert.ok(Math.abs(pose.armRight.upper)>0,phase);assert.equal(pose.armLeft.upper,0,phase+' ownership');
 }
 for(const phase of ['write','shiver','impact','open','claim']) {
  const event={active:true,progress:.4,frame:0,endFrame:36,value:{phase,action:'raise one brow',parts:['head','arm_u_l']}};
  for(const kind of ['expression','bone']) {const pose=deriveActorPose({...a,tracks:[{kind,events:[event]}]});assert.equal(pose.armLeft.upper,0,phase+'/'+kind);assert.equal(pose.armRight.upper,0,phase+'/'+kind);}
 }
});
test('facial predicate objects cannot borrow arm ownership or operational phases',async()=>{
 const m=await nativeActingFixture(),a=evaluatePerformance(m,0).actors[0]!;
 const pose=(action:string,phase='write',kind='bone')=>deriveActorPose({...a,tracks:[{kind,events:[{active:true,progress:.4,frame:0,endFrame:36,value:{action,phase,parts:['head','torso','arm_u_r','arm_l_r','hand_r']}}]}]});
 for(const action of ['open the mouth','lift the chin','raise one eyebrow','press lips together','part the lips','tighten the jaw','close eyelids','purse lips','lower the chin','tremble the lips','show the teeth','raise eyebrows and open the mouth','mouth opens','lips press together','action.write','rewrite','blueprint','action:press','write_mouth','raise the eyebrow with the right arm relaxed','press lips with arms resting']) {
  const p=pose(action,/^(?:action[.:]|rewrite|blueprint|write_mouth)/.test(action)?'claim':'write');
  assert.equal(p.armRight.upper,0,action);assert.equal(p.armLeft.upper,0,action);
 }
 for(const action of ['press the button and purse lips','raise the right hand and lift the chin','lift the chin and raise the right arm','hand touches the cheek','touch the cheek with the hand','sip from the cup and close the eyes']) {
  assert.ok(Math.abs(pose(action).armRight.upper)>0,action);
  assert.equal(pose(action,'write','expression').armRight.upper,0,action+' expression');
 }
});
test('actual authored operational library recipes retain owned gesture onset and recovery',async()=>{
 const m=await nativeActingFixture(),a=evaluatePerformance(m,0).actors[0]!;
 for(const name of ['write','shiver','sip','present']) {
  const source=await readFile(`library/action/${name}/index.js`,'utf8');
  const events:Array<{phase:string}> = [];
  const recipe = new Function('track',source.replace(/^import .*;$/m,'').replace(/export default .*;/,'').replace('export function','function')+`; return ${name};`)((_world:unknown,kind:string,_target:unknown,items:Array<{phase:string}>)=>{if(kind==='bone')events.push(...items);});
  recipe({id:'lin'},{id:'prop'}).run({}).next();
  const event=events.find((e:{phase:string})=>e.phase===({present:'offer'}[name]??name));
  for(const progress of [0,.4,1]) {
   const p=deriveActorPose({...a,tracks:[{kind:'bone',events:[{active:true,progress,frame:0,endFrame:36,value:event}]}]});
   const arm=name==='present'?p.armLeft:p.armRight;
   assert.equal(Math.abs(arm.upper)>0,progress===.4,name+'/'+progress);
  }
 }
});
test('later facial declarations cannot erase an active genuine arm claim',async()=>{
 const m=await nativeActingFixture(),a=evaluatePerformance(m,0).actors[0]!;
 const body={active:true,progress:.4,frame:0,endFrame:36,value:{action:'write with the hand',parts:['arm_u_r','arm_l_r','hand_r']}};
 const alone=deriveActorPose({...a,tracks:[{kind:'bone',events:[body]}]});
 for(const action of ['press lips together','open mouth','raise one eyebrow']) {
  const face={active:true,progress:.4,frame:6,endFrame:42,value:{action,phase:'write',parts:['head','arm_u_r','arm_l_r','hand_r']}};
  const mixed=deriveActorPose({...a,tracks:[{kind:'bone',events:[body,face]}]});
  assert.deepEqual(mixed.armRight,alone.armRight,action+' preserves earlier write at overlap progress .4');
 }
 const successor={active:true,progress:.6,frame:6,endFrame:42,value:{action:'point with the hand',parts:['arm_u_r','arm_l_r','hand_r']}};
 const mixed=deriveActorPose({...a,tracks:[{kind:'bone',events:[body,successor]}]});
 const next=deriveActorPose({...a,tracks:[{kind:'bone',events:[successor]}]});
 assert.deepEqual(mixed.armRight,next.armRight,'genuine successor still owns chain');
});
