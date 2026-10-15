import {test} from 'node:test';
import assert from 'node:assert/strict';
import {thermosSolid,transformSolid,solidSupport} from '../src/motor/propGeometry';
import {simulateScene} from '../src/motor';
import {nativeDraftArtworkFixture} from './helpers/figureArtwork';
import {FIGURE_VIEWS,type FigureView} from '../src/schemas/figureArtwork';
import type {Skeleton} from '../src/schemas/libraryMeta';

test('renderer thermos solid support includes rotated handle, ink and size/base transform',()=>{
  const solid=transformSolid(thermosSolid,[200,160],132,1);
  for(const angle of [0,45,90,106.494227,135,180,225,270,315]){
    const support=solidSupport(solid,angle);
    const r=angle*Math.PI/180;
    // Independent dense sampling of actual quadratic handle plus outer ink.
    for(let i=0;i<=1000;i++){
      const t=i/1000,u=1-t;
      for(const [x,y] of [[u*u*133+2*u*t*158+t*t*158,u*u*54+2*u*t*54+t*t*76],[u*u*158+2*u*t*158+t*t*133,u*u*76+2*u*t*98+t*t*98]] as [number,number][]){
        const lowest=(x-100)*Math.sin(r)+(y-132)*Math.cos(r)+4.5;
        assert.ok(support.y>=lowest-1e-8,`${angle}: handle/stroke must not penetrate`);
      }
    }
  }
  assert.ok(solidSupport(solid,106.494227).y>75,'downward handle, not body anchor, controls rest');
  const letterboxed=transformSolid(thermosSolid,[400,160],132,1);
  assert.deepEqual(solidSupport(letterboxed,90),solidSupport(solid,90),'SVG meet uses centered uniform content, not a stretched box');
  assert.equal(solidSupport(solid,0).y,4,'upright bottom ink included');
  const small=transformSolid(thermosSolid,[200,160],132,.5);
  assert.ok(Math.abs(solidSupport(small,90).y-solidSupport(solid,90).y/2)<1e-9);
});

test('rotated pickup hold free release and putdown rest on visible solid with continuous ownership',async()=>{
  const art=await nativeDraftArtworkFixture();
  const views=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,art.views[v].skeleton])) as Record<FigureView,Skeleton>;
  for(const angle of [0,45,90,106.494227,180,270])for(const mode of ['free','place'] as const){
    const solid=transformSolid(thermosSolid,[200,160],132,.25);
    const movie=simulateScene({durationSec:8,actors:[{id:'hero',x:500,groundY:650,scale:.6,facing:1,skeleton:art.views.front.skeleton,skeletonViews:views,intents:[{at:0,duration:1,intent:'grab',target:'cup'},{at:4,duration:.8,intent:'release',releaseMode:mode,target:'cup'}]}],props:[{id:'cup',x:580,y:480,size:[50,40],rotation:angle,solid,grip:{at:[9,-14],radius:1,depth:'front'},intents:[]}],supports:[{x0:0,x1:1280,y:570}],groundY:650,resolveX:()=>580});
    const actor=movie.actors.hero!,prop=movie.props.cup!;
    assert.ok(actor[95]!.holds,'hold persists until release');
    const detach=actor.findIndex((f,i)=>i>=96&&!f.holds);assert.ok(detach>=96);
    assert.ok(Math.hypot(prop[detach]!.x-prop[detach-1]!.x,prop[detach]!.y-prop[detach-1]!.y)<20,'detach position continuous');
    assert.ok(actor.slice(detach).every(f=>!f.holds),'no remote rebind');
    const end=prop.at(-1)!;assert.ok(Math.abs(end.y+solidSupport(solid,end.rotation!).y-570)<.011,`${angle}/${mode}: solid, not anchor rests on support; y=${end.y} bottom=${solidSupport(solid,end.rotation!).y} detach=${JSON.stringify(prop[detach])}`);
    assert.equal(end.rotation,prop[detach]!.rotation,'release does not snap upright');
  }
});
