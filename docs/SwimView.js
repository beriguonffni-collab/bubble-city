import * as T from './vendor/three.module.js';

export function createSwimView(scene,camera){
 if(!camera.parent)scene.add(camera);
 const rig=new T.Group();camera.add(rig);rig.visible=false;
 const suit=new T.MeshStandardMaterial({color:0x163c48,roughness:.7,metalness:.12,depthTest:false,depthWrite:false});
 const glove=new T.MeshStandardMaterial({color:0x426b72,roughness:.6,depthTest:false,depthWrite:false});
 const arms=[];
 for(const side of [-1,1]){
  const arm=new T.Group();rig.add(arm);
  const sleeve=new T.Mesh(new T.CylinderGeometry(.062,.085,.43,12),suit);sleeve.rotation.x=Math.PI/2;sleeve.position.z=.2;arm.add(sleeve);
  const hand=new T.Mesh(new T.SphereGeometry(1,12,8),glove);hand.scale.set(.074,.045,.13);hand.position.z=-.045;arm.add(hand);
  for(let i=0;i<4;i++){const finger=new T.Mesh(new T.CapsuleGeometry(.013,.08,3,6),glove);finger.rotation.x=Math.PI/2;finger.position.set((i-1.5)*.032,0,-.16-Math.sin(i)*.012);arm.add(finger);}
  arm.traverse(m=>{if(m.isMesh){m.frustumCulled=false;m.renderOrder=100;}});arms.push({arm,side});
 }
 let weight=0;
 return {update(player,time,dt,reduced){
  weight+=((player.swimming?1:0)-weight)*(1-Math.exp(-dt*7));rig.visible=weight>.01;
  const effort=.2+.8*(player.swimEffort||0),phase=reduced?0:player.stroke||0;
  for(const {arm,side} of arms){const stroke=Math.sin(phase+(side>0?Math.PI:0));
   arm.position.set(side*(.27+(1-stroke)*.07*effort)*Math.min(1,camera.aspect),-.27-(1-weight)*.7+Math.cos(phase*2)*.025*effort,-.52-stroke*.21*effort);
   arm.rotation.set(-.08+stroke*.12*effort,side*(-.25+stroke*.32*effort),side*(.18+stroke*.22*effort));
  }
  return reduced?{bob:0,roll:0,pitch:0}:{bob:weight*(Math.sin(time*1.6)*.025+Math.sin(phase*2)*.022*effort),roll:weight*Math.sin(phase)*.012*effort,pitch:weight*Math.cos(phase*2)*.009*effort};
 }};
}
