# Episode YAML language

`episode.yml` is the only agent-authored executable stage script. It states
dramatic intent using friendly English instance IDs. Assets own coordinates,
rig mechanics, timing defaults, and visual implementation. Chinese is valid
only inside dialogue and human-facing metadata such as the title.

```yaml
episode: {id: coffee, title: 咖啡事件, language: zh-CN}
actors:
  xiaoming: {use: figure.office.xiaoming.v1, voice: voice.zh.xiaoming.v1}
  xiaohong: {use: figure.office.xiaohong.v1, voice: voice.zh.xiaohong.v1}
locations:
  office: {use: set.office.startup.v1}
objects:
  coffee: {use: prop.office.coffee.v1}
  desk: {use: prop.office.desk.v1}
scenes:
  - id: reveal
    location: office
    actors:
      xiaoming: {facing: xiaohong}
      xiaohong: {facing: xiaoming}
    objects: {desk: center, coffee: on(desk)}
    script:
      - xiaoming: |
          这杯咖啡，{xiaoming.act.pick_up(coffee)}不是老板的。
          {xiaohong.face.shocked(), camera.use.punch_in(xiaohong)}是你的。
```

Coordinates, scale, bones, sockets, layouts, and frames are never authored.
Scene declarations describe relationships; staging resolves composition.
Staging uses a normalized logical canvas (`x`/`y` from 0 to 1); output pixels
are a renderer concern. An unfocused scene establishes the complete composition.
An explicit focus is context-aware: it emphasizes the target while retaining
other relevant actors, moving subjects, and bound objects when they fit.

## Calls

A call is a registry-generated typed terminal path. Fixed namespaces are:

```text
actor.act.*       timed body or prop interaction
actor.face.*      persistent facial state
actor.look.*      persistent gaze constraint
actor.move.*      semantic locomotion
actor.voice.*     persistent synthesis state
object.state.*    object state
camera.use.*      camera performance
vfx.use.*         visual effect
sfx.play.*        sound effect
actor.say("...") speech interruption intrinsic
```

`act.throw` is a procedure asset with a fixed schema, never
`act(operation: string, ...)`. Required domain arguments are positional;
optional modifiers are keyword arguments:

```yaml
{aqiang.act.throw(cpu, awei, arc="high", speed=1.4)}
```

The parser accepts references, finite numbers, booleans, and quoted strings.
Calls cannot nest and no JavaScript is evaluated. Keyword order is irrelevant.

## Time

Timed procedures block by convention and use the asset default duration:

```yaml
{awei.act.slam(desk)}
{awei.act.slam(desk, duration=1.2)}
{awei.act.slam(desk, mode="nonblock")}
```

A brace group starts every member concurrently. It blocks for its longest
blocking member. State calls apply immediately and do not block.

Explicit spans use identical normalized calls except for `mode`:

```yaml
- aqiang: |
    接好了！{aqiang.act.throw(cpu, awei, arc="high", mode="begin")}
- awei: |
    你不要过来啊！
    {aqiang.act.throw(cpu, awei, arc="high", mode="end"), awei.face.shocked()}
```

Pair identity is subject + resolved terminal + positional arguments + sorted
kwargs, excluding only `mode`. Defaults are normalized from the procedure
schema. `duration` is invalid on spans. Duplicate begins, unmatched ends, and
spans open at scene end are errors. Assets define enter/sustain/exit scaling.

## Speech and silence

Braces split dialogue into audio chunks. Calls never enter voice or captions.
Voice state applies to every following chunk:

```yaml
- aqiang: |
    我叫爱新觉罗……{aqiang.voice.speed(1.5)}努尔哈赤……
    {aqiang.voice.speed(2)}后面还有二十八个字……
    {aqiang.voice.speed(1)}啊，终于！
```

`actor.say("...")` is valid only inside braces and creates overlapping speech
for interruptions. An ellipsis-only statement is silence; every `…` contributes
the configured standard beat. Ellipses mixed with dialogue remain TTS text.

The committed global TTS speed default is `1.2`. `tts.speed` in config and
`--voice-speed` on `make`/`render-yaml` override it; a later inline
`actor.voice.speed(n)` call wins for following chunks. Values must be positive
and finite. Speed is included in audio cache identity and propagated into
measured timing, speech events, and renderer lip cadence.

Semantic staging groups actors into inferred `left`, `center`, and `right`
lanes, separates same-lane footprints in stable actor-ID order, clamps to the
subject safe area, and fails when the requested composition cannot fit.
Authors never write coordinates.

## Hard cutover

Deprecated `cast`, `sets`, `layout`, `place`, `say`, `run`, `#cue`, and
`at/together` forms fail with migration errors. No converter or dual runtime is
provided. Unknown terminals, bad arguments, incompatible assets, invalid claims,
and impossible ownership also fail before compilation.
