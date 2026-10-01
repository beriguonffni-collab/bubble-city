import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {random,softDisc} from './Assets.js';
const TAU=Math.PI*2;
function bubbleTexture(){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,17,32,32,30);g.addColorStop(0,'rgba(105,220,242,0)');g.addColorStop(.7,'rgba(150,235,250,.07)');g.addColorStop(.94,'rgba(200,255,255,.66)');g.addColorStop(1,'rgba(200,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);ctx.strokeStyle='rgba(245,255,255,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(32,32,25,3.7,4.8);ctx.stroke();const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex}

function powWave(y){return Math.pow(.5+.5*Math.sin(y*34),2)}
function ribbon(){const p=[],uv=[],ix=[];for(let i=0;i<=20;i++){const y=i/20,w=Math.sin(Math.PI*(.025+y*.975))*(.046+.038*powWave(y));for(const side of [-1,1]){p.push(Math.sin(y*6)*.11+side*w,y,Math.sin(y*8)*.07+side*w*Math.sin(y*19)*.65);uv.push((side+1)/2,y)}if(i<20){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2)}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g}
function seahorseGeometry(){const parts=[];function colored(g,c){const color=new T.Color(c),v=[];for(let i=0;i<g.attributes.position.count;i++)v.push(color.r,color.g,color.b);g.setAttribute('color',new T.Float32BufferAttribute(v,3));parts.push(g)}
 const path=[new T.Vector3(.48,1.3,0),new T.Vector3(.1,1.38,0),new T.Vector3(-.21,1.1,0),new T.Vector3(-.08,.76,0),new T.Vector3(.08,.4,0),new T.Vector3(-.12,.06,0)];
 colored(new T.TubeGeometry(new T.CatmullRomCurve3(path),28,.14,8),0xf3bd63);
 const belly=new T.SphereGeometry(1,14,10);belly.scale(.23,.36,.16);belly.translate(.015,.48,0);colored(belly,0xf7c969);const crown=new T.ConeGeometry(.095,.22,6);crown.translate(.02,1.56,0);colored(crown,0xeaa954);
 const tail=[];for(let i=0;i<=40;i++){const t=i/40,a=t*TAU*1.4,r=.29*(1-t)+.025;tail.push(new T.Vector3(-.13+Math.sin(a)*r,-.01-t*.55+Math.cos(a)*r-.29,0))}colored(new T.TubeGeometry(new T.CatmullRomCurve3(tail),40,.045,6),0xe8a342);
 const snout=new T.CylinderGeometry(.065,.08,.42,8);snout.rotateZ(-Math.PI/2);snout.translate(.5,1.3,0);colored(snout,0xf9d382);
 for(const side of [-1,1]){const eye=new T.SphereGeometry(.047,8,6);eye.translate(.23,1.39,side*.13);colored(eye,0x06293e)}
 for(let i=0;i<8;i++){const ridge=new T.ConeGeometry(.07,.16,5);ridge.rotateZ(.8);ridge.translate(-.22+Math.sin(i*.48)*.07,.2+i*.12,0);colored(ridge,0xd06c4f)}
 const fin=new T.SphereGeometry(1,10,6);fin.scale(.2,.3,.018);fin.translate(-.25,.64,0);colored(fin,0xc1f5c6);return mergeGeometries(parts)}
function coralGeometry(seed){const r=random(seed),parts=[];const branch=(a,b,width)=>{parts.push(new T.TubeGeometry(new T.CatmullRomCurve3([a,a.clone().lerp(b,.45).add(new T.Vector3(.15,0,.1)),b]),6,width,5))};for(let i=0;i<7;i++){const a=i*TAU/7,b=new T.Vector3(Math.sin(a)*(1+r()),1+r()*2,Math.cos(a)*(1+r()));branch(new T.Vector3(),b,.1);for(let j=0;j<3;j++)branch(b.clone().multiplyScalar(.65),b.clone().add(new T.Vector3((r()-.5),.6+r(),(r()-.5))),.055)}return mergeGeometries(parts)}
export function buildOceanLife({scene,city,solids,foundations,core,districts,m,geo,instance,box,cylinder}){
 const rand=random(90872),time={value:0},matrix=new T.Object3D(),kelpGeometry=ribbon(),kelpMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.38,metalness:.1,side:T.DoubleSide,vertexColors:false});
 kelpMat.onBeforeCompile=s=>{s.uniforms.gardenTime=time;s.vertexShader='uniform float gardenTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  float phase=instanceMatrix[3].x*.071+instanceMatrix[3].z*.043;
  transformed.x+=pow(position.y,1.7)*(.10*sin(gardenTime*.65+phase+position.y*3.8)+.045*sin(gardenTime*1.13+phase));
  transformed.z+=position.y*position.y*.075*cos(gardenTime*.48+phase+position.y*4.);
 `);s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float vein=exp(-abs(vKelpUv.x-.5)*70.);float rib=pow(.5+.5*sin(vKelpUv.y*220.+abs(vKelpUv.x-.5)*40.),6.);
 diffuseColor.rgb*=.7+.3*vKelpUv.y;diffuseColor.rgb+=vec3(.06,.10,.012)*vein+vec3(.025,.045,.006)*rib;`);s.vertexShader='varying vec2 vKelpUv;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvKelpUv=uv;');s.fragmentShader='varying vec2 vKelpUv;\n'+s.fragmentShader};
 const groups=new Map(),coverage=[],kelpRoot=new T.Group();kelpRoot.name='Living kelp forests on every foundation';kelpRoot.userData.environmentLayer=true;city.add(kelpRoot);
 function blade(x,y,z,h,ry){const key=Math.floor(x/300)+','+Math.floor(z/300);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({x,y,z,h,ry,color:new T.Color().setHSL(.24+rand()*.13,.61+rand()*.18,.17+rand()*.19)})}
 // Every structural base receives six overlapping height bands of fronds and a dense skirt.
 const bases=[...foundations];function cover(f){let count=0;const top=Math.min(-3,f.top),bottom=Math.max(-118,f.bottom+1),rings=Math.max(1,Math.ceil((top-bottom)/19)),around=Math.max(10,Math.min(34,Math.ceil(f.r*.5)));
  for(let layer=0;layer<rings;layer++)for(let j=0;j<around;j++){const a=(j+rand()*.7)/around*TAU,r=f.r+.7+rand()*1.8,y=bottom+layer*19+rand()*3;blade(f.x+Math.sin(a)*r,y,f.z+Math.cos(a)*r,Math.min(9+rand()*17,-1.5-y),a);count++}
  for(let j=0;j<around;j++){const a=rand()*TAU,r=f.r+3+rand()*10;blade(f.x+Math.sin(a)*r,-119,f.z+Math.cos(a)*r,7+rand()*22,a);count++}coverage.push({...f,blades:count})
 }
 bases.forEach(cover);
 // Dense meadows run beside the inhabited submerged avenue, leaving the route and doors open.
 for(const side of [-1,1])for(let i=0;i<4400;i++){const x=side*(72+rand()*44),z=430-rand()*2350;if(core.some(p=>Math.hypot(x-p.x,z-p.z)<p.r))continue;blade(x,-119+rand(),z,4+rand()*17,rand()*TAU)}
 const reefMats=[0xee9aac,0xdfab52,0x826bce,0x4bceba].map(color=>new T.MeshStandardMaterial({color,roughness:.65}));const corals=Array.from({length:4},(_,i)=>coralGeometry(93+i));let reefCount=0;
 for(let i=0;i<2800;i++){const f=bases[i%bases.length],a=rand()*TAU,r=f.r+4+rand()*18,x=f.x+Math.cos(a)*r,z=f.z+Math.sin(a)*r,scale=.6+rand()*1.25;if(Math.abs(x)<23)continue;instance(corals[i%4],reefMats[i%4],x,-119,z,scale,scale,scale,0,a);reefCount++}
 // Coral conservatories: open arcades, recessed galleries and illuminated public seabed gardens.
 for(let i=0;i<14;i++){const side=i%2?1:-1,x=side*340,z=210-Math.floor(i/2)*330;
  box(m.ivory,x,-118.7,z,52,1.4,34);for(const sx of [-23,23])for(const sz of [-13,13]){cylinder(m.stone,x+sx,-110.5,z+sz,1.2,16);cylinder(m.gold,x+sx,-103,z+sz,1.9,.6)}
  box(m.ivory,x,-102.5,z,52,1,34);box(m.glow,x,-103.1,z+16,49,.16,.2);
  for(const sx of [-15,0,15]){cylinder(m.stone,x+sx,-117,z,5,2);instance(corals[i%4],reefMats[(i+1)%4],x+sx,-116,z,2.1,2.1,2.1);}
  for(let n=0;n<6;n++)box(m.ivory,x,-119.35,z+20+n*4,6,1.3,2.5);
 }
 for(const f of foundations.slice(bases.length)){cover(f);bases.push(f)}
 let blades=0;for(const [key,list] of groups){const mesh=new T.InstancedMesh(kelpGeometry,kelpMat,list.length);mesh.name='Flexible kelp '+key;mesh.userData.runtimeOnly=true;mesh.userData.softVegetation=true;for(let i=0;i<list.length;i++){const p=list[i];matrix.position.set(p.x,p.y,p.z);matrix.rotation.set(.07,p.ry,(rand()-.5)*.2);matrix.scale.set(p.h*.65,p.h,p.h*.65);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);mesh.setColorAt(i,p.color)}mesh.computeBoundingSphere();mesh.boundingSphere.radius+=4;kelpRoot.add(mesh);blades+=list.length}
 const horses=new T.InstancedMesh(seahorseGeometry(),new T.MeshStandardMaterial({vertexColors:true,roughness:.32,metalness:.16}),112);horses.name='112 animated reef seahorses';horses.userData.collisionInstances=112;city.add(horses);const animals=[];
 for(let i=0;i<112;i++){const c=core[i%core.length],a=(i%4)*1.57+.2,x=c.x+Math.sin(a)*(c.r+14),z=c.z+Math.cos(a)*(c.r+14),y=-101+(i%5)*13;const body=solids.add({x,z,w:1.4,d:1.1,bottom:y-1,top:y+2,dynamic:true,climbable:false,damageable:false,visual:{mesh:horses,index:i}});animals.push({x,y,z,a,body})}
 const bubbleGeo=new T.BufferGeometry(),bp=[];for(let i=0;i<3400;i++){const f=bases[i%bases.length],a=rand()*TAU;bp.push(f.x+Math.cos(a)*(f.r+5),-118+rand()*115,f.z+Math.sin(a)*(f.r+5))}bubbleGeo.setAttribute('position',new T.Float32BufferAttribute(bp,3));const bubbles=new T.Points(bubbleGeo,new T.PointsMaterial({map:bubbleTexture(),color:0xccffff,size:.65,transparent:true,opacity:.62,depthWrite:false}));bubbles.name='Rising reef oxygen';scene.add(bubbles);
 // Articulated strolling residents along the new shoreline: one instanced batch per body part.
 const paths=districts.promenades.filter((_,i)=>i%3===0).slice(0,420),parts={};for(const [name,g,mat] of [['body',geo.lowcyl,m.pink],['head',geo.sphere,m.ivory],['limbs',geo.lowcyl,m.dark]]){const mesh=new T.InstancedMesh(g,mat,paths.length*(name==='limbs'?4:1));mesh.userData.runtimeOnly=true;mesh.name='Waterfront residents '+name;city.add(mesh);parts[name]=mesh}
 const residents=paths.map(p=>({...p,body:solids.add({x:p.x,z:p.z,w:.6,d:.6,bottom:7.8,top:9.65,dynamic:true,climbable:false,damageable:false})}));
 function put(mesh,i,x,y,z,sx,sy,sz,rz=0,ry=0){matrix.position.set(x,y,z);matrix.rotation.set(0,ry,rz);matrix.scale.set(sx,sy,sz);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix)}
 for(let i=0;i<animals.length;i++){const a=animals[i];put(horses,i,a.x,a.y,a.z,1.8,1.8,1.8,0,a.a)}horses.computeBoundingSphere();
 return{seahorseFocus:animals[1],stats:{foundations:bases.length,covered:coverage.filter(c=>c.blades>0).length,blades,reefs:reefCount,seahorses:animals.length,residents:paths.length,conservatories:14},coverage,update(t,dt,camera){time.value=t;kelpRoot.visible=camera.position.y<35;for(const mesh of kelpRoot.children){const b=mesh.boundingSphere;mesh.visible=Math.hypot(camera.position.x-b.center.x,camera.position.z-b.center.z)<(camera.position.y<0?420:100)+b.radius}horses.visible=camera.position.y<25;bubbles.visible=camera.position.y<25;bubbles.position.y=(t*.8)%3;
  if(horses.visible){for(let i=0;i<animals.length;i++){const a=animals[i],x=a.x+Math.sin(t*.16+i)*1.1,y=a.y+Math.sin(t*.6+i)*.55,z=a.z+Math.cos(t*.16+i)*1.1;put(horses,i,x,y,z,1.8,1.8,1.8,Math.sin(t*.5+i)*.07,a.a+Math.sin(t*.2)*.25);Object.assign(a.body,{x,z,bottom:y-1,top:y+2.6});solids.reindex(a.body)}horses.instanceMatrix.needsUpdate=true;horses.computeBoundingSphere()}
  for(let i=0;i<residents.length;i++){const p=residents[i],d=Math.sin(t*.15+i)*6,x=p.x+Math.sin(p.ry)*d,z=p.z+Math.cos(p.ry)*d;put(parts.body,i,x,8.9,z,.24,.72,.22,0,p.ry);put(parts.head,i,x,9.5,z,.2,.24,.2);for(let j=0;j<4;j++){const side=j%2?1:-1,arm=j>1,offset=side*(arm?.32:.12),swing=Math.sin(t*2.1+i+(j%2)*Math.PI)*.12;put(parts.limbs,i*4+j,x+offset,arm?8.95:8.15,z+swing,.07,arm?.58:.68,.07,swing,p.ry)}Object.assign(p.body,{x,z});solids.reindex(p.body)}for(const mesh of Object.values(parts)){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
 }};
}
