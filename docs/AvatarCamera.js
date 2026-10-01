import * as T from './vendor/three.module.js';
export class AvatarCamera{
 constructor(){this.targetDistance=0;this.distance=0;this.forward=new T.Vector3();this.actualDistance=0}
 zoom(delta){this.targetDistance=T.MathUtils.clamp(this.targetDistance+Math.sign(delta)*(this.targetDistance<3?.65:1.2),0,16);if(this.targetDistance<.5)this.targetDistance=0}
 update(camera,player,dt,solids){
  this.distance+=(this.targetDistance-this.distance)*(1-Math.exp(-dt*14));if(this.distance<.025)this.distance=0;
  this.forward.set(0,0,-1).applyQuaternion(camera.quaternion);let safe=this.distance;
  for(let d=.5;d<=this.distance;d+=.2){const p={x:player.position.x-this.forward.x*d,y:player.position.y-this.forward.y*d+.15*d,z:player.position.z-this.forward.z*d};if(!player.phase&&!solids.clear(p)){safe=Math.max(0,d-.3);break}}
  camera.position.x-=this.forward.x*safe;camera.position.y+=(-this.forward.y+.15)*safe;camera.position.z-=this.forward.z*safe;this.actualDistance=safe;
  return safe>.6;
 }
}
