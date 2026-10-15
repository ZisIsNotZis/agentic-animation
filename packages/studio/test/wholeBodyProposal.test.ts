import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeDraftArtworkFixture} from '../../core/test/helpers/figureArtwork';
import {figureViewForOrientation} from '../../core/src/schemas/figureArtwork';
import {resolveWholeBodyProposal,type WholeBodyState} from '../../core/src/motor/wholeBodyProposal';
import {solveActorFigure} from '../src/components/performance/actorPose';
import {designHandToWorld} from '../src/components/performance/reach';
import {evaluatePerformance} from '../src/performance/evaluate';
import type {PerformanceManifest} from '../src/performance/types';

test('wholeBodyProposal consumes actual renderer-authored poses in all sixteen native view/direction cases',async()=>{
  const artwork=await nativeDraftArtworkFixture();
  for(const orientation of ['front','front-right','right','back-right','back','back-left','left','front-left']){
    for(const facing of [-1,1] as const){
      const skeleton=artwork.views[figureViewForOrientation(orientation)].skeleton;
      const manifest={video:{width:1280,height:720,fps:24},durationInFrames:2,
        actors:[{id:'hero',artwork,skeleton,placement:{at:[500,650],scale:.88},
          tracks:[{kind:'bone',events:[{frame:0,endFrame:2,value:{action:'point',parts:['arm_u_l','arm_l_l','hand_l'],orientation}}]}]}],
        sceneTrack:[{start:0,end:2/24,motor:{actors:{hero:[0,1].map(()=>({x:500,lean:0,facing,walk:0,crouch:.2,waist:10}))},props:{}}}],
      } as PerformanceManifest;
      const actor=evaluatePerformance(manifest,1).actors[0]!,figure=solveActorFigure(actor);
      assert.ok(Math.abs(figure.pose.armLeft.upper)>1,'equivalence must include a live authored arm pose');
      const world=(name:string)=>designHandToWorld(actor,figure.solved!.joints[name]!,figure.space,figure.flipped);
      const feet={l:world('foot_l'),r:world('foot_r')};
      const palm=world('hand_r');
      // The declared neutral ankle-to-ground offset is independent of the
      // proposed FK. This tests joint/sole alignment, not painted shoe contours.
      const state:WholeBodyState={actors:{hero:{skeleton:figure.skeleton!,x:actor.x,y:actor.y,scale:actor.scale,
        flipped:figure.flipped,pose:{waistPitch:figure.waistPitch,waistY:figure.pose.torsoY,
          torsoScaleY:figure.pose.torsoScaleY,facing:1,armL:figure.pose.armLeft,armR:figure.pose.armRight,
          legL:figure.pose.legLeft,legR:figure.pose.legRight},footTargets:feet,support:feet,
        soleOffset:{l:(skeleton.space.height-skeleton.joints.foot_l![1])*actor.scale,
          r:(skeleton.space.height-skeleton.joints.foot_r![1])*actor.scale},palmTarget:palm}},
        props:{cup:{x:palm[0]-12,y:palm[1]+14,rotation:0,owner:'hero',socket:[12,-14],radius:1.5}}};
      const input={accepted:state,dt:1/24,time:1/24,maxAttempts:2,presentationTimes:[1/24],presentationReference:{state,time:1/24}};
      const accepted=resolveWholeBodyProposal(input,snapshot=>({state:snapshot,samples:[structuredClone(snapshot)],events:[]}));
      assert.equal(accepted.accepted,true,`${orientation}/${facing}: ${JSON.stringify(accepted.rejections)}`);
      const rejected=resolveWholeBodyProposal(input,snapshot=>{
        snapshot.actors.hero!.x+=40;
        return {state:snapshot,samples:[structuredClone(snapshot)],events:[]};
      });
      assert.equal(rejected.accepted,false,`${orientation}/${facing} final body must participate`);
      assert.ok(rejected.rejections.some(r=>r.constraint==='support-anchor'));
      assert.ok(rejected.rejections.some(r=>r.constraint==='grip-socket'));
    }
  }
});
