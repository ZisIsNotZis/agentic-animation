/** Renderer-owned opaque thermos geometry. Shadows and transient binding cues
 * are not solids. Curves and ink are projected analytically, not via an AABB. */
type Point = [number,number];
export interface SolidCurve { points: [Point,Point] | [Point,Point,Point]; ink: Point }
export type PropSolid = SolidCurve[];
const line=(a:Point,b:Point,r=0):SolidCurve=>({points:[a,b],ink:[r,r]});
const curve=(a:Point,b:Point,c:Point,r:number):SolidCurve=>({points:[a,b,c],ink:[r,r]});
const body:PropSolid=[
  line([68,38],[132,38],4),line([132,38],[132,115],4),
  curve([132,115],[132,132],[115,132],4),line([115,132],[85,132],4),
  curve([85,132],[68,132],[68,115],4),line([68,115],[68,38],4),
];
export const thermosHandle:PropSolid=[curve([133,54],[158,54],[158,76],4.5),curve([158,76],[158,98],[133,98],4.5)];
const top:PropSolid=[line([84,23],[84,14],3.5),line([84,14],[116,14],3.5),line([116,14],[116,23],3.5)];
const cap={x:78,y:22,width:44,height:23,rx:6};
function pathFor(contour:PropSolid,closed=false):string {
  return `M${contour[0]!.points[0].join(' ')} `+contour.map(p=>p.points.length===3?`Q${p.points[1].join(' ')} ${p.points[2]!.join(' ')}`:`L${p.points[1].join(' ')}`).join(' ')+(closed?' Z':'');
}
export const THERMOS_ART={body:pathFor(body,true),handle:pathFor(thermosHandle),top:pathFor(top),cap,
  bodyStroke:body[0]!.ink[0]*2,handleStroke:thermosHandle[0]!.ink[0]*2,capStroke:7,topStroke:top[0]!.ink[0]*2};
// Rounded rectangle is the Minkowski sum of its inner rectangle and a disk;
// include outer ink. Sharp SVG miters are explicit vertices, not round joins.
const cx0=cap.x+cap.rx,cx1=cap.x+cap.width-cap.rx,cy0=cap.y+cap.rx,cy1=cap.y+cap.height-cap.rx;
const capRadius=cap.rx+THERMOS_ART.capStroke/2;
export const thermosSolid:PropSolid=[...body,...thermosHandle,...top,
  line([64,34],[136,34]),line([80.5,10.5],[119.5,10.5]),
  line([cx0,cy0],[cx1,cy0],capRadius),line([cx1,cy0],[cx1,cy1],capRadius),
  line([cx1,cy1],[cx0,cy1],capRadius),line([cx0,cy1],[cx0,cy0],capRadius),
];

/** The authored handle socket in prop-local staged units. The art is placed
 * about its base anchor (100, base), so a socket authored in art units moves
 * and scales with it; the motor, the compiler and the checks share this one
 * projection. */
export function stagedGrip(grip:{at:Point;radius:number;depth:'front'|'behind'},base:number,scale:number):{at:Point;radius:number;depth:'front'|'behind'} {
  return {at:[(grip.at[0]-100)*scale,(grip.at[1]-base)*scale],radius:grip.radius*scale,depth:grip.depth};
}

export function transformSolid(solid:PropSolid,size:Point,base:number,scale:number):PropSolid {
  // SVG defaults to xMidYMid meet; CSS pivot uses the full element height.
  const unit=Math.min(size[0]/200,size[1]/160)*scale;
  const pivotY=(size[1]/2-size[1]*base/160)*scale;
  return solid.map(c=>({points:c.points.map(([x,y])=>[(x-100)*unit,(y-80)*unit+pivotY]) as SolidCurve['points'],ink:[c.ink[0]*unit,c.ink[1]*unit]}));
}

/** Lowest transformed visible point and horizontal witness relative to pivot.
 * Quadratic extrema and elliptical stroke support are exact at any rotation. */
export function solidSupport(solid:PropSolid,rotation:number):{x:number;y:number} {
  const r=rotation*Math.PI/180,s=Math.sin(r),c=Math.cos(r);
  let best={x:0,y:-Infinity};
  for(const shape of solid){
    const pts=shape.points.map(([x,y])=>({x:x*c-y*s,y:x*s+y*c}));
    const candidates=[0,1];
    if(pts.length===3){const [a,b,d]=pts as [{x:number;y:number},{x:number;y:number},{x:number;y:number}];const denominator=a.y-2*b.y+d.y;if(denominator!==0){const t=(a.y-b.y)/denominator;if(t>0&&t<1)candidates.push(t);}}
    const [rx,ry]=shape.ink,extent=Math.hypot(rx*s,ry*c);
    const inkX=extent===0?0:(rx*rx*s*c-ry*ry*c*s)/extent;
    for(const t of candidates){const u=1-t,a=pts[0]!,b=pts[1]!,d=pts[2];
      const x=d?u*u*a.x+2*u*t*b.x+t*t*d.x:u*a.x+t*b.x;
      const y=(d?u*u*a.y+2*u*t*b.y+t*t*d.y:u*a.y+t*b.y)+extent;
      if(y>best.y)best={x:x+inkX,y};
    }
  }
  return best;
}

export function isThermosArt(key:string):boolean {
  const lower=key.toLowerCase();
  return !lower.includes('desk')&&(lower.includes('thermos')||lower.includes('cup'));
}
