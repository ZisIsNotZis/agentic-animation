# Episode YAML language

`episode.yml` is the only agent-authored executable stage script. It states dramatic intent using friendly English instance names.
Category plugins own normalized geometry, rig mechanics, timing defaults, and visual implementation.
Chinese is valid only inside dialogue and human-facing metadata such as the title.

```yaml
episode: {id: coffee, title: 咖啡事件, language: zh-CN}
actors:
  xiaoming: {use: figure/xiaoming, voice: voice/zh/xiaoming}
  xiaohong: {use: figure/xiaohong, voice: voice/zh/xiaohong}
locations:
  office: {use: set/agent_stage}
objects:
  coffee: {use: prop/coffee}
  desk: {use: prop/desk}
scenes:
  - id: reveal
    location: office
    actors:
      xiaoming: {facing: xiaohong}
      xiaohong: {facing: xiaoming}
    objects: {desk: center, coffee: on(desk)}
    script:
      - xiaoming: |
          这杯咖啡，{xiaoming.prop.pickup(coffee)}不是老板的。
          {xiaohong.emotion.shocked(), camera.punch_in(xiaohong)}是你的。
```

Coordinates, scale, bones, sockets, layouts, and frames are never authored in episode YAML.
Scene declarations describe relationships; the ordered whole-world plugin chain resolves composition on `world.canvas`.
Staging uses a normalized logical canvas (`x`/`y` from 0 to 1); output pixels
are a renderer concern. An unfocused scene establishes the complete composition.
An explicit focus is context-aware: it emphasizes the target while retaining
other relevant actors, moving subjects, and bound objects when they fit.

## Calls

A call is a plugin-exported factory in `library/<category>/<name>/index.js`, re-exported by the category `plugin.js`. Actor procedures take the actor as the first argument; world categories are subject-less:

```text
action.<name>(actor, ...)         timed body or prop interaction
emotion.<name>(actor)             persistent facial state
gaze.<name>(actor, target)        persistent gaze constraint
movement.<name>(actor, target)    semantic locomotion
voice.<name>(actor, ...)          voice behavior (e.g. interrupt)
prop.<name>(actor, object, ...)   pickup, putdown, handover
camera.<name>(target)             camera performance
effect.<name>(target)             visual effect
sound.<name>()                    sound effect
music.<name>()                    music cue
<actor>.say("...")                speech interruption intrinsic
```

For example: `action.slam(lin, desk)`, `emotion.shocked(lin)`, `gaze.at(lin, awei)`, `movement.to(lin, door)`, `prop.pickup(lin, desk)`, `camera.punch_in(lin)`, `effect.ai_glitch(screen)`, `sound.static_buzz()`, `music.ending()`.

Brace contents are real JavaScript expressions evaluated against live instance handles and the plugin namespaces. Each factory returns an invocation descriptor (`durationSec`, `mode`, generator `run`); the scheduler reads the descriptor, and the generator body drives the world per frame. Timing is overridable per call:

```yaml
{action.slam(awei, desk)}
{...action.slam(awei, desk), durationSec: 1.2}
{...action.slam(awei, desk), mode: "nonblock"}
```

Blocking calls must declare `durationSec` (their own or via override); unknown instances, missing exports, and argument errors fail at `check`/`make` dry-run, never mid-render.

## Speech and silence

Braces split dialogue into audio chunks. Calls never enter voice or captions.
Voice state applies to every following chunk:

```yaml
- aqiang: |
    我叫爱新觉罗……{aqiang.voice.speed(1.5)}努尔哈赤……
    {aqiang.voice.speed(2)}后面还有二十八个字……
    {aqiang.voice.speed(1)}啊，终于！
```

`<actor>.say("...")` is valid only inside braces and creates overlapping speech
for interruptions. An ellipsis-only statement is silence; every `…` contributes
the configured standard beat. Ellipses mixed with dialogue remain TTS text.

The committed global TTS speed default is `1.2`. `tts.speed` in config and
`--voice-speed` on `make`/`render-yaml` override it; a later inline
`<actor>.voice.speed(n)` call wins for following chunks. Values must be positive
and finite. Speed is included in audio cache identity and propagated into
measured timing, speech events, and renderer lip cadence.

Semantic staging groups actors into inferred `left`, `center`, and `right`
lanes, separates same-lane footprints in stable actor-ID order, clamps to the
subject safe area, and fails when the requested composition cannot fit.
Authors never write coordinates; plugins and the engine keep geometry normalized to `0..1`.

## Hard cutover

Deprecated `cast`, `sets`, `layout`, `place`, `say`, `run`, `#cue`, and
`at/together` forms fail with migration errors. No converter or dual runtime is
provided. Unknown terminals, bad arguments, incompatible assets, invalid claims,
and impossible ownership also fail before compilation.
