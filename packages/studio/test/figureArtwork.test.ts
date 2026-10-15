import {test} from "node:test";
import assert from "node:assert/strict";
import {artworkFixture} from "../../core/test/helpers/figureArtwork";
import {evaluatePerformance} from "../src/performance/evaluate";
import type {PerformanceManifest} from "../src/performance/types";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {PerformanceActor} from "../src/components/performance/Actor";
import {PerformanceFrame} from "../src/components/PerformanceEpisode";
import {nativeInteractionObjectIds} from "../src/performance/interactionLayers";

test('canonical PerformanceActor consumes native art without built-in character special cases',async () => {
  const artwork=await artworkFixture();
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:24,actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.7},tracks:[{kind:'bone',events:[{frame:0,value:{orientation:'right'}}]}]}]} as PerformanceManifest;
  const actor=evaluatePerformance(manifest,0).actors[0]!;
  const html=renderToStaticMarkup(React.createElement(PerformanceActor,{actor,props:[]}));
  assert.match(html,/data-figure-artwork="svg-bone-parts"/);
  assert.match(html,/data-native-figure-view="side"/);
  assert.match(html,/data-art-part="arm_u_r"/);
});

test('native CSS bottom-centre scaling preserves the declared world anchor',async () => {
  const artwork=await artworkFixture();
  for(const scale of [.6,.88,1.2]) {
    const manifest={video:{width:1280,height:720,fps:24},durationInFrames:24,actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale}}]} as PerformanceManifest;
    const actor=evaluatePerformance(manifest,0).actors[0]!;
    const html=renderToStaticMarkup(React.createElement(PerformanceActor,{actor,props:[]}));
    const left=Number(html.match(/left:([-\d.]+)px/)![1]);
    const origin=actor.skeleton!.space.width/2;
    assert.equal(left+origin,actor.x,'CSS transform origin, not scaled width, fixes the world centre');
  }
});

test('native crouch survives the canonical motor-to-actor projection',async () => {
  const artwork=await artworkFixture();
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:48,actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.6}}],sceneTrack:[{start:0,motor:{actors:{hero:Array.from({length:48},()=>({x:500,facing:1,lean:0,walk:0,crouch:.75}))},props:{}}}]} as unknown as PerformanceManifest;
  const actor=evaluatePerformance(manifest,20).actors[0]!;
  assert.equal(actor.crouch,.75);
});

test('legacy figure motor crouch projection remains available without native artwork',async () => {
  const artwork=await artworkFixture();
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:48,actors:[{id:'hero',skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.6}}],sceneTrack:[{start:0,motor:{actors:{hero:Array.from({length:48},()=>({x:500,facing:1,lean:0,walk:0,crouch:.75}))},props:{}}}]} as unknown as PerformanceManifest;
  const actor=evaluatePerformance(manifest,20).actors[0]!;
  assert.equal(actor.crouch,.75);
  const html=renderToStaticMarkup(React.createElement(PerformanceActor,{actor,props:[]}));
  assert.doesNotMatch(html,/data-figure-artwork/);
});

test('native mouth selection follows the actual speech cue timebase, including short takes',async () => {
  const artwork=await artworkFixture();
  const manifest={video:{width:1280,height:720,fps:30},durationInFrames:15,actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.7},tracks:[{kind:'speech',events:[{frame:0,endFrame:15,text:'test',mouth:[{start:0,end:.2,viseme:'A'},{start:.2,end:.5,viseme:'D'}]}]}]}]} as PerformanceManifest;
  for (const [frame,key] of [[3,'A'],[11,'D']] as const) {
    const actor=evaluatePerformance(manifest,frame).actors[0]!;
    const html=renderToStaticMarkup(React.createElement(PerformanceActor,{actor,props:[]}));
    assert.match(html,new RegExp('data-native-viseme="'+key+'"'));
  }
});

