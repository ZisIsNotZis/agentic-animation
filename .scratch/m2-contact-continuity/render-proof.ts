import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {simulateScene} from '../../packages/core/src/motor';
import {FIGURE_VIEWS, type FigureView} from '../../packages/core/src/schemas/figureArtwork';
import type {Skeleton} from '../../packages/core/src/schemas/libraryMeta';
import {FigureArtworkSchema} from '../../packages/core/src/schemas/libraryMeta';
import {evaluatePerformance} from '../../packages/studio/src/performance/evaluate';
import {PerformanceActor} from '../../packages/studio/src/components/performance/Actor';
import type {PerformanceManifest} from '../../packages/studio/src/performance/types';
const artwork=FigureArtworkSchema.parse(JSON.parse(readFileSync('/tmp/agentic-animation-art-m2-parts-20261008/workspace/library/figure/lin_b_draft/artwork.json','utf8')));
const skeletonViews=Object.fromEntries(FIGURE_VIEWS.map(v=>[v,artwork.views[v].skeleton])) as Record<FigureView,Skeleton>;
const common={groundY:650,scale:.8,skeleton:artwork.views.front.skeleton,skeletonViews};
const movie=simulateScene({durationSec:6,actors:[
 {...common,id:'giver',x:750,facing:-1,intents:[{at:0,duration:1,intent:'grab',target:'cup'}]},
 {...common,id:'receiver',x:350,facing:1,intents:[{at:1.5,duration:1.6,intent:'move',target:'giver',grab:'cup'},{at:4.5,duration:.8,intent:'release',target:'cup'}]},
],props:[{id:'cup',x:650,y:480,size:[12,16],intents:[]}],groundY:650,resolveX:id=>id==='giver'?750:650});
const manifest={video:{width:1280,height:720,fps:24},durationInFrames:144,actors:['giver','receiver'].map(id=>({id,artwork,skeleton:artwork.views.front.skeleton,placement:{at:[id==='giver'?750:350,650],scale:.8}})),props:[{id:'cup',at:[650,480]}],sceneTrack:[{start:0,end:6,motor:{fps:24,...movie}}]} as PerformanceManifest;
const transfer=movie.actors.receiver!.findIndex(f=>f.holds==='cup');
if(transfer<1)throw new Error('proof challenge never transfers');
const frames=[transfer-2,transfer-1,transfer,transfer+1,108,109];
let html='<html><body style="margin:0;background:#eee;font-family:sans-serif">';
for(const frame of frames){
 const state=evaluatePerformance(manifest,frame); const prop=state.props[0]!;
 const body=state.actors.map(actor=>renderToStaticMarkup(React.createElement(PerformanceActor,{actor,props:[]}))).join('');
 html+=`<div style="position:relative;width:1280px;height:720px;background:#f4eedb;zoom:.5;display:inline-block"><strong style="position:absolute;left:30px;top:30px;font-size:32px">Diagnostic frame ${frame}: ${state.actors.map(a=>a.id+' '+(a.holds??'free')).join(' / ')}</strong>${body}<svg style="position:absolute;left:0;top:0;z-index:100;width:1280px;height:720px"><rect x="${prop.x-6}" y="${prop.y-16}" width="12" height="16" fill="#35a"/>${state.actors.filter(a=>a.reach).map(a=>`<circle cx="${a.reach![0]}" cy="${a.reach![1]}" r="4" fill="red"/>`).join('')}</svg></div>`;
}
html+='</body></html>';
mkdirSync('/tmp/m2-contact-continuity-proof',{recursive:true});
writeFileSync('/tmp/m2-contact-continuity-proof/index.html',html);
writeFileSync('/tmp/m2-contact-continuity-proof/manifest.json',JSON.stringify(manifest));
console.log(JSON.stringify({frames,transfer,artwork:'actual draft lin_b_draft',limitation:'synthetic diagnostic prop and motor intent challenge, not canonical media/AV acceptance'}));
