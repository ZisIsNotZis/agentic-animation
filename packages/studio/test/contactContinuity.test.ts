import {test} from 'node:test';
import assert from 'node:assert/strict';
import {artworkFixture,nativeDraftArtworkFixture} from '../../core/test/helpers/figureArtwork';
import {simulateScene,type MotorScene} from '../../core/src/motor';
import {FIGURE_VIEWS, figureViewForOrientation, type FigureView} from '../../core/src/schemas/figureArtwork';
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
  const art=await nativeDraftArtworkFixture();
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
  const artwork=await nativeDraftArtworkFixture();
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
    const mid=evaluatePerformance(manifest,start+8).actors[0]!;
    assert.ok(mid.reachInfluence!>0 && mid.reachInfluence!<1,'challenge must exercise live overlapping arbitration');
    const authoredMid=deriveActorPose(mid).armRight;
    const contactMid=solveActorFigure({...mid,reachInfluence:1}).pose.armRight;
    const blendedMid=solveActorFigure(mid).pose.armRight;
    assert.ok(Math.abs(contactMid.upper-authoredMid.upper)>5,'authored and outgoing contact poses must differ meaningfully');
    assert.ok(Math.abs(blendedMid.upper-contactMid.upper)>2,'authored gesture contributes before withdrawal finishes');
    const {designHandToWorld}=await import('../src/components/performance/reach');
    const full=solveActorFigure({...mid,reachInfluence:1});
    const rest=solveActorFigure({...mid,reachInfluence:0});
    const blended=solveActorFigure(mid);
    const world=(figure:typeof full)=>designHandToWorld(mid,figure.solved!.joints.hand_r!,figure.space,figure.flipped);
    const a=world(rest),b=world(full),c=world(blended);
    assert.ok(Math.hypot(c[0]-(a[0]+(b[0]-a[0])*mid.reachInfluence!),c[1]-(a[1]+(b[1]-a[1])*mid.reachInfluence!))<.02,'visible target arbitration is Cartesian');
    const overlap=evaluatePerformance(manifest,clear-1).actors[0]!;
    const actual=solveActorFigure(overlap).pose.armRight,authored=deriveActorPose(overlap).armRight;
    assert.ok(Math.abs(actual.upper-authored.upper)<.1,`${id} must regain authored control before reach clears: ${actual.upper} vs ${authored.upper}; weight ${overlap.reachInfluence}; start ${start} clear ${clear}`);
    const warnings=detectPropDiscontinuities(manifest).filter(w=>w.id.startsWith(id+'.')&&w.frame>=start&&w.frame<=clear+1);
    assert.deepEqual(warnings,[],`${id} must not jump during outgoing authored-arm overlap`);
  }
});

