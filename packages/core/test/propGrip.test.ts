import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PropPlacementSchema} from '../src/schemas/libraryMeta';
import {loadAssetRegistry} from '../src/assets/registry';

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

test('existing prop plugin exposes one-call free release separately from support-aware putdown',async()=>{
  const {loadPlugins}=await import('../src/plugins');
  const prop=(await loadPlugins('library')).find(p=>p.category==='prop')!;
  const namespace=prop.namespace as {release:(a:unknown,o:unknown)=>{run:(w:unknown)=>Generator};putdown:(a:unknown,o:unknown)=>{run:(w:unknown)=>Generator}};
  assert.equal(typeof namespace.release,'function');assert.equal(typeof namespace.putdown,'function');
});
