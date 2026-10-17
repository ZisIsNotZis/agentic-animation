import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PropPlacementSchema} from '../src/schemas/libraryMeta';
import type {Skeleton} from '../src/schemas/libraryMeta';
import {FIGURE_VIEWS,type FigureView} from '../src/schemas/figureArtwork';
import {loadAssetRegistry} from '../src/assets/registry';
import {simulateScene} from '../src/motor';
import {stagedGrip,thermosHandle,thermosSolid,transformSolid,type PropSolid} from '../src/motor/propGeometry';
import {renderedHandWorld} from '../src/motor/reach';
import {nativeDraftArtworkFixture} from './helpers/figureArtwork';

/** Distance from a point to a prop's DRAWN ink, in prop-local staged px: `<= 0`
 *  means the point lies on painted geometry. The solid's quadratics are sampled,
 *  which is exact at the curve nodes a handle bar is authored on. */
const inkDistance=(solid:PropSolid,point:[number,number]):number=>Math.min(...solid.map(shape=>{
  let nearest=Infinity;
  for(let step=0;step<=32;step++){
    const t=step/32,u=1-t,[a,b,d]=shape.points;
    const x=d?u*u*a[0]+2*u*t*b[0]+t*t*d[0]:u*a[0]+t*b[0];
    const y=d?u*u*a[1]+2*u*t*b[1]+t*t*d[1]:u*a[1]+t*b[1];
    nearest=Math.min(nearest,Math.hypot(point[0]-x,point[1]-y));
  }
  return nearest-shape.ink[0];
}));

test('prop placement validates optional intrinsic handle geometry without changing legacy placement',()=>{
  const legacy=PropPlacementSchema.parse({base:132});
  assert.equal(legacy.grip,undefined);
  assert.deepEqual(PropPlacementSchema.parse({base:132,grip:{at:[148,76]}}).grip,{at:[148,76],radius:2,depth:'front'});
  for(const grip of [{at:[148,76],radius:0},{at:[148,76],depth:'sideways'},{at:[Infinity,76]},{at:[148,76],typo:1}])
    assert.equal(PropPlacementSchema.safeParse({base:132,grip}).success,false);
});

