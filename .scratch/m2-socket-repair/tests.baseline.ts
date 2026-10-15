import {test} from 'node:test';
import assert from 'node:assert/strict';
import {artworkFixture} from '../../core/test/helpers/figureArtwork';
import {simulateScene,type MotorScene} from '../../core/src/motor';
import {FIGURE_VIEWS, type FigureView} from '../../core/src/schemas/figureArtwork';
import type {Skeleton} from '../../core/src/schemas/libraryMeta';
import type {PerformanceManifest} from '../src/performance/types';
import {detectPropDiscontinuities} from '../src/performance/teleports';

test('contact motor approaches with finite travel and withdraws after transfer and release',async()=>{
  const art=await artworkFixture();
  const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  const common={groundY:650,scale:.6,skeleton:art.views.front.skeleton,skeletonViews};
  const movie=simulateScene({durationSec:5,actors:[
    {...common,id:'giver',x:750,facing:-1,intents:[{at:0,duration:1,intent:'grab',target:'cup'}]},
    {...common,id:'receiver',x:350,facing:1,intents:[{at:1,duration:1.6,intent:'move',target:'giver',grab:'cup'},{at:3.5,duration:.8,intent:'release',target:'cup'}]},
  ],props:[{id:'cup',x:650,y:480,size:[12,16],intents:[]}],groundY:650,resolveX:id=>id==='giver'?750:680});
  const giver=movie.actors.giver!,receiver=movie.actors.receiver!;
  assert.ok(!giver[0]!.holds,'first frame must travel before contact');
  const transfer=receiver.findIndex(f=>f.holds==='cup');
  assert.ok(transfer>0,'actual contact transfers ownership');
  assert.ok(giver[transfer]!.reach,'giver retains visible withdrawal target on transfer');
  assert.ok(!giver[transfer]!.holds);
  const release=receiver.findIndex((f,i)=>i>transfer&&!f.holds);
  assert.ok(release>transfer);
  assert.ok(receiver[release]!.reach,'release must not instantly drop the arm');
  assert.ok(receiver.slice(-12).every(f=>!f.reach&&!f.holds),'withdrawal eventually completes');
  for(const frames of [giver,receiver]) for(let i=1;i<frames.length;i++){
    const a=frames[i-1]!,b=frames[i]!;
    if(a.reach&&b.reach&&!a.holds&&!b.holds) assert.ok(Math.hypot(b.reach[0]-a.reach[0],b.reach[1]-a.reach[1])<=20.01,'unloaded hand travel bounded at 480px/s');
  }
});

test('discontinuity detector does not exempt unrelated prop motion when an actor flips',()=>{
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:2,
    actors:[{id:'hero',placement:{at:[500,650]},positionTrack:[{frame:0,at:[500,650],flip:false},{frame:1,at:[500,650],flip:true}]}],
    props:[{id:'cup',at:[600,500],positionTrack:[{frame:0,at:[600,500]},{frame:1,at:[700,500]}]}],
  } as PerformanceManifest;
  assert.ok(detectPropDiscontinuities(manifest).some(w=>w.id==='cup'));
});

test('discontinuity detector checks visible wrist/elbow without root displacement',async()=>{
  const artwork=await artworkFixture();
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:2,
    actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.6}}],
    sceneTrack:[{frame:0,endFrame:2,motor:{fps:24,actors:{hero:[{x:500,lean:0,facing:1,walk:0,reach:[560,520]},{x:500,lean:0,facing:1,walk:0,reach:[420,490]}]},props:{}}}],
  } as PerformanceManifest;
  assert.ok(detectPropDiscontinuities(manifest).some(w=>w.id.startsWith('hero.hand_r')||w.id.startsWith('hero.elbow_r')));
});

test('continuity thresholds expose sub-60px jumps, angles wrap, smooth motion remains quiet',()=>{
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:3,
    props:[{id:'cup',at:[600,500],positionTrack:[{frame:0,at:[600,500],rotation:179},{frame:1,at:[620,500],rotation:-179},{frame:2,at:[640,500],rotation:-160}]}],
  } as PerformanceManifest;
  assert.deepEqual(detectPropDiscontinuities(manifest),[],'20px translation and wrapped small angles are continuous');
  manifest.props![0]!.positionTrack![1]!.at=[640,500];
  assert.ok(detectPropDiscontinuities(manifest).some(w=>w.id==='cup'&&w.frame===1),'40px is visible, even below old 60px gate');
  assert.deepEqual(detectPropDiscontinuities(manifest,{threshold:60}),[],'explicit translation override remains available');
  manifest.props![0]!.positionTrack![1]!.rotation=90;
  assert.ok(detectPropDiscontinuities(manifest,{threshold:60}).some(w=>w.id==='cup.rotation'&&w.metric==='angle'));
});

