import {isDeepStrictEqual} from 'node:util';
import {solveSkeleton,legDropInterval,type SkeletonPose} from './skeleton';
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
}
export interface WholeBodyProp {
  x: number;
  y: number;
  rotation: number;
  owner?: string;
  /** Declared socket or captured bind-time attachment, in prop-local units. */
  socket?: Point;
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

function worldJoints(actor: WholeBodyActor): Record<string,Point> {
  const solved=solveSkeleton(actor.skeleton,actor.pose),space=actor.skeleton.space;
  return Object.fromEntries(Object.entries(solved.joints).map(([name,p])=>[name,[
    actor.x+(p[0]-space.width/2)*actor.scale*(actor.flipped?-1:1),
    actor.y+(p[1]-space.height)*actor.scale,
  ]]));
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
    check('ground-support',a.support.l||a.support.r?0:1,0,{actor:id});
    for(const side of ['l','r'] as const){
      const foot=joints[`foot_${side}`]!,target=a.footTargets[side],anchor=a.support[side];
      const design:Point=[a.skeleton.space.width/2+(target[0]-a.x)/a.scale*(a.flipped?-1:1),
        a.skeleton.space.height+(target[1]-a.y)/a.scale];
      const interval=legDropInterval(a.skeleton,side,design),drop=a.pose.waistY??0;
      check('leg-annulus',interval?Math.max(0,interval[0]-drop,drop-interval[1]):Infinity,0,{actor:id,joint:`foot_${side}`});
      check('foot-reach',distance(foot,target),.02,{actor:id,joint:`foot_${side}`});
      if(!anchor)continue;
      check('support-anchor',distance(foot,anchor),.02,{actor:id,joint:`foot_${side}`});
      if(old.support[side])check('stance-drift',distance(anchor,old.support[side]!),.02,{actor:id,joint:`foot_${side}`});
      check('sole-height',Math.abs(foot[1]+a.soleOffset[side]-a.y),.02,{actor:id,joint:`foot_${side}`});
    }
    if(a.palmTarget){
      check('palm-contact',distance(joints.hand_r!,a.palmTarget),.02,{actor:id,joint:'hand_r'});
      const loaded=Object.values(after.props).some(p=>p.owner===id)||Object.values(before.props).some(p=>p.owner===id);
      if(old.palmTarget&&!loaded)check('incoming-palm-rate',distance(a.palmTarget,old.palmTarget),480*elapsed,{actor:id,joint:'hand_r'});
    }
  }
  for(const [id,p] of Object.entries(after.props)){
    const old=before.props[id]!;
    check('prop-rate',distance([p.x,p.y],[old.x,old.y]),720*elapsed,{prop:id});
    check('prop-angle-rate',angleDelta(p.rotation,old.rotation),(p.owner?90:840)*elapsed,{prop:id});
    if(!p.owner)continue;
    const owner=after.actors[p.owner];
    if(!owner||!p.socket||p.radius===undefined||!Number.isFinite(p.radius)||p.radius<0){
      check('owned-socket',1,0,{prop:id});continue;
    }
    const r=p.rotation*Math.PI/180,[sx,sy]=p.socket;
    const socket:Point=[p.x+sx*Math.cos(r)-sy*Math.sin(r),p.y+sx*Math.sin(r)+sy*Math.cos(r)];
    check('grip-socket',distance(worldJoints(owner).hand_r!,socket),Math.min(p.radius,1.6),{actor:p.owner,prop:id,joint:'hand_r'});
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
