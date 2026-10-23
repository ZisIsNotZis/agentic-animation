import {isDeepStrictEqual} from 'node:util';
import {solveSkeleton,legDropInterval,plantedLegAngles,type SkeletonPose} from './skeleton';
import {renderedHandWorld,renderedShoulderWorld} from './reach';
import type {Skeleton} from '../schemas/libraryMeta';

type Point = [number,number];
type Side = 'l'|'r';
export interface WholeBodyActor {
  skeleton: Skeleton;
  x: number;
  y: number;
  scale: number;
  flipped: boolean;
  /** Final native renderer pose, including authored claims and motor arbitration.
   * Leg validation uses the nonnegative-drop, hip-above-ankle branch. */
  pose: SkeletonPose;
  footTargets: Record<Side,Point>;
  /** Null means swing, not a sliding stance. */
  support: Record<Side,Point|null>;
  /** World ankle-to-sole distance; supplied from the selected artwork. */
  soleOffset: Record<Side,number>;
  palmTarget?: Point;
  /** The OFF hand's world point (R7): checked exactly as `palmTarget` is, on
   *  the left arm's drawn composition. Absent on every pre-R7 bake. */
  palmTargetL?: Point;
  /** World grip point the hands hold while the body hangs from a support
   *  (slice B). Present, it carries the body instead of the feet (I1). */
  grip?: Point;
}
/** Trajectory cap for a prop the manifest declares as a projectile (stage
 *  px/s): the fastest a strike may launch it plus the speed a full-stage fall
 *  adds on top. The 720 px/s `prop-rate` below stays the teleport gate for
 *  bodies and placed props; a projectile's flight is declared physics, not a
 *  discontinuity, so the gate would otherwise freeze every strike. */
export const PROJECTILE_PROP_RATE = 3200;
export interface WholeBodyProp {
  x: number;
  y: number;
  rotation: number;
  /** Declared `prop.kind: "projectile"`: its rate cap is the flight cap. */
  projectile?: boolean;
  owner?: string;
  /** Declared socket or captured bind-time attachment, in prop-local units. */
  socket?: Point;
  /** Which hand holds it: the right hand unless the off hand bound it (R7). */
  hand?: 'l'|'r';
  radius?: number;
}
/** S may add complete controller state. It is cloned and published as a unit. */
export interface WholeBodyState {
  actors: Record<string,WholeBodyActor>;
  props: Record<string,WholeBodyProp>;
}
export interface OwnershipEvent {
  prop: string;
  from?: string;
  to?: string;
  /** Earliest permitted contact/release time, in scene seconds. */
  notBefore: number;
}
export interface WholeBodyProposal<S extends WholeBodyState> {
  state: S;
  /** One complete state per requested presentation timestamp, in order. */
  samples: S[];
  events: OwnershipEvent[];
}
export interface ProposalViolation {
  actor?: string;
  prop?: string;
  joint?: string;
  constraint: string;
  measured: number;
  limit: number;
  attempt: number;
}
export interface WholeBodyInput<S extends WholeBodyState> {
  accepted: S;
  /** Accepted state's time; candidate endpoint is time + dt. */
  time: number;
  dt: number;
  maxAttempts: number;
  /** Offsets in (0,dt], not inferred from substep endpoints. */
  presentationTimes: number[];
  presentationReference?: {state:S;time:number};
}
export interface WholeBodyResult<S extends WholeBodyState> {
  accepted: boolean;
  state: S;
  samples: S[];
  events: OwnershipEvent[];
  attempts: number;
  progress: number;
  rejections: ProposalViolation[];
}

