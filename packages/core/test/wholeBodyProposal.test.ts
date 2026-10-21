import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeDraftArtworkFixture} from './helpers/figureArtwork';
import {solveSkeleton,plantedLegAngles,legDropInterval} from '../src/motor/skeleton';

/** The design-space foot the motor's planted-leg solve lands for an aim. */
function solvedLegFoot(sk: Parameters<typeof plantedLegAngles>[0],side: 'l'|'r',drop: number,design:[number,number]): [number,number] {
  const angles=plantedLegAngles(sk,side,drop,design);
  return solveSkeleton(sk,side==='r'?{waistY:drop,legR:angles}:{waistY:drop,legL:angles}).joints[`foot_${side}`]!;
}
import {resolveWholeBodyProposal,type WholeBodyState} from '../src/motor/wholeBodyProposal';

async function standing(): Promise<WholeBodyState> {
  const art=await nativeDraftArtworkFixture(),skeleton=art.views.front.skeleton;
  const x=500,y=650,scale=.88;
  const targets=Object.fromEntries(['l','r'].map(side=>{
    const f=skeleton.joints[`foot_${side}`]!;
    return [side,[x+(f[0]-skeleton.space.width/2)*scale,y+(f[1]-skeleton.space.height)*scale]];
  })) as {l:[number,number];r:[number,number]};
  const hand=solveSkeleton(skeleton,{}).joints.hand_r!;
  const palm:[number,number]=[x+(hand[0]-skeleton.space.width/2)*scale,y+(hand[1]-skeleton.space.height)*scale];
  return {actors:{hero:{skeleton,x,y,scale,flipped:false,pose:{},footTargets:targets,
    support:{l:targets.l,r:targets.r},soleOffset:{l:y-targets.l[1],r:y-targets.r[1]},palmTarget:palm}},
    props:{cup:{x:palm[0]-12,y:palm[1]+14,rotation:0,owner:'hero',socket:[12,-14],radius:1.5}}};
}

 test('wholeBodyProposal rejects final root motion despite unchanged valid palm/socket and rolls back everything',async()=>{
  const state=await standing(),before=structuredClone(state);
  const result=resolveWholeBodyProposal({accepted:state,dt:1/120,time:1,maxAttempts:3,presentationTimes:[]},snapshot=>{
    snapshot.actors.hero!.x+=40;
    // A hand-only/socket-only validator would accept this unchanged attachment.
    return {state:snapshot,samples:[],events:[]};
  });
  assert.equal(result.accepted,false);
  assert.equal(result.attempts,3);
  assert.deepEqual(result.state,before);
  assert.deepEqual(state,before,'speculative mutation must not leak to source');
  assert.deepEqual(result.events,[]);
  assert.ok(result.rejections.some(r=>r.actor==='hero'&&r.constraint==='support-anchor'));
  assert.ok(result.rejections.some(r=>r.joint==='hand_r'&&r.constraint==='palm-contact'));
});

 test('wholeBodyProposal validates authored elbow FK rather than only contact target',async()=>{
  const state=await standing();
  const result=resolveWholeBodyProposal({accepted:state,dt:1/24,time:1,maxAttempts:2,presentationTimes:[]},snapshot=>{
    snapshot.actors.hero!.pose.armL={upper:90,lower:-90};
    return {state:snapshot,samples:[],events:[]};
  });
  assert.equal(result.accepted,false);
  assert.ok(result.rejections.some(r=>r.joint==='elbow_l'&&r.constraint==='joint-rate'));
});

 test('wholeBodyProposal replans coupled root/drop/legs/contact and returns one atomic accepted state',async()=>{
  const state=await standing(),progresses:number[]=[];
  const plan=(snapshot:WholeBodyState,progress:number)=>{
    progresses.push(progress);
    const actor=snapshot.actors.hero!,drop=progress*20;
    actor.x+=progress*20;actor.pose.waistY=drop;
    for(const side of ['l','r'] as const){
      const world=actor.footTargets[side];
      const target:[number,number]=[actor.skeleton.space.width/2+(world[0]-actor.x)/actor.scale,
        actor.skeleton.space.height+(world[1]-actor.y)/actor.scale];
      const angles=plantedLegAngles(actor.skeleton,side,drop,target);
      if(side==='l')actor.pose.legL=angles;else actor.pose.legR=angles;
    }
    const hand=solveSkeleton(actor.skeleton,actor.pose).joints.hand_r!;
    actor.palmTarget=[actor.x+(hand[0]-actor.skeleton.space.width/2)*actor.scale,
      actor.y+(hand[1]-actor.skeleton.space.height)*actor.scale];
    snapshot.props.cup!.x=actor.palmTarget[0]-12;snapshot.props.cup!.y=actor.palmTarget[1]+14;
    return {state:snapshot,samples:[],events:[]};
  };
  const input={accepted:state,dt:1/24,time:1,maxAttempts:8,presentationTimes:[]};
  const result=resolveWholeBodyProposal(input,plan);
  assert.equal(result.accepted,true,JSON.stringify(result.rejections));
  assert.ok(result.attempts>1,'full root+drop progress must be reduced, not hand-clamped');
  assert.ok(result.state.actors.hero!.x>state.actors.hero!.x);
  assert.deepEqual(progresses,Array.from({length:result.attempts},(_,i)=>2**-i));
  assert.deepEqual(resolveWholeBodyProposal(input,plan).state,result.state,'deterministic');
});

