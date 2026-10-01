import {inFootprint} from './Footprint.js';
import * as T from './vendor/three.module.js';
import {ROLL_SECONDS,rollBurstSpeed} from './ShiftGesture.js';
// Analytic collision bodies remain independent of rendering and GLB export.
export const OCEAN={half:3750,z:-1700,floor:-120,ceiling:900};
export const FLIGHT_SPEED=160;
export const FLIGHT_ACCEL_SECONDS=2;
export const SKIM_HEIGHT=.55;
// The containment envelope is separate from phaseable city collision.
export function contain(p){p.x=T.MathUtils.clamp(p.x,-OCEAN.half+.31,OCEAN.half-.31);p.z=T.MathUtils.clamp(p.z,OCEAN.z-OCEAN.half+.31,OCEAN.z+OCEAN.half-.31);p.y=T.MathUtils.clamp(p.y,OCEAN.floor+1.7,OCEAN.ceiling-.2);return p}
export class Solids{
 constructor(){this.bodies=[];this.cells=new Map();this.dry=[]}
 // The rendered torus scales its tube along with its major radius. Enclose
 // each visible segment, including the bend, rather than using a thin rail.
 addRing(x,y,z,r,tube=r*.022,segments=48,contactAt){const half=Math.PI/segments,radial=r*Math.cos(half);for(let i=0;i<segments;i++){const a=(i+.5)*2*half;this.add({x:x+Math.sin(a)*radial,z:z+Math.cos(a)*radial,w:2*(r+tube)*Math.sin(half),d:2*tube+2*r*(1-Math.cos(half)),ry:a,top:y+tube,bottom:y-tube,contactAt})}}
 inside(p){return Math.abs(p.x)<OCEAN.half&&Math.abs(p.z-OCEAN.z)<OCEAN.half}
 add(body){this.bodies.push(body);this.reindex(body);return body}
 remove(body){body.destroyed=true;for(const key of body.cellKeys||[]){const list=this.cells.get(key),i=list?.indexOf(body);if(i>=0)list.splice(i,1)}body.cellKeys=[]}
 reindex(body){if(body.destroyed)return;const extent=body.r??Math.hypot(body.w,body.d)/2,minX=Math.floor((body.x-extent-2)/100),maxX=Math.floor((body.x+extent+2)/100),minZ=Math.floor((body.z-extent-2)/100),maxZ=Math.floor((body.z+extent+2)/100);if(body.cellKeys&&body.cellMinX===minX&&body.cellMaxX===maxX&&body.cellMinZ===minZ&&body.cellMaxZ===maxZ)return;const keys=[];for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++)keys.push(x+','+z);for(const k of body.cellKeys||[]){const list=this.cells.get(k),i=list?.indexOf(body);if(i>=0)list.splice(i,1)}for(const k of keys){if(!this.cells.has(k))this.cells.set(k,[]);this.cells.get(k).push(body)}body.cellKeys=keys;body.cellMinX=minX;body.cellMaxX=maxX;body.cellMinZ=minZ;body.cellMaxZ=maxZ}


 nearby(p,reach=0){if(!reach)return this.cells.get(Math.floor(p.x/100)+','+Math.floor(p.z/100))||[];const found=new Set();for(let x=Math.floor((p.x-reach)/100);x<=Math.floor((p.x+reach)/100);x++)for(let z=Math.floor((p.z-reach)/100);z<=Math.floor((p.z+reach)/100);z++)for(const b of this.cells.get(x+','+z)||[])found.add(b);return [...found]}
 horizontal(p,b,pad=0){if(b.destroyed)return false;if(b.footprint)return inFootprint(p.x,p.z,b.footprint,pad);if(b.r!=null)return Math.hypot(p.x-b.x,p.z-b.z)<b.r+pad;const a=b.ry||0,c=Math.cos(a),s=Math.sin(a),x=p.x-b.x,z=p.z-b.z;return Math.abs(c*x-s*z)<b.w/2+pad&&Math.abs(s*x+c*z)<b.d/2+pad}
 heightAt(p,b){if(!b.slope)return b.top;const [a,c]=b.slope,dx=c.x-a.x,dz=c.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return a.y+(c.y-a.y)*t}
 cutAt(p,b,pad=0){return b.cuts?.contains(p,pad)||false}
 overlap(p,b){if(b.destroyed||this.cutAt({x:p.x,y:p.y-.8,z:p.z},b,.9))return false;if(b.damageCollision&&b.cuts.holes.length&&(b.fragment||Math.min(b.w??b.r*2,b.d??b.r*2)>4)){if(!this.horizontal(p,b,.3)||p.y<=b.bottom||p.y-1.65>=b.top)return false;return b.damageCollision.overlap(p)}if(b.shell){const dx=p.x-b.x,dz=p.z-b.z,dy=Math.max(p.y-1.35-b.y,Math.min(0,p.y-.3-b.y)),near=Math.hypot(dx,dz,dy),far=Math.max(Math.hypot(dx,dz,p.y-.3-b.y),Math.hypot(dx,dz,p.y-1.35-b.y));return near<b.r+.34&&far>b.r-.34}const top=this.heightAt(p,b),bottom=b.slope?top-(b.thickness??1.1):b.bottom;return this.horizontal(p,b,.3)&&p.y>bottom+.02&&p.y-1.65<top-.02}
 clear(p,except){return this.inside(p)&&p.y>=OCEAN.floor+1.65&&p.y<OCEAN.ceiling&& !this.nearby(p).some(b=>b!==except&&this.overlap(p,b))}
 floor(p,ceiling=p.y-1.65+.4){let y=this.inside(p)?OCEAN.floor:-Infinity;for(const b of this.nearby(p)){if(b.damageCollision&&b.cuts.holes.length){if(!b.destroyed)y=Math.max(y,b.damageCollision.floorAt(p,ceiling));continue}if(!b.shell&&this.horizontal(p,b,b.slope?.1:0)&&this.heightAt(p,b)<=ceiling&&!this.cutAt({x:p.x,y:this.heightAt(p,b),z:p.z},b,.31))y=Math.max(y,this.heightAt(p,b));}return y}
 // Newly realized floors or falling debris can intersect a previously clear
 // capsule. Find a nearby clear position before motion; never reuse a stale
 // safe point without checking it against the current destroyed world.
 recover(p,safe){
  if(this.clear(p))return true;
  const damaged=this.nearby(p).some(b=>b.damageCollision&&this.overlap(p,b));
  if(damaged){
   const candidates=[],floor=this.floor(p,p.y-.3);
   if(Number.isFinite(floor)&&Math.abs(floor+1.7-p.y)<=1.5)candidates.push({...p,y:floor+1.7});
   for(let r=.1;r<=1.81;r+=.1){
    candidates.push({...p,y:p.y+r},{...p,y:p.y-r});
    for(let i=0;i<8;i++){const a=i*Math.PI/4;candidates.push({x:p.x+Math.cos(a)*r,y:p.y,z:p.z+Math.sin(a)*r})}
   }
   candidates.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y,a.z-p.z)-Math.hypot(b.x-p.x,b.y-p.y,b.z-p.z));
   const clear=candidates.find(q=>this.clear(q));if(clear){Object.assign(p,clear);return true}
  }
  if(safe&&this.clear(safe)){Object.assign(p,safe);return true}
  return false;
 }
 // Immersion is an ocean/dry-room query, not a test against solid bounds.
 // A pillar or slab never creates an air column beneath it; its collision is
 // handled by clear(). This also floods newly opened destruction cavities.
 water(p){
  if(!this.inside(p)||p.y>=1.2||p.y<=OCEAN.floor)return false;
  if(this.nearby(p).some(b=>b.waterExit&&this.horizontal(p,b,-.05)&&Math.abs(p.y-this.heightAt(p,b)-1.7)<.25&&!this.cutAt({x:p.x,y:this.heightAt(p,b),z:p.z},b,.31)))return false;
  return !this.dry.some(b=>this.horizontal(p,b)&&p.y>b.bottom&&p.y<b.top);
 }

 pushDynamic(p){for(const b of this.nearby(p)){if(b.destroyed||this.cutAt({x:p.x,y:p.y-.8,z:p.z},b,.9)||!b.dynamic||!this.overlap(p,b)||!this.horizontal(p,b,.3)||p.y<=b.bottom+.02||p.y-1.65>=b.top-.02)continue;const a=b.ry||0,c=Math.cos(a),s=Math.sin(a),dx=p.x-b.x,dz=p.z-b.z,x=c*dx-s*dz,z=s*dx+c*dz,ex=b.w/2+.31-Math.abs(x),ez=b.d/2+.31-Math.abs(z);if(ex<ez){const amount=Math.sign(x||1)*ex;p.x+=c*amount;p.z-=s*amount}else{const amount=Math.sign(z||1)*ez;p.x+=s*amount;p.z+=c*amount}}}

 surface(p,yaw,reach=1.5){let best=null;const forward={x:-Math.sin(yaw),z:-Math.cos(yaw)};for(const b of this.nearby(p,reach+2)){if(b.destroyed||this.cutAt({x:p.x,y:p.y-.8,z:p.z},b,1)||b.climbable===false||b.top<p.y-.8||b.bottom>p.y||b.top-b.bottom<.25)continue;let x,z,nx,nz;if(b.r!=null){const dx=p.x-b.x,dz=p.z-b.z,len=Math.hypot(dx,dz)||1;nx=dx/len;nz=dz/len;x=b.x+nx*b.r;z=b.z+nz*b.r}else{const a=b.ry||0,c=Math.cos(a),s=Math.sin(a),dx=p.x-b.x,dz=p.z-b.z,lx=c*dx-s*dz,lz=s*dx+c*dz;let qx=Math.max(-b.w/2,Math.min(b.w/2,lx)),qz=Math.max(-b.d/2,Math.min(b.d/2,lz));let ux=lx-qx,uz=lz-qz;const n=Math.hypot(ux,uz);if(n<.001)continue;ux/=n;uz/=n;nx=c*ux+s*uz;nz=-s*ux+c*uz;x=b.x+c*qx+s*qz;z=b.z-s*qx+c*qz}const d=Math.hypot(p.x-x,p.z-z);if(d>reach||forward.x*nx+forward.z*nz>-.2)continue;if(!best||d<best.distance)best={body:b,x,z,nx,nz,distance:d}}return best}
}
export function direction(yaw,pitch,f,s,u,mode){const c=mode==='gaze'?1:Math.cos(pitch);const v={x:-Math.sin(yaw)*c*f+Math.cos(yaw)*s,y:mode==='gaze'?0:Math.sin(pitch)*f+u,z:-Math.cos(yaw)*c*f-Math.sin(yaw)*s};const n=Math.max(1,Math.hypot(v.x,v.y,v.z));for(const k of ['x','y','z'])v[k]/=n;return v}
export class Player{
 constructor(){this.position={x:-62,y:9.7,z:300};this.yaw=-.16;this.pitch=.02;this.mode='walk';this.phase=false;this.safe={...this.position};this.velocity=0;this.swimVelocity={x:0,y:0,z:0};this.swimming=false;this.skimming=false;this.underwater=false;this.grounded=true;this.speed=0;this.walkSpeed=0;this.stepOffset=0;this.stroke=0;this.boost=1;this.swimEffort=0;this.jumped=false;this.boosting=false;this.boostKind=null;this.dashRemaining=0;this.flightDashRemaining=0;this.flightRunTime=0;this.flightInput=null;this.flightVelocity={x:0,y:0,z:0}}
 setMode(mode,world){this.stepOffset=0;this.walkSpeed=0;this.support=null;this.carrierMatrix=null;this.climbing=null;this.mantle=null;this.emote=null;this.mode=mode;this.velocity=0;this.boost=1;this.boosting=false;this.boostKind=null;this.dashRemaining=0;this.flightDashRemaining=0;this.flightRunTime=0;this.flightInput=null;this.flightVelocity={x:0,y:0,z:0};if(mode==='walk'){this.phase=false;if(world)world.recover(this.position,this.safe)}this.swimming=false;this.skimming=false;this.swimVelocity={x:0,y:0,z:0}}
 startFlightDash({f=0,s=0,u=0}={}){if(this.mode==='walk'||this.underwater||this.climbing)return false;if(!f&&!s&&(!u||this.mode==='gaze'))f=1;this.flightDashInput={f,s,u};this.flightDashRemaining=ROLL_SECONDS;this.boost=1;return true}
 cancelFlightDash(){this.flightDashRemaining=0;this.flightRunTime=0;this.flightDashInput=null;this.boost=1;this.boosting=false;this.boostKind=null}
 toggleFlight(mode,world){this.setMode(this.mode===mode?'walk':mode,world)}
 togglePhase(world){this.phase=!this.phase;this.cancelFlightDash();this.dashRemaining=0;this.swimming=false;this.skimming=false;this.underwater=false;this.swimEffort=0;this.swimInput={f:0,s:0,u:0};this.swimVelocity={x:0,y:0,z:0};if(this.phase&&this.mode==='walk')this.setMode('free',world);if(!this.phase)world.recover(this.position,this.safe)}
 visit(p,yaw,pitch,mode,world){this.position={...p};this.yaw=yaw;this.pitch=pitch;this.phase=false;this.setMode(mode,world);this.underwater=!this.phase&&p.y<-.25&&world.water(p);this.swimming=mode==='walk'&&world.water(p);if(world.clear(this.position))this.safe={...this.position}}
 startClimb(world){if(this.phase)return false;const hit=world.surface(this.position,this.yaw);if(!hit)return false;this.setMode('walk',world);this.climbing=hit;this.climbVelocity={f:0,s:0};this.climbFast=false;this.swimming=false;this.skimming=false;this.velocity=0;this.position.x=hit.x+hit.nx*.48;this.position.z=hit.z+hit.nz*.48;return true}
 releaseClimb(jump=false){const h=this.climbing;this.climbing=null;this.mantle=null;if(jump&&h){this.position.x+=h.nx*.8;this.position.z+=h.nz*.8;this.velocity=9;this.jumped=true}}
 climbStep(dt,{f=0,s=0,jump=false,fast=false},world){const p=this.position,old={...p},h=this.climbing;this.swimming=false;this.skimming=false;this.boosting=false;this.boostKind=null;this.swimEffort=0;this.jumped=false;this.grounded=false;this.climbFast=fast;
  if(jump){this.releaseClimb(true);return 0}
  if(this.mantle){const m=this.mantle;m.t=Math.min(1,m.t+dt/(fast?.85:1.8));const smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10)},lift=smooth(m.t/.68),over=smooth((m.t-.44)/.56);p.y=T.MathUtils.lerp(m.from.y,m.to.y,lift);for(const k of ['x','z'])p[k]=T.MathUtils.lerp(m.from[k],m.to[k],over);contain(p);if(m.t===1){this.releaseClimb();this.grounded=true}return 0}
  const wallYaw=Math.atan2(h.nx,h.nz),length=Math.max(1,Math.hypot(f,s)),velocity=this.climbVelocity||(this.climbVelocity={f:0,s:0}),rate=fast?.72:.28,blend=1-Math.exp(-dt*5);
  velocity.f+=(f/length*rate-velocity.f)*blend;velocity.s+=(s/length*rate-velocity.s)*blend;this.climbEffort=Math.min(1,Math.hypot(velocity.f,velocity.s)/rate);
  const target={x:p.x+h.nz*velocity.s*dt,y:p.y+velocity.f*dt,z:p.z-h.nx*velocity.s*dt};
  if(f>0&&p.y>h.body.top-.4){const top={x:h.x-h.nx*.7,y:h.body.top+1.7,z:h.z-h.nz*.7};if(world.clear(top)){this.mantle={from:{...p},to:top,t:0};return 0}}
  const next=world.surface(target,wallYaw,1.2);if(next){const snapped={x:next.x+next.nx*.48,y:target.y,z:next.z+next.nz*.48},correction=Math.hypot(snapped.x-target.x,snapped.z-target.z),normalDot=next.nx*h.nx+next.nz*h.nz;
   // Never teleport the torso over mouldings or onto a different face. A ledge
   // blocks lateral travel until climbed over; contiguous faces join smoothly.
   if(correction<.025&&normalDot>.85&&world.clear(snapped)){Object.assign(p,snapped);this.climbing=next}}
  contain(p);if(f<0&&p.y<=world.floor(p)+1.75){this.releaseClimb();this.grounded=true}
  this.speed=Math.hypot(p.x-old.x,p.y-old.y,p.z-old.z)/Math.max(dt,.001);this.underwater=!this.phase&&p.y<-.25&&world.water(p);if(world.clear(p))this.safe={...p};return 0
 }
 step(dt,{f=0,s=0,u=0,fast=false,jump=false}={},world){dt=Math.min(dt,.05);this.carrierMotion=null;const carrier=!this.phase&&(this.climbing?.body?.carrier||this.support);if(carrier){carrier.updateWorldMatrix(true,false);if(this.carrierMatrix){const transform=new T.Matrix4().multiplyMatrices(carrier.matrixWorld,this.carrierMatrix.clone().invert()),next=new T.Vector3().copy(this.position).applyMatrix4(transform);if(next.distanceTo(new T.Vector3().copy(this.position))<30){Object.assign(this.position,next);this.carrierMotion=transform;if(this.climbing){const h=this.climbing,point=new T.Vector3(h.x,this.position.y,h.z).applyMatrix4(transform),normal=new T.Vector3(h.nx,0,h.nz).transformDirection(transform);h.x=point.x;h.z=point.z;h.nx=normal.x;h.nz=normal.z}}}this.carrierMatrix=carrier.matrixWorld.clone()}else this.carrierMatrix=null;if(!this.phase&&!this.climbing){world.pushDynamic(this.position);if(world.nearby(this.position).some(b=>b.damageCollision&&world.overlap(this.position,b)))world.recover(this.position,this.safe);}contain(this.position);if(this.climbing)return this.climbStep(dt,{f,s,jump,fast},world);this.impacts=[];let contactBody=null;this.jumped=false;const p=this.position,old={...p},flying=this.mode!=='walk';const wasGrounded=this.grounded,wasSwimming=this.swimming;this.skimming=false;this.swimming=!this.phase&&world.water(p)&&(!flying||p.y<-.25);const swim=this.swimming;if(swim&&!wasSwimming){this.cancelFlightDash();const v=this.flightVelocity||{x:0,y:0,z:0},scale=Math.min(1,12/(Math.hypot(v.x,v.y,v.z)||1));this.swimVelocity={x:v.x*scale,y:v.y*scale,z:v.z*scale}}if(!swim&&wasSwimming){this.boost=1;this.dashRemaining=0;this.swimVelocity={x:0,y:0,z:0}}let launching=flying&&!swim&&this.flightDashRemaining>0;if(launching){this.flightDashRemaining=Math.max(0,this.flightDashRemaining-dt);if(!f&&!s&&!u)({f,s,u}=this.flightDashInput);fast=true;}if(swim&&(fast||this.dashRemaining>0)&&!f&&!s&&!u)f=1;if(swim&&this.dashRemaining>0){fast=true;this.dashRemaining=Math.max(0,this.dashRemaining-dt)}const moving=!!(f||s||((flying?this.mode!=='gaze':swim)&&u));this.boost=fast&&moving&&(flying||swim)?Math.min(swim?9:4,Math.max(swim?2.5:1.25,this.boost)+dt*(swim?7:1.8)):1;if(launching)this.boost=rollBurstSpeed(1-this.flightDashRemaining/ROLL_SECONDS)/FLIGHT_SPEED;const submerged=!this.phase&&world.water(p)&&p.y<0;if(submerged){this.flightDashRemaining=0;this.flightRunTime=0;}// Ordinary takeoff reaches full speed in exactly two seconds. Boosts keep
  // their immediate kick; releasing boost returns to full ordinary cruise.
  this.flightRunTime=flying&&!swim&&moving?(fast?FLIGHT_ACCEL_SECONDS:Math.min(FLIGHT_ACCEL_SECONDS,this.flightRunTime+dt)):0;
  const ramp=this.flightRunTime/FLIGHT_ACCEL_SECONDS,cruise=ramp*ramp*(3-2*ramp);
  const speed=swim?4.2*this.boost:flying?FLIGHT_SPEED*this.boost*cruise:fast?15:7.5;const v=direction(this.yaw,this.pitch,f,s,u,flying?this.mode:swim?'free':'gaze');const delta={x:0,y:0,z:0};
  // Near-level flight rides the surface. Q or a deliberate downward flight
  // direction still pierces it, including a high-speed water impact.
  const horizontal=Math.hypot(v.x,v.z),diving=this.mode==='free'&&(u<0||v.y<-horizontal*.35);
  const surfaceAhead={x:p.x+v.x*speed*dt,y:.3,z:p.z+v.z*speed*dt};
  const rideSurface=flying&&!swim&&!this.phase&&!diving&&p.y>=-.25&&world.water({...p,y:.3})&&world.water(surfaceAhead);
  if(rideSurface&&v.y<=0&&p.y+v.y*speed*dt<=SKIM_HEIGHT&&this.mode==='free'){
   if(horizontal>0){v.x/=horizontal;v.z/=horizontal}v.y=0;
   delta.y=SKIM_HEIGHT-p.y;
  }
  this.skimming=rideSurface&&horizontal>.01&&Math.min(p.y,p.y+v.y*speed*dt)<=1.2;

  if(swim){this.swimInput={f,s,u};const effort=Math.min(1,Math.hypot(f,s,u));this.swimEffort+=(effort-this.swimEffort)*(1-Math.exp(-5*dt));this.stroke+=dt*(2+effort*4);if(this.mode!=='gaze'&&!u&&!(f&&Math.abs(this.pitch)>.12))v.y=Math.max(-.65,Math.min(.65,(.32-p.y)*2.3))/speed;for(const k of ['x','y','z']){this.swimVelocity[k]+=(v[k]*speed*(1+.12*Math.sin(this.stroke))-this.swimVelocity[k])*(1-Math.exp(-dt*(k==='y'?9:5)));delta[k]=this.swimVelocity[k]*dt}if(flying&&this.mode==='gaze'){delta.y=0;this.swimVelocity.y=0}}
  else for(const k of ['x','y','z'])delta[k]+=v[k]*speed*dt;
  const impactSpeed=dt>0?Math.hypot(delta.x,delta.y,delta.z)/dt:0;const n=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.y,delta.z)/.3));for(let i=0;i<n;i++)for(const k of ['x','y','z']){if(!flying&&!swim&&k==='y')continue;const was=p[k];p[k]+=delta[k]/n;if(!this.phase&&!world.clear(p)){const body=world.nearby(p).find(b=>world.overlap(p,b));if(body&&this.mode==='walk'&&((!swim&&this.grounded)||(swim&&body.waterExit))&&k!=='y'){const stepY=world.nearby(p).reduce((height,b)=>world.overlap(p,b)?Math.max(height,b.damageCollision?b.damageCollision.floorAt(p,p.y-1.7+.42):world.heightAt(p,b)):height,-Infinity)+1.7;if(stepY>=p.y&&stepY-p.y<=.42&&world.clear({...p,y:stepY})){p.y=stepY;continue}}if(body){contactBody=body;if(body!==this.lastContactBody&&!this.impacts.some(e=>e.body===body)){const normal={x:0,y:0,z:0};normal[k]=-Math.sign(delta[k]);const point={x:p.x,y:p.y-.8,z:p.z};if(k==='y')point.y=normal.y>0?body.top:body.bottom;else if(body.r!=null){const len=Math.hypot(p.x-body.x,p.z-body.z)||1;normal.x=(p.x-body.x)/len;normal.z=(p.z-body.z)/len;point.x=body.x+normal.x*body.r;point.z=body.z+normal.z*body.r;}this.impacts.push({body,point,normal,speed:impactSpeed,sonic:fast&&swim,movement:swim?'swim':flying?'fly':'walk',boosted:!!fast,phase:this.phase})}}p[k]=was}}
  if(!this.phase&&delta.y<0&&p.y+delta.y<=OCEAN.floor+1.7&&world.seabedBody){if(this.lastContactBody!==world.seabedBody)this.impacts.push({body:world.seabedBody,point:{x:p.x,y:OCEAN.floor,z:p.z},normal:{x:0,y:1,z:0},speed:impactSpeed,sonic:fast&&swim,movement:swim?'swim':flying?'fly':'walk',boosted:!!fast,phase:this.phase});contactBody=world.seabedBody}this.lastContactBody=contactBody;const support=world.floor(p,p.y-1.65+.08);if(jump&&!flying&&!swim&&!this.phase&&this.velocity<=0&&Math.abs(p.y-(support+1.7))<.12){this.velocity=8.2;this.jumped=true;}
  this.grounded=false;
  if(!flying&&!this.phase){if(world.water(p)){this.swimming=true;this.velocity=0;p.y=Math.min(.65,Math.max(-118.1,p.y));}
   else{this.swimming=false;this.skimming=false;this.velocity=Math.max(-100,this.velocity-22*dt);const floor=world.floor(p,old.y-1.65+.4),next=p.y+this.velocity*dt;const crosses=next<.4&&p.y>=.4&&world.water({...p,y:.3});if(crosses&&floor<-.5){p.y=.32;this.velocity=0;this.swimming=true}else if((next<=floor+1.7||(wasGrounded&&!this.jumped&&p.y-(floor+1.7)<=.42))&&this.velocity<=0){p.y=floor+1.7;this.velocity=0;this.grounded=true}else if(next>p.y){const rise=next-p.y,count=Math.max(1,Math.ceil(rise/.12));for(let i=0;i<count;i++){const trial={...p,y:p.y+rise/count};if(!world.clear(trial)){this.velocity=0;break}p.y=trial.y}}else p.y=next}}
  // Smooth the visible torso/camera over stair risers without moving the
  // collision capsule away from the supporting tread.
  if(this.grounded&&wasGrounded&&!this.jumped&&!swim&&!flying){this.stepOffset=T.MathUtils.clamp((this.stepOffset||0)-(p.y-old.y),-.3,.3)*Math.exp(-dt*14)}else this.stepOffset=0;
  contain(p);this.support=this.grounded?world.nearby(p).find(b=>b.carrier&&world.horizontal(p,b,-.05)&&Math.abs(p.y-b.top-1.7)<.13)?.carrier:null;if(this.support){this.support.updateWorldMatrix(true,false);this.carrierMatrix=this.support.matrixWorld.clone()}this.underwater=!this.phase&&p.y<-.25&&world.water(p);this.walkSpeed=Math.hypot(p.x-old.x,p.z-old.z)/Math.max(dt,.001);this.speed=Math.hypot(p.x-old.x,p.y-old.y,p.z-old.z)/Math.max(dt,.001);if(flying){this.flightInput={f,s,u};this.flightVelocity={x:(p.x-old.x)/Math.max(dt,.001),y:(p.y-old.y)/Math.max(dt,.001),z:(p.z-old.z)/Math.max(dt,.001)};}this.boosting=fast&&moving&&this.speed>1&&(flying||this.swimming);this.boostKind=this.boosting?(this.swimming||this.underwater?'water':'air'):null;if(world.clear(p))this.safe={...p};return Math.hypot(p.x-old.x,p.z-old.z);
 }
}