test('reused figure clip paths are scoped independently per actor',async () => {
  const artwork=await artworkFixture();
  artwork.views.front.parts.head='<svg viewBox="0 0 400 720"><defs><clipPath id="shared"><rect width="400" height="720"/></clipPath></defs><g clip-path="url(#shared)"><path d="M0 0L1 1"/></g></svg>';
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:24,actors:['one','two'].map((id)=>({id,artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.7}}))} as PerformanceManifest;
  const html=renderToStaticMarkup(React.createElement('div',{},...evaluatePerformance(manifest,0).actors.map((actor)=>React.createElement(PerformanceActor,{key:actor.id,actor,props:[]}))));
  const ids=[...html.matchAll(/<clipPath id="([^"]+)"/g)].map((m)=>m[1]);
  assert.equal(ids.length,2);assert.equal(new Set(ids).size,2);
  assert.ok(ids.every((id)=>id.includes('shared')),'asset clip defs must actually be consumed');
  assert.doesNotMatch(html,/url\(#shared\)/);
});

test('native interaction objects remain visible between body and grip planes after release',async () => {
  const artwork=await artworkFixture();
  const manifest={video:{width:1280,height:720,fps:24},durationInFrames:24,actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[500,650],scale:.7}}],props:[{id:'cup',type:'thermos',placement:{at:[540,500],scale:.5}}],bindingConstraints:[{object:'cup',holder:'hero',startFrame:0,endFrame:4}]} as PerformanceManifest;
  const state=evaluatePerformance(manifest,20);
  assert.ok(nativeInteractionObjectIds(manifest,state.actors).has('cup'));
  const baked={...manifest,bindingConstraints:[],sceneTrack:[{motor:{actors:{hero:[{holds:'cup'},{}]}}}]} as unknown as PerformanceManifest;
  assert.ok(nativeInteractionObjectIds(baked,state.actors).has('cup'),'baked holds must survive release for layering');
  const html=renderToStaticMarkup(React.createElement(PerformanceFrame,{manifest,state}));
  assert.match(html,/data-layer="native-interaction-props"/);
  assert.match(html,/data-layer="native-contact-hands"/);
  const legacy={...manifest,actors:manifest.actors!.map((a)=>({...a,artwork:undefined}))};
  assert.equal(nativeInteractionObjectIds(legacy,evaluatePerformance(legacy,20).actors).size,0);
});

// Transport/geometry fixture only; actual character appearance is inspected in
// isolated canonical renders, never approved by this dummy-vector fixture.
test('canonical asset projection preserves artwork and chooses its native skeleton',async () => {
  const artwork=await artworkFixture();
  artwork.views.side.skeleton.joints.hand_r=[350,512];
  artwork.views.side.skeleton.arm.fore=Math.hypot(350-292,512-408);
  const compiled={video:{width:1280,height:720,fps:30},assets:{actors:{hero:{use:{instance:'hero',ref:'figure/draft_fixture',resolved:{skeleton:artwork.views.front.skeleton,artwork}}}}},
    sceneTrack:[{id:'room',start:0,end:1,duration:1,motor:{fps:24,actors:{hero:Array.from({length:24},()=>({x:400,facing:1,lean:0,walk:0,crouch:.75}))},props:{}},initial:{actors:{hero:{present:true,pose:'standing'}}},staging:{actors:{hero:{at:[400,650],scale:.6}}}}],
    performanceTracks:[{subject:'hero',kind:'actor',events:[{kind:'call',start:0,end:.2,tracks:[{kind:'bone',events:[{at:0,duration:0,value:{orientation:'right'}}]}]}]}],totalDuration:1} as unknown as PerformanceManifest;
  const frame=evaluatePerformance(compiled,10);
  const actor=frame.actors[0]!;
  assert.deepEqual(actor.artwork,artwork);
  assert.equal(actor.orientation,'right');
  assert.deepEqual(actor.skeleton,artwork.views.side.skeleton);
  assert.equal(actor.fps,30);
  assert.equal(actor.crouch,.75,'historical compiled branch retains baked crouch');
  assert.deepEqual(evaluatePerformance(compiled,10),frame,'seek-safe replay');
});
