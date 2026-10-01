import {createSkimWake} from './SkimWake.js';
import {forwardTravel,vortexEnvelope} from './TraversalRules.js';
import {worldDepth} from './WorldDepth.js';
import * as T from './vendor/three.module.js';
export function corkscrewAngle(progress){const u=Math.max(0,Math.min(1,progress));return Math.PI*2*u*u*(3-2*u)}
// World-space water sheath, air condensation, persistent bubbles and ballistic spray.
export function createTraversalEffects(scene,camera){
 const group=new T.Group();group.name='Water corkscrew and sonic pressure sheath';scene.add(group);
 const uniforms={time:{value:0},power:{value:0},water:{value:1},dash:{value:0}};
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,
  vertexShader:`uniform float time,water,dash;varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormal;void main(){vUv=uv;float a=uv.x*6.28318;float r=(sin(a*5.+uv.y*24.-time*14.)*.065+sin(a*11.-uv.y*33.+time*9.)*.025)*water*dash;vec3 displaced=position+normal*r;vWorld=(modelMatrix*vec4(displaced,1.)).xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
  fragmentShader:`uniform float time,power,water,dash;varying vec2 vUv;varying vec3 vWorld,vNormal;
  void main(){float z=vUv.y,a=vUv.x*6.28318;float swirl=sin(a*5.-z*22.+time*17.+sin(a*3.+time*4.)*.8);float lace=pow(max(0.,swirl),7.);float strands=pow(max(0.,sin(a*19.+z*57.-time*22.)),20.);float edge=pow(1.-abs(dot(normalize(cameraPosition-vWorld),normalize(vNormal))),2.);float ends=smoothstep(0.,.12,z)*(1.-smoothstep(.85,1.,z));float opacity=(.035+edge*.10+lace*.26+strands*.19)*ends*power*mix(1.,2.4,water);vec3 col=mix(vec3(.82,.94,1.),vec3(.015,.60,.84),water);col=mix(col,vec3(.88,1.,1.),clamp(lace+strands,0.,1.));gl_FragColor=vec4(col,opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`});
 Object.assign(material,worldDepth({vertexShader:material.vertexShader,fragmentShader:material.fragmentShader}));
 const sheath=new T.Mesh(new T.CylinderGeometry(.65,1.65,7,96,24,true),material);sheath.rotation.x=Math.PI/2;sheath.position.z=-1.9;group.add(sheath);
 const inner=new T.Mesh(new T.CylinderGeometry(.85,1.32,5.5,80,16,true),material);inner.rotation.x=Math.PI/2;inner.rotation.y=.4;inner.position.z=-1.6;group.add(inner);
 const ribbons=[];
 for(let strand=0;strand<5;strand++){
  const points=Array.from({length:121},(_,i)=>{const u=i/120,a=u*Math.PI*4+strand*Math.PI*2/5,r=.88+u*.65;return new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,1-u*6)});
  const mat=new T.MeshPhysicalMaterial({color:strand%2?0x91faff:0x16bddb,emissive:0x168da0,emissiveIntensity:.25,metalness:.15,roughness:.08,clearcoat:1,transparent:true,opacity:0,depthWrite:false});
  const ribbon=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),120,.026+strand*.005,6,false),mat);group.add(ribbon);ribbons.push(ribbon);
 }
 const ringMaterial=new T.MeshBasicMaterial({color:0xc6ffff,transparent:true,opacity:0,depthWrite:false});
 const rings=Array.from({length:7},(_,i)=>{const m=new T.Mesh(new T.TorusGeometry(1,.016,6,96),ringMaterial.clone());m.position.z=-i*.7;group.add(m);return m});
 const particleMaterial=new T.MeshPhysicalMaterial({color:0xa1f4ff,metalness:.1,roughness:.07,clearcoat:1,transparent:true,opacity:.48,depthWrite:false});
 const count=2200,particles=new T.InstancedMesh(new T.SphereGeometry(1,12,8),particleMaterial,count);particles.instanceMatrix.setUsage(T.DynamicDrawUsage);particles.frustumCulled=false;particles.name='Persistent bubbles and splash droplets';scene.add(particles);
 const pool=Array.from({length:count},()=>({life:0,p:new T.Vector3(),v:new T.Vector3(),r:0,bubble:true})),dummy=new T.Object3D();let cursor=0,dashAge=20,splashAge=10,roll=0,spinTime=0,spinQueue=0,previous=new T.Vector3(),hasPrevious=false,accumulator=0;
 const rotation=new T.Quaternion(),forward=new T.Vector3(),side=new T.Vector3(),up=new T.Vector3();
 function emit(p,v,r,life,bubble){const item=pool[cursor++%count];item.p.copy(p);item.v.copy(v);item.r=r;item.life=life;item.total=life;item.bubble=bubble}
 const skimWake=createSkimWake(scene,emit);
 const blasts=[];for(let i=0;i<10;i++){const g=new T.Group(),mat=new T.MeshPhysicalMaterial({color:0x92faff,metalness:.12,roughness:.08,clearcoat:1,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});const sphere=new T.Mesh(new T.SphereGeometry(1,40,24),mat);g.add(sphere);const ring=new T.Mesh(new T.TorusGeometry(1,.07,10,96),mat.clone());ring.rotation.x=Math.PI/2;g.add(ring);const crown=new T.Mesh(new T.CylinderGeometry(.7,1,1,80,4,true),mat.clone());g.add(crown);scene.add(g);g.visible=false;blasts.push({g,sphere,ring,crown,age:20,power:1,surface:false})}let blastIndex=0;
 function burst(p,strength=3,surface=false){const b=blasts[blastIndex++%blasts.length];b.age=0;b.power=strength;b.surface=surface;b.g.position.copy(p);b.g.visible=true;for(let i=0;i<Math.min(600,70+strength*25);i++){const a=Math.random()*Math.PI*2,z=Math.random()*2-1,r=Math.sqrt(1-z*z),speed=(3+Math.random()*7)*Math.sqrt(strength);emit(new T.Vector3().copy(p),new T.Vector3(Math.cos(a)*r,z,Math.sin(a)*r).multiplyScalar(speed),.07+Math.random()*.19,1.4+Math.random()*3,true)}}
 function splash(x,z,strength=1){splashAge=0;burst(new T.Vector3(x,0,z),strength,true);const power=Math.sqrt(strength);for(let i=0;i<Math.min(800,90+strength*32);i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*12*power,r=Math.random()*power*2;emit(new T.Vector3(x+Math.cos(a)*r,.1,z+Math.sin(a)*r),new T.Vector3(Math.cos(a)*s,4+Math.random()*12*power,Math.sin(a)*s),.045+Math.random()*.16,2+Math.random()*3,false)}}
 function dash(position){if(position)burst(new T.Vector3().copy(position),4);dashAge=0;spinQueue=Math.min(2,spinQueue+1);}
 const shocks=Array.from({length:5},()=>{const m=new T.Mesh(new T.TorusGeometry(1,.04,8,96),new T.MeshBasicMaterial({color:0xe2ffff,transparent:true,opacity:0,depthWrite:false}));m.visible=false;scene.add(m);return{mesh:m,age:10}});let shockIndex=0;
 function sonic(player){if(!forwardTravel(player.flightDashInput))return;const s=shocks[shockIndex++%shocks.length];s.age=0;s.mesh.position.copy(player.position);const i=player.flightDashInput||{f:1,s:0,u:0},c=player.mode==='gaze'?1:Math.cos(player.pitch);const d=new T.Vector3(-Math.sin(player.yaw)*c*i.f+Math.cos(player.yaw)*i.s,player.mode==='gaze'?0:Math.sin(player.pitch)*i.f+i.u,-Math.cos(player.yaw)*c*i.f-Math.sin(player.yaw)*i.s).normalize();s.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),d);s.mesh.visible=true;uniforms.power.value=1;}
 function stop(){skimWake.reset();dashAge=20;roll=0;spinTime=0;spinQueue=0;hasPrevious=false;uniforms.power.value=0;group.visible=false}
 function update(player,t,dt,{active=true,reduced=false,third=true}={}){
  for(const s of shocks){s.age+=dt;s.mesh.visible=s.age<1.1;s.mesh.scale.setScalar(1+s.age*34);s.mesh.material.opacity=Math.max(0,1-s.age/1.1)*.55}
  if(player.phase){dashAge=20;spinQueue=0;spinTime=0;for(const p of pool)p.life=0;for(const b of blasts){b.age=20;b.g.visible=false}for(const s of shocks){s.age=10;s.mesh.visible=false}uniforms.power.value=0;}dashAge+=dt;splashAge+=dt;const swim=!player.phase&&(player.swimming||player.underwater),boost=active&&!player.phase&&player.boosting;
  if(!swim||!active){spinQueue=0;spinTime=0}
  if(spinQueue>0){spinTime+=dt;while(spinTime>=.8&&spinQueue>0){spinTime-=.8;spinQueue--}if(!spinQueue)spinTime=0}
  const progress=spinTime/.8;
  // One full turn; 2π and 0 have exactly the same orientation. Never rewind.
  const bodyRoll=!spinQueue?0:corkscrewAngle(progress);roll=reduced?0:bodyRoll;
  const pulse=swim&&active?Math.max(dashAge<.95?Math.pow(Math.sin(Math.PI*dashAge/.95),.45):0,spinQueue?Math.pow(Math.sin(Math.PI*progress),.45):0):0;
  rotation.setFromEuler(new T.Euler(swim||player.mode!=='gaze'?player.pitch:0,player.yaw,0,'YXZ'));if(!swim&&player.speed>.5&&player.flightVelocity){const v=new T.Vector3().copy(player.flightVelocity);if(v.lengthSq()>.01)rotation.setFromUnitVectors(new T.Vector3(0,0,-1),v.normalize())}forward.set(0,0,-1).applyQuaternion(rotation);side.set(1,0,0).applyQuaternion(rotation);up.set(0,1,0).applyQuaternion(rotation);
  group.position.copy(player.position);group.quaternion.copy(rotation);group.rotateZ(dashAge*10);
  const vortex=swim&&active?vortexEnvelope(dashAge):0;const target=swim?vortex:(boost&&forwardTravel(player.flightInput)?Math.min(1,player.speed/343):0);
  uniforms.power.value+=(target-uniforms.power.value)*(1-Math.exp(-dt*12));uniforms.time.value=t;uniforms.water.value=swim?1:0;uniforms.dash.value=vortex;group.visible=uniforms.power.value>.008&&(swim||third);
  group.scale.setScalar(swim?1.6+vortex*.8:1.4);inner.rotation.y=t*(swim?1.2:.4);
  for(const r of ribbons){r.visible=swim;r.material.opacity=uniforms.power.value*.65}
  for(let i=0;i<rings.length;i++){const m=rings[i],u=(t*(swim?2:4)+i/7)%1;m.position.z=-3+u*7;m.scale.setScalar(.75+u*1.3);m.material.opacity=uniforms.power.value*Math.sin(u*Math.PI)*(swim?.12:.055)}
  if(active&&swim&&(boost||vortex>0)){
   accumulator+=dt*(reduced?65:260);const n=Math.floor(accumulator);accumulator-=n;
   for(let i=0;i<n;i++){const alpha=(i+1)/Math.max(1,n),p=hasPrevious?previous.clone().lerp(player.position,alpha):new T.Vector3().copy(player.position),a=t*15+i*2.399,r=.35+Math.random()*.6;
    p.addScaledVector(forward,-.7).addScaledVector(side,Math.cos(a)*r).addScaledVector(up,Math.sin(a)*r);
    const v=forward.clone().multiplyScalar(-1-Math.random()*3).addScaledVector(side,Math.cos(a)*1.4).addScaledVector(up,Math.sin(a)*1.4+1);
    emit(p,v,.025+Math.random()*.11,1.4+Math.random()*2.4,true);
   }
  }
  const wake=skimWake.update(player,t,dt,{active,reduced});
  previous.copy(player.position);hasPrevious=active;
  for(const b of blasts){b.age+=dt;if(b.age>3.6){b.g.visible=false;continue}const a=b.age,r=1+Math.sqrt(b.power)*24*(1-Math.exp(-a*1.1)),fade=Math.pow(Math.max(0,1-a/3.6),2);b.sphere.scale.set(r,b.surface?r*.22:r,r);b.sphere.material.opacity=fade*.16;b.ring.scale.setScalar(r*1.12);b.ring.material.opacity=fade*.8;b.ring.rotation.z=a*1.5;b.crown.visible=b.surface;b.crown.scale.set(r*.8,Math.max(.1,Math.sqrt(b.power)*9*a-4.9*a*a),r*.8);b.crown.position.y=b.crown.scale.y*.4;b.crown.material.opacity=fade*.28;}
  let visible=0;for(let i=0;i<pool.length;i++){const p=pool[i];p.life-=dt;if(p.life>0){p.v.y+=dt*(p.bubble?1.3:-9.8);p.v.multiplyScalar(Math.exp(-dt*(p.bubble?.5:.08)));p.p.addScaledVector(p.v,dt);if(p.bubble&&p.p.y>0)p.life=Math.min(p.life,.18);const size=p.r*Math.min(1,p.life*4);dummy.position.copy(p.p);dummy.scale.set(size,size*(p.bubble?1:1.9),size);dummy.updateMatrix();particles.setMatrixAt(visible++,dummy.matrix)}}particles.count=visible;particles.instanceMatrix.needsUpdate=true;
  return{roll,bodyRoll,pulse,vortex,wakeSections:wake.sections,wakeSpray:wake.spray,bubbles:visible,splash:Math.max(0,1-splashAge/.65)};
 }
 return{dash,sonic,splash,stop,update};
}
