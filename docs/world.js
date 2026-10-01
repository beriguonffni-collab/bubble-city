import {routeBridge} from './BridgeRouting.js';
import {inFootprint} from './Footprint.js';
import {districtLayout,urbanLots,infillLots} from './DistrictLayout.js';
import {cityArchitect} from './CityArchitecture.js';
import {buildCanalStairs} from './CanalStairs.js';
import {buildLivingDistricts} from './LivingDistricts.js';
import {buildOceanLife} from './OceanLife.js';
import {createSceneCollisions} from './SceneCollisions.js';
import * as T from './vendor/three.module.js';
import {meshContact} from './ClimbSurface.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {random,glassTexture,billboard,skyEnvironment,softDisc} from './Assets.js';
import {architecturalGlass,stoneMaterial,microSurface} from './Surfaces.js';
import {createAtmosphere} from './Atmosphere.js';
import {boatFactory} from './Boats.js';
import {BoatFleet} from './BoatNavigation.js';
import {PROFILES,renderSize} from './RenderProfile.js';
import {Solids,OCEAN} from './Physics.js';
import {buildInhabitedDepths} from './InhabitedDepths.js';
import {makeWater,seabedMaterial} from './Water.js';

export const destinations={
 waterfront:{label:'Waterfront gardens',p:{x:-140,y:9.5,z:165},yaw:0,pitch:0,mode:'walk'},
 reef:{label:'Coral conservatory',p:{x:340,y:-110,z:242},yaw:0,pitch:-.07,mode:'free'},
 kelp:{label:'Foundation kelp forest',p:{x:-10,y:-92,z:380},yaw:1.02,pitch:-.08,mode:'free'},
 sanctuary:{label:'Seabed lantern sanctuary',p:{x:48,y:-115.3,z:135},yaw:Math.PI,pitch:0,mode:'walk'},
 arrival:{label:'Sunlit promenade',p:{x:-62,y:9.7,z:300},yaw:-.16,pitch:.03,mode:'walk'},
 skyline:{label:'Above the city',p:{x:12,y:310,z:620},yaw:.05,pitch:-.28,mode:'free'},
 marina:{label:'Pearl yacht marina',p:{x:-22,y:5,z:325},yaw:.714,pitch:-.15,mode:'free'},
 swim:{label:'Swim beneath the city',p:{x:0,y:-5,z:140},yaw:0,pitch:-.12,mode:'walk'},
 canal:{label:'Along the water',p:{x:0,y:2.5,z:180},yaw:0,pitch:.06,mode:'free'},
 dive:{label:'The submerged avenue',p:{x:0,y:-69,z:140},yaw:0,pitch:.05,mode:'free'},
 garden:{label:'Sky garden',p:{x:-163,y:130.8,z:-150},yaw:-.9,pitch:-.16,mode:'walk'},
 bubble:{label:'The impossible pearl',p:{x:40,y:90,z:-1110},yaw:.1,pitch:.13,mode:'free'}
};
export function createWorld(canvas){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,logarithmicDepthBuffer:true,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
 const scene=new T.Scene();scene.background=new T.Color('#9cdef2');scene.fog=new T.FogExp2('#a5e0ee',.00035);const atmosphere=createAtmosphere(renderer,scene);
 const camera=new T.PerspectiveCamera(62,innerWidth/innerHeight,.12,11000);camera.rotation.order='YXZ';camera.position.set(12,150,520);
 scene.add(new T.HemisphereLight(0xe4faff,0x1f5265,.55));const sun=new T.DirectionalLight(0xfff5de,2.8);sun.position.set(-700,1300,500);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-170,right:170,top:170,bottom:-170,near:1,far:650});sun.shadow.bias=-.00015;sun.shadow.normalBias=.12;scene.add(sun,sun.target);renderer.shadowMap.autoUpdate=false;
 const city=new T.Group();city.name='T1 Bubble City • above and below';scene.add(city);const solids=new Solids(),rand=random(80913),batches=new Map(),pristine=new Map(),detailBatches=[],renderBatches=[],fullGeometry=new Map(),bridgeMaterials=new Map(),boats=[],traffic=[],pearls=[],fish=[];const collision=createSceneCollisions(solids);
 const geo={box:new T.BoxGeometry(1,1,1),plane:new T.PlaneGeometry(1,1),lawnRing:new T.RingGeometry(.82,1,32),cyl:new T.CylinderGeometry(1,1,1,32),lowcyl:new T.CylinderGeometry(1,1,1,12),sphere:new T.SphereGeometry(1,12,8),leaf:new T.SphereGeometry(1,16,10),cone:new T.ConeGeometry(1,1,12),ring:new T.TorusGeometry(1,.022,6,48)};
 const material=(color,extra={})=>new T.MeshPhysicalMaterial({color,roughness:.45,...extra});
 const m={ivory:material('#f1e6d7',{roughness:.32,clearcoat:.4}),white:material('#f5f7ed'),dark:material('#346776',{metalness:.45}),glass:architecturalGlass(),edge:material('#c2edea',{metalness:.65,roughness:.2}),lawn:material('#479b59'),leaf:material('#65b655'),leaf2:material('#99c862'),trunk:material('#94775b'),stone:stoneMaterial(),coral:material('#e191c7'),coral2:material('#91d9b7'),glow:material('#77fcf5',{emissive:'#27bccb',emissiveIntensity:.5}),pink:material('#f39ae3',{emissive:'#af46a8',emissiveIntensity:.2}),gold:material('#eac782',{metalness:.65}),road:material('#75999f'),window:material('#7adaef',{roughness:.16,metalness:.7}),fish:material('#ffd475',{emissive:'#a56520',emissiveIntensity:.1})};
 m.glass.userData.buildingEnvelope=true;
 const tmp=new T.Object3D(),foundations=[],coreLots=[],bridgeRoutes=[],bridgeRails=[];
 const fishEyeMatrix=new T.Matrix4(),fishEyeOffsets=[-1,1].map(sign=>new T.Matrix4().makeTranslation(.58,.2,sign*.78).scale(new T.Vector3(.09,.15,.1)));
 const lodGeometry=new Map([[geo.cyl,new T.CylinderGeometry(1,1,1,12)],[geo.lowcyl,new T.CylinderGeometry(1,1,1,6)],[geo.sphere,new T.SphereGeometry(1,6,4)],[geo.leaf,new T.SphereGeometry(1,6,4)],[geo.ring,new T.TorusGeometry(1,.022,3,20)]]);
 const waterLightTime={value:0};
 // Sunlight also refracts across the submerged architecture, not just the seabed.
 for(const mat of [m.stone,m.ivory,m.glass])mat.onBeforeCompile=shader=>{
  shader.uniforms.causticTime=waterLightTime;
  shader.vertexShader='varying vec3 causticWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec4 cpos=vec4(transformed,1.);
   #ifdef USE_INSTANCING
   cpos=instanceMatrix*cpos;
   #endif
   causticWorld=(modelMatrix*cpos).xyz;`);
  shader.fragmentShader='uniform float causticTime;varying vec3 causticWorld;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   if(causticWorld.y<-.5){vec2 p=causticWorld.xz+causticWorld.y*.2;float a=sin(p.x*.55+sin(p.y*.39+causticTime*.4))+sin(p.y*.61+sin(p.x*.33-causticTime*.5));float lace=1.-smoothstep(.03,.17,abs(a));totalEmissiveRadiance+=vec3(.015,.09,.10)*lace;}`);
 };
 microSurface(m.ivory,.09);microSurface(m.stone,.17);
 function instance(g,mat,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,physical=true){const cell=[m.leaf,m.leaf2,m.trunk,m.lawn].includes(mat)?300:1200,key=g.uuid+mat.uuid+Math.floor(x/cell)+","+Math.floor(z/cell);let b=batches.get(key);if(!b){b={g,mat,matrices:[]};batches.set(key,b)}tmp.position.set(x,y,z);tmp.rotation.set(rx,ry,rz);tmp.scale.set(sx,sy,sz);tmp.updateMatrix();b.matrices.push(tmp.matrix.clone());const visual={batch:b,index:b.matrices.length-1};if(physical)collision.instance(g,tmp.matrix,visual);return visual}
 function cylinder(mat,x,y,z,r,h,solid=true){if(y-h/2<=-110&&h>8)foundations.push({x,z,r,bottom:y-h/2,top:y+h/2});const visual=instance(geo.cyl,mat,x,y,z,r,h,r,0,0,0,false);solids.add({visual,x,z,r,top:y+h/2,bottom:y-h/2,contactAt:meshContact(geo.cyl,tmp.matrix.clone())})}
 function box(mat,x,y,z,w,h,d,solid=true,ry=0){const visual=instance(geo.box,mat,x,y,z,w,h,d,0,ry,0,false);solids.add({visual,x,z,w,d,ry,top:y+h/2,bottom:y-h/2,contactAt:meshContact(geo.box,tmp.matrix.clone())})}
 function ring(mat,x,y,z,r){const first=solids.bodies.length,visual=instance(geo.ring,mat,x,y,z,r,r,r,Math.PI/2,0,0,false);solids.addRing(x,y,z,r,r*.022,48,meshContact(geo.ring,tmp.matrix.clone()));for(const body of solids.bodies.slice(first))body.visual=visual}
 function tree(x,y,z,scale=1,palm=false){if(typeof bridgeRoutes!=='undefined'&&bridgeRoutes.some(r=>r.samples?.some(p=>Math.hypot(p.x-x,p.z-z)<r.width/2+4*scale&&p.y<y+8*scale&&p.y+3>y)))return;cylinder(m.trunk,x,y+2.1*scale,z,.24*scale,4.2*scale);if(palm){for(let a=0;a<6;a++){const ang=a*Math.PI/3;instance(geo.leaf,m.leaf,x+Math.sin(ang)*1.9*scale,y+4.3*scale,z+Math.cos(ang)*1.9*scale,2.7*scale,.4*scale,.65*scale,0,-ang,Math.sin(ang)*.12)}}else{instance(geo.leaf,rand()>.45?m.leaf:m.leaf2,x,y+4.8*scale,z,2.2*scale,2.7*scale,2.2*scale);instance(geo.leaf,m.leaf,x+1.2*scale,y+3.7*scale,z-.4*scale,1.5*scale,1.7*scale,1.5*scale)}}
 function terrace(x,y,z,r,inner){cylinder(m.ivory,x,y,z,r,1.8);if(inner<r-2){instance(geo.lawnRing,m.lawn,x,y+1.02,z,r-1.3,r-1.3,r-1.3,-Math.PI/2)}ring(m.edge,x,y+2.1,z,r-.5);for(let a=0;a<18;a++){const ang=a*Math.PI/9;tree(x+Math.sin(ang)*(r-3),y+1,z+Math.cos(ang)*(r-3),.6+rand()*.5,a%4===0)}}
 const ads=Array.from({length:8},(_,i)=>{const map=billboard(i);return new T.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.2,roughness:.25})});
 function screen(x,y,z,r,width,height,angle,index){const px=x+Math.sin(angle)*(r+.6),pz=z+Math.cos(angle)*(r+.6);instance(geo.box,m.ivory,px,y,pz,width+1.1,height+1.1,1,0,angle);solids.add({x:px,z:pz,w:width+1.1,d:1.15,ry:angle,top:y+(height+1.1)/2,bottom:y-(height+1.1)/2});instance(geo.plane,ads[index%ads.length],px+Math.sin(angle)*.68,y,pz+Math.cos(angle)*.68,width,height,1,0,angle)}
 function tagStructure(first){const structure={bodies:solids.bodies.slice(first)};for(const b of structure.bodies)b.structure=structure}
 function tower(x,z,r,h,seed){const first=solids.bodies.length,base=8;cylinder(m.glass,x,base+h/2,z,r,h,true);for(let y=base+6;y<base+h;y+=7.2)cylinder(m.edge,x,y,z,r+.12,.32);for(let a=0;a<14;a++){const ang=a*Math.PI/7;box(m.edge,x+Math.sin(ang)*(r+.15),base+h/2,z+Math.cos(ang)*(r+.15),.38,h,.38)}for(const k of [.2,.48,.77]){const y=base+h*k;terrace(x,y,z,r+5,r+1);cylinder(m.ivory,x,y-2.5,z,r+1.5,2)}terrace(x,base+h,z,r+3,0);cylinder(m.ivory,x,base+h+3,z,r*.62,5);cylinder(m.glass,x,base+h+8,z,r*.35,8);cylinder(m.white,x,base+h+18,z,.35,20);instance(geo.sphere,m.glow,x,base+h+28,z,.65,.65,.65);screen(x,base+h*.56,z,r,r*1.42,Math.min(54,h*.3),x<0?Math.PI*.32:-Math.PI*.32,seed);if(h>150)screen(x,base+h*.25,z,r,r*1.35,32,0,seed+2);tagStructure(first)}
 const buildVariedTower=cityArchitect({m,geo,instance,box,cylinder,tree,screen});
 const variedTower=p=>{const first=solids.bodies.length;buildVariedTower(p);tagStructure(first)};
 // Each district is an island of terraced towers, with open navigable canals between them.
 for(let row=0;row<7;row++)for(let col=0;col<4;col++){
  const x=[-430,-140,140,430][col],z=300-row*330+(col%2?0:30),r=col===1&&row===0?88:85;
  coreLots.push({x,z,r});cylinder(m.stone,x,-58,z,r-4,124,true);
  for(let a=0;a<42;a++){const ang=a*Math.PI/21;const px=x+Math.sin(ang)*(r-7),pz=z+Math.cos(ang)*(r-7);if(a%2===0){tree(px,8,pz,.85,a%6===0);cylinder(m.lawn,px,8.15,pz,2.6,.3)}if(a%3===0){cylinder(m.white,px,11,pz,.14,6);instance(geo.sphere,m.glow,px,14,pz,.55,.25,.55)}if(a%4===0)box(m.gold,px-2,8.5,pz+2,2.5,.3,.7,false,ang);if(a%2){const hx=x+Math.sin(ang)*(r-3),hz=z+Math.cos(ang)*(r-3);instance(geo.lowcyl,a%3?m.pink:m.dark,hx,8.85,hz,.25,1.1,.25);instance(geo.sphere,m.ivory,hx,9.6,hz,.22,.25,.22);box(m.dark,hx-.12,8.25,hz,.12,.5,.18);box(m.dark,hx+.12,8.25,hz,.12,.5,.18)}}
  const heights=[125+rand()*110,70+rand()*100,95+rand()*145];
  for(let j=0;j<3;j++){const a=j*2.094+1.2;const tx=x+Math.sin(a)*35,tz=z+Math.cos(a)*35;((row+col+j)%3===0?tower(tx,tz,18+rand()*9,heights[j],row*4+col+j):variedTower({x:tx,z:tz,r:21,h:heights[j],seed:row*4+col+j,style:(row*4+col+j)%8}))}
  // Colonnades and a second inhabited city continue below the canals.
  for(let a=0;a<10;a++){const ang=a*Math.PI/5;const px=x+Math.sin(ang)*(r+8),pz=z+Math.cos(ang)*(r+8);cylinder(m.stone,px,-62,pz,3.5,116,true);for(const yy of [-87,-48,-7]){cylinder(m.ivory,px,yy,pz,5.4,2);ring(m.glow,px,yy+1.1,pz,5.4)}}
  for(let j=0;j<2;j++){const tx=x+(j?104:-104),tz=z-95;cylinder(m.glass,tx,-65,tz,13,88,true);for(let yy=-106;yy<-20;yy+=12)cylinder(m.stone,tx,yy,tz,15,2);screen(tx,-49,tz,13,15,27,0,row+j);ring(m.glow,tx,-20,tz,14);cylinder(m.stone,tx,-114,tz,19,12,true)}
 }
 solids.add({x:-140,z:-150,r:13,top:127,bottom:-120});
 const urbanPlan=districtLayout(coreLots),bridgeLandings=[];
 // Curved elevated bridges. Short analytic deck segments make them walkable.
 function bridge(points,width=8,mat=m.ivory,landings=true){const firstBody=solids.bodies.length;points=routeBridge(points,width,solids);let curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'catmullrom',.08);
 const aligned=curve.getSpacedPoints(Math.ceil(curve.getLength()/4));let changed=false;
 for(const p of aligned){let best=null;for(const b of solids.nearby(p,20)){if(!b.slope||!b.bridgePart||!solids.horizontal(p,b,18))continue;const y=solids.heightAt(p,b),dy=Math.abs(y-p.y);if(dy<5&&(!best||dy<best.dy))best={b,y,dy}}
 if(best){const b=best.b,a=b.ry||0,lateral=Math.abs(Math.cos(a)*(p.x-b.x)-Math.sin(a)*(p.z-b.z)),blend=1-T.MathUtils.smoothstep(lateral,b.w/2+width/2,b.w/2+width/2+18);p.y=T.MathUtils.lerp(p.y,best.y,blend);changed=true}}
 if(changed)curve=new T.CatmullRomCurve3(aligned,false,'catmullrom',.08);
 const seg=Math.max(12,Math.min(1200,Math.ceil(curve.getLength()/2))),verts=[],inds=[];for(let i=0;i<=seg;i++){const p=curve.getPointAt(i/seg),d=curve.getTangentAt(i/seg),r=new T.Vector3(d.z,0,-d.x).normalize().multiplyScalar(width/2);verts.push(p.x+r.x,p.y,p.z+r.z,p.x-r.x,p.y,p.z-r.z);if(i<seg){const n=i*2;inds.push(n,n+1,n+2,n+1,n+3,n+2)}if(i<seg){const q=curve.getPointAt((i+1)/seg);solids.add({x:(p.x+q.x)/2,z:(p.z+q.z)/2,w:width,d:Math.hypot(q.x-p.x,q.z-p.z)+.01,ry:Math.atan2(q.x-p.x,q.z-p.z),top:Math.max(p.y,q.y),bottom:Math.min(p.y,q.y)-1.1,slope:[{x:p.x,y:p.y,z:p.z},{x:q.x,y:q.y,z:q.z}],climbable:false,bridgePart:true,deckCurve:curve})}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(inds);g.computeVertexNormals();if(!bridgeMaterials.has(mat.uuid))bridgeMaterials.set(mat.uuid,new T.MeshStandardMaterial({color:mat.color,side:T.DoubleSide,roughness:.55}));const mesh=new T.Mesh(g,bridgeMaterials.get(mat.uuid));mesh.userData.physical=true;mesh.userData.mergeStructure=true;city.add(mesh);for(const body of solids.bodies.slice(firstBody))body.visual={mesh};bridgeRails.push({curve,width,seg});if(landings){
  for(let i=0;i<=8;i++){const p=curve.getPoint(i/8);if(p.z>-2300&&p.z<700&&[-295,0,295].some(x=>Math.abs(p.x-x)<25))continue;cylinder(m.stone,p.x,(-120+p.y-4)/2,p.z,1.9,p.y+116);cylinder(m.ivory,p.x,p.y-4.75,p.z,width*.6,1.5)}
  for(const body of solids.bodies.slice(firstBody))body.bridgePart=true;
  for(const end of [0,1]){const p=curve.getPoint(end),d=curve.getTangent(end);if(p.y<8)continue;const sign=end?1:-1,n=Math.hypot(d.x,d.z),run=Math.max(35,(p.y-7.8)*9),q=[p.x+sign*d.x/n*run,7.86,p.z+sign*d.z/n*run];for(let attempt=0;attempt<30;attempt++){if(urbanPlan.polygons.some(poly=>inFootprint(q[0],q[2],poly))&&solids.clear({x:q[0],y:9.5,z:q[2]}))break;q[0]+=sign*d.x/n*18;q[2]+=sign*d.z/n*18}bridgeLandings.push({x:q[0],z:q[2],y:7.86});const mid=[(p.x+q[0])/2,(p.y+7.86)/2,(p.z+q[2])/2];bridge([[p.x,p.y,p.z],mid,q],width,mat,false);for(let j=0;j<4;j++){const t=j/3,xx=p.x+(q[0]-p.x)*t,zz=p.z+(q[2]-p.z)*t,yy=p.y+(7.8-p.y)*t;if(zz>-2300&&zz<700&&[-295,0,295].some(x=>Math.abs(xx-x)<25))continue;cylinder(m.stone,xx,(-120+yy-4)/2,zz,1.7,yy+116)}}
 }for(const body of solids.bodies.slice(firstBody))body.bridgePart=true;bridgeRoutes.push({curve,width,samples:curve.getPoints(Math.ceil(curve.getLength()/8))});return curve}
 for(let i=0;i<7;i++){const z=230-i*330;
    // Street-to-street arches avoid overlapping low approach ramps.
    const route=bridge([[-65,7.86,z],[-35,16,z-8],[0,20,z],[35,16,z+8],[65,7.86,z+15]],10,m.ivory,false);
    bridgeLandings.push({x:-65,y:7.86,z},{x:65,y:7.86,z:z+15});
    for(let j=0;j<4;j++)traffic.push({curve:route,offset:j/4,mesh:vehicle(2.5,.8,1.15,j%2?m.pink:m.white)});
    for(const end of [0,1]){const p=route.getPoint(end);cylinder(m.stone,p.x,-57,p.z,2.5,128)}
    if(i<6)for(const side of [-1,1]){const x=side*252;bridge([[x,7.86,z-40],[x+side*12,24,z-155],[x,7.86,z-280]],9,m.ivory,false);bridgeLandings.push({x,y:7.86,z:z-40},{x,y:7.86,z:z-280})}
    bridge([[-125,-45,z-50],[0,-34,z-55],[125,-45,z-50]],7,m.stone);
   }
   // Skyway ribbons along the outer districts and across the central panorama.
 for(const side of [-1,1]){const curve=bridge([[side*350,55,550],[side*235,78,100],[side*320,102,-450],[side*250,85,-1100],[side*350,58,-1820]],12);for(let i=0;i<15;i++)traffic.push({curve,offset:i/15,mesh:vehicle(4.5,1.2,1.8,i%3?m.white:m.pink)})}
 function arch(z,span,height,y){const pts=[];for(let i=0;i<=60;i++){const a=Math.PI*i/60;pts.push(new T.Vector3(-Math.cos(a)*span/2,y+Math.sin(a)*height,z))}const curve=new T.CatmullRomCurve3(pts);for(let i=0;i<180;i++){const p=curve.getPoint(i/179);for(const dz of [-3,3])solids.add({x:p.x,z:p.z+dz,r:2.5,top:p.y+2.5,bottom:p.y-2.5})}for(const dz of [-3,3]){const g=new T.TubeGeometry(curve,90,2.4,8,false);g.translate(0,0,dz);(()=>{const archMesh=new T.Mesh(g,m.ivory);archMesh.userData.physical=true;city.add(archMesh)})()}for(let i=5;i<60;i+=5){const p=pts[i];box(m.edge,p.x,p.y,z,.5,.6,7)}}
 arch(-475,330,155,38);arch(-1280,600,335,20);
 // A reachable garden landmark, and a suspended pearl containing a miniature city.
 cylinder(m.stone,-140,3.5,-150,13,247,true);terrace(-140,128,-150,34,0);solids.add({x:-140,z:-150,r:34,top:128,bottom:126});
 const pearl=new T.Group();pearl.position.set(0,140,-1300);city.add(pearl);const shell=new T.Mesh(new T.SphereGeometry(80,48,32),new T.MeshPhysicalMaterial({color:'#b1efff',metalness:.15,roughness:.08,transparent:true,opacity:.12,side:T.DoubleSide,depthWrite:false,iridescence:1}));shell.userData.physical=true;solids.add({shell:true,x:0,y:140,z:-1300,r:80,top:220,bottom:60,climbable:false,visual:{mesh:shell}});pearl.add(shell);pearls.push(shell);const rim=new T.Mesh(new T.TorusGeometry(80,.5,8,100),m.glow);rim.rotation.x=Math.PI/2;rim.userData.physical=true;pearl.add(rim);solids.addRing(0,140,-1300,80,.5,160);const garden=new T.Mesh(new T.CylinderGeometry(42,32,8,48),m.ivory);garden.position.y=-35;pearl.add(garden);for(let i=0;i<24;i++){const angle=rand()*Math.PI*2,rr=rand()*33,h=8+rand()*37;const tower=new T.Mesh(new T.CylinderGeometry(2.5,3,h,16),m.glass);tower.position.set(Math.cos(angle)*rr,-31+h/2,Math.sin(angle)*rr);pearl.add(tower);solids.add({x:tower.position.x,z:-1300+tower.position.z,r:3,bottom:109,top:109+h})}solids.add({x:0,z:-1300,r:42,top:109,bottom:101});
 // Distant city silhouettes establish a much larger world around the detailed canals.
 const corridorFree=p=>!bridgeRoutes.some(r=>r.samples.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<p.r+r.width/2+8&&q.y<p.h+10));
 const skylineLots=urbanLots(urbanPlan).filter(corridorFree).filter(p=>!bridgeLandings.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<p.r+22));for(const p of skylineLots){cylinder(m.stone,p.x,-58.5,p.z,p.r+1,123);variedTower(p)}
 const districtConnections=[];
 for(const route of urbanPlan.routes)for(let i=2;i<route.points.length-2;i+=3){const a=route.points[i],prev=route.points[i-1],next=route.points[i+1],dx=next[0]-prev[0],dz=next[1]-prev[1],length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;let reach=urbanPlan.canalWidth/2+14,ends,indices;
  for(let trial=0;trial<8;trial++){ends=[[-1,1].map(sign=>[a[0]+nx*reach*sign,a[1]+nz*reach*sign])][0];indices=ends.map(p=>urbanPlan.polygons.findIndex(poly=>inFootprint(p[0],p[1],poly)));if(indices.every(n=>n>=0))break;reach+=15}
  if(indices.some(n=>n<0)||!ends.every(p=>solids.clear({x:p[0],y:10,z:p[1]})))continue;
  const [left,right]=ends;bridge([[left[0],7.86,left[1]],[a[0],20,a[1]],[right[0],7.86,right[1]]],12,m.ivory,false);
  for(const end of ends){cylinder(m.stone,end[0],-56.6,end[1],2.7,126.8);bridgeLandings.push({x:end[0],z:end[1],y:7.8})}districtConnections.push(indices);
 }
 const infill=infillLots(urbanPlan,skylineLots,bridgeLandings).filter(corridorFree);for(const p of infill){cylinder(m.stone,p.x,-58.5,p.z,p.r+1,123);variedTower(p)}
 const districts=buildLivingDistricts({city,solids,core:coreLots,outer:skylineLots,allLots:[...skylineLots,...infill],landings:bridgeLandings,layout:urbanPlan,m,geo,box,cylinder,instance,tree,screen});
 // Rails stop at shared junctions; retained geometry and collision match.
   for(const {curve,width,seg} of bridgeRails)for(const sign of [-1,1]){let run=[];
    const flush=()=>{if(run.length<2){run=[];return}const rail=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(run),run.length-1,.15,5,false),m.edge);rail.userData.physical=true;rail.userData.mergeStructure=true;city.add(rail);for(let i=1;i<run.length;i++){const a=run[i-1],b=run[i];solids.add({x:(a.x+b.x)/2,z:(a.z+b.z)/2,w:.36,d:Math.hypot(b.x-a.x,b.z-a.z)+.02,ry:Math.atan2(b.x-a.x,b.z-a.z),top:Math.max(a.y,b.y)+.18,bottom:Math.min(a.y,b.y)-.18,bridgePart:true})}run=[]};
    for(let i=0;i<=seg;i++){const p=curve.getPointAt(i/seg),d=curve.getTangentAt(i/seg);p.add(new T.Vector3(d.z,0,-d.x).normalize().multiplyScalar(width/2*sign));
     const junction=solids.nearby(p).some(b=>b.deckCurve&&b.deckCurve!==curve&&Math.abs(solids.heightAt(p,b)-p.y)<2&&solids.horizontal(p,b,1.5));
     if(junction){flush();continue}p.y+=1.1;run.push(p)}flush()
   }
   const canalStairs=buildCanalStairs({city,layout:urbanPlan,solids,box,cylinder,m,landings:bridgeLandings});
 function vehicle(w,h,d,mat){const g=new T.Group();const hull=new T.Mesh(new T.BoxGeometry(w,h,d),mat);g.add(hull);const glass=new T.Mesh(new T.BoxGeometry(w*.62,h*.6,d*.85),m.window);glass.position.y=h*.5;g.add(glass);scene.add(g);return g}
 const createBoat=boatFactory();
 for(let i=0;i<22;i++){const boat=createBoat(i);scene.add(boat.mesh);boats.push(Object.assign(boat,{lane:i%3===0?-295:i%3===1?0:295,offset:rand()*2600,speed:4+rand()*4,direction:i%2?1:-1}));boat.mesh.position.set(boat.lane,.8,550-i*105);boat.mesh.rotation.y=boat.direction*Math.PI/2}
 const docked=createBoat(22);docked.mesh.position.set(-35,.8,310);docked.mesh.rotation.y=-.2;scene.add(docked.mesh);boats.push(Object.assign(docked,{static:true}));const fleet=new BoatFleet(boats,solids);
 // Submerged gardens: branching corals, kelp, and dancing schools of fish.
 for(let i=0;i<950;i++){const x=(rand()-.5)*1250,z=550-rand()*2650,y=-117+rand()*3;if(i%3===0){for(let j=0;j<3;j++)instance(geo.leaf,j%2?m.coral:m.coral2,x+(j-1)*1.2,y+1.5+j*.5,z,1.1,2.5+j*.6,1.1)}else{instance(geo.cone,m.lawn,x,y+2,z,.35,4+rand()*6,.35,0,rand()*6,(rand()-.5)*.4)}}
 const tail=new T.ConeGeometry(.72,1.15,3,1);tail.rotateZ(-Math.PI/2);tail.scale(1,.72,.4);tail.translate(-1.25,0,0);const dorsal=new T.ConeGeometry(.45,.85,3,1);dorsal.scale(1,1,.25);dorsal.translate(-.15,.65,0);const fishGeometry=mergeGeometries([geo.sphere.clone(),tail,dorsal]);const fishMesh=new T.InstancedMesh(fishGeometry,m.fish,2400);const fishEyes=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshBasicMaterial({color:0x082237}),4800);scene.add(fishEyes);fishMesh.name='Swimming fish';scene.add(fishMesh);for(let i=0;i<2400;i++){const f=foundations[(Math.floor(i/24)*17)%foundations.length],a=Math.floor(i/24)*2.399,rr=f.r+42;fish.push({x:f.x+Math.cos(a)*rr+(rand()-.5)*10,y:-15-rand()*89,z:f.z+Math.sin(a)*rr+(rand()-.5)*10,phase:Math.floor(i/24)+rand()*.35,speed:1+rand()*2})}
 const dustGeo=new T.BufferGeometry(),dustPos=[];for(let i=0;i<1200;i++)dustPos.push((rand()-.5)*1300,-rand()*120,600-rand()*2800);dustGeo.setAttribute('position',new T.Float32BufferAttribute(dustPos,3));const bubbles=new T.Points(dustGeo,new T.PointsMaterial({map:softDisc(),color:0xbffbff,size:.7,transparent:true,opacity:.58,depthWrite:false,blending:T.AdditiveBlending}));scene.add(bubbles);
 // Light shafts below the surface, kept subtle so the architecture remains legible.
 const rays=new T.Group();for(let i=0;i<28;i++){const ray=new T.Mesh(new T.ConeGeometry(12,108,12,1,true),new T.MeshBasicMaterial({color:'#81ebff',transparent:true,opacity:.018,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}));ray.position.set((rand()-.5)*640,-55,400-rand()*2400);rays.add(ray)}scene.add(rays);
 for(let i=0;i<fish.length;i++){const f=fish[i];f.collider=solids.add({x:f.x,z:f.z,w:1.5,d:.6,bottom:f.y-.35,top:f.y+.35,dynamic:true,climbable:false,damageable:false,visual:{mesh:fishMesh,index:i}})}
 const depths=buildInhabitedDepths({scene,city,solids,instance,geo,m,box,cylinder,tree});const oceanLife=buildOceanLife({scene,city,solids,foundations,core:coreLots,districts,m,geo,instance,box,cylinder});for(const b of boats)collision.hierarchy(b.high,true);for(const c of traffic)collision.hierarchy(c.mesh,true);for(const a of depths.actors)collision.hierarchy(a.mesh,true);
 // Merge compatible static bridge surfaces by neighborhood. Curves, rail detail
 // and collision stay intact while hundreds of individual draw calls disappear.
 const structuralBatches=new Map();for(const mesh of [...city.children])if(mesh.userData.mergeStructure){mesh.geometry.computeBoundingSphere();const c=mesh.geometry.boundingSphere.center,key=mesh.material.uuid+':'+Math.floor(c.x/600)+':'+Math.floor(c.z/600);if(!structuralBatches.has(key))structuralBatches.set(key,[]);structuralBatches.get(key).push(mesh);city.remove(mesh)}
 for(const parts of structuralBatches.values()){const mesh=new T.Mesh(mergeGeometries(parts.map(p=>p.geometry)),parts[0].material);for(const b of solids.bodies)if(parts.includes(b.visual?.mesh))b.visual={mesh};mesh.userData.structuralNetwork=true;mesh.name='Supported bridge network';mesh.userData.physical=true;mesh.receiveShadow=true;city.add(mesh)}
 for(const batch of batches.values()){const {g,mat,matrices}=batch;const mesh=new T.InstancedMesh(g,mat,matrices.length);batch.mesh=mesh;mesh.userData.collisionInstances=matrices.length;mesh.name='City batch '+pristine.size;pristine.set(mesh.name,matrices);fullGeometry.set(mesh.name,g);matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.computeBoundingSphere();renderBatches.push(mesh);if([m.leaf,m.leaf2,m.trunk,m.lawn].includes(mat)){mesh.userData.detailRange=1500;detailBatches.push(mesh)}mesh.castShadow=mat!==m.leaf&&mat!==m.leaf2;mesh.receiveShadow=true;city.add(mesh)}
 collision.hierarchy(city);
 const water=makeWater(scene),bedMat=seabedMaterial(),bed=new T.Mesh(new T.PlaneGeometry(7500,7500),bedMat);bed.rotation.x=-Math.PI/2;bed.position.set(0,-120,OCEAN.z);scene.add(bed);solids.seabedBody={x:0,z:OCEAN.z,w:7500,d:7500,bottom:-120.2,top:-120,seabed:true,visual:{mesh:bed}};
 // Huge, soft clouds drift slowly over the skyline.
 const clouds=new T.Group();const cloudmat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55,depthWrite:false});for(let i=0;i<40;i++){const cloud=new T.Mesh(geo.sphere,cloudmat);cloud.scale.set(90+rand()*140,25+rand()*25,45+rand()*70);cloud.position.set((rand()-.5)*7000,850+rand()*600,(rand()-.5)*7000);clouds.add(cloud)}clouds.visible=false;scene.add(clouds);
 // Capture the real surrounding architecture into the glass reflections once at startup.
 const reflectionTarget=new T.WebGLCubeRenderTarget(512,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
 const reflectionCamera=new T.CubeCamera(1,3500,reflectionTarget);reflectionCamera.position.set(0,115,150);water.mesh.visible=false;rays.visible=false;reflectionCamera.update(renderer,scene);water.mesh.visible=true;
 water.setEnvironment(reflectionTarget.texture);m.glass.envMap=reflectionTarget.texture;m.glass.needsUpdate=true;
 // Keep nearby reflections detailed; distant geometry already blends into haze.
 const reflectionHidden=[];water.setReflectionHooks(()=>{for(const mesh of renderBatches){const b=mesh.boundingSphere;if(mesh.visible&&camera.position.distanceTo(b.center)-b.radius>Math.min(renderDistance,1500)){mesh.visible=false;reflectionHidden.push(mesh)}}},()=>{for(const mesh of reflectionHidden)mesh.visible=true;reflectionHidden.length=0});
 let renderDistance=3000,distantDetail=true;
 let underwater=false,quality='balanced',renderDimensions={},lastShadow=-1,firstPersonRig;
 function resize(){const size=renderSize(quality,innerWidth,innerHeight,devicePixelRatio,renderer.capabilities.maxTextureSize);renderer.setPixelRatio(1);renderer.setSize(size.width,size.height,false);renderDimensions=size;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();canvas.dataset.resolution=size.width+' × '+size.height;canvas.dataset.quality=quality;canvas.dataset.qualityLabel=PROFILES[quality].label}
 function setQuality(name){quality=PROFILES[name]?name:'balanced';resize();water.setQuality(PROFILES[quality].reflection);const r=PROFILES[quality].shadow;sun.shadow.mapSize.set(r,r);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}renderer.shadowMap.needsUpdate=true}
 function applyViewDistance(){camera.far=underwater?Math.min(950,renderDistance):renderDistance;camera.updateProjectionMatrix();scene.fog.density=underwater?Math.max(.004,2/renderDistance):Math.max(.00022,2/renderDistance)}
 addEventListener('resize',resize);setQuality('balanced');
 return{scene,camera,renderer,solids,city,collision,districts,oceanLife,canalStairs,bridgeRoutes,bridgeLandings,districtConnections,architectureStats:{primary:skylineLots.length,infill:infill.length,families:8},collisionAudit:()=>collision.audit([city,...boats.map(b=>b.high),...traffic.map(c=>c.mesh),...depths.actors.map(a=>a.mesh)]),boats,fleet,traffic,destinations,setQuality,setPerformance:p=>{distantDetail=p.distantDetail!==false;water.setReflections(p.reflections!==false);const shadows=p.shadows!==false;if(renderer.shadowMap.enabled!==shadows){renderer.shadowMap.enabled=shadows;renderer.shadowMap.needsUpdate=shadows;scene.traverse(o=>{for(const mat of Array.isArray(o.material)?o.material:[o.material])if(mat)mat.needsUpdate=true})}canvas.dataset.reflections=String(p.reflections!==false);canvas.dataset.shadows=String(shadows);canvas.dataset.distantDetail=String(distantDetail)},setRenderDistance:distance=>{renderDistance=Math.max(500,Math.min(11000,Number(distance)||3000));applyViewDistance();canvas.dataset.renderDistance=String(renderDistance)},ripple:water.ripple,setFirstPersonRig:rig=>{firstPersonRig=rig;rig.traverse(o=>o.layers.set(1));scene.traverse(o=>{if(o.isLight)o.layers.enable(1)});water.setFirstPersonRig(rig)},
  update(t,dt,player){// Animated swimmers and their shadows must use the same frame. A cached
  // 8 Hz shadow repeatedly projected an old body pose onto the moving skin.
  {lastShadow=t;const p=camera.position;sun.target.position.set(p.x,0,p.z-45);sun.position.set(p.x-150,260,p.z+105);sun.target.updateMatrixWorld();renderer.shadowMap.needsUpdate=true}for(const mesh of renderBatches){const b=mesh.boundingSphere,distance=Math.max(0,camera.position.distanceTo(b.center)-b.radius),original=fullGeometry.get(mesh.name);mesh.visible=!mesh.userData.fracturedOriginal&&distance<Math.min(renderDistance,mesh.userData.detailRange?(distantDetail?mesh.userData.detailRange:450):Infinity);mesh.geometry=distance>(distantDetail?500:120)?(lodGeometry.get(original)||original):original}waterLightTime.value=t;water.update(t,player);bedMat.uniforms.time.value=t;if(player.underwater!==underwater){underwater=player.underwater;applyViewDistance();scene.background.set(underwater?'#086781':'#9cdef2');scene.fog.color.set(underwater?'#067c99':'#a5e0ee');scene.fog.density=underwater?Math.max(.004,2/renderDistance):Math.max(.00022,2/renderDistance);clouds.visible=false}atmosphere.update(camera,underwater);rays.visible=underwater;depths.update(t,dt);oceanLife.update(t,dt,camera);for(const c of traffic){const u=((t*.008+c.offset)%1+1)%1,p=c.curve.getPoint(u),d=c.curve.getTangent(u);c.mesh.position.copy(p);c.mesh.position.y+=1;c.mesh.rotation.y=Math.atan2(-d.z,d.x)}fishMesh.visible=fishEyes.visible=camera.position.y<35;if(player.position.y<120)for(let i=0;i<fish.length;i++){const f=fish[i];tmp.position.set(f.x+Math.sin(t*.1+f.phase)*22,f.y+Math.sin(t*.5+f.phase)*1.5,f.z+Math.cos(t*.1+f.phase)*22);tmp.rotation.set(0,t*.1+f.phase,Math.sin(t*8+f.phase)*.15);tmp.scale.set(.65,.3,.23);tmp.updateMatrix();fishMesh.setMatrixAt(i,tmp.matrix);Object.assign(f.collider,{x:tmp.position.x,z:tmp.position.z,ry:tmp.rotation.y,bottom:tmp.position.y-.35,top:tmp.position.y+.35});solids.reindex(f.collider);for(let side=0;side<2;side++)fishEyes.setMatrixAt(i*2+side,fishEyeMatrix.multiplyMatrices(tmp.matrix,fishEyeOffsets[side]))}collision.update(player.position);fishMesh.instanceMatrix.needsUpdate=true;fishEyes.instanceMatrix.needsUpdate=true;bubbles.position.y=(t*.6)%12;clouds.rotation.y=t*.0006;
},
  renderPlacePreview(view,target){
   // A small, on-demand view shares the renderer and restores every world state.
   const previousTarget=renderer.getRenderTarget(),fog=scene.fog,background=scene.background;
   const saved=renderBatches.map(mesh=>[mesh,mesh.visible,mesh.geometry]),hidden=[];
   const reflection=water.mesh.onBeforeRender,live=water.mesh.material.uniforms.liveReflection.value,under=water.mesh.material.uniforms.under.value,shadow=renderer.shadowMap.needsUpdate;
   try{
    for(const mesh of renderBatches){const d=Math.max(0,view.position.distanceTo(mesh.boundingSphere.center)-mesh.boundingSphere.radius),original=fullGeometry.get(mesh.name);mesh.visible=!mesh.userData.fracturedOriginal&&d<Math.min(renderDistance,mesh.userData.detailRange||Infinity);mesh.geometry=d>500?(lodGeometry.get(original)||original):original}
    for(const child of scene.children)if(child.userData.runtimeOnly||child.name==='Pearl Diver'){hidden.push([child,child.visible]);child.visible=false}
    const submerged=view.position.y<-.25&&solids.water(view.position);scene.background=new T.Color(submerged?'#086781':'#9cdef2');scene.fog=new T.FogExp2(submerged?'#067c99':'#a5e0ee',submerged?.004:Math.max(.00022,2/renderDistance));atmosphere.update(view,submerged);
    water.mesh.onBeforeRender=()=>{};water.mesh.material.uniforms.liveReflection.value=0;water.mesh.material.uniforms.under.value=submerged?1:0;renderer.shadowMap.needsUpdate=false;
    renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,view);
   }finally{
    renderer.setRenderTarget(previousTarget);scene.fog=fog;scene.background=background;water.mesh.onBeforeRender=reflection;water.mesh.material.uniforms.liveReflection.value=live;water.mesh.material.uniforms.under.value=under;renderer.shadowMap.needsUpdate=shadow;
    for(const [mesh,visible,geometry] of saved){mesh.visible=visible;mesh.geometry=geometry}for(const [child,visible] of hidden)child.visible=visible;atmosphere.update(camera,underwater);
   }
  },
  render(){renderer.render(scene,camera);if(firstPersonRig?.visible){const mask=camera.layers.mask,clear=renderer.autoClear,background=scene.background;camera.layers.set(1);renderer.autoClear=false;scene.background=null;renderer.clearDepth();try{renderer.render(scene,camera)}finally{scene.background=background;camera.layers.mask=mask;renderer.autoClear=clear}}},
  stats(){return{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,quality,resolution:renderDimensions}},
  async exportModel(){const {GLTFExporter}=await import('./vendor/GLTFExporter.js');const model=new T.Group();model.name='T1 Bubble City';const cleanCity=city.clone(true);cleanCity.traverse(o=>{if(fullGeometry.has(o.name)){o.geometry=fullGeometry.get(o.name);o.visible=true}if(o.userData.detailRange||o.userData.environmentLayer||o.userData.softVegetation||o.name==='112 animated reef seahorses')o.visible=true;if(o.userData.fracturedOriginal){o.visible=true;delete o.userData.fracturedOriginal}if(o.isInstancedMesh&&pristine.has(o.name))pristine.get(o.name).forEach((matrix,i)=>o.setMatrixAt(i,matrix))});model.add(cleanCity);const waterModel=new T.Mesh(new T.PlaneGeometry(7500,7500),new T.MeshStandardMaterial({color:'#21c8df',metalness:.4,roughness:.22,transparent:true,opacity:.72,side:T.DoubleSide}));waterModel.rotation.x=-Math.PI/2;waterModel.position.z=OCEAN.z;model.add(waterModel);const floor=new T.Mesh(new T.PlaneGeometry(7500,7500),m.stone);floor.rotation.x=-Math.PI/2;floor.position.set(0,-120,OCEAN.z);model.add(floor);for(const b of boats){const boat=b.high.clone(true);boat.traverse(o=>{if(o.userData.fracturedOriginal){o.visible=true;delete o.userData.fracturedOriginal}});boat.visible=true;boat.position.copy(b.mesh.position);boat.quaternion.copy(b.mesh.quaternion);model.add(boat)}model.userData={title:'T1 Bubble City',interactiveURL:'https://beriguonffni-collab.github.io/bubble-city/',description:'Sunlit canal metropolis and continuous submerged city.'};return new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true,maxTextureSize:4096})}
 };
}