test('wholeBodyProposal retries complete controller/prop state and defers exactly one release event',async()=>{
  const base=await standing();
  const state={...base,controllers:{hero:{gaitPhase:.4,hold:{elapsed:2,grip:[12,-14]},pending:['cup']}}};
  const seen:number[]=[];
  const input={accepted:state,dt:1/24,time:2,maxAttempts:3,presentationTimes:[]};
  const result=resolveWholeBodyProposal(input,(snapshot,progress)=>{
    seen.push(snapshot.controllers.hero.hold.elapsed);
    snapshot.controllers.hero.hold.elapsed+=progress;
    snapshot.controllers.hero.pending.pop();
    snapshot.props.cup!.owner=undefined;
    if(progress===1)snapshot.actors.hero!.x+=40;
    return {state:snapshot,samples:[],events:[{prop:'cup',from:'hero',notBefore:2}]};
  });
  assert.equal(result.accepted,true);
  assert.equal(result.attempts,2);
  assert.deepEqual(seen,[2,2],'retry restarts hold/gait/ownership, not only hand');
  assert.equal(state.controllers.hero.hold.elapsed,2);
  assert.deepEqual(state.controllers.hero.pending,['cup']);
  assert.equal(state.props.cup!.owner,'hero');
  assert.equal(result.state.controllers.hero.hold.elapsed,2.5);
  assert.deepEqual(result.state.controllers.hero.pending,[]);
  assert.deepEqual(result.events,[{prop:'cup',from:'hero',notBefore:2}]);
  const rejected=resolveWholeBodyProposal(input,snapshot=>{
    snapshot.props.cup!.owner=undefined;
    return {state:snapshot,samples:[],events:[{prop:'cup',from:'hero',notBefore:3}]};
  });
  assert.equal(rejected.accepted,false,'no early ownership beat');
  assert.deepEqual(rejected.events,[],'failed proposal cannot publish event');
  assert.deepEqual(rejected.state,state);
});

test('wholeBodyProposal bounds unowned incoming palm travel including shoulder recovery',async()=>{
  const state=await standing();state.props.cup!.owner=undefined;
  const result=resolveWholeBodyProposal({accepted:state,dt:1/24,time:1,maxAttempts:3,presentationTimes:[]},(snapshot,progress)=>{
    const actor=snapshot.actors.hero!;
    actor.pose.waistY=24*progress;
    for(const side of ['l','r'] as const){
      const world=actor.footTargets[side];
      const target:[number,number]=[actor.skeleton.space.width/2+(world[0]-actor.x)/actor.scale,
        actor.skeleton.space.height+(world[1]-actor.y)/actor.scale];
      const angles=plantedLegAngles(actor.skeleton,side,actor.pose.waistY,target);
      if(side==='l')actor.pose.legL=angles;else actor.pose.legR=angles;
    }
    const hand=solveSkeleton(actor.skeleton,actor.pose).joints.hand_r!;
    actor.palmTarget=[actor.x+(hand[0]-actor.skeleton.space.width/2)*actor.scale,
      actor.y+(hand[1]-actor.skeleton.space.height)*actor.scale];
    return {state:snapshot,samples:[],events:[]};
  });
  assert.equal(result.accepted,true);
  assert.ok(result.attempts>1,'total world palm travel, not only relative hand travel, limits whole progress');
  assert.ok(result.rejections.some(r=>r.constraint==='incoming-palm-rate'));
  assert.ok(result.state.actors.hero!.pose.waistY!<24,'posture and palm advance together');
});

test('wholeBodyProposal validates requested presentation samples, not only quiet endpoints',async()=>{
  const state=await standing();
  const result=resolveWholeBodyProposal({accepted:state,dt:1/24,time:1,maxAttempts:2,
    presentationTimes:[1/48,1/24],presentationReference:{state,time:1}},snapshot=>{
    const middle=structuredClone(snapshot);middle.actors.hero!.pose.armL={upper:100,lower:-100};
    return {state:snapshot,samples:[middle,structuredClone(snapshot)],events:[]};
  });
  assert.equal(result.accepted,false);
  assert.ok(result.rejections.some(r=>r.joint==='elbow_l'&&r.constraint==='joint-rate'));
  const missing=resolveWholeBodyProposal({accepted:state,dt:1/24,time:1,maxAttempts:1,
    presentationTimes:[1/24],presentationReference:{state,time:1}},snapshot=>({state:snapshot,samples:[],events:[]}));
  assert.equal(missing.accepted,false);
  assert.ok(missing.rejections.some(r=>r.constraint==='presentation-coverage'));
});

