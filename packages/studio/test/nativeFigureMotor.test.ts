import {test} from "node:test";
import assert from "node:assert/strict";
import {artworkFixture} from "../../core/test/helpers/figureArtwork";
import {simulateScene,bakeSceneMotor} from "../../core/src/motor";
import {FIGURE_VIEWS,figureViewForOrientation,type FigureView} from "../../core/src/schemas/figureArtwork";
import type {Skeleton} from "../../core/src/schemas/libraryMeta";
import {evaluatePerformance} from "../src/performance/evaluate";
import {deriveActorPose,solveActorFigure} from "../src/components/performance/Actor";
import {designHandToWorld} from "../src/components/performance/reach";
import type {PerformanceManifest} from "../src/performance/types";

const orientations=['front','front-right','right','back-right','back','back-left','left','front-left'];

test('native motor palm targets remain reachable by the actual rendered FK in every view',async () => {
  const artwork=await artworkFixture();
  const side=artwork.views.side.skeleton;
  side.joints.shoulder_r=[200,286];side.joints.elbow_r=[220,408];side.joints.hand_r=[220,512];
  side.arm.upper=Math.hypot(20,122);side.arm.fore=104;
  const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map((view)=>[view,artwork.views[view].skeleton])) as Record<FigureView,Skeleton>;
  const base=evaluatePerformance({video:{width:1280,height:720,fps:24},durationInFrames:48,actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.6}}]} as PerformanceManifest,0).actors[0]!;
  for (const orientation of orientations) {
    const dir=orientation==='left'||orientation.endsWith('-left')?-1:1;
    const movie=simulateScene({durationSec:2,actors:[{id:'hero',x:500,groundY:650,facing:dir,scale:.6,skeleton:artwork.views.front.skeleton,skeletonViews,orientations:[{at:0,orientation}],intents:[{at:0,duration:1,intent:'grab',target:'cup'}]}],props:[{id:'cup',x:500+dir*80,y:540,size:[30,40],intents:[]}],groundY:650,resolveX:()=>500+dir*80});
    assert.ok(movie.actors.hero!.some((f)=>f.holds==='cup'),orientation+' should bind on contact');
    for (const f of movie.actors.hero!) {
      if (!f.reach) continue;
      const actor={...base,...f,y:650,orientation:orientation as typeof base.orientation,skeleton:artwork.views[figureViewForOrientation(orientation)].skeleton,motor:true,flip:f.facing===-1};
      const figure=solveActorFigure(actor);
      const point=designHandToWorld(actor,figure.solved!.joints.hand_r!,figure.space,figure.flipped);
      const error=Math.hypot(point[0]-f.reach[0],point[1]-f.reach[1]);
      assert.ok(error<.05,`${orientation}: palm misses motor target by ${error}px`);
    }
  }
});

test('short native arms pick up floor props and recover in either travel direction for every orientation',async () => {
  const artwork=await artworkFixture();
  // Short-arm geometry reproduces the M2 floor pickup; vectors are irrelevant here.
  for (const view of FIGURE_VIEWS) {
    const sk=artwork.views[view].skeleton;
    sk.joints.waist=[200,408.24];
    sk.joints.shoulder_r=[243.2,261.84];
    sk.joints.elbow_r=[257.6,339.84];
    sk.joints.hand_r=[281.6,435.84];
    sk.arm.upper=Math.hypot(14.4,78);sk.arm.fore=Math.hypot(24,96);sk.arm.handRadius=8.4;
    sk.parts.torso={box:[[138.8,233.04],[260,504.24]]};
    if (view==='side') {
      sk.joints.shoulder_r=[204.8,259.44];sk.joints.elbow_r=[219.2,337.44];sk.joints.hand_r=[230,435.84];
      sk.arm.fore=Math.hypot(10.8,98.4);sk.arm.handRadius=4.8;
    }
  }
  const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map((v)=>[v,artwork.views[v].skeleton])) as Record<FigureView,Skeleton>;
  for (const orientation of orientations) for (const direction of [-1,1] as const) {
    const movie=simulateScene({durationSec:5,actors:[{id:'hero',x:960-direction*288,groundY:691.2,facing:direction,scale:.88,skeleton:artwork.views.front.skeleton,skeletonViews,orientations:[{at:0,orientation}],intents:[{at:0,duration:1.6,intent:'move',target:'cup',grab:'cup'},{at:3.5,duration:.1,intent:'release',target:'cup'}]}],props:[{id:'cup',x:960,y:691.2,size:[200,160],touchBox:{a:[-24,-70.5],b:[24,0]},intents:[]}],groundY:691.2,resolveX:()=>960});
    const frames=movie.actors.hero!;
    assert.ok(frames.slice(0,60).some(f=>f.holds==='cup'),`${orientation}/${direction}: floor pickup must bind during the beat`);
    assert.ok(movie.props.cup!.slice(30,80).some(f=>f.y<600),`${orientation}/${direction}: cup must leave the floor`);
    assert.ok(frames.slice(108).every(f=>!f.holds&&!f.reach&&!f.waist&&!f.crouch),`${orientation}/${direction}: release must recover upright`);
  }
});

