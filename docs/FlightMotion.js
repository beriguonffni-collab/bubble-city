import {ROLL_SECONDS} from './ShiftGesture.js';
import * as T from './vendor/three.module.js';
import {limb,aim} from './WallContacts.js';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
// A coordinated pose layer: hips, spine, shoulders, elbows, knees and ankles
// follow different phases. A short tap extends into an immediate synchronized roll.
export function createFlightMotion(model,rest=new Map()){
 const bone=n=>model.getObjectByName(n),v=()=>new T.Vector3();
 let blend=0,bank=0,lastYaw=null,age=2,queued=0,clock=0,weight=0,requested=0,travelF=1,travelS=0,boostBlend=0;
 function dash(){age=0;requested=0;queued=0}
 function update(player,dt,{active=true,reduced=false}={}){
  weight+=(1-weight)*(1-Math.exp(-dt*8));const saved=[];model.traverse(o=>{if(o.isBone)saved.push([o,o.quaternion.clone(),o.position.clone()])});
  clock+=dt;age+=dt;
  blend+=(Math.min(1,player.speed/30)-blend)*(1-Math.exp(-dt*4));
  const input=player.flightInput||{f:1,s:0},length=Math.max(1,Math.hypot(input.f,input.s));
  const follow=1-Math.exp(-dt*7);travelF+=(input.f/length-travelF)*follow;travelS+=(input.s/length-travelS)*follow;
  boostBlend+=((player.boosting?Math.min(1,(player.boost-1)/2):0)-boostBlend)*(1-Math.exp(-dt*6));
  const rolling=age<ROLL_SECONDS&&player.speed>.6&&input.f>0&&input.f>Math.abs(input.s||0);
  if(rolling){blend=Math.max(blend,1-Math.exp(-age*70));boostBlend=Math.max(boostBlend,1-Math.exp(-age*70));travelF=1;travelS=0}
  const u=Math.min(1,age/ROLL_SECONDS),roll=rolling?Math.PI*2*smooth((u-.08)/.9):0;
  const tuck=rolling?smooth(u/.15)*(1-smooth((u-.75)/.25))*.3:0;
  const turn=lastYaw===null?0:Math.atan2(Math.sin(player.yaw-lastYaw),Math.cos(player.yaw-lastYaw))/Math.max(dt,.001);lastYaw=player.yaw;
  bank+=((Math.max(-.42,Math.min(.42,turn*.15))*blend)-bank)*(1-Math.exp(-dt*5));
  const extension=smooth(blend),reach=extension*Math.max(0,travelF)*smooth(boostBlend),backward=Math.max(0,-travelF),lateral=Math.abs(travelS);
  // Idle contains a weight shift and twisted shoulders. Remove that asymmetry
  // gradually using the actual bind pose before solving paired flight limbs.
  for(const [b] of saved){const pose=rest.get(b.name);if(pose){b.quaternion.slerp(pose.quaternion,extension);b.position.lerp(pose.position,extension);b.scale.copy(pose.scale)}}
  model.updateMatrixWorld(true);
  const sway=(reduced?0:1)*Math.sin(clock*2.1)*.065;
  bone('spine_01').rotation.x+=sway*.12;bone('spine_02').rotation.x+=sway*.08;
  // Shared breathing motion preserves matching reach on both sides.
  model.updateMatrixWorld(true);const head=bone('Head').getWorldPosition(v()),hip=bone('pelvis').getWorldPosition(v());
  for(const [side,sign] of [['l',1],['r',-1]]){
   const wave=Math.sin(clock*2.1);
   // Both arms finish the hover transition reaching forward together.
   // Small offset waves keep the pose alive without pulling either arm back.
   const cruiseY=head.y+.30+.008*wave,cruiseZ=head.z-.04;
   const leading=Math.max(0,-sign*travelS);
   const hand=new T.Vector3(head.x+sign*(.34-.16*reach+.20*lateral*extension),T.MathUtils.lerp(head.y-.43+.055*wave+leading*.17+backward*.10,cruiseY,reach),T.MathUtils.lerp(head.z+.16+backward*.12-leading*.12,cruiseZ,reach));
   const elbow=new T.Vector3(sign*T.MathUtils.lerp(.66,.42,reach),head.y-T.MathUtils.lerp(.30,.12,reach),head.z+T.MathUtils.lerp(-.20,-.06,reach));
   limb(bone('upperarm_'+side),bone('lowerarm_'+side),bone('hand_'+side),hand,elbow);
   if(reach>.01){const handBone=bone('hand_'+side),before=handBone.quaternion.clone();aim(handBone,bone('middle_01_'+side),handBone.getWorldPosition(v()).add(new T.Vector3(0,1,0)));handBone.quaternion.slerpQuaternions(before,handBone.quaternion.clone(),reach);handBone.updateMatrixWorld(true)}
   // Hover keeps its relaxed knees; cruise extends both legs behind the hips.
   const hoverBend=.20+.025*wave;
   const bend=T.MathUtils.lerp(hoverBend,.018+.006*wave,reach)+(backward*.07+leading*.08)*extension;
   const foot=new T.Vector3(hip.x+sign*(.15-.045*reach+.05*lateral*extension),hip.y-.825+bend,hip.z-.04);
   const knee=new T.Vector3(sign*.22,hip.y-.25,hip.z+.65);
   limb(bone('thigh_'+side),bone('calf_'+side),bone('foot_'+side),foot,knee);
   const footBone=bone('foot_'+side),footBefore=footBone.quaternion.clone();aim(footBone,bone('ball_'+side),footBone.getWorldPosition(v()).add(new T.Vector3(0,-1,.05)));footBone.quaternion.slerpQuaternions(footBefore,footBone.quaternion.clone(),reach);footBone.updateMatrixWorld(true);
  }
  // Lift the gaze along the flight path instead of leaving the face pointed down.
  for(const [name,angle] of [['neck_01',-.25],['Head',-.95]]){const b=bone(name),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),angle*reach).multiply(b.getWorldQuaternion(new T.Quaternion()));b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));b.updateMatrixWorld(true)}
  for(const [b,q,p] of saved){b.quaternion.slerpQuaternions(q,b.quaternion.clone(),weight);b.position.lerpVectors(p,b.position.clone(),weight)}
  const forwardLean=-Math.PI/2,backLean=(.60+.52*boostBlend)*backward;
  const lean=T.MathUtils.lerp(-.025,Math.max(0,travelF)*T.MathUtils.lerp(-Math.PI/4,forwardLean,smooth(boostBlend))+backLean,extension);
  const sideLean=-travelS*(.55+.55*boostBlend)*extension;
  return{lean,bank:sideLean+(reduced?0:bank*Math.max(0,travelF)),roll,tuck,blend,direction:blend<.08?'hover':travelF<-.4?'backward':lateral>.4?(travelS>0?'right':'left'):'forward'};
 }
 return{update,dash,reset(){blend=0;bank=0;lastYaw=null;age=2;queued=0;weight=0;requested=0;travelF=1;travelS=0;boostBlend=0}};
}