/** Design-space joint -> world, through the actor transform the renderer uses. */
function toWorld(actor: WholeBodyActor,p:Point):Point {
  const space=actor.skeleton.space;
  return [actor.x+(p[0]-space.width/2)*actor.scale*(actor.flipped?-1:1),
    actor.y+(p[1]-space.height)*actor.scale];
}
function worldJoints(actor: WholeBodyActor): Record<string,Point> {
  const solved=solveSkeleton(actor.skeleton,actor.pose);
  return Object.fromEntries(Object.entries(solved.joints).map(([name,p])=>[name,toWorld(actor,p)]));
}
/** The foot the leg solve LANDS for a design aim: the motor's own planted-leg
 * solve at the current hip drop, then the same FK `solveSkeleton` draws with.
 * That solver clamps the aim (stride first, then radial), so this comparison is
 * like with like AT THE CLAMP. A rest leg has 0.00 px of slack: its target sits
 * exactly ON the reachable annulus boundary, the solved foot lands a rounding
 * width inside it, and comparing the two against the raw aim refused a substep
 * that is visually perfect. Whether the aim is reachable at all is
 * `leg-annulus`'s question, not this one's. */
function solvedFoot(actor: WholeBodyActor,side:Side,design:Point,drop:number):Point {
  const angles=plantedLegAngles(actor.skeleton,side,drop,design);
  const pose:SkeletonPose=side==='r'?{waistY:drop,legR:angles}:{waistY:drop,legL:angles};
  return toWorld(actor,solveSkeleton(actor.skeleton,pose).joints[`foot_${side}`]!);
}
const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const angleDelta=(a:number,b:number)=>Math.abs(((a-b+540)%360+360)%360-180);
const segments=[['shoulder_l','elbow_l'],['elbow_l','hand_l'],['shoulder_r','elbow_r'],
  ['elbow_r','hand_r'],['hip_l','knee_l'],['knee_l','foot_l'],['hip_r','knee_r'],['knee_r','foot_r']] as const;