test('invisible actors are not sampled as visible motion',()=>{
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:2,
    actors:[{id:'hidden',present:false,placement:{at:[500,650]},positionTrack:[{frame:0,at:[500,650]},{frame:1,at:[900,650]}]}],
  } as PerformanceManifest;
  assert.deepEqual(detectPropDiscontinuities(manifest),[]);
});

test('solveReach follows the declared rest elbow branch when returning to rest',async()=>{
  const {solveReach,renderedHandWorld}=await import('../src/components/performance/reach');
  const artwork=await artworkFixture();
  const skeleton=artwork.views.front.skeleton;
  skeleton.joints.shoulder_r=[243.2,261.84];
  skeleton.joints.elbow_r=[257.6,339.84];
  skeleton.joints.hand_r=[281.6,435.84];
  skeleton.arm.upper=Math.hypot(14.4,78);skeleton.arm.fore=Math.hypot(24,96);
  const actor={id:'hero',x:500,y:650,scale:.8,skeleton,motor:true,flip:false,facing:1 as const};
  const reach=renderedHandWorld(actor,{upper:0,lower:0},false);
  const result=solveReach({...actor,reach});
  assert.ok(Math.abs(result.armRight.upper)<.01,'rest upper arm must not switch to the reflected elbow solution');
  assert.ok(Math.abs(result.armRight.lower)<.01,'rest forearm must retain native bend branch');
});

 test('authored right arm regains control continuously during outgoing withdrawal',async()=>{
  const {solveActorFigure,deriveActorPose}=await import('../src/components/performance/actorPose');
  const {evaluatePerformance}=await import('../src/performance/evaluate');
  const artwork=await artworkFixture();
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:30,
    actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.6},
      tracks:[{kind:'bone',events:[{frame:0,endFrame:30,value:{action:'point',parts:['arm_u_r','arm_l_r','hand_r']}}]}]}],
    sceneTrack:[{frame:0,endFrame:30,motor:{fps:24,actors:{hero:Array.from({length:30},(_,i)=>({x:500,lean:0,facing:1,walk:0,reach:[550,550],reachInfluence:Math.exp(-i/3)}))},props:{}}}],
  } as PerformanceManifest;
  const actor=evaluatePerformance(manifest,20).actors[0]!;
  const authored=deriveActorPose(actor).armRight;
  const actual=solveActorFigure(actor).pose.armRight;
  assert.ok(Math.abs(actual.upper-authored.upper)<.2,'withdrawal must no longer suppress authored arm');
  assert.ok(Math.abs(actual.lower-authored.lower)<.2);
  const before=solveActorFigure(evaluatePerformance(manifest,29).actors[0]!).pose.armRight;
  const after=solveActorFigure({...evaluatePerformance(manifest,29).actors[0]!,reach:undefined}).pose.armRight;
  assert.ok(Math.abs(before.upper-after.upper)<.01,'clearing reach must not reveal a delayed gesture');
});

test('local handle socket prevents body-center pickup and carries rotated contact continuously',async()=>{
  const art=await artworkFixture();
  const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  const movie=simulateScene({durationSec:3,actors:[{id:'hero',x:500,groundY:650,facing:1,scale:.6,skeleton:art.views.front.skeleton,skeletonViews,intents:[{at:0,duration:1,intent:'grab',target:'cup'},{at:2,duration:.1,intent:'release',target:'cup'}]}],
    props:[{id:'cup',x:570,y:530,size:[40,50],grip:{at:[28,-25],radius:2,depth:'front'},rotation:25,intents:[]}],groundY:650,resolveX:()=>570});
  const frames=movie.actors.hero!;
  assert.ok(frames.some(f=>f.holds==='cup'));
  for(let i=0;i<frames.length;i++){
    const actor=frames[i]!,prop=movie.props.cup![i]!;
    if(!actor.holds)continue;
    const r=(prop.rotation??0)*Math.PI/180;
    const socket=[prop.x+28*Math.cos(r)+25*Math.sin(r),prop.y+28*Math.sin(r)-25*Math.cos(r)];
    assert.ok(Math.hypot(actor.reach![0]-socket[0]!,actor.reach![1]-socket[1]!)<2.2,'hand must remain on handle, not center');
    assert.equal(actor.gripDepth,'front');
    if(i)assert.ok(Math.abs((prop.rotation??0)-(movie.props.cup![i-1]!.rotation??0))<10,'orientation must not snap');
  }
  assert.ok(movie.props.cup!.some(f=>Math.abs((f.rotation??0)-25)>1),'wrist motion must affect prop orientation');
});

