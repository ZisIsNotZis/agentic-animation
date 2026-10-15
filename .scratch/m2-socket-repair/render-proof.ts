import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {simulateScene} from '../../packages/core/src/motor';
import {FIGURE_VIEWS, type FigureView} from '../../packages/core/src/schemas/figureArtwork';
import type {Skeleton} from '../../packages/core/src/schemas/libraryMeta';
import {FigureArtworkSchema} from '../../packages/core/src/schemas/libraryMeta';
import {evaluatePerformance} from '../../packages/studio/src/performance/evaluate';
import {PerformanceProp} from '../../packages/studio/src/components/performance/Prop';
import {PerformanceActor} from '../../packages/studio/src/components/performance/Actor';
import type {PerformanceManifest} from '../../packages/studio/src/performance/types';
const artwork=FigureArtworkSchema.parse(JSON.parse(readFileSync('/tmp/agentic-animation-art-m2-parts-20261008/workspace/library/figure/lin_b_draft/artwork.json','utf8')));
const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,artwork.views[v].skeleton])) as Record<FigureView,Skeleton>;
const common={groundY:650,scale:.8,skeleton:artwork.views.front.skeleton,skeletonViews};
const movie=simulateScene({durationSec:8,actors:[{...common,id:'hero',x:400,facing:1,orientations:[{at:0,orientation:'right'}],intents:[{at:0,duration:1.6,intent:'move',target:'cup',grab:'cup'},{at:6,duration:.8,intent:'release',releaseMode:'free',target:'cup'}]}],props:[{id:'cup',x:650,y:650,size:[50,40],grip:{at:[12,-14],radius:1.5,depth:'front'},intents:[]}],groundY:650,resolveX:()=>650});
const manifest={video:{width:1280,height:720,fps:24},durationInFrames:192,actors:[{id:'hero',artwork,skeleton:artwork.views.front.skeleton,placement:{at:[400,650],scale:.8},tracks:[{kind:'bone',events:[{frame:0,endFrame:192,value:{orientation:'right'}}]}]}],props:[{id:'cup',at:[650,650],size:[50,40],base:132}],sceneTrack:[{start:0,end:8,motor:movie}]} as PerformanceManifest;
const transfer=movie.actors.hero!.findIndex(f=>f.holds==='cup');
if(transfer<1)throw new Error('proof challenge never binds');
const frames=[8,transfer-1,transfer,60,144,168];
let html='<html><body style="margin:0;background:#eee;font-family:sans-serif">';
for(const frame of frames){
 const state=evaluatePerformance(manifest,frame); const prop=state.props[0]!;
 const body=state.actors.map(actor=>renderToStaticMarkup(React.createElement(PerformanceActor,{actor,props:[]}))).join('') + renderToStaticMarkup(React.createElement(PerformanceProp,{prop})) + state.actors.filter(a=>a.holds||a.contact).map(actor=>renderToStaticMarkup(React.createElement(PerformanceActor,{actor,props:[],handsOnly:true}))).join('');
 html+=`<div style="position:relative;width:1280px;height:720px;background:#f4eedb;zoom:.5;display:inline-block"><strong style="position:absolute;left:30px;top:30px;font-size:32px">Diagnostic frame ${frame}: ${state.actors.map(a=>a.id+' '+(a.holds??'free')).join(' / ')}</strong>${body}<svg style="position:absolute;left:0;top:0;z-index:100;width:1280px;height:720px">${state.actors.filter(a=>a.reach).map(a=>`<circle cx="${a.reach![0]}" cy="${a.reach![1]}" r="4" fill="red"/>`).join('')}</svg></div>`;
}
html+='</body></html>';
mkdirSync('/tmp/m2-socket-repair-proof',{recursive:true});
writeFileSync('/tmp/m2-socket-repair-proof/index.html',html);
writeFileSync('/tmp/m2-socket-repair-proof/manifest.json',JSON.stringify(manifest));
console.log(JSON.stringify({frames,transfer,artwork:'actual draft lin_b_draft',limitation:'synthetic diagnostic prop and motor intent challenge, not canonical media/AV acceptance'}));

import {detectPropDiscontinuities} from '../../packages/studio/src/performance/teleports';
writeFileSync('.scratch/m2-socket-repair/proof-warnings.json',JSON.stringify(detectPropDiscontinuities(manifest),null,2));