/** Validate actual world FK, never just the requested IK target. */
function validateState(before:WholeBodyState,after:WholeBodyState,elapsed:number,
  attempt:number):ProposalViolation[] {
  const errors:ProposalViolation[]=[];
  const check=(constraint:string,measured:number,limit:number,location:Partial<ProposalViolation>={})=>{
    if(!Number.isFinite(measured)||measured>limit+1e-8)errors.push({...location,constraint,measured,limit,attempt});
  };
  /** A non-finite input has NO solution. Refuse it by naming the joint and the
   *  input that was non-finite, because a NaN ratio reads as a tolerance miss on
   *  a substep nobody could have solved, and hides which number was bad. */
  const nonFinite=(joint:string,input:string,value:number,location:Partial<ProposalViolation>)=>{
    if(Number.isFinite(value))return false;
    errors.push({...location,constraint:`${input}-non-finite`,joint,measured:value,limit:0,attempt});
    return true;
  };
  for(const category of ['actors','props'] as const){
    if(Object.keys(before[category]).sort().join('\0')!==Object.keys(after[category]).sort().join('\0')){
      errors.push({constraint:'state-topology',measured:1,limit:0,attempt});return errors;
    }
  }
  for(const [id,a] of Object.entries(after.actors)){
    const old=before.actors[id]!,joints=worldJoints(a),previous=worldJoints(old);
    check('root-rate',distance([a.x,a.y],[old.x,old.y]),720*elapsed,{actor:id,joint:'root'});
    if(a.scale<=0||!Number.isFinite(a.scale))check('positive-scale',Infinity,0,{actor:id});
    for(const [name,p] of Object.entries(joints)){
      if(!previous[name]){check('joint-topology',1,0,{actor:id,joint:name});continue;}
      check('joint-rate',distance(p,previous[name]),720*elapsed,{actor:id,joint:name});
    }
    for(const [from,to] of segments){
      const p=joints[from]!,q=joints[to]!,r=previous[from]!,s=previous[to]!;
      const angle=(u:Point,v:Point)=>Math.atan2(v[1]-u[1],v[0]-u[0])*180/Math.PI;
      check('segment-angle-rate',angleDelta(angle(p,q),angle(r,s)),840*elapsed,{actor:id,joint:to});
    }
    check('ground-support',a.support.l||a.support.r||a.grip?0:1,0,{actor:id});
    // The drawn hand of a hanging body stays ON its grip, and the grip is the
    // bar: a world anchor like a stance foot, so it never slides.
    if(a.grip){
      const gripSurface={x:a.x,y:a.y+(a.pose.waistY??0)*a.scale,scale:a.scale,
        flip:a.flipped,motor:true,waist:a.pose.waistPitch??0,lean:0,skeleton:a.skeleton};
      const hand=renderedHandWorld(gripSurface,a.pose.armR??{upper:0,lower:0},a.flipped);
      check('grip-contact',distance(hand,a.grip),.5,{actor:id,joint:'hand_r'});
      if(old.grip)check('grip-drift',distance(a.grip,old.grip),.02,{actor:id,joint:'hand_r'});
    }
    for(const side of ['l','r'] as const){
      const foot=joints[`foot_${side}`]!,target=a.footTargets[side],anchor=a.support[side];
      const drop=a.pose.waistY??0,joint=`foot_${side}`;
      if(nonFinite(joint,'foot-target',target[0],{actor:id,joint})||
        nonFinite(joint,'foot-target',target[1],{actor:id,joint})||
        nonFinite(joint,'waist-drop',drop,{actor:id,joint}))continue;
      const design:Point=[a.skeleton.space.width/2+(target[0]-a.x)/a.scale*(a.flipped?-1:1),
        a.skeleton.space.height+(target[1]-a.y)/a.scale];
      const interval=legDropInterval(a.skeleton,side,design);
      check('leg-annulus',interval?Math.max(0,interval[0]-drop,drop-interval[1]):Infinity,0,{actor:id,joint});
      check('foot-reach',distance(foot,solvedFoot(a,side,design,drop)),.02,{actor:id,joint});
      if(!anchor)continue;
      check('support-anchor',distance(foot,anchor),.02,{actor:id,joint:`foot_${side}`});
      if(old.support[side])check('stance-drift',distance(anchor,old.support[side]!),.02,{actor:id,joint:`foot_${side}`});
      check('sole-height',Math.abs(foot[1]+a.soleOffset[side]-a.y),.02,{actor:id,joint:`foot_${side}`});
    }
    if(a.palmTarget){
      if(nonFinite('hand_r','palm-target',a.palmTarget[0],{actor:id,joint:'hand_r'})||
        nonFinite('hand_r','palm-target',a.palmTarget[1],{actor:id,joint:'hand_r'})||
        nonFinite('hand_r','waist-drop',a.pose.waistY??0,{actor:id,joint:'hand_r'}))continue;
      // The palm check compares the DRAWN hand with the motor's world reach
      // point, so it must use the renderer's arm composition (reach.ts).
      // solveSkeleton's arm chain mirrors the rest vectors by `facing` and is
      // not the render truth for a mirrored native figure: at a raised aim the
      // two diverge by the hand radius and the proposal freezes the beat.
      const surface={x:a.x,y:a.y+(a.pose.waistY??0)*a.scale,scale:a.scale,
        flip:a.flipped,motor:true,waist:a.pose.waistPitch??0,lean:0,skeleton:a.skeleton};
      // Compare like with like at the reach cap: a target beyond the drawn
      // arm's bone reach is reached at the cap, not at the aim, so the hand is
      // judged against the reached point in the aim's direction. Inside the
      // reach the reached point IS the aim, so the check stays exact.
      const palmOf=(side:'l'|'r',target:Point,joint:string,constraint:string):void=>{
        const drawnHand=renderedHandWorld(surface,side==='l'?a.pose.armL??{upper:0,lower:0}:a.pose.armR??{upper:0,lower:0},a.flipped,side);
        const shoulder=renderedShoulderWorld(surface,a.flipped,side);
        const reach=(a.skeleton.arm.upper+a.skeleton.arm.fore)*a.scale;
        const aim:Point=[target[0]-shoulder[0],target[1]-shoulder[1]];
        const span=Math.hypot(aim[0],aim[1]);
        const reached:Point=span>reach&&span>0
          ? [shoulder[0]+aim[0]/span*reach,shoulder[1]+aim[1]/span*reach] : target;
        check(constraint,distance(drawnHand,reached),.02,{actor:id,joint});
      };
      if(nonFinite('hand_r','waist-drop',a.pose.waistY??0,{actor:id,joint:'hand_r'}))continue;
      palmOf('r',a.palmTarget,'hand_r','palm-contact');
      const loaded=Object.values(after.props).some(p=>p.owner===id)||Object.values(before.props).some(p=>p.owner===id);
      if(old.palmTarget&&!loaded)check('incoming-palm-rate',distance(a.palmTarget,old.palmTarget),480*elapsed,{actor:id,joint:'hand_r'});
    }
    // The off hand's palm is checked on its own arm's drawing (R7).
    if(a.palmTargetL){
      const surface={x:a.x,y:a.y+(a.pose.waistY??0)*a.scale,scale:a.scale,
        flip:a.flipped,motor:true,waist:a.pose.waistPitch??0,lean:0,skeleton:a.skeleton};
      if(!nonFinite('hand_l','palm-target',a.palmTargetL[0],{actor:id,joint:'hand_l'})&&
        !nonFinite('hand_l','palm-target',a.palmTargetL[1],{actor:id,joint:'hand_l'})){
        const drawnHand=renderedHandWorld(surface,a.pose.armL??{upper:0,lower:0},a.flipped,'l');
        const shoulder=renderedShoulderWorld(surface,a.flipped,'l');
        const reach=(a.skeleton.arm.upper+a.skeleton.arm.fore)*a.scale;
        const aim:Point=[a.palmTargetL[0]-shoulder[0],a.palmTargetL[1]-shoulder[1]];
        const span=Math.hypot(aim[0],aim[1]);
        const reached:Point=span>reach&&span>0
          ? [shoulder[0]+aim[0]/span*reach,shoulder[1]+aim[1]/span*reach] : a.palmTargetL;
        check('palm-contact-l',distance(drawnHand,reached),.02,{actor:id,joint:'hand_l'});
      }
    }
  }
  for(const [id,p] of Object.entries(after.props)){
    const old=before.props[id]!;
    check('prop-rate',distance([p.x,p.y],[old.x,old.y]),(p.projectile?PROJECTILE_PROP_RATE:720)*elapsed,{prop:id});
    check('prop-angle-rate',angleDelta(p.rotation,old.rotation),(p.owner?90:840)*elapsed,{prop:id});
    if(!p.owner)continue;
    const owner=after.actors[p.owner];
    if(!owner||!p.socket||p.radius===undefined||!Number.isFinite(p.radius)||p.radius<0){
      check('owned-socket',1,0,{prop:id});continue;
    }
    const r=p.rotation*Math.PI/180,[sx,sy]=p.socket;
    const socket:Point=[p.x+sx*Math.cos(r)-sy*Math.sin(r),p.y+sx*Math.sin(r)+sy*Math.cos(r)];
    // The socket must sit on the hand the renderer DRAWS (same composition as
    // the palm check): solveSkeleton's arm chain is not the render truth once
    // a raised or far-reaching aim reflects the elbow branch.
    const hand=renderedHandWorld({x:owner.x,y:owner.y+(owner.pose.waistY??0)*owner.scale,scale:owner.scale,
      flip:owner.flipped,motor:true,waist:owner.pose.waistPitch??0,lean:0,skeleton:owner.skeleton},
      (p.hand==='l'?owner.pose.armL:owner.pose.armR)??{upper:0,lower:0},owner.flipped,p.hand==='l'?'l':'r');
    check('grip-socket',distance(hand,socket),Math.min(p.radius,1.6),{actor:p.owner,prop:id,joint:p.hand==='l'?'hand_l':'hand_r'});
  }
  return errors;
}