test('native handover stops at live object reach rather than crowding the giver',async () => {
  const artwork=await artworkFixture();
  const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map((v)=>[v,artwork.views[v].skeleton])) as Record<FigureView,Skeleton>;
  const common={groundY:650,scale:.6,skeleton:artwork.views.front.skeleton,skeletonViews};
  const movie=simulateScene({durationSec:3,actors:[{...common,id:'giver',x:750,facing:-1,intents:[{at:0,duration:1,intent:'grab',target:'cup'}]},{...common,id:'receiver',x:350,facing:1,intents:[{at:1,duration:1.6,intent:'move',target:'giver',grab:'cup'}]}],props:[{id:'cup',x:680,y:540,size:[30,40],intents:[]}],groundY:650,resolveX:(id)=>id==='giver'?750:680});
  assert.ok(movie.actors.receiver!.some(f=>f.holds==='cup'),'handover binds through actual contact');
  const gaps=movie.actors.giver!.map((f,i)=>f.x-movie.actors.receiver![i]!.x);
  assert.ok(Math.min(...gaps)>150,'reach should preserve readable body spacing');
});

test('native motor leaves unclaimed arms resting during semantic presentation',async () => {
  const artwork=await artworkFixture();
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:24,actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.6},tracks:[{kind:'action',events:[{frame:0,endFrame:24,value:{action:'present'}}]}]}]} as PerformanceManifest;
  const actor={...evaluatePerformance(manifest,12).actors[0]!,motor:true};
  const pose=solveActorFigure(actor).pose;
  assert.deepEqual(pose.armLeft,{upper:0,lower:0,hand:'rest'});
  assert.deepEqual(pose.armRight,{upper:0,lower:0,hand:'rest'});
});

test('native resting correction preserves each explicitly claimed arm segment',async () => {
  const artwork=await artworkFixture();
  for (const side of ['l','r']) for (const part of [`arm_u_${side}`,`arm_l_${side}`,`hand_${side}`]) {
    const manifest={video:{width:1280,height:720,fps:24},durationInFrames:24,actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.6},tracks:[
      {kind:'action',events:[{frame:0,endFrame:24,value:{action:'present'}}]},
      {kind:'bone',events:[{frame:0,endFrame:24,value:{action:'point',parts:[part]}}]},
    ]}]} as PerformanceManifest;
    const actor={...evaluatePerformance(manifest,12).actors[0]!,motor:true};
    const key=side==='l'?'armLeft':'armRight';
    assert.deepEqual(solveActorFigure(actor).pose[key],deriveActorPose(actor)[key],part+' explicit claim must win');
  }
});

test('presentation recipe bone claims are not independent authored gestures',async () => {
  const artwork=await artworkFixture();
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:24,actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.6},tracks:[{kind:'bone',events:[{frame:0,endFrame:24,value:{phase:'offer',parts:['arm_l_l','hand_l','arm_l_r','hand_r']}}]}]}]} as PerformanceManifest;
  const actor={...evaluatePerformance(manifest,12).actors[0]!,motor:true};
  assert.deepEqual(solveActorFigure(actor).pose.armLeft,{upper:0,lower:0,hand:'rest'});
  assert.deepEqual(solveActorFigure(actor).pose.armRight,{upper:0,lower:0,hand:'rest'});
});

test('native resting correction does not suppress other authored action gestures',async () => {
  const artwork=await artworkFixture();
  for (const action of ['point','raise','wave']) {
    const manifest={video:{width:1280,height:720,fps:24},durationInFrames:24,actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.6},tracks:[{kind:'action',events:[{frame:0,endFrame:24,value:{action}}]}]}]} as PerformanceManifest;
    const actor={...evaluatePerformance(manifest,12).actors[0]!,motor:true};
    assert.deepEqual(solveActorFigure(actor).pose.armRight,deriveActorPose(actor).armRight,action);
  }
});

test('native release clears ownership/contact immediately and withdraws the reach to rest',async () => {
  const artwork=await artworkFixture();
  const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map((view)=>[view,artwork.views[view].skeleton])) as Record<FigureView,Skeleton>;
  const movie=simulateScene({durationSec:2,actors:[{id:'hero',x:500,groundY:650,facing:1,scale:.6,skeleton:artwork.views.front.skeleton,skeletonViews,intents:[{at:0,duration:1,intent:'grab',target:'cup'},{at:1,duration:.1,intent:'release',target:'cup'}]}],props:[{id:'cup',x:580,y:540,size:[30,40],intents:[]}],groundY:650,resolveX:()=>580});
  assert.ok(movie.actors.hero!.slice(0,20).some((f)=>f.holds==='cup'));
  assert.ok(movie.actors.hero!.slice(24).every((f)=>!f.holds&&!f.contact),'release must immediately clear ownership and fist contact');
  assert.ok(movie.actors.hero!.slice(-3).every((f)=>!f.reach),'withdrawal must finish at rest rather than leave a ghost reach');
});

test('native orientation and binding events use scene-relative motor time',async () => {
  const artwork=await artworkFixture();
  const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map((view)=>[view,artwork.views[view].skeleton])) as Record<FigureView,Skeleton>;
  const movie=bakeSceneMotor({durationSec:2,startSec:9,actors:{hero:{at:[.4,.8],scale:.6,skeleton:artwork.views.front.skeleton,skeletonViews}},objects:{cup:{at:[.46,.72],size:[30,40]}},tracks:[{subject:'hero',events:[{start:9,end:10,tracks:[{kind:'bone',events:[{at:0,value:{orientation:'right'}}]},{kind:'binding',events:[{at:0,value:{operation:'bind',object:'cup',holder:'hero'}}]}]}]}]},{width:1280,height:720});
  assert.ok(movie?.actors.hero?.some((f)=>f.holds==='cup'),'later-scene grab must actually run');
});
