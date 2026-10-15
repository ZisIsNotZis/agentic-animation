import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeDraftArtworkFixture} from '../../core/test/helpers/figureArtwork';
import {bakeSceneMotor} from '../../core/src/motor';
import {FIGURE_VIEWS,type FigureView} from '../../core/src/schemas/figureArtwork';
import type {Skeleton} from '../../core/src/schemas/libraryMeta';
import {evaluatePerformance} from '../src/performance/evaluate';
import {detectPropDiscontinuities} from '../src/performance/teleports';
import {solveActorFigure} from '../src/components/performance/actorPose';
import type {PerformanceManifest} from '../src/performance/types';

test('live whole-body native offer torso recovers through withdrawal and its authored interval exit',async()=>{
  const art=await nativeDraftArtworkFixture();
  const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  const actors={giver:{at:[.65,.64] as const,facing:-1,scale:.88,skeleton:art.views.front.skeleton,skeletonViews},receiver:{at:[.35,.64] as const,facing:1,scale:.88,skeleton:art.views.front.skeleton,skeletonViews}};
  const cue=3.476644;
  const movie=bakeSceneMotor({durationSec:6.726666,actors,objects:{cup:{at:[.5,.64],size:[200,160],grip:{at:[36,-42],radius:1.5,depth:'front'},touchBox:{a:[-24,-70.5],b:[24,0]}}},tracks:[
    {subject:'giver',events:[{start:0,end:0,tracks:[{kind:'motor',events:[{intent:'move',target:'cup',grab:'cup',duration:1.6}]}]},
      {start:cue,end:cue+1.6,tracks:[{kind:'gaze',events:[{at:0,duration:1.6,value:{phase:'offer',target:'receiver'}}]},{kind:'motor',events:[{actor:'receiver',intent:'move',target:'giver',grab:'cup',duration:1.6}]}]}]},
  ]})!;
  assert.deepEqual(movie.diagnostics??[],[],'canonical offer must not exhaust at reach clearing or claim exit');
  assert.equal(movie.actors.receiver!.findIndex(f=>f.holds==='cup'),84);
  assert.ok(movie.actors.giver!.slice(130).every(f=>!f.reach&&!f.holds),'outgoing withdrawal completes');
  const manifest={video:{width:1920,height:1080,fps:24},durationInFrames:162,actors:Object.entries(actors).map(([id,a])=>({id,artwork:art,skeleton:a.skeleton,placement:{at:[a.at[0]*1920,a.at[1]*1080],scale:.88},tracks:[]})),props:[{id:'cup',at:[960,691.2]}],sceneTrack:[{start:0,end:6.726666,motor:movie}]} as PerformanceManifest;
  assert.deepEqual(detectPropDiscontinuities(manifest),[],'accepted authored torso/arms stay continuous');
});

test('live whole-body transaction bakes canonical nonzero authored pose in all sixteen native transforms',async()=>{
  const art=await nativeDraftArtworkFixture();
  const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  for(const orientation of ['front','back','right','left','front-right','front-left','back-right','back-left'])for(const facing of [-1,1] as const){
    const value={action:'point',parts:['arm_u_l','arm_l_l','hand_l']};
    const movie=bakeSceneMotor({durationSec:1,actors:{hero:{at:[.5,.9],scale:.6,facing,skeleton:art.views.front.skeleton,skeletonViews}},objects:{},tracks:[{subject:'hero',events:[
      {start:0,end:1,tracks:[{kind:'bone',events:[{value:{orientation}}]},{kind:'bone',events:[{value,duration:1}]}]},
      {start:.9,end:1,tracks:[{kind:'motor',events:[{intent:'release',target:'absent',duration:.1}]}]},
    ]}]},{width:1280,height:720})!;
    assert.deepEqual(movie.diagnostics??[],[]);
    const manifest={video:{width:1280,height:720,fps:24},durationInFrames:24,
      actors:[{id:'hero',artwork:art,skeleton:art.views.front.skeleton,placement:{at:[640,648],scale:.6,flip:facing===-1},tracks:[{kind:'bone',events:[{frame:0,endFrame:24,value:{orientation}}]},{kind:'bone',events:[{frame:0,endFrame:24,value}]}]}],
      sceneTrack:[{start:0,end:1,motor:movie}]} as PerformanceManifest;
    const actor=evaluatePerformance(manifest,12).actors[0]!;
    assert.ok(actor.skeletonPose,'accepted canonical pose reaches evaluator');
    const actual=solveActorFigure(actor),canonical=solveActorFigure({...actor,skeletonPose:undefined});
    assert.ok(Math.abs(actor.skeletonPose.armL!.upper)>1,'authored pose is not a neutral placeholder');
    for(const name of Object.keys(actual.solved!.joints)){
      const p=actual.solved!.joints[name]!,q=canonical.solved!.joints[name]!;
      assert.ok(Math.hypot(p[0]-q[0],p[1]-q[1])<.02,`${orientation}/${facing}/${name}: exact renderer source pose`);
    }
  }
});