/** Pure planning boundary: callbacks must have no external side effects. Each
 * attempt gets a fresh copy, including extra controller state. Ownership events
 * are data, never callbacks; caller publishes result once outside this function.
 * Native motor substeps publish the accepted controller snapshot once. */
export function resolveWholeBodyProposal<S extends WholeBodyState>(input:WholeBodyInput<S>,
  plan:(snapshot:S,progress:number)=>WholeBodyProposal<S>):WholeBodyResult<S> {
  if(!Number.isFinite(input.dt)||input.dt<=0||!Number.isFinite(input.time)||
    !Number.isInteger(input.maxAttempts)||input.maxAttempts<1||input.maxAttempts>16)
    throw new Error('wholeBodyProposal requires finite time, positive dt and 1..16 attempts');
  if(input.presentationTimes.some((t,i)=>!Number.isFinite(t)||t<=0||t>input.dt||
    (i>0&&t<=input.presentationTimes[i-1]!))||
    (input.presentationTimes.length&&(!input.presentationReference||!Number.isFinite(input.presentationReference.time)||input.presentationReference.time>input.time)))
    throw new Error('wholeBodyProposal requires ordered presentation times and their accepted reference');
  const baseline=structuredClone(input.accepted),rejections:ProposalViolation[]=[];
  for(let attempt=1;attempt<=input.maxAttempts;attempt++){
    const progress=2**(1-attempt),proposal=structuredClone(plan(structuredClone(baseline),progress));
    const errors=validateState(baseline,proposal.state,input.dt,attempt);
    if(proposal.samples.length!==input.presentationTimes.length)
      errors.push({constraint:'presentation-coverage',measured:Math.abs(proposal.samples.length-input.presentationTimes.length),limit:0,attempt});
    else if(input.presentationReference){
      let reference=input.presentationReference;
      proposal.samples.forEach((state,i)=>{
        const time=input.time+input.presentationTimes[i]!;
        errors.push(...validateState(baseline,state,input.presentationTimes[i]!,attempt),
          ...validateState(reference.state,state,time-reference.time,attempt));
        for(const [id,prop] of Object.entries(state.props)){
          const old=baseline.props[id];
          if(!old||old.owner===prop.owner)continue;
          const event=proposal.events.find(e=>e.prop===id);
          if(!event||event.from!==old.owner||event.to!==prop.owner||!Number.isFinite(event.notBefore)||time<event.notBefore)
            errors.push({prop:id,constraint:'presentation-ownership',measured:1,limit:0,attempt});
        }
        reference={state,time};
      });
      if(input.presentationTimes.at(-1)===input.dt&&!isDeepStrictEqual(proposal.samples.at(-1),proposal.state))
        errors.push({constraint:'presentation-endpoint',measured:1,limit:0,attempt});
    }
    for(const [id,prop] of Object.entries(proposal.state.props)){
      const old=baseline.props[id];if(!old)continue;
      const events=proposal.events.filter(e=>e.prop===id),changed=old.owner!==prop.owner;
      if(events.length!==(changed?1:0)||events.some(e=>e.from!==old.owner||e.to!==prop.owner||
        !Number.isFinite(e.notBefore)||input.time+input.dt<e.notBefore))
        errors.push({prop:id,constraint:'ownership-event',measured:1,limit:0,attempt});
    }
    if(proposal.events.some(e=>!proposal.state.props[e.prop]))
      errors.push({constraint:'ownership-event-prop',measured:1,limit:0,attempt});
    if(!errors.length)return {accepted:true,state:proposal.state,samples:proposal.samples,events:proposal.events,attempts:attempt,progress,rejections};
    rejections.push(...errors);
  }
  return {accepted:false,state:baseline,samples:[],events:[],attempts:input.maxAttempts,progress:0,rejections};
}