test('handover bake prepares before cue, gates contact and diagnoses insufficient pre-roll',async()=>{
  const {bakeSceneMotor}=await import('../../core/src/motor');
  const art=await artworkFixture();
  const views=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  const common={scale:.6,skeleton:art.views.front.skeleton,skeletonViews:views};
  const source={durationSec:5,actors:{giver:{...common,at:[.6,.9] as const},receiver:{...common,at:[.25,.9] as const}},objects:{cup:{at:[.55,.65] as const,size:[12,16] as [number,number]}},tracks:[{subject:'giver',events:[{start:0,tracks:[{kind:'motor',events:[{intent:'grab',target:'cup',duration:1}]}]},{start:3,tracks:[{kind:'motor',events:[{intent:'move',actor:'receiver',target:'giver',grab:'cup',duration:1.6}]}]}]}]};
  const movie=bakeSceneMotor(source,{width:1280,height:720})!;
  assert.ok(movie.actors.receiver!.slice(0,72).some(f=>f.x>320),'recipient must prepare before contact cue');
  const transfer=movie.actors.receiver!.findIndex(f=>f.holds==='cup');
  assert.ok(transfer>=72&&transfer<=73,`transfer should occur on cue with adequate pre-roll, got ${transfer}`);
  assert.deepEqual(movie.diagnostics??[],[]);
  const withoutOffer=structuredClone(source);withoutOffer.tracks[0]!.events.splice(1);
  const resting=bakeSceneMotor(withoutOffer,{width:1280,height:720})!;
  const offered=movie.actors.giver![65]!.reach!,rest=resting.actors.giver![65]!.reach!;
  assert.ok(Math.hypot(offered[0]-rest[0],offered[1]-rest[1])>10,'giver must prepare an offer before cue without extra author calls');
  source.tracks[0]!.events[1]!.start=.05;
  const late=bakeSceneMotor(source,{width:1280,height:720})!;
  assert.ok(late.diagnostics?.some(d=>d.includes('contact cue')),'infeasible cue must be surfaced rather than snapped');
});

test('release and transfer withdrawal overlap authored arm without deferred endpoint jumps',async()=>{
  const {evaluatePerformance}=await import('../src/performance/evaluate');
  const {solveActorFigure,deriveActorPose}=await import('../src/components/performance/actorPose');
  const artwork=await artworkFixture();
  const views=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,artwork.views[v].skeleton])) as Record<FigureView,Skeleton>;
  const common={groundY:650,scale:.6,skeleton:artwork.views.front.skeleton,skeletonViews:views};
  const movie=simulateScene({durationSec:6,actors:[
    {...common,id:'giver',x:750,facing:-1,intents:[{at:0,duration:1,intent:'grab',target:'cup'}]},
    {...common,id:'receiver',x:350,facing:1,intents:[{at:1,duration:1.6,intent:'move',target:'giver',grab:'cup'},{at:3.5,duration:.1,intent:'release',target:'cup'}]},
  ],props:[{id:'cup',x:650,y:480,size:[12,16],intents:[]}],groundY:650,resolveX:id=>id==='giver'?750:650});
  for(const id of ['giver','receiver']){
    const frames=movie.actors[id]!;
    const start=frames.findIndex((f,i)=>i>0&&!f.holds&&frames[i-1]!.holds);
    assert.ok(start>0);
    const clear=frames.findIndex((f,i)=>i>start&&!f.reach);
    const manifest={video:{width:1280,height:720,fps:24},durationInFrames:144,actors:[
      {id,artwork,skeleton:artwork.views.front.skeleton,placement:{at:[id==='giver'?750:350,650],scale:.6},tracks:[{kind:'bone',events:[{frame:start,endFrame:143,value:{action:'point',parts:['arm_u_r','arm_l_r','hand_r']}}]}]},
    ],props:[{id:'cup',at:[650,480]}],sceneTrack:[{start:0,end:6,motor:movie}]} as PerformanceManifest;
    const overlap=evaluatePerformance(manifest,clear-1).actors[0]!;
    const actual=solveActorFigure(overlap).pose.armRight,authored=deriveActorPose(overlap).armRight;
    assert.ok(Math.abs(actual.upper-authored.upper)<.1,`${id} must regain authored control before reach clears`);
    const warnings=detectPropDiscontinuities(manifest).filter(w=>w.id.startsWith(id+'.')&&w.frame>=start&&w.frame<=clear+1);
    assert.deepEqual(warnings,[],`${id} must not jump during outgoing authored-arm overlap`);
  }
});

