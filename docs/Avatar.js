import {createSwimMotion} from './SwimMotion.js';
import {createFlightMotion} from './FlightMotion.js';
import {createWallContacts} from './WallContacts.js';
import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// One authored skeleton and one set of meshes/materials for both camera modes.
export async function createAvatar(scene){
 const loader=new GLTFLoader();const [gltf,extended]=await Promise.all([loader.loadAsync('./avatar/pearl-diver.avatar'),loader.loadAsync('./avatar/extended-motions.avatar')]);
 const names=new Set(gltf.animations.map(c=>c.name));for(const clip of extended.animations)if(!names.has(clip.name))gltf.animations.push(clip);
 const climbingBase=gltf.animations.find(c=>c.name==='Idle_Loop').clone();climbingBase.name='Wall_Climb';gltf.animations.push(climbingBase);
 const anchor=new T.Group(),turn=new T.Group(),model=gltf.scene;anchor.name='Pearl Diver';scene.add(anchor);anchor.add(turn);turn.add(model);
 const flightRest=new Map();model.traverse(o=>{if(o.isBone)flightRest.set(o.name,{quaternion:o.quaternion.clone(),position:o.position.clone(),scale:o.scale.clone()})});
 const mixer=new T.AnimationMixer(model),clips=new Map(gltf.animations.map(c=>[c.name,c])),actions=new Map();
 const pearl=new T.MeshPhysicalMaterial({color:0xaddddc,metalness:.48,roughness:.22,clearcoat:1,clearcoatRoughness:.12,iridescence:.45,iridescenceIOR:1.35,envMapIntensity:1.15});
 const suit=new T.MeshPhysicalMaterial({color:0x073344,metalness:.25,roughness:.55,clearcoat:.25});
 const light=new T.MeshStandardMaterial({color:0x8efef1,emissive:0x21d3c5,emissiveIntensity:1.3,roughness:.2});
 const visor=new T.MeshPhysicalMaterial({color:0x07344e,metalness:.85,roughness:.08,clearcoat:1,iridescence:.8});
 const shell=new T.MeshPhysicalMaterial({color:0xe0eeec,metalness:.38,roughness:.19,clearcoat:1});
 const originals=[],arms=[],accessories=[];
 model.traverse(o=>{if(o.isSkinnedMesh){o.material=o.material.name==='M_Joints'?suit:pearl;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;originals.push(o)}});
 // First-person arms are cut from the same skinned body, using the same skeleton.
 for(const source of originals){
  const geometry=source.geometry,skin=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight;
  const armBones=new Set(source.skeleton.bones.map((b,i)=>/lowerarm|hand_|thumb_|index_|middle_|ring_|pinky_/.test(b.name)?i:-1));
  const inArm=i=>{let total=0;for(let k=0;k<4;k++){if(armBones.has(skin.getComponent(i,k)))total+=weights.getComponent(i,k)}return total>.55};
  const indices=geometry.index?.array||Array.from({length:geometry.attributes.position.count},(_,i)=>i),selected=[];
  for(let i=0;i<indices.length;i+=3)if(inArm(indices[i])&&inArm(indices[i+1])&&inArm(indices[i+2]))selected.push(indices[i],indices[i+1],indices[i+2]);
  // Keep authored surfaces only. Capping every index boundary also capped
  // UV/hard-normal seams, creating hundreds of coincident triangles on fingers.
  const g=geometry.clone();g.setIndex(selected);const mesh=new T.SkinnedMesh(g,source.material);mesh.name=source.name+' first-person arms';mesh.bind(source.skeleton,source.bindMatrix);mesh.frustumCulled=false;mesh.castShadow=false;source.parent.add(mesh);arms.push(mesh);
 }
 const action=name=>{if(!actions.has(name))actions.set(name,mixer.clipAction(clips.get(name)));return actions.get(name)};
 let current='Idle_Loop';action(current).play();mixer.update(0);scene.updateMatrixWorld(true);
 function mount(boneName,geometry,material,offset,scale){const bone=model.getObjectByName(boneName);if(!bone)return;const mesh=new T.Mesh(geometry,material);mesh.position.copy(bone.getWorldPosition(new T.Vector3())).add(new T.Vector3(...offset));if(scale)mesh.scale.set(...scale);scene.add(mesh);bone.attach(mesh);mesh.castShadow=true;mesh.receiveShadow=true;accessories.push(mesh);return mesh}
 // Pearl ceramic helmet, polarized faceplate, luminous breathing collar and a chest crest.
 mount('Head',new T.SphereGeometry(1,40,28),shell,[0,.115,0],[.174,.225,.168]);
 mount('Head',new T.SphereGeometry(1,40,24,0,Math.PI,.25*Math.PI,.58*Math.PI),visor,[0,.12,.018],[.178,.21,.178]);
 for(const side of [-1,1]){mount('Head',new T.SphereGeometry(1,20,12),light,[side*.171,.11,0],[.026,.075,.045]);mount('spine_03',new T.CapsuleGeometry(.045,.25,8,16),shell,[side*.18,-.14,-.17]);mount('spine_03',new T.SphereGeometry(1,20,12),light,[side*.18,-.12,-.218],[.018,.09,.012])}
 const crest=mount('spine_03',new T.OctahedronGeometry(.095,2),light,[0,.01,.165],[1,1,.28]);
 const collar=mount('neck_01',new T.TorusGeometry(.115,.018,8,40),light,[0,0,0]);if(collar)collar.rotation.x+=Math.PI/2;
 for(const side of ['l','r']){mount('upperarm_'+side,new T.SphereGeometry(1,28,18),shell,[0,-.04,0],[.12,.15,.14]);mount('lowerarm_'+side,new T.TorusGeometry(.065,.012,8,32),light,[0,-.19,0]);}
 const fistPose=new Map(gltf.animations.find(c=>c.name==='Punch_Jab').tracks.filter(t=>/^(index|middle|ring|pinky|thumb)_0[123]_[lr]\.quaternion$/.test(t.name)).map(t=>[t.name.split('.')[0],new T.Quaternion().fromArray(t.createInterpolant().evaluate(.25))]));
 const contacts=createWallContacts(model),flightMotion=createFlightMotion(model,flightRest),swimMotion=createSwimMotion(model,flightRest);
 const bones={head:model.getObjectByName('Head'),pelvis:model.getObjectByName('pelvis')};
 const headPosition=new T.Vector3(),eyeOffset=new T.Vector3(),quaternion=new T.Quaternion(),forward=new T.Vector3();let bodyYaw=0,initialized=false,climbCycle=0,flightLean=0;
 function update(player,t,dt,{third=false,roll=0,dash=0,splash=0,active=true,reduced=false}={}){
  const swim=!player.phase&&(player.swimming||player.underwater),fly=player.mode!=='walk',input=player.swimInput||{f:0,s:0,u:0},swimIntent=!!(input.f||input.s||input.u||player.dashRemaining>0),moving=active&&!player.piloting&&player.speed>.6&&(!swim||swimIntent);
  const waterInput=player.swimInput||{f:1,s:0},waterDirectional=swim&&moving&&(waterInput.f<-.1||(Math.abs(waterInput.s)>.1&&waterInput.f<.65));
  const gaitSpeed=(!swim&&!fly&&!player.climbing)?(player.walkSpeed??player.speed):player.speed;
  const name=player.emote&&clips.has(player.emote)?player.emote:player.climbing?(player.mantle?'ClimbUp_1m':'Wall_Climb'):swim?(moving?(waterDirectional?'Idle_Loop':'Swim_Fwd_Loop'):'Swim_Idle_Loop'):fly?'Idle_Loop':!player.grounded?'Jump_Loop':moving?'Sprint_Loop':'Idle_Loop';
  if(name!==current){const next=action(name).reset().setEffectiveWeight(1).play();action(current).crossFadeTo(next,.22,false);current=name}
  const base=action(current);base.paused=false;base.timeScale=swim?Math.min(2.1,.8+player.speed*.06):moving?Math.min(2.475,gaitSpeed*1.2375/7.5):1;
  if(player.emote)base.timeScale=1;else if(player.climbing){base.timeScale=player.mantle?1:player.climbEffort>0?1.6:0}else if(fly&&!swim){base.timeScale=.85}
  mixer.update(dt);
  // Contacts own climbing completely. Remove the idle clip's hip oscillation.
  if(player.climbing&&!player.mantle)for(const [name,pose] of flightRest){const b=model.getObjectByName(name);b.quaternion.copy(pose.quaternion);b.position.copy(pose.position);b.scale.copy(pose.scale)}
  // The authored Roll supplies coordinated torso/arm/leg compression. The whole rig then corkscrews.
  const tumble=action('Roll');if(dash>.015&&swim&&!waterDirectional){tumble.enabled=true;tumble.play();tumble.paused=true;tumble.time=.33+dash*.07;tumble.setEffectiveWeight(dash*.87);mixer.update(0)}else{tumble.setEffectiveWeight(0);tumble.stop()}
  const splashAction=action('Spell_Simple_Shoot');if(splash>.015){splashAction.enabled=true;splashAction.play();splashAction.paused=true;splashAction.time=(1-splash)*Math.min(.8,clips.get('Spell_Simple_Shoot').duration);splashAction.setEffectiveWeight(splash*.75);mixer.update(0)}else{splashAction.stop()}

  if(player.piloting){bodyYaw=player.helmYaw;initialized=true}
  else if(player.climbing&&Number.isFinite(player.climbing.nx)){bodyYaw=Math.atan2(player.climbing.nx,player.climbing.nz);initialized=true}
  else if(fly&&!swim&&initialized){bodyYaw+=Math.atan2(Math.sin(player.yaw-bodyYaw),Math.cos(player.yaw-bodyYaw))*(1-Math.exp(-dt*7))}
  else if(!initialized||moving||!third){bodyYaw=player.yaw;initialized=true}
  let flightPose=null;
  if(fly&&!swim&&!player.emote&&!player.climbing){
   anchor.position.set(0,0,0);anchor.quaternion.identity();turn.rotation.set(0,0,0);anchor.updateMatrixWorld(true);
   flightPose=flightMotion.update(player,dt,{active,reduced});flightLean=flightPose.lean;
  }else{flightMotion.reset();flightLean=0}
  let swimPose=null;if(waterDirectional){anchor.position.set(0,0,0);anchor.quaternion.identity();turn.rotation.set(0,0,0);anchor.updateMatrixWorld(true);swimPose=swimMotion.update(player,dt)}else swimMotion.reset();
  quaternion.setFromEuler(new T.Euler(swim?(swimPose?.lean??(moving?player.pitch:0)):player.climbing?0:flightLean,bodyYaw,swimPose?.bank||flightPose?.bank||0,'YXZ'));
  // Every flight pose lives in the same camera-facing frame. Directional
  // lean and axial roll are local offsets, never a second world orientation.
  // Gaze flight shares this visual frame while Physics keeps altitude locked.
  if(flightPose)quaternion.setFromEuler(new T.Euler(player.pitch,bodyYaw,0,'YXZ')).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),flightPose.roll+flightPose.bank)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),flightLean));
  if(swimPose&&roll&&player.swimVelocity){const axis=new T.Vector3().copy(player.swimVelocity);if(axis.lengthSq()>.1)quaternion.premultiply(new T.Quaternion().setFromAxisAngle(axis.normalize(),roll))}
  anchor.quaternion.copy(quaternion);turn.rotation.set(0,Math.PI,swim&&!waterDirectional?roll:0,'ZYX');
  // Animated head stays anchored at the player eye; the rig has a real torso, legs and fingers.
  anchor.position.set(0,0,0);anchor.updateMatrixWorld(true);bones.head.getWorldPosition(headPosition);
  eyeOffset.set(0,.12,.075).applyQuaternion(new T.Quaternion().setFromEuler(new T.Euler(0,Math.PI,0))).applyQuaternion(quaternion);
  const placedHead=new T.Vector3().copy(player.position).sub(headPosition).sub(eyeOffset);
  if(third&&flightPose?.tuck){const center=bones.pelvis.getWorldPosition(new T.Vector3());const pivot=new T.Vector3().copy(player.position).add(new T.Vector3(0,-.8,0)).sub(center);placedHead.lerp(pivot,flightPose.tuck)}
  anchor.position.copy(placedHead);
  // Keep the same swimming arms inside a first-person lens instead of cropping them below it.
  if(!third&&swim){forward.set(0,.04,-.38).applyQuaternion(quaternion);anchor.position.add(forward)}
  if(fly&&!moving&&!swim&&third)anchor.position.y+=Math.sin(t*1.8)*.1;
  anchor.updateMatrixWorld(true);
  if(fly&&!swim&&!player.climbing&&!player.emote){
   for(const [name,q] of fistPose)model.getObjectByName(name).quaternion.copy(q);
   anchor.updateMatrixWorld(true);
  }
  let contactReport=[];
  if(player.climbing&&!player.mantle){contacts.alignBody(anchor,player);contactReport=contacts.update(player,dt)}else contacts.reset();
  for(const mat of [pearl,suit,shell,visor]){mat.transparent=!!player.phase;mat.opacity=player.phase?.32+.1*Math.sin(t*10):1;mat.depthWrite=!player.phase;}
  for(const m of originals)m.visible=third;for(const m of accessories)m.visible=third;for(const m of arms)m.visible=!third&&(!fly||swim)&&(player.climbing||player.emote||(!fly&&!swim)||moving);
  if(crest)crest.material.emissiveIntensity=1.1+Math.sin(t*2)*.15;
  return{gaitRate:base.timeScale,animation:swimPose?'Swim_'+swimPose.direction:flightPose?(flightPose.roll?'Air_Roll':moving?'Flight_Cruise':'Flight_Hover'):current,airRoll:flightPose?.roll||0,flightDirection:swimPose?.direction||flightPose?.direction||'',armMeshes:arms.length,handsVisible:arms.some(m=>m.visible),bodyVisible:third,contacts:contactReport};
 }
 return{root:anchor,update,dash:()=>flightMotion.dash(),clips:[...clips.keys()],duration:name=>clips.get(name)?.duration||2,setVisible(value){anchor.visible=value}};
}
