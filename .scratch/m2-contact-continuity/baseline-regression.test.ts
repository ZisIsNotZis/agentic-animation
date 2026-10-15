import {test} from 'node:test';
import assert from 'node:assert/strict';
import {artworkFixture} from '../../packages/core/test/helpers/figureArtwork';
import {simulateScene} from './baseline-executable';
import {FIGURE_VIEWS, type FigureView} from '../../packages/core/src/schemas/figureArtwork';
import type {Skeleton} from '../../packages/core/src/schemas/libraryMeta';
import type {PerformanceManifest} from '../../packages/studio/src/performance/types';
import {detectPropDiscontinuities} from './detector-baseline-executable';

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