test('wholeBodyProposal separately rejects sole height and clamped/annulus-infeasible leg targets',async()=>{
  const state=await standing();
  const input={accepted:state,dt:1/24,time:1,maxAttempts:1,presentationTimes:[]};
  const sole=resolveWholeBodyProposal(input,snapshot=>{
    snapshot.actors.hero!.soleOffset.l+=3;
    return {state:snapshot,samples:[],events:[]};
  });
  assert.equal(sole.accepted,false);
  assert.ok(sole.rejections.some(r=>r.constraint==='sole-height'&&r.joint==='foot_l'));
  const reach=resolveWholeBodyProposal(input,snapshot=>{
    const a=snapshot.actors.hero!;a.footTargets.r=[a.x+500,a.y];
    a.support.r=a.footTargets.r;
    a.pose.legR=plantedLegAngles(a.skeleton,'r',0,[a.skeleton.space.width/2+500/a.scale,a.skeleton.space.height]);
    return {state:snapshot,samples:[],events:[]};
  });
  assert.equal(reach.accepted,false);
  // Reachability is `leg-annulus`'s question: the aim is 500 px outside the
  // leg's annulus, so no drop can plant it (the measured miss is Infinity, not
  // a tolerance). `foot-reach` now compares like with like at the clamp — the
  // drawn foot against the foot the leg solve LANDS for that aim — so it no
  // longer reports an unreachable aim twice, as a sub-pixel shortfall.
  assert.ok(reach.rejections.some(r=>r.constraint==='leg-annulus'&&r.joint==='foot_r'),
    JSON.stringify(reach.rejections.filter(r=>r.joint==='foot_r')));
});

test('wholeBodyProposal transfer requires actual recipient socket contact and a unique gated event',async()=>{
  const state=await standing();state.actors.receiver=structuredClone(state.actors.hero!);
  const input={accepted:state,dt:1/24,time:1,maxAttempts:2,presentationTimes:[]};
  const plan=(snapshot:WholeBodyState)=>{
    snapshot.props.cup!.owner='receiver';
    return {state:snapshot,samples:[],events:[{prop:'cup',from:'hero',to:'receiver',notBefore:1}]};
  };
  assert.equal(resolveWholeBodyProposal(input,plan).accepted,true);
  state.actors.receiver.x+=100;
  for(const side of ['l','r'] as const){
    const foot=state.actors.receiver.footTargets[side];
    state.actors.receiver.footTargets[side]=[foot[0]+100,foot[1]];
    state.actors.receiver.support[side]=state.actors.receiver.footTargets[side];
  }
  state.actors.receiver.palmTarget![0]+=100;
  const miss=resolveWholeBodyProposal(input,plan);
  assert.equal(miss.accepted,false);
  assert.ok(miss.rejections.some(r=>r.constraint==='grip-socket'));
  assert.ok(miss.rejections.every(r=>r.constraint==='grip-socket'),'isolated actual contact miss, not invalid receiver support');
  assert.deepEqual(miss.events,[]);
});

test('wholeBodyProposal rejects early sample ownership even when final contact beat is valid',async()=>{
  const state=await standing();
  const result=resolveWholeBodyProposal({accepted:state,dt:1/24,time:1,maxAttempts:1,
    presentationTimes:[1/48,1/24],presentationReference:{state,time:1}},snapshot=>{
    snapshot.props.cup!.owner=undefined;
    return {state:snapshot,samples:[structuredClone(snapshot),structuredClone(snapshot)],
      events:[{prop:'cup',from:'hero',notBefore:1+1/24}]};
  });
  assert.equal(result.accepted,false);
  assert.ok(result.rejections.some(r=>r.constraint==='presentation-ownership'));
  assert.equal(result.state.props.cup!.owner,'hero');
  assert.deepEqual(result.events,[]);
});

