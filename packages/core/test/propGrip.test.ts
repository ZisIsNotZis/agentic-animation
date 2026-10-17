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
import {nativeDraftArtworkFixture} from './helpers/figureArtwork';

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

test('a declared handle socket carries the prop by the handle and tilts it with the wrist',async()=>{
  // Data (SCHEMAS.md "Prop grip geometry"): the thermos draws its loop handle
  // on the body's right, so a socket inside the body box would be the centre
  // carry this test must reject.
  const {placement}=JSON.parse(readFileSync(new URL('../../../library/prop/thermos/manifest.json',import.meta.url),'utf8')) as
    {placement:{body:[number,number,number,number];grip?:{at:[number,number];radius:number;depth:'front'|'behind'}}};
  assert.ok(placement.grip,'the thermos must declare placement.grip');
  const [bodyX0,bodyY0,bodyX1,bodyY1]=placement.body,[socketX,socketY]=placement.grip.at;
  // The renderer's handle ink spans x 133..158, y 54..98 about the body box.
  assert.ok(socketX>bodyX1&&socketX<=158&&socketY>bodyY0&&socketY<bodyY1,
    `the declared socket ${socketX},${socketY} is not inside the drawn handle (body right edge ${bodyX1}, handle ink 133..158 x 54..98)`);

  const art=await nativeDraftArtworkFixture();
  const views=Object.fromEntries(FIGURE_VIEWS.map(view=>[view,art.views[view].skeleton])) as Record<FigureView,Skeleton>;
  /** The same socket in prop-local staged units, off the object's box. */
  const socket={at:[9,-14] as [number,number],radius:2,depth:'front' as const};
  /** `declared` null is the old centre carry: the same prop, no socket. */
  const hold=(propY:number,declared:typeof socket|null=null)=>simulateScene({
    durationSec:6,
    actors:[{id:'hero',x:500,groundY:650,scale:.6,facing:1,skeleton:art.views.front.skeleton,skeletonViews:views,
      intents:[{at:0,duration:1,intent:'grab',target:'cup'}]}],
    props:[{id:'cup',x:580,y:propY,size:[50,40],intents:[],...(declared?{grip:declared}:{})}],
    supports:[{x0:0,x1:1280,y:570}],groundY:650,resolveX:()=>580,
  });
  type Movie=ReturnType<typeof hold>;
  const heldFrames=(movie:Movie)=>movie.actors.hero!.map((frame,index)=>frame.holds==='cup'?index:-1).filter(index=>index>=0);
  const settledFrame=(movie:Movie)=>heldFrames(movie).at(-1)!;
  const handAt=(movie:Movie,frame:number)=>movie.actors.hero![frame]!.reach!;
  const socketAt=(movie:Movie,frame:number)=>{
    const prop=movie.props.cup![frame]!,radians=(prop.rotation??0)*Math.PI/180;
    return [prop.x+socket.at[0]*Math.cos(radians)-socket.at[1]*Math.sin(radians),
      prop.y+socket.at[0]*Math.sin(radians)+socket.at[1]*Math.cos(radians)] as [number,number];
  };
  const gapToSocket=(movie:Movie,frame:number)=>{const hand=handAt(movie,frame),at=socketAt(movie,frame);return Math.hypot(hand[0]-at[0],hand[1]-at[1]);};
  const rotationAt=(movie:Movie,frame:number)=>movie.props.cup![frame]!.rotation??0;

  // The bound, settled hold puts the hand ON the socket: the prop hangs where
  // the fingers touched it instead of being carried by its bounding box.
  const carried=hold(480,socket),carriedFrame=settledFrame(carried);
  const socketGap=gapToSocket(carried,carriedFrame);
  assert.ok(socketGap<=0.5,`the hand is ${socketGap.toFixed(2)}px off the declared socket at the settled hold`);
  // Falsification: the same scene without the declaration is the old centre
  // carry, a handle offset away from the socket this test measures.
  const centred=hold(480);
  const centreGap=gapToSocket(centred,settledFrame(centred));
  assert.ok(centreGap>20,`the centre carry is only ${centreGap.toFixed(2)}px from the declared socket`);

  // The wrist drives the held rotation: two holds whose reach to the prop
  // differs end tilted differently, and the centre carry never tilts at all.
  const high=hold(430,socket),low=hold(540,socket);
  const tilt=rotationAt(high,settledFrame(high))-rotationAt(low,settledFrame(low));
  assert.ok(Math.abs(tilt)>20,`a changed wrist direction moved the held prop only ${tilt.toFixed(1)}deg`);
  const rotations=heldFrames(carried).map(frame=>rotationAt(carried,frame));
  assert.ok(Math.max(...rotations)-Math.min(...rotations)>10,`the held prop never tilts (${(Math.max(...rotations)-Math.min(...rotations)).toFixed(1)}deg)`);
  for(const propY of [430,540]){
    const still=hold(propY);
    assert.equal(rotationAt(still,settledFrame(still)),0,`the centre carry rotated ${propY}px prop`);
  }
});

test('existing prop plugin exposes one-call free release separately from support-aware putdown',async()=>{
  const {loadPlugins}=await import('../src/plugins');
  const prop=(await loadPlugins('library')).find(p=>p.category==='prop')!;
  const namespace=prop.namespace as {release:(a:unknown,o:unknown)=>{run:(w:unknown)=>Generator};putdown:(a:unknown,o:unknown)=>{run:(w:unknown)=>Generator}};
  assert.equal(typeof namespace.release,'function');assert.equal(typeof namespace.putdown,'function');
});
