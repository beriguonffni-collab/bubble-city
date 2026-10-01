import * as T from './vendor/three.module.js';
import {limb} from './WallContacts.js';
// Reverse sculling and lateral strokes, rather than playing a forward crawl
// while the body travels backwards. The forward crawl remains the authored clip.
export function createSwimMotion(model,rest){
 let weight=0,clock=0,lean=0,bank=0;
 const bone=n=>model.getObjectByName(n),v=()=>new T.Vector3();
 return{reset(){weight=0;lean=0;bank=0},update(player,dt){
  const saved=[];model.traverse(b=>{if(b.isBone)saved.push([b,b.quaternion.clone(),b.position.clone()])});
  clock+=dt;weight+=(1-weight)*(1-Math.exp(-8*dt));
  const input=player.swimInput||{f:0,s:0},back=Math.max(0,-input.f),side=input.s||0,boost=player.boosting?Math.min(1,(player.boost-1)/6):0;
  for(const [name,p] of rest){const b=bone(name);b.quaternion.slerp(p.quaternion,weight);b.position.lerp(p.position,weight)}
  model.updateMatrixWorld(true);const head=bone('Head').getWorldPosition(v()),hip=bone('pelvis').getWorldPosition(v());
  for(const [suffix,sign] of [['l',1],['r',-1]]){
   const phase=clock*(boost?5:3)+(side?sign*.7:0),stroke=Math.sin(phase),recover=Math.cos(phase),leading=Math.max(0,-sign*side);
   const hand=new T.Vector3(head.x+sign*(.38+.09*recover+.14*Math.abs(side)),head.y-.35+.09*stroke+leading*.13,head.z+.15+.20*stroke);
   limb(bone('upperarm_'+suffix),bone('lowerarm_'+suffix),bone('hand_'+suffix),hand,new T.Vector3(sign*.65,head.y-.12,head.z-.1));
   const kick=Math.sin(phase+sign*.8),foot=new T.Vector3(hip.x+sign*(.16+.07*recover),hip.y-.65+.1*kick,hip.z-.12+.15*kick);
   limb(bone('thigh_'+suffix),bone('calf_'+suffix),bone('foot_'+suffix),foot,new T.Vector3(sign*.32,hip.y-.3,hip.z+.6));
  }
  for(const [b,q,p] of saved){b.quaternion.slerpQuaternions(q,b.quaternion.clone(),weight);b.position.lerpVectors(p,b.position.clone(),weight)}
  const follow=1-Math.exp(-6*dt);lean+=((.35+.4*boost)*back-lean)*follow;bank+=(-side*(.35+.4*boost)-bank)*follow;
  return{lean,bank,direction:back>.4?'backward':side>0?'right':'left'};
 }};
}
