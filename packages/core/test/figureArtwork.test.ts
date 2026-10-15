import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp, mkdir, writeFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {loadAssetRegistry} from "../src/assets/registry";
import {SkeletonSchema} from "../src/schemas/libraryMeta";
import {createFigureArtworkSchema, figureViewForOrientation} from "../src/schemas/figureArtwork";
import {artworkFixture as fixture} from "./helpers/figureArtwork";

test('discovers optional figure artwork and embeds validated native vector data',async (t) => {
  const root=await mkdtemp(join(tmpdir(),'anim-figure-art-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const dir=join(root,'figure/draft_fixture');await mkdir(dir,{recursive:true});
  const artwork=await fixture();
  await writeFile(join(dir,'manifest.json'),'{}');
  await writeFile(join(dir,'skeleton.json'),JSON.stringify(artwork.views.front.skeleton));
  await writeFile(join(dir,'artwork.json'),JSON.stringify(artwork));
  const asset=(await loadAssetRegistry(root)).resolveAsset('figure/draft_fixture');
  assert.deepEqual(asset.artwork,artwork);
});

test('a malformed declared artwork resource fails loading rather than falling back',async (t) => {
  const root=await mkdtemp(join(tmpdir(),'anim-figure-art-bad-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const dir=join(root,'figure/draft_fixture');await mkdir(dir,{recursive:true});
  await writeFile(join(dir,'manifest.json'),'{}');
  await writeFile(join(dir,'artwork.json'),JSON.stringify({format:'svg-bone-parts',views:{}}));
  await assert.rejects(loadAssetRegistry(root),/figure figure\/draft_fixture: invalid artwork.json/);
});

test('native vector artwork retains all eight orientation selections',() => {
  assert.deepEqual(['front','front-right','right','back-right','back','back-left','left','front-left'].map(figureViewForOrientation),['front','quarter','side','quarter_back','back','quarter_back','side','quarter']);
  assert.throws(()=>figureViewForOrientation('surprise'),/unknown figure orientation/);
});

test('artwork rejects missing joints, design-frame mismatch and executable SVG',async () => {
  const schema=createFigureArtworkSchema(SkeletonSchema);
  const data=await fixture();assert.ok(schema.safeParse(data).success);
  const noJoint=structuredClone(data);delete noJoint.views.side.skeleton.joints.shoulder_r;
  assert.equal(schema.safeParse(noJoint).success,false);
  const size=structuredClone(data);size.views.back.skeleton.space.width=500;
  assert.equal(schema.safeParse(size).success,false);
  const drift=structuredClone(data);drift.views.side.skeleton.joints.waist![0]+=20;
  assert.equal(schema.safeParse(drift).success,false);
  const lengths=structuredClone(data);lengths.views.front.skeleton.arm.upper-=.1;
  assert.equal(schema.safeParse(lengths).success,false);
  const frame=structuredClone(data);frame.views.front.parts.head=frame.views.front.parts.head.replace('400 720','800 720');
  assert.equal(schema.safeParse(frame).success,false);
  for (const payload of ['<script>alert(1)</script>','<image href="https://example.com/x.png"/>','<path onload="alert(1)"/>']) {
    const bad=structuredClone(data);bad.views.front.parts.head='<svg>'+payload+'</svg>';
    assert.equal(schema.safeParse(bad).success,false);
  }
});

test('self-contained figure SVG rejects external CSS and parser bypasses',async () => {
  const schema=createFigureArtworkSchema(SkeletonSchema);
  const data=await fixture();
  for (const payload of [
    '<style>@import url("https://example.com/art.css")</style>',
    '<style>@import "https://example.com/art.css";</style>',
    '<style>path{fill:url(https://example.com/art.svg#p)}</style>',
    '<path style="fill:u\\72l(https://example.com/art.svg#p)"/>',
    '<path fill="url(https://example.com/art.svg#p)"/>',
    '<path fill="url(//example.com/art.svg#p)"/>',
    '<path fill="u&#114;l(https://example.com/art.svg#p)"/>',
    '<path fill="u\\72l(https://example.com/art.svg#p)"/>',
    '<path fill="url(/*comment*/#p)"/>',
    '<animate attributeName="fill" values="red;url(https://example.com/a)"/>',
    '<a href="https://example.com/"><path/></a>',
    '<svg xmlns="http://www.w3.org/1999/xhtml"><style>@import "https://example.com/a";</style></svg>',
    '<path foo:style="fill:red"/>', '<path onload="alert(1)"/>',
    '<path/><foreignObject/>', '<!--<path/>-->', '<![CDATA[<style/>]]>',
  ]) {
    const bad=structuredClone(data);
    bad.views.front.parts.head=`<svg viewBox="0 0 400 720">${payload}</svg>`;
    assert.equal(schema.safeParse(bad).success,false,payload);
  }
});

test('self-contained figure SVG preserves literal local defs references',async () => {
  const data=await fixture();
  data.views.front.parts.head='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 720"><defs><linearGradient id="paint"><stop offset="0" stop-color="#fff"/></linearGradient><clipPath id="clip"><rect width="10" height="20"/></clipPath></defs><g clip-path="url(#clip)"><path d="M0 0L1 1" fill="url(\'#paint\')"/></g></svg>';
  assert.deepEqual(createFigureArtworkSchema(SkeletonSchema).parse(data),data);
});
