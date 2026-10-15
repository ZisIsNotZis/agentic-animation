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
const cases=[];
for(const orientation of ['front','front-right','right','back-right','back','back-left','left','front-left']) for(const direction of [-1,1] as const){
 const movie=simulateScene({durationSec:8,actors:[{...common,id:'hero',x:650-direction*250,facing:direction,orientations:[{at:0,orientation}],intents:[{at:0,duration:1.6,intent:'move',target:'cup',grab:'cup'},{at:6,duration:.8,intent:'release',releaseMode:'free',target:'cup'}]}],props:[{id:'cup',x:650,y:650,size:[50,40],grip:{at:[12,-14],radius:1.5,depth:'front'},intents:[]}],groundY:650,resolveX:()=>650});
 const bound=movie.actors.hero!.findIndex(f=>f.holds==='cup');
 const persistent=movie.actors.hero!.slice(60,144).every(f=>f.holds==='cup');
 const rest=movie.actors.hero!.slice(-12).every(f=>!f.holds&&!f.reach);
 cases.push({orientation,direction,bound,persistent,rest});
}
writeFileSync('.scratch/m2-socket-repair/view-proof.json',JSON.stringify(cases,null,2));
if(cases.some(c=>c.bound<0||!c.persistent||!c.rest)) throw Error(JSON.stringify(cases));
console.log('Actual draft socket pickup/hold/free-release: 16/16 cases pass (no visual/AV assertion)');