test('socket transfer preserves orientation and one-call release frees gravity while hold persists',async()=>{
  const art=await nativeDraftArtworkFixture();
  const views=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  const common={groundY:650,scale:.6,skeleton:art.views.front.skeleton,skeletonViews:views};
  const movie=simulateScene({durationSec:8,actors:[
    {...common,id:'giver',x:750,facing:-1,intents:[{at:0,duration:.2,intent:'grab',target:'cup'}]},
    {...common,id:'receiver',x:350,facing:1,intents:[{at:2,duration:.2,intent:'move',target:'giver',grab:'cup'},{at:6,duration:.1,intent:'release',releaseMode:'free',target:'cup'}]},
  ],props:[{id:'cup',x:650,y:480,size:[40,50],grip:{at:[26,-25],radius:2,depth:'behind'},rotation:20,intents:[]}],groundY:650,resolveX:id=>id==='giver'?750:650});
  const transfer=movie.actors.receiver!.findIndex(f=>f.holds==='cup');assert.ok(transfer>48);
  assert.ok(movie.actors.receiver!.slice(transfer,144).every(f=>f.holds==='cup'),'holding must not expire at intent end');
  for(let i=1;i<144;i++)assert.ok(Math.abs(movie.props.cup![i]!.rotation!-movie.props.cup![i-1]!.rotation!)<=3.76,'rotation including transfer is rate limited to 90deg/s');
  assert.ok(movie.actors.receiver!.slice(144).every(f=>!f.holds));
  assert.ok(movie.props.cup!.slice(144).some(f=>f.falling),'one release must free gravity');
  assert.equal(movie.props.cup!.at(-1)!.y,650,'prop lands on support without extra author calls');
  const {evaluatePerformance}=await import('../src/performance/evaluate');
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:192,actors:[{id:'receiver',artwork:art,skeleton:art.views.front.skeleton,placement:{at:[350,650],scale:.6}},{id:'giver',artwork:art,skeleton:art.views.front.skeleton,placement:{at:[750,650],scale:.6}}],props:[{id:'cup',at:[650,480]}],sceneTrack:[{start:0,end:8,motor:movie}]} as PerformanceManifest;
  assert.deepEqual(detectPropDiscontinuities(manifest).filter(w=>/\.(hand|elbow|shoulder)/.test(w.id)),[],'native socket handover and free release have continuous drawn arm FK');
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


test('actual native draft socket pickup is reachable and FK-continuous in all sixteen view/travel cases',async()=>{
  const {solveActorFigure}=await import('../src/components/performance/actorPose');
  const {evaluatePerformance}=await import('../src/performance/evaluate');
  const art=await nativeDraftArtworkFixture();
  const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  for(const orientation of ['front','front-right','right','back-right','back','back-left','left','front-left'])for(const direction of [-1,1] as const){
    const movie=simulateScene({durationSec:8,actors:[{id:'hero',x:650-direction*250,groundY:650,scale:.8,facing:direction,skeleton:art.views.front.skeleton,skeletonViews,orientations:[{at:0,orientation}],intents:[{at:0,duration:1.6,intent:'move',target:'cup',grab:'cup'},{at:6,duration:.8,intent:'release',releaseMode:'free',target:'cup'}]}],props:[{id:'cup',x:650,y:650,size:[50,40],grip:{at:[12,-14],radius:1.5,depth:'front'},intents:[]}],groundY:650,resolveX:()=>650});
    const label=`${orientation}/${direction}`,frames=movie.actors.hero!;
    assert.ok(frames.findIndex(f=>f.holds==='cup')>=0,`${label} binds real handle`);
    assert.ok(frames.slice(60,144).every(f=>f.holds==='cup'),`${label} persistent hold`);
    assert.ok(frames.slice(144).every(f=>!f.holds),`${label} free release`);
    assert.ok(frames.slice(-12).every(f=>!f.reach),`${label} natural rest`);
    assert.equal(movie.props.cup!.at(-1)!.y,650);
    const manifest={video:{width:1280,height:720,fps:24},durationInFrames:192,actors:[{id:'hero',artwork:art,skeleton:art.views.front.skeleton,placement:{at:[650-direction*250,650],scale:.8},tracks:[{kind:'bone',events:[{frame:0,endFrame:192,value:{orientation}}]}]}],props:[{id:'cup',at:[650,650]}],sceneTrack:[{start:0,end:8,motor:movie}]} as PerformanceManifest;
    for(let i=0;i<144;i++)if(frames[i]!.holds){
      const actor=evaluatePerformance(manifest,i).actors[0]!,fk=solveActorFigure(actor);
      const h=fk.solved!.hands.hand_r!.center;
      const world=[actor.x+(fk.flipped?-1:1)*(h[0]-fk.space.width/2)*actor.scale,actor.y+(h[1]-fk.space.height)*actor.scale];
      assert.ok(Math.hypot(world[0]!-actor.reach![0],world[1]!-actor.reach![1])<.02,`${label} drawn palm equals contact`);
      const prop=movie.props.cup![i]!,angle=prop.rotation!*Math.PI/180;
      const socket=[prop.x+12*Math.cos(angle)+14*Math.sin(angle),prop.y+12*Math.sin(angle)-14*Math.cos(angle)];
      assert.ok(Math.hypot(world[0]!-socket[0]!,world[1]!-socket[1]!)<1.6,`${label} drawn palm remains on rotated handle`);
      assert.equal(actor.gripDepth,'front');

    }
    assert.deepEqual(detectPropDiscontinuities(manifest).filter(w=>w.id.startsWith('hero.')),[],`${label} native full-chain continuity`);
    const bind=frames.findIndex(f=>f.holds==='cup');
    assert.deepEqual(detectPropDiscontinuities(manifest).filter(w=>w.frame>=bind&&/hero\.(knee|foot)/.test(w.id)),[],`${label} planted crouch recovery continuity`);
  }
});


test('actual native draft socket handover and free release stay continuous in all sixteen view/travel cases',async()=>{
  const art=await nativeDraftArtworkFixture();
  const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  const common={groundY:650,scale:.8,skeleton:art.views.front.skeleton,skeletonViews};
  for(const orientation of ['front','front-right','right','back-right','back','back-left','left','front-left'])for(const direction of [-1,1] as const){
    const movie=simulateScene({durationSec:8,actors:[
      {...common,id:'giver',x:650+direction*100,facing:(-direction) as 1|-1,orientations:[{at:0,orientation}],intents:[{at:0,duration:.2,intent:'grab',target:'cup'}]},
      {...common,id:'receiver',x:650-direction*300,facing:direction,orientations:[{at:0,orientation}],intents:[{at:2,duration:.2,intent:'move',target:'giver',grab:'cup'},{at:6,duration:.1,intent:'release',releaseMode:'free',target:'cup'}]},
    ],props:[{id:'cup',x:650,y:480,size:[40,50],grip:{at:[26,-25],radius:2,depth:'behind'},rotation:20,intents:[]}],groundY:650,resolveX:id=>id==='giver'?650+direction*100:650});
    const label=`${orientation}/${direction}`,receiver=movie.actors.receiver!,giver=movie.actors.giver!;
    const transfer=receiver.findIndex(f=>f.holds==='cup');
    assert.ok(transfer>48,`${label} contact-controlled transfer`);
    assert.ok(giver.slice(0,transfer).some(f=>f.holds==='cup'),`${label} giver picked up`);
    assert.ok(!giver[transfer]!.holds&&giver[transfer]!.reach,`${label} giver withdraws`);
    assert.ok(receiver.slice(transfer,144).every(f=>f.holds==='cup'),`${label} receiver holds beyond intent`);
    assert.ok(receiver.slice(144).every(f=>!f.holds),`${label} one-call release`);
    assert.equal(movie.props.cup!.at(-1)!.y,650);
    for(let i=1;i<144;i++)assert.ok(Math.abs(movie.props.cup![i]!.rotation!-movie.props.cup![i-1]!.rotation!)<=3.76,`${label} continuous socket orientation`);
    const manifest={video:{width:1280,height:720,fps:24},durationInFrames:192,actors:['giver','receiver'].map(id=>({id,artwork:art,skeleton:art.views.front.skeleton,placement:{at:[id==='giver'?650+direction*100:650-direction*300,650],scale:.8},tracks:[{kind:'bone',events:[{frame:0,endFrame:192,value:{orientation}}]}]})),props:[{id:'cup',at:[650,480]}],sceneTrack:[{start:0,end:8,motor:movie}]} as PerformanceManifest;
    assert.deepEqual(detectPropDiscontinuities(manifest).filter(w=>/\.(hand|elbow|shoulder)/.test(w.id)),[],`${label} drawn arm FK through transfer/release`);
  }
});

test('short native point returns continuously at its authored endpoint with cleared or residual reach',async()=>{
  const {evaluatePerformance}=await import('../src/performance/evaluate');
  const {solveActorFigure}=await import('../src/components/performance/actorPose');
  const art=await nativeDraftArtworkFixture();
  for(const residual of [false,true]){
    const manifest={video:{width:1920,height:1080,fps:24},durationInFrames:26,
      actors:[{id:'hero',artwork:art,skeleton:art.views.side.skeleton,placement:{at:[900,690],scale:.88},tracks:[{kind:'bone',events:[{frame:0,endFrame:24,value:{action:'point',parts:['arm_u_r','arm_l_r','hand_r']}}]}]}],
      sceneTrack:[{frame:0,endFrame:26,motor:{fps:24,actors:{hero:Array.from({length:26},()=>({x:900,lean:0,facing:1,walk:0,...(residual?{reach:[925,470],reachInfluence:0}:{})}))},props:{}}}],
    } as PerformanceManifest;
    const active=evaluatePerformance(manifest,23).actors[0]!;
    for(const track of active.tracks)for(const event of track.events)if(event.active)event.progress=1;
    const before=solveActorFigure(active),after=solveActorFigure(evaluatePerformance(manifest,24).actors[0]!);
    for(const joint of ['hand_r','elbow_r'])assert.ok(Math.hypot(...before.solved!.joints[joint]!.map((v,i)=>v-after.solved!.joints[joint]![i]!) as [number,number])*.88<.02,`${residual}/${joint} limiting endpoint`);
    assert.deepEqual(detectPropDiscontinuities(manifest).filter(w=>/\.(hand|elbow)/.test(w.id)),[]);
  }
});

test('fractional native transfer cue never appears before presentation time',async()=>{
  const {bakeSceneMotor}=await import('../../core/src/motor');
  const art=await nativeDraftArtworkFixture();
  const views=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  for(const phase of [.05,.25,.5,.75,.95]){
    const cue=3+phase/24;
    const movie=bakeSceneMotor({durationSec:6,actors:{giver:{at:[.65,.64],scale:.88,skeleton:art.views.front.skeleton,skeletonViews:views},receiver:{at:[.35,.64],scale:.88,skeleton:art.views.front.skeleton,skeletonViews:views}},objects:{cup:{at:[.5,.64],size:[75,90],grip:{at:[18,-45],radius:2,depth:'front'}}},tracks:[
      {subject:'giver',events:[{start:0,end:0,tracks:[{kind:'motor',events:[{intent:'move',target:'cup',grab:'cup',duration:1.6}]}]}]},
      {subject:'receiver',events:[{start:cue,end:cue,tracks:[{kind:'motor',events:[{intent:'move',target:'giver',grab:'cup',duration:1.6}]}]}]},
    ]})!;
    const first=movie.actors.receiver!.findIndex(f=>f.holds==='cup');
    assert.equal(first,Math.ceil(cue*24),`cue ${cue}: first non-early contact`);
    assert.ok(movie.actors.receiver!.slice(0,first).every(f=>!f.holds&&!f.contact));
  }
});

test('native canonical-scale two-call contact sweeps rendered presentation arms through claim exit',async()=>{
  const {bakeSceneMotor}=await import('../../core/src/motor');
  const art=await nativeDraftArtworkFixture();
  const views=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  for(const orientation of ['front','right','left','back','front-right','front-left','back-right','back-left']){
    const cue=3.476644;
    const actors={giver:{at:[.65,.64] as const,facing:-1,scale:.88,skeleton:art.views.front.skeleton,skeletonViews:views},receiver:{at:[.35,.64] as const,facing:1,scale:.88,skeleton:art.views.front.skeleton,skeletonViews:views}};
    const tracks=Object.keys(actors).map(subject=>({subject,events:[{start:0,end:.2,tracks:[{kind:'bone',events:[{value:{orientation}}]}]},
      {start:subject==='giver'?0:cue,end:subject==='giver'?0:cue,tracks:[{kind:'motor',events:[{intent:'move',target:subject==='giver'?'cup':'giver',grab:'cup',duration:1.6}]}]}]}));
    const movie=bakeSceneMotor({durationSec:6.726666,actors,objects:{cup:{at:[.5,.64],size:[200,160],grip:{at:[36,-42],radius:1.5,depth:'front'},touchBox:{a:[-24,-70.5],b:[24,0]}}},tracks})!;
    const manifest={video:{width:1920,height:1080,fps:24},durationInFrames:162,actors:Object.entries(actors).map(([id,a])=>({id,artwork:art,skeleton:a.skeleton,placement:{at:[a.at[0]*1920,a.at[1]*1080],scale:.88},tracks:[{kind:'bone',events:[{frame:0,endFrame:162,value:{orientation}},{frame:Math.floor(cue*24),endFrame:120,value:{action:'present',parts:['arm_u_r','arm_l_r','hand_r']}}]}]})),props:[{id:'cup',at:[960,691.2]}],sceneTrack:[{start:0,end:6.726666,motor:movie}]} as PerformanceManifest;
    assert.equal(movie.actors.receiver!.findIndex(f=>f.holds==='cup'),84,`${orientation} non-early cue`);
    assert.deepEqual(detectPropDiscontinuities(manifest),[],`${orientation} rendered whole-body/prop/claim/deletion endpoints`);
  }
});

test('native leg IK preserves declared rest bend in every view',async()=>{
  const {plantedLegAngles}=await import('../../core/src/motor/skeleton');
  const art=await nativeDraftArtworkFixture();
  for(const view of FIGURE_VIEWS) for(const side of ['l','r'] as const){
    const sk=art.views[view].skeleton;
    const rest=plantedLegAngles(sk,side,0);
    assert.ok(Math.abs(rest.upper)<.01 && Math.abs(rest.lower)<.01,`${view}/${side} rest round trip ${JSON.stringify(rest)}`);
    const near=plantedLegAngles(sk,side,.000001);
    assert.ok(Math.abs(near.upper)<.01 && Math.abs(near.lower)<.01,`${view}/${side} limiting onset`);
  }
});

test('orientation-only claim retains view without transient torso tilt at exit',async()=>{
  const {solveActorFigure}=await import('../src/components/performance/actorPose');
  const {evaluatePerformance}=await import('../src/performance/evaluate');
  const art=await nativeDraftArtworkFixture();
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:8,
    actors:[{id:'hero',artwork:art,skeleton:art.views.front.skeleton,placement:{at:[500,650],scale:.6},
      tracks:[{kind:'bone',events:[{frame:0,endFrame:5,value:{action:'turn the body front-right'}}]}]}],
  } as PerformanceManifest;
  for(let f=0;f<8;f++) assert.equal(solveActorFigure(evaluatePerformance(manifest,f).actors[0]!).waistPitch,0,`orientation claim f${f}`);
});

