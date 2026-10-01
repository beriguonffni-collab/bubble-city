import * as T from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {OCEAN} from './Physics.js';
import {random,softDisc} from './Assets.js';
export function buildInhabitedDepths({scene,city,solids,instance,geo,m,box,cylinder,tree}){
 const rand=random(321),animated=[];
 const ceramic=new T.MeshPhysicalMaterial({color:0xe3ede2,roughness:.22,metalness:.25,clearcoat:1});
 const weave=document.createElement('canvas');weave.width=512;weave.height=512;const wc=weave.getContext('2d');wc.fillStyle='#356e7b';wc.fillRect(0,0,512,512);for(let y=0;y<512;y+=4)for(let x=0;x<512;x+=4){wc.fillStyle=(x+y)%8?'#4e8794':'#275f6c';wc.fillRect(x,y,3,1);wc.fillRect(x,y,1,3)}const fabric=new T.CanvasTexture(weave);fabric.colorSpace=T.SRGBColorSpace;fabric.wrapS=fabric.wrapT=T.RepeatWrapping;fabric.repeat.set(4,4);fabric.anisotropy=8;const velvet=new T.MeshPhysicalMaterial({map:fabric,color:0x9bbfc0,roughness:.86,sheen:1,sheenColor:0x90ccd2,sheenRoughness:.65});
 const roundGeo=new RoundedBoxGeometry(1,1,1,3,.12);function furniture(mat,x,y,z,w,h,d){instance(roundGeo,mat,x,y,z,w,h,d);solids.add({x,z,w,d,top:y+h/2,bottom:y-h/2})}

 const brass=new T.MeshPhysicalMaterial({color:0xe9ca83,metalness:.85,roughness:.17});
 const glass=new T.MeshPhysicalMaterial({color:0xabefff,metalness:.1,roughness:.025,transparent:true,opacity:.23,clearcoat:1,side:T.DoubleSide,depthWrite:false});
 const light=new T.MeshStandardMaterial({color:0xcaffee,emissive:0x72ffe1,emissiveIntensity:2});
 const pink=new T.MeshStandardMaterial({color:0xf5b5e9,emissive:0xaa3789,emissiveIntensity:.5});
 // A visible geological foundation with a continuous top and deep sides. Its extent matches the water.
 const foundation=new T.BoxGeometry(1,1,1);
 // The caustic seabed owns the top face. Keep only sides and bottom here.
 const ids=[];for(const group of foundation.groups)if(group.materialIndex!==2)ids.push(...foundation.index.array.slice(group.start,group.start+group.count));foundation.setIndex(ids);foundation.clearGroups();
 instance(foundation,m.stone,0,-185,OCEAN.z,7500,130,7500);
 for(const side of [-1,1]){box(m.stone,side*3740,-57,OCEAN.z,20,126,7500,true);box(m.stone,0,-57,OCEAN.z+side*3740,7460,126,20,true)}
 function sign(text,x,y,z,width=7){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#083c51';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#b9f9e5';ctx.lineWidth=5;ctx.strokeRect(12,12,1000,232);ctx.font='46px Georgia';ctx.textAlign='center';ctx.fillStyle='#eaffed';ctx.fillText(text,512,146);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const a=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.3}));a.position.set(x,y,z);city.add(a)}
 function room(x,floor,z,w,d,name){
  const h=6;
  box(ceramic,x,floor-.5,z,w+1,1,d+1,true);box(ceramic,x,floor+h,z,w+1,.6,d+1,true);
  box(m.stone,x-w/2,floor+h/2,z,.5,h,d,true);box(m.stone,x+w/2,floor+h/2,z,.5,h,d,true);
  // Rear and front panoramic glazing have matching collision, with a real open central doorway.
  box(glass,x,floor+h/2,z-d/2,w,h,.3,true);
  for(const side of [-1,1])box(glass,x+side*(w/4+1),floor+h/2,z+d/2,w/2-2,h,.3,true);
  box(ceramic,x,floor+h-.7,z+d/2,4,1.4,.5,true);
  for(const zz of [-d/2,d/2])for(const xx of [-w/2,w/2])cylinder(brass,x+xx,floor+h/2,z+zz,.16,h,true);
  box(light,x,floor+.03,z,w-1,.03,.08,false);box(light,x,floor+h-.35,z-d/2+.4,w-1,.06,.06,false);
  furniture(velvet,x-w*.25,floor+.4,z-d*.2,4,.8,2,true);furniture(velvet,x-w*.25,floor+1.1,z-d*.2-.8,4,1.2,.35,true);
  box(ceramic,x+w*.25,floor+.9,z-d*.2,3.5,.18,1.5,true);for(const dx of [-1.4,1.4])box(brass,x+w*.25+dx,floor+.45,z-d*.2,.12,.9,1.2,true);
  cylinder(glass,x,floor+.8,z+1,1.3,.1,true);instance(geo.ring,brass,x,floor+.86,z+1,1.3,1.3,1.3,Math.PI/2);cylinder(brass,x,floor+.4,z+1,.12,.8,true);
  for(const side of [-1,1])furniture(velvet,x-w*.25+side*1.85,floor+.9,z-d*.2,.4,1.5,2.1);for(let i=0;i<5;i++){box(brass,x-w/2+.5,floor+1+i*.65,z-d/2+1,3.4,.08,1,true);for(let j=0;j<6;j++)box(j%2?pink:ceramic,x-w/2-.7+j*.42,floor+1.25+i*.65,z-d/2+1,.28,.4,.5,false)}
  for(const side of [-1,1]){cylinder(ceramic,x+side*(w/2-1.5),floor+.6,z+d/2-1.5,.7,1.2,true);tree(x+side*(w/2-1.5),floor+1,z+d/2-1.5,.52,false)}
  sign(name,x,floor+h-.5,z+d/2+.35,w*.65);
  solids.dry.push({x,z,w:w-.4,d:d-.4,bottom:floor,top:floor+h});
 }
 // Habitable seabed quarter. Each shell has an open doorway and dry interior.
 for(let i=0;i<12;i++){const x=i%2? -48:48,z=130-Math.floor(i/2)*190;room(x,-117,z,20,18,i===0?'LANTERN SANCTUARY':['TIDAL ARCHIVE','THE CORAL STUDIO','ABYSSAL TEA ROOM'][i%3]);box(m.stone,x,-119,z,22,2,20,true);for(let j=0;j<8;j++){box(m.ivory,x,-119.65,z+12+j*3,2,.7,2,true);cylinder(light,x-2,-118.5,z+12+j*3,.17,1.5,false)}}
 // Larger grounded habitats and ribs make the seabed an inhabited foundation, not an empty plane.
 const habitatLots=[];for(let i=0,attempt=0;i<60&&attempt<1500;attempt++){const x=(i%2?1:-1)*(170+rand()*420),z=400-rand()*2300,r=8+rand()*10;if(habitatLots.some(p=>Math.hypot(x-p.x,z-p.z)<r+p.r+2))continue;habitatLots.push({x,z,r});i++;cylinder(m.stone,x,-117,z,r,6,true);for(let a=0;a<8;a++){const angle=a*Math.PI/4;instance(geo.leaf,a%2?pink:m.coral2,x+Math.cos(angle)*5,-112+rand()*4,z+Math.sin(angle)*5,1.3,3+rand()*4,1.2)}}
 // Jellyfish, rays and turtles have silhouettes, fins and articulated movement.
 for(let i=0;i<30;i++){const g=new T.Group();g.position.set((rand()-.5)*800,-95-rand()*18,250-rand()*2400);const type=i%3;const shell=new T.Mesh(type===0?new T.SphereGeometry(1,20,14,0,Math.PI*2,0,Math.PI*.58):new T.SphereGeometry(1,20,12),type===0?glass:type===1?m.coral2:m.dark);shell.scale.set(type===1?2.8:1.5,type===0?1.2:.45,type===1?1.5:2);g.add(shell);const fins=[];if(type===0){for(let n=0;n<8;n++){const points=Array.from({length:12},(_,j)=>new T.Vector3(Math.cos(n)*.8+Math.sin(j*.6)*.15,-j*.35,Math.sin(n)*.8));const tentacle=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),22,.035,4),light);g.add(tentacle);fins.push(tentacle)}}else for(const side of [-1,1]){const fin=new T.Mesh(new T.SphereGeometry(1,12,8),type===1?m.coral2:m.dark);fin.position.x=side*1.7;fin.scale.set(1.8,.09,type===1?.8:1.2);g.add(fin);fins.push(fin)}const eyeMat=new T.MeshBasicMaterial({color:0x072237});if(type){for(const side of [-1,1]){const eye=new T.Mesh(new T.SphereGeometry(.12,8,6),eyeMat);eye.position.set(side*.45,.3,1.6);g.add(eye)}}scene.add(g);animated.push({mesh:g,type:'animal',fins,origin:g.position.clone(),seed:i})}
 const positions=[];for(let i=0;i<2400;i++)positions.push((rand()-.5)*1400,-118+rand()*15,450-rand()*2600);const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(positions,3));const plankton=new T.Points(pg,new T.PointsMaterial({map:softDisc(),size:.18,color:0xa6ffcc,transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending}));scene.add(plankton);
 return{actors:animated,update(t){plankton.position.y=Math.sin(t*.15)*.5;for(const a of animated){if(a.type==='orb'){a.mesh.rotation.y=t*.3;a.mesh.position.y=a.y+Math.sin(t)*.12}else{a.mesh.position.copy(a.origin).add(new T.Vector3(Math.sin(t*.055+a.seed)*13,Math.sin(t*.5+a.seed)*1.2,Math.cos(t*.055+a.seed)*13));a.mesh.rotation.y=t*.055+a.seed;for(let i=0;i<a.fins.length;i++)a.fins[i].rotation.z=Math.sin(t*1.5+i)*.25}}}};
}