test('socket transfer preserves orientation and one-call release frees gravity while hold persists',async()=>{
  const art=await artworkFixture();
  const views=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  const common={groundY:650,scale:.6,skeleton:art.views.front.skeleton,skeletonViews:views};
  const movie=simulateScene({durationSec:8,actors:[
    {...common,id:'giver',x:750,facing:-1,intents:[{at:0,duration:.2,intent:'grab',target:'cup'}]},
    {...common,id:'receiver',x:350,facing:1,intents:[{at:2,duration:.2,intent:'move',target:'giver',grab:'cup'},{at:6,duration:.1,intent:'release',target:'cup'}]},
  ],props:[{id:'cup',x:650,y:480,size:[40,50],grip:{at:[26,-25],radius:2,depth:'behind'},rotation:20,intents:[]}],groundY:650,resolveX:id=>id==='giver'?750:650});
  const transfer=movie.actors.receiver!.findIndex(f=>f.holds==='cup');assert.ok(transfer>48);
  assert.ok(movie.actors.receiver!.slice(transfer,144).every(f=>f.holds==='cup'),'holding must not expire at intent end');
  for(let i=1;i<144;i++)assert.ok(Math.abs(movie.props.cup![i]!.rotation!-movie.props.cup![i-1]!.rotation!)<=3.76,'rotation including transfer is rate limited to 90deg/s');
  assert.ok(movie.actors.receiver!.slice(144).every(f=>!f.holds));
  assert.ok(movie.props.cup!.slice(144).some(f=>f.falling),'one release must free gravity');
  assert.equal(movie.props.cup!.at(-1)!.y,650,'prop lands on support without extra author calls');
  const {evaluatePerformance}=await import('../src/performance/evaluate');
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:192,actors:[{id:'receiver',artwork:art,skeleton:art.views.front.skeleton,placement:{at:[350,650],scale:.6}}],props:[{id:'cup',at:[650,480]}],sceneTrack:[{start:0,end:8,motor:movie}]} as PerformanceManifest;
  const state=evaluatePerformance(manifest,100);
  assert.equal(state.props[0]!.rotation,movie.props.cup![100]!.rotation,'renderer must consume baked orientation instead of zeroing it');
  assert.equal(state.actors[0]!.gripDepth,'behind');
});

test('explicit free release detaches immediately below a higher support while putdown stays support-aware',async()=>{
  const art=await artworkFixture();const views=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  const base:MotorScene={durationSec:4,actors:[{id:'hero',x:500,groundY:650,facing:1 as const,scale:.6,skeleton:art.views.front.skeleton,skeletonViews:views,intents:[{at:0,duration:1,intent:'grab' as const,target:'cup'},{at:2,duration:.8,intent:'release' as const,target:'cup',releaseMode:'free' as const}]}],props:[{id:'cup',x:580,y:540,size:[30,40] as [number,number],intents:[]}],supports:[{x0:0,x1:1280,y:400}],groundY:650,resolveX:()=>580};
  const free=simulateScene(base);
  assert.ok(free.actors.hero![47]!.holds);
  assert.ok(!free.actors.hero![48]!.holds&&free.actors.hero![48]!.reach,'free release immediately detaches and naturally withdraws');
  assert.ok(Math.hypot(free.props.cup![48]!.x-free.props.cup![47]!.x,free.props.cup![48]!.y-free.props.cup![47]!.y)<10,'detach position is continuous');
  assert.equal(free.props.cup!.at(-1)!.y,650,'free release below a shelf must fall to ground, not lift onto shelf');
  const place={...base,actors:structuredClone(base.actors)};place.actors[0]!.intents[1]!.releaseMode='place';
  const placed=simulateScene(place);
  assert.ok(placed.actors.hero![48]!.holds,'putdown retains support-aware lifting before opening');
  assert.equal(placed.props.cup!.at(-1)!.y,400);
});

test('free release retains moving carry velocity and cannot remotely bind an idle recipient',async()=>{
  const art=await artworkFixture();const views=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  const common={groundY:650,scale:.6,skeleton:art.views.front.skeleton,skeletonViews:views};
  const movie=simulateScene({durationSec:3,actors:[
    {...common,id:'giver',x:600,facing:-1,intents:[{at:0,duration:1,intent:'grab',target:'cup'},{at:1.8,duration:1,intent:'grab',target:'cup',offerTo:'receiver',contactAt:2.4},{at:2,duration:.1,intent:'release',releaseMode:'free',target:'cup'}]},
    {...common,id:'receiver',x:300,facing:1,intents:[]},
  ],props:[{id:'cup',x:520,y:540,size:[30,40],intents:[]}],groundY:650,resolveX:()=>520});
  const props=movie.props.cup!;
  const previousDx=props[47]!.x-props[46]!.x,freeDx=props[48]!.x-props[47]!.x;
  assert.ok(Math.abs(previousDx)>1,'challenge must release a moving held object');
  assert.ok(Math.abs(freeDx)>1&&Math.sign(freeDx)===Math.sign(previousDx),'free release retains carry momentum');
  assert.ok(Math.abs(freeDx-previousDx)<6,'velocity must not reset to zero or teleport');
  assert.ok(movie.actors.receiver!.every(f=>!f.holds),'no receiver contact means no remote binding');
});