test('native canonical loaded recovery and unloaded rendered withdrawal obey world velocity ceilings',async()=>{
  const {bakeSceneMotor}=await import('../../core/src/motor');
  const {evaluatePerformance}=await import('../src/performance/evaluate');
  const {solveActorFigure}=await import('../src/components/performance/actorPose');
  const {designHandToWorld}=await import('../src/components/performance/reach');
  const art=await nativeDraftArtworkFixture();
  const views=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  for(const orientation of ['front','right','left','front-right']){
    const cue=3.476644;
    const actors={giver:{at:[.65,.64] as const,facing:-1,scale:.88,skeleton:art.views.front.skeleton,skeletonViews:views},receiver:{at:[.35,.64] as const,facing:1,scale:.88,skeleton:art.views.front.skeleton,skeletonViews:views}};
    const tracks=Object.keys(actors).map(subject=>({subject,events:[{start:0,end:.2,tracks:[{kind:'bone',events:[{value:{orientation}}]}]},
      {start:subject==='giver'?0:cue,end:subject==='giver'?0:cue,tracks:[{kind:'motor',events:[{intent:'move',target:subject==='giver'?'cup':'giver',grab:'cup',duration:1.6}]}]}]}));
    const movie=bakeSceneMotor({durationSec:6.726666,actors,objects:{cup:{at:[.5,.64],size:[200,160],grip:{at:[36,-42],radius:1.5,depth:'front'},touchBox:{a:[-24,-70.5],b:[24,0]}}},tracks})!;
    const manifest={video:{width:1920,height:1080,fps:24},durationInFrames:162,actors:Object.entries(actors).map(([id,a])=>({id,artwork:art,skeleton:a.skeleton,placement:{at:[a.at[0]*1920,a.at[1]*1080],scale:.88},tracks:[{kind:'bone',events:[{frame:0,endFrame:162,value:{orientation}},{frame:Math.floor(cue*24),endFrame:120,value:{action:'present',parts:['arm_u_r','arm_l_r','hand_r']}}]}]})),props:[{id:'cup',at:[960,691.2]}],sceneTrack:[{start:0,end:6.726666,motor:movie}]} as PerformanceManifest;
    for(let f=1;f<162;f++){
      const p=movie.props.cup![f-1]!,q=movie.props.cup![f]!;
      assert.ok(Math.hypot(q.x-p.x,q.y-p.y)<=30.01,`${orientation} loaded prop f${f}`);
      const a=evaluatePerformance(manifest,f-1).actors.find(a=>a.id==='giver')!,b=evaluatePerformance(manifest,f).actors.find(a=>a.id==='giver')!;
      if(f<84||a.holds||b.holds)continue;
      const fa=solveActorFigure(a),fb=solveActorFigure(b);
      const ha=designHandToWorld(a,fa.solved!.joints.hand_r!,fa.space,fa.flipped),hb=designHandToWorld(b,fb.solved!.joints.hand_r!,fb.space,fb.flipped);
      assert.ok(Math.hypot(hb[0]-ha[0],hb[1]-ha[1])<=20.01,`${orientation} unloaded rendered f${f}`);
    }
  }
});

