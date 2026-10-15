import {test} from "node:test";
import assert from "node:assert/strict";
import {artworkFixture} from "./helpers/figureArtwork";
import {solveSkeleton,solveArmIK} from "../src/motor/skeleton";

const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('body drop moves waist, shoulders and hips while planted-leg IK retains feet',async () => {
  const sk=(await artworkFixture()).views.front.skeleton;
  const drop=60;
  const h=sk.joints.hip_r!,k=sk.joints.knee_r!,f=sk.joints.foot_r!;
  const u:[number,number]=[k[0]-h[0],k[1]-h[1]],v:[number,number]=[f[0]-k[0],f[1]-k[1]];
  const leg=solveArmIK({x:f[0],y:f[1]},{shoulder:[h[0],h[1]+drop],upper:Math.hypot(...u),fore:Math.hypot(...v),upperDir:u,foreDir:v});
  const solved=solveSkeleton(sk,{waistY:drop,legR:leg,armR:{upper:0,lower:0}});
  near(solved.joints.waist![1],sk.joints.waist![1]+drop);
  near(solved.joints.shoulder_r![1],sk.joints.shoulder_r![1]+drop);
  near(solved.joints.hip_r![1],h[1]+drop);
  near(solved.joints.foot_r![0],f[0]);near(solved.joints.foot_r![1],f[1]);
  near(Math.hypot(solved.joints.knee_r![0]-solved.joints.hip_r![0],solved.joints.knee_r![1]-solved.joints.hip_r![1]),Math.hypot(...u));
  near(solved.hands.hand_r!.center[1],sk.joints.hand_r![1]+drop);
});

test('default skeleton poses retain their unmodified rest geometry',async () => {
  const sk=(await artworkFixture()).views.front.skeleton;
  assert.deepEqual(solveSkeleton(sk).joints,sk.joints);
});

test('legDropInterval rejects unreachable anchors and respects both annulus boundaries',async()=>{
  const {legDropInterval}=await import('../src/motor/skeleton');
  const sk=(await artworkFixture()).views.front.skeleton;
  sk.joints.hip_r=[0,0];sk.joints.knee_r=[0,60];sk.joints.foot_r=[0,100];
  const interval=legDropInterval(sk,'r',[0,120])!;
  near(interval[0],20.01);near(interval[1],99.99);
  assert.equal(legDropInterval(sk,'r',[100,120]),null,'horizontal reach outside outer circle is infeasible');
  assert.equal(legDropInterval(sk,'r',[0,10]),null,'hip drop cannot unfold a target inside inner circle');
  assert.equal(legDropInterval(sk,'r',[0,-10]),null,'native standing branch cannot put hip below ankle');
  const lateral=legDropInterval(sk,'r',[30,100])!;
  near(lateral[0],100-Math.sqrt(99.99**2-30**2));near(lateral[1],100);
  assert.equal(legDropInterval(sk,'r',[0,40])![0],0,'already reachable target permits no compression');
});

test('legDropInterval reachable endpoints produce actual native leg FK without target clamping',async()=>{
  const {nativeDraftArtworkFixture}=await import('./helpers/figureArtwork');
  const {FIGURE_VIEWS}=await import('../src/schemas/figureArtwork');
  const {legDropInterval,plantedLegAngles}=await import('../src/motor/skeleton');
  const art=await nativeDraftArtworkFixture();
  for(const view of FIGURE_VIEWS)for(const side of ['l','r'] as const)for(const offset of [-60,0,60]){
    const sk=art.views[view].skeleton,foot=sk.joints[`foot_${side}`]!;
    const target:[number,number]=[foot[0]+offset,foot[1]];
    const interval=legDropInterval(sk,side,target)!;
    assert.ok(interval,`${view}/${side}/${offset} envelope exists`);
    for(const drop of [interval[0],(interval[0]+interval[1])/2,interval[1]]){
      const leg=plantedLegAngles(sk,side,drop,target);
      const solved=solveSkeleton(sk,{waistY:drop,...(side==='r'?{legR:leg}:{legL:leg})});
      near(solved.joints[`foot_${side}`]![0],target[0]);near(solved.joints[`foot_${side}`]![1],target[1]);
    }
  }
});
