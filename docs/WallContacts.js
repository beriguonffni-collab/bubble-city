import * as T from './vendor/three.module.js';
const v=()=>new T.Vector3();
export function aim(bone,end,target){const from=bone.getWorldPosition(v()),direction=end.getWorldPosition(v()).sub(from).normalize(),desired=target.clone().sub(from).normalize();const rotation=new T.Quaternion().setFromUnitVectors(direction,desired).multiply(bone.getWorldQuaternion(new T.Quaternion()));const parent=bone.parent.getWorldQuaternion(new T.Quaternion()).invert();bone.quaternion.copy(parent.multiply(rotation));bone.updateMatrixWorld(true)}
export function limb(root,mid,end,target,pole){if(!root||!mid||!end)return;const a=root.getWorldPosition(v()),b=mid.getWorldPosition(v()),c=end.getWorldPosition(v()),l1=a.distanceTo(b),l2=b.distanceTo(c);const dir=target.clone().sub(a),distance=Math.max(.01,Math.min(dir.length(),l1+l2-.002));dir.normalize();const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));const perpendicular=pole.clone().sub(a).addScaledVector(dir,-pole.clone().sub(a).dot(dir)).normalize();const joint=a.clone().addScaledVector(dir,along).addScaledVector(perpendicular,height);aim(root,mid,joint);aim(mid,end,a.clone().addScaledVector(dir,distance))}
// Hold positions are world-space, so a planted hand does not slide with the torso.
export function createWallContacts(model){
 const bone=name=>model.getObjectByName(name),up=new T.Vector3(0,1,0),holds=new Map(),palms=new Map();let previous=null,travel=0,step=0,reach=null;
 model.updateMatrixWorld(true);
 for(const side of ['l','r']){
  const hand=bone('hand_'+side),inv=hand.getWorldQuaternion(new T.Quaternion()).invert();
  const origin=hand.getWorldPosition(v());
  const middle=bone('middle_01_'+side).getWorldPosition(v()).sub(origin).applyQuaternion(inv);
  const index=bone('index_01_'+side).getWorldPosition(v()).sub(origin).applyQuaternion(inv);
  const y=middle.clone().normalize(),x=index.clone().sub(middle);x.addScaledVector(y,-x.dot(y)).normalize();if(side==='r')x.negate();const z=x.clone().cross(y).normalize();
  palms.set(side,{offset:middle.clone().multiplyScalar(.62),basis:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z)).invert()});
 }
 function normal(p){return new T.Vector3(p.climbing.nx||0,0,p.climbing.nz??1).normalize()}
 function project(p,point){
  const h=p.climbing,n=normal(p);
  if(h.body?.contactAt){const hit=h.body.contactAt(point,n);if(hit)return hit;return null}
  const base=new T.Vector3(h.x??p.position.x,point.y,h.z??p.position.z-.48);
  return{point:point.clone().addScaledVector(n,-point.clone().sub(base).dot(n)),normal:n};
 }
 function alignBody(anchor,p){
  const head=bone('Head').getWorldPosition(v()),hit=project(p,head);
  if(!hit)return;
  const n=normal(p),distance=head.clone().sub(hit.point).dot(n);
  anchor.position.addScaledVector(n,Math.max(-2.5,Math.min(.5,.26-distance)));anchor.updateMatrixWorld(true);
 }
 function ideal(p,side,foot=false){
  const n=normal(p),tangent=new T.Vector3(n.z,0,-n.x),sign=side==='l'?-1:1;
  const at=bone(foot?'pelvis':'Head').getWorldPosition(v()).addScaledVector(tangent,sign*(foot?.31:.32));
  at.y+=foot?-.69:.065+(side==='l'?.025:0);
  // Near a ledge, stay below its top until the mantle takes over.
  if(p.climbing.body)at.y=Math.min(at.y,p.climbing.body.top-.09);
  return project(p,at);
 }
 function update(p,dt){
  if(p.carrierMotion)for(const h of holds.values()){h.point.applyMatrix4(p.carrierMotion);h.from.applyMatrix4(p.carrierMotion);h.to.applyMatrix4(p.carrierMotion);h.normal.transformDirection(p.carrierMotion)}model.updateMatrixWorld(true);const n=normal(p),tangent=new T.Vector3(n.z,0,-n.x),position=new T.Vector3(p.position.x,p.position.y,p.position.z);
  const delta=previous?position.clone().sub(previous):v(),distance=delta.length();
  if(distance>2){holds.clear();travel=0;step=0;reach=null}
  travel+=Math.min(distance,.15);previous=position;
  // A reach finishes even when input stops. The other diagonal remains planted.
  if(reach){reach.age+=dt;if(reach.age>=reach.duration){for(const [id,h] of holds){const pair=(id.endsWith('l')?0:1)^(id.startsWith('foot')?1:0);if(pair===reach.pair)h.point.copy(h.to)}reach=null;step++}}
  if(!reach&&distance>.00001&&(travel>.14||holds.size===0)){reach={age:0,duration:p.climbFast?.24:.72,pair:step%2,fresh:true};travel=0}
  const fraction=reach?Math.min(1,reach.age/reach.duration):1;
  const diagnostics=[];
  for(const side of ['l','r'])for(const foot of [false,true]){
   const id=(foot?'foot_':'hand_')+side,pair=(side==='l'?0:1)^(foot?1:0),wanted=ideal(p,side,foot);if(!wanted)continue;
   let hold=holds.get(id);
   if(!hold){hold={point:wanted.point.clone(),normal:wanted.normal.clone(),from:wanted.point.clone(),to:wanted.point.clone()};holds.set(id,hold)}
   const swing=!!reach&&pair===reach.pair;
   if(swing&&reach.fresh){hold.from.copy(hold.point);const ahead=distance>.00001?project(p,wanted.point.clone().addScaledVector(delta,(delta.y<0?.22:.13)/distance)):null;hold.to.copy(ahead?.point||wanted.point);hold.normal.copy(wanted.normal)}
   if(swing){const a=fraction,ease=a*a*a*(a*(a*6-15)+10);hold.point.lerpVectors(hold.from,hold.to,ease);hold.point.addScaledVector(n,Math.sin(a*Math.PI)**2*.045)}
   // Never snap an overstretched limb to a new anchor; IK limits the reach.
   const root=bone((foot?'thigh_':'upperarm_')+side);
   if(foot){
    const target=hold.point.clone().addScaledVector(n,.11);target.y+=.07;
    const pole=bone('pelvis').getWorldPosition(v()).addScaledVector(n,-.30).addScaledVector(tangent,side==='l'?-.26:.26);pole.y-=.34;
    limb(root,bone('calf_'+side),bone(id),target,pole);
    aim(bone(id),bone('ball_'+side),hold.point);
   }else{
    const palm=palms.get(side),surfaceNormal=hold.normal.clone();
    const y=up.clone().addScaledVector(surfaceNormal,-up.dot(surfaceNormal)).normalize(),x=y.clone().cross(surfaceNormal).normalize();
    const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,surfaceNormal)).multiply(palm.basis);
    const target=hold.point.clone().addScaledVector(surfaceNormal,.018).sub(palm.offset.clone().applyQuaternion(rotation));
    const pole=bone('Head').getWorldPosition(v()).addScaledVector(tangent,side==='l'?-.42:.42).addScaledVector(n,.10);pole.y-=.27;
    limb(root,bone('lowerarm_'+side),bone(id),target,pole);
    const hand=bone(id);hand.quaternion.copy(hand.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));hand.updateMatrixWorld(true);
    for(const finger of ['index','middle','ring','pinky'])for(let j=1;j<=3;j++){
     const part=bone(finger+'_0'+j+'_'+side),end=bone(finger+'_0'+(j+1)+(j===3?'_leaf':'')+'_'+side);if(!part||!end)continue;
     aim(part,end,part.getWorldPosition(v()).addScaledVector(y,.08).addScaledVector(surfaceNormal,j===1?.006:-.008));
    }
    const actual=palm.offset.clone().applyQuaternion(hand.getWorldQuaternion(new T.Quaternion())).add(hand.getWorldPosition(v()));
    diagnostics.push({side,error:actual.distanceTo(hold.point),point:hold.point.toArray(),actual:actual.toArray(),planted:!swing||fraction>=.98});
   }
  }
  if(reach)reach.fresh=false;model.updateMatrixWorld(true);return diagnostics;
 }
 return{alignBody,update,reset(){holds.clear();previous=null;travel=0;step=0;reach=null}};
}