test('native held-view limiter exhaustion is diagnostic without breaking the grip',async()=>{
  const art=await nativeDraftArtworkFixture();
  const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  const scene: MotorScene={durationSec:8,actors:[{id:'hero',x:750,groundY:650,facing:-1,scale:.88,
    skeleton:art.views.front.skeleton,skeletonViews,orientations:[{at:0,orientation:'right'},{at:3,orientation:'left'}],
    intents:[{at:0,duration:1.6,intent:'move',target:'cup',grab:'cup'},{at:6,duration:1,intent:'release',target:'cup',releaseMode:'free'}]}],
    props:[{id:'cup',x:650,y:650,size:[50,40],grip:{at:[12,-14],radius:1.5,depth:'front'},intents:[]}],groundY:650,resolveX:()=>650};
  const movie=simulateScene(scene);
  const diagnostics=movie.diagnostics?.filter(d=>d.startsWith('whole-body proposal exhausted:'))??[];
  assert.equal(diagnostics.length,1,'one bounded diagnostic per actor, not a substep log flood');
  assert.match(diagnostics[0]!,/hero.*3\.000s.*original controllers\/ownership retained/);
  assert.equal(movie.actors.hero![72]!.holds,'cup','diagnosis must not detach the held object');
  assert.equal(movie.actors.hero![72]!.orientation,'right','infeasible view change rolls back the complete body, not just the hand');
  const {evaluatePerformance}=await import('../src/performance/evaluate');
  const {solveActorFigure}=await import('../src/components/performance/actorPose');
  const {designHandToWorld}=await import('../src/components/performance/reach');
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:192,
    actors:[{id:'hero',artwork:art,skeleton:art.views.front.skeleton,placement:{at:[750,650],scale:.88},
      tracks:[{kind:'bone',events:[{frame:0,endFrame:72,value:{orientation:'right'}},{frame:72,endFrame:192,value:{orientation:'left'}}]}]}],
    props:[{id:'cup',at:[650,650]}],sceneTrack:[{start:0,end:8,motor:movie}]} as PerformanceManifest;
  for(const frame of [71,72,73,74,75]){
    const actor=evaluatePerformance(manifest,frame).actors[0]!;
    const figure=solveActorFigure(actor);
    const palm=designHandToWorld(actor,figure.solved!.joints.hand_r!,figure.space,figure.flipped);
    assert.ok(Math.hypot(palm[0]-actor.reach![0],palm[1]-actor.reach![1])<.02,'no independent prop clamp masks contact');
    const prop=movie.props.cup![frame]!,angle=(prop.rotation??0)*Math.PI/180;
    const socket=[prop.x+12*Math.cos(angle)+14*Math.sin(angle),prop.y+12*Math.sin(angle)-14*Math.cos(angle)];
    assert.ok(Math.hypot(socket[0]!-palm[0],socket[1]!-palm[1])<1.6,'rotated socket remains on palm');
  }
  const quiet=simulateScene({...scene,actors:[{...scene.actors[0]!,orientations:[{at:0,orientation:'front'}]}]});
  assert.ok(!quiet.diagnostics?.some(d=>d.startsWith('whole-body proposal exhausted:')));
  const {bakeSceneMotor}=await import('../../core/src/motor');
  const baked=bakeSceneMotor({durationSec:8,
    actors:{hero:{at:[750/1280,650/720],facing:-1,scale:.88,skeleton:art.views.front.skeleton,skeletonViews}},
    objects:{cup:{at:[650/1280,650/720],size:[50,40],grip:scene.props[0]!.grip}},
    tracks:[{subject:'hero',events:[
      {start:0,tracks:[{kind:'bone',events:[{value:{orientation:'right'}}]},{kind:'motor',events:[{intent:'move',target:'cup',grab:'cup',duration:1.6}]}]},
      {start:3,tracks:[{kind:'bone',events:[{value:{orientation:'left'}}]}]},
      {start:6,tracks:[{kind:'motor',events:[{intent:'release',target:'cup',duration:1,releaseMode:'free'}]}]},
    ]}]},{width:1280,height:720})!;
  assert.ok(baked.diagnostics?.some(d=>d.startsWith('whole-body proposal exhausted:')),'compile bake must retain simulation diagnostics alongside cue diagnostics');
});
test('native world support stays planted through travel and stopping in every view and direction',async()=>{
  const art=await nativeDraftArtworkFixture();
  const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  const {evaluatePerformance}=await import('../src/performance/evaluate');
  const {solveActorFigure}=await import('../src/components/performance/actorPose');
  const {designHandToWorld}=await import('../src/components/performance/reach');
  for(const orientation of ['front','front-right','right','back-right','back','back-left','left','front-left']) for(const direction of [-1,1] as const){
    const x=650-direction*200;
    const movie=simulateScene({durationSec:3,actors:[{id:'hero',x,groundY:650,facing:direction,scale:.88,skeleton:art.views.front.skeleton,skeletonViews,orientations:[{at:0,orientation}],intents:[{at:0,duration:1,intent:'move',target:'goal'}]}],props:[],groundY:650,resolveX:()=>650});
    const manifest={video:{width:1280,height:720,fps:24},durationInFrames:72,actors:[{id:'hero',artwork:art,skeleton:art.views.front.skeleton,placement:{at:[x,650],scale:.88},tracks:[{kind:'bone',events:[{frame:0,endFrame:72,value:{orientation}}]}]}],sceneTrack:[{start:0,end:3,motor:movie}]} as PerformanceManifest;
    assert.deepEqual(detectPropDiscontinuities(manifest),[],`${orientation}/${direction} whole visible chain continuity`);
    assert.deepEqual(simulateScene({durationSec:3,actors:[{id:'hero',x,groundY:650,facing:direction,scale:.88,skeleton:art.views.front.skeleton,skeletonViews,orientations:[{at:0,orientation}],intents:[{at:0,duration:1,intent:'move',target:'goal'}]}],props:[],groundY:650,resolveX:()=>650}),movie,'deterministic duplicate bake');
    for(let frame=1;frame<72;frame++){
      assert.ok(movie.actors.hero![frame]!.footSupport?.l || movie.actors.hero![frame]!.footSupport?.r,'never evade support by labelling both feet swing');
      const a=evaluatePerformance(manifest,frame-1).actors[0]!,b=evaluatePerformance(manifest,frame).actors[0]!;
      const fa=solveActorFigure(a),fb=solveActorFigure(b);
      for(const side of ['l','r'] as const){
        if(!a.footSupport?.[side]||!b.footSupport?.[side])continue;
        const p=designHandToWorld(a,fa.solved!.joints[`foot_${side}`]!,fa.space,fa.flipped);
        const q=designHandToWorld(b,fb.solved!.joints[`foot_${side}`]!,fb.space,fb.flipped);
        const target=b.worldFootTargets![side];
        assert.ok(Math.hypot(q[0]-target[0],q[1]-target[1])<.02,'actual FK reaches anchor, not clamped target');
        const sk=b.skeleton!;
        assert.ok(Math.abs(q[1]+(sk.space.height-sk.joints[`foot_${side}`]![1])*b.scale-b.y)<.02,'independent declared ankle-to-sole height stays grounded');
        assert.ok(Math.hypot(q[0]-p[0],q[1]-p[1])<.02,`${orientation}/${direction} ${side} stance f${frame} slides ${Math.hypot(q[0]-p[0],q[1]-p[1])}`);
      }
    }
    assert.ok(movie.actors.hero!.slice(-12).every(f=>f.footSupport?.l&&f.footSupport?.r),'both feet support after completion');
    const sk=skeletonViews[figureViewForOrientation(orientation)];
    for(const f of movie.actors.hero!.slice(-12)){
      assert.equal(f.walk,0,`${orientation}/${direction} terminal gait does not restart`);
      assert.equal(f.crouch??0,0,`${orientation}/${direction} terminal gait reserve recovers upright`);
      for(const side of ['l','r'] as const){
        const foot=sk.joints[`foot_${side}`]!;
        const facing=orientation==='front'||orientation==='back'?direction:orientation.includes('left')||orientation==='left'?-1:1;
        const rest=[f.x+facing*(foot[0]-sk.space.width/2)*.88,650+(foot[1]-sk.space.height)*.88];
        assert.ok(Math.hypot(f.worldFootTargets![side][0]-rest[0]!,f.worldFootTargets![side][1]-rest[1]!)<.02,`${orientation}/${direction} ${side} terminal world rest anchor`);
      }
    }
  }
});