test('registry carries a validated handle socket from prop placement',async(t)=>{
  const root=await mkdtemp(join(tmpdir(),'anim-prop-grip-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const dir=join(root,'prop/handle_fixture');await mkdir(dir,{recursive:true});
  await writeFile(join(dir,'manifest.json'),JSON.stringify({placement:{base:132,grip:{at:[148,76],radius:3,depth:'behind'}}}));
  const asset=(await loadAssetRegistry(root)).resolveAsset('prop/handle_fixture');
  assert.deepEqual((asset as {placement?:{grip:unknown}}).placement?.grip,{at:[148,76],radius:3,depth:'behind'});
});

test('a declared handle socket puts the DRAWN hand on the drawn handle, not beside it',async()=>{
  // The socket is authored in art units and the engine places the drawn hand on
  // it, so the socket itself must lie inside the DRAWN handle bar's ink (a
  // 9-art-unit stroke about the curve at x 158). The previous check measured the
  // motor's hand point against the motor's own socket and read 0.00 whatever the
  // data declared; that is how a socket 10 art units off the bar survived review.
  const {placement}=JSON.parse(readFileSync(new URL('../../../library/prop/thermos/manifest.json',import.meta.url),'utf8')) as
    {placement:{base:number;size:[number,number];stageWidth:number;grip?:{at:[number,number];radius:number;depth:'front'|'behind'}}};
  assert.ok(placement.grip,'the thermos must declare placement.grip');
  const scale=placement.stageWidth/placement.size[0];
  const socket=stagedGrip(placement.grip,placement.base,scale);
  const handleInk=transformSolid(thermosHandle,placement.size,placement.base,scale);
  const socketOffInk=inkDistance(handleInk,socket.at);
  assert.ok(socketOffInk<=0,
    `the declared socket ${placement.grip.at.join(',')} sits ${(socketOffInk/scale).toFixed(1)} art units outside the drawn handle's ink`);

  const art=await nativeDraftArtworkFixture();
  const views=Object.fromEntries(FIGURE_VIEWS.map(view=>[view,art.views[view].skeleton])) as Record<FigureView,Skeleton>;
  const solid=transformSolid(thermosSolid,placement.size,placement.base,scale);
  /** `declared` false is the old centre carry: the same prop, no socket. */
  const hold=(propY:number,declared=true)=>simulateScene({
    durationSec:6,
    actors:[{id:'hero',x:500,groundY:650,scale:.6,facing:1,skeleton:art.views.front.skeleton,skeletonViews:views,poseTracks:[],
      intents:[{at:0,duration:1,intent:'grab',target:'thermos'}]}],
    props:[{id:'thermos',x:580,y:propY,size:placement.size,solid,intents:[],...(declared?{grip:socket}:{})}],
    supports:[{x0:0,x1:1280,y:570}],groundY:650,resolveX:()=>580,
  });
  type Movie=ReturnType<typeof hold>;
  const heldFrames=(movie:Movie)=>movie.actors.hero!.map((frame,index)=>frame.holds==='thermos'?index:-1).filter(index=>index>=0);
  const settledFrame=(movie:Movie)=>heldFrames(movie).at(-1)!;
  const rotationAt=(movie:Movie,frame:number)=>movie.props.thermos![frame]!.rotation??0;
  /** The point the renderer DRAWS for the right hand (its own arm composition
   *  over the baked pose), in the prop's staged local frame. */
  const drawnHandLocal=(movie:Movie,frame:number)=>{
    const actor=movie.actors.hero![frame]!,pose=actor.skeletonPose;
    assert.ok(pose?.armR,`frame ${frame} carries no drawn arm`);
    const flipped=actor.facing===-1;
    const hand=renderedHandWorld({x:actor.x,y:650+(pose.waistY??0)*.6,scale:.6,flip:flipped,motor:true,
      waist:pose.waistPitch??0,lean:0,skeleton:art.views.front.skeleton},pose.armR,flipped);
    const prop=movie.props.thermos![frame]!,radians=(prop.rotation??0)*Math.PI/180,dx=hand[0]-prop.x,dy=hand[1]-prop.y;
    return [dx*Math.cos(radians)+dy*Math.sin(radians),-dx*Math.sin(radians)+dy*Math.cos(radians)] as [number,number];
  };
  const offHandle=(movie:Movie,frame:number)=>inkDistance(handleInk,drawnHandLocal(movie,frame));

  // Throughout the carry the DRAWN hand sits on the DRAWN handle bar: the prop
  // is placed from the socket at its live rotation every substep, so no frame
  // carries a bind-time offset.
  const carried=hold(480),carriedFrame=settledFrame(carried);
  assert.ok(heldFrames(carried).length>48,'the thermos is never held');
  const carriedOff=offHandle(carried,carriedFrame);
  assert.ok(carriedOff<=0,`the drawn hand is ${(carriedOff/scale).toFixed(1)} art units off the drawn handle at the settled carry`);
  const worst=Math.max(...heldFrames(carried).map(frame=>offHandle(carried,frame)));
  assert.ok(worst<=0,`the drawn hand is ${(worst/scale).toFixed(1)} art units off the drawn handle on a held frame`);

  // Falsification: the same scene without the declaration is the old centre
  // carry, which the same DRAWN check rejects.
  const centred=hold(480,false);
  assert.ok(offHandle(centred,settledFrame(centred))>0,'the centre carry must not pass the handle check');

  // The wrist drives the held rotation: two holds whose reach to the prop
  // differs end tilted differently, and the centre carry never tilts at all.
  const high=hold(430),low=hold(540);
  const tilt=rotationAt(high,settledFrame(high))-rotationAt(low,settledFrame(low));
  assert.ok(Math.abs(tilt)>20,`a changed wrist direction moved the held prop only ${tilt.toFixed(1)}deg`);
  const rotations=heldFrames(carried).map(frame=>rotationAt(carried,frame));
  assert.ok(Math.max(...rotations)-Math.min(...rotations)>10,`the held prop never tilts (${(Math.max(...rotations)-Math.min(...rotations)).toFixed(1)}deg)`);
  for(const propY of [430,540]){
    const still=hold(propY,false);
    assert.equal(rotationAt(still,settledFrame(still)),0,`the centre carry rotated ${propY}px prop`);
  }
});

test('existing prop plugin exposes one-call free release separately from support-aware putdown',async()=>{
  const {loadPlugins}=await import('../src/plugins');
  const prop=(await loadPlugins('library')).find(p=>p.category==='prop')!;
  const namespace=prop.namespace as {release:(a:unknown,o:unknown)=>{run:(w:unknown)=>Generator};putdown:(a:unknown,o:unknown)=>{run:(w:unknown)=>Generator}};
  assert.equal(typeof namespace.release,'function');assert.equal(typeof namespace.putdown,'function');
});