test('wholeBodyProposal failure in a second actor rolls back first actor and deferred ownership together',async()=>{
  const state=await standing();state.actors.receiver=structuredClone(state.actors.hero!);
  const before=structuredClone(state);
  const result=resolveWholeBodyProposal({accepted:state,dt:1/24,time:1,maxAttempts:2,presentationTimes:[]},snapshot=>{
    snapshot.props.cup!.owner=undefined;
    snapshot.actors.hero!.pose.armL={upper:1,lower:0};
    snapshot.actors.receiver!.pose.armL={upper:90,lower:0};
    return {state:snapshot,samples:[],events:[{prop:'cup',from:'hero',notBefore:1}]};
  });
  assert.equal(result.accepted,false);
  assert.deepEqual(result.state,before);
  assert.deepEqual(state,before);
  assert.deepEqual(result.events,[]);
  assert.ok(result.rejections.some(r=>r.actor==='receiver'&&r.joint==='elbow_l'));
});

test('wholeBodyProposal judges foot-reach at the clamp, so a zero-slack rest leg is not refused by rounding',async()=>{
  // Every accepted figure's rest legs are straight, so a straight-down stance
  // target sits exactly ON the reachable annulus boundary and the solved foot
  // lands a rounding width inside it. Comparing the drawn foot with the raw aim
  // refused that substep; the aim the solver LANDS is the honest comparison.
  const state=await standing();
  const input={accepted:state,dt:1/24,time:1,maxAttempts:1,presentationTimes:[]};
  const still=resolveWholeBodyProposal(input,snapshot=>({state:snapshot,samples:[],events:[]}));
  assert.equal(still.accepted,true,JSON.stringify(still.rejections));
  // The residual at a boundary aim is the solver's own clamp, not a pose
  // fault: on the standing fixture the rest leg's aim sits ON the annulus and
  // the solved foot lands inside it by less than the rounding the comparison
  // used to judge. The check now measures the foot the solve LANDS instead.
  const a=state.actors.hero!,sk=a.skeleton;
  const interval=legDropInterval(sk,'r',[sk.joints.foot_r![0],sk.joints.foot_r![1]]);
  assert.ok(interval,'a straight rest leg has an annulus');
  const landed=solvedLegFoot(sk,'r',0,[sk.joints.foot_r![0],sk.joints.foot_r![1]]);
  assert.ok(Math.hypot(landed[0]-sk.joints.foot_r![0],landed[1]-sk.joints.foot_r![1])>0,
    'the solve lands inside the aim, which is what the clamp comparison accepts');
  // The check still catches a pose whose drawn leg is NOT the leg its aim
  // solves: the renderer must draw the pose the motor planned.
  const desynced=resolveWholeBodyProposal(input,snapshot=>{
    snapshot.actors.hero!.pose.legR={upper:-150,lower:-5};
    return {state:snapshot,samples:[],events:[]};
  });
  assert.equal(desynced.accepted,false);
  assert.ok(desynced.rejections.some(r=>r.constraint==='foot-reach'&&r.joint==='foot_r'));
});

test('wholeBodyProposal names the joint and the input when a target is non-finite',async()=>{
  // A non-finite target has NO solution. It must be refused by a diagnostic
  // that says which joint and which input was non-finite, not by a NaN ratio
  // that reads as a tolerance miss on a substep nobody could have solved.
  const state=await standing();
  const input={accepted:state,dt:1/24,time:1,maxAttempts:1,presentationTimes:[]};
  const foot=resolveWholeBodyProposal(input,snapshot=>{
    snapshot.actors.hero!.footTargets.r=[Infinity,state.actors.hero!.footTargets.r[1]];
    return {state:snapshot,samples:[],events:[]};
  });
  assert.equal(foot.accepted,false);
  const named=foot.rejections.find(r=>r.joint==='foot_r'&&r.constraint==='foot-target-non-finite');
  assert.ok(named,JSON.stringify(foot.rejections.filter(r=>r.joint==='foot_r')));
  assert.equal(named.measured,Infinity,'the value that had no solution is carried, not a NaN ratio');
  assert.equal(foot.rejections.some(r=>r.constraint==='foot-reach'),false,'no tolerance verdict on an unsolvable aim');
  const palm=resolveWholeBodyProposal(input,snapshot=>{
    snapshot.actors.hero!.palmTarget=[NaN,state.actors.hero!.palmTarget![1]];
    return {state:snapshot,samples:[],events:[]};
  });
  assert.equal(palm.accepted,false);
  assert.ok(palm.rejections.some(r=>r.constraint==='palm-target-non-finite'&&r.joint==='hand_r'),
    JSON.stringify(palm.rejections.filter(r=>r.joint==='hand_r')));
  const drop=resolveWholeBodyProposal(input,snapshot=>{
    (snapshot.actors.hero!.pose as {waistY?:number}).waistY=Infinity;
    return {state:snapshot,samples:[],events:[]};
  });
  assert.equal(drop.accepted,false);
  assert.ok(drop.rejections.some(r=>r.constraint==='waist-drop-non-finite'&&r.joint==='foot_l'));
  assert.ok(drop.rejections.some(r=>r.constraint==='waist-drop-non-finite'&&r.joint==='hand_r'));
});
