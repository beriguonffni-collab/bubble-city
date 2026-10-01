import {fractureAtlas,fractureMaterial} from './FracturedSurface.js';
import {createCuts} from './DestructionCuts.js';
import {damagedCollision} from './DamagedCollision.js';
import {impactDiameter,createStructuralCollapse,revealInterior} from './StructuralCollapse.js';
export {impactDiameter} from './StructuralCollapse.js';
import * as T from './vendor/three.module.js';
export const DAMAGE_NAMES=['','Fractures spreading','Heavy cracking','Major breach','Structural tearing','Support failure','Partial collapse','Catastrophic collapse','Obliterated'];
// All damage lives in memory. Reload reconstructs pristine city and vessels.
export class DamageLedger{
 constructor(){this.records=new Map();this.clock=0}
 hit(event){if(!event?.body||event.body.destroyed||!Number.isFinite(event.speed)||event.speed<=0)return null;let r=this.records.get(event.body);if(r&&this.clock-r.last<.65)return null;if(!r){r={tier:0,strikes:0,last:-10,hits:[]};this.records.set(event.body,r)}r.strikes++;r.tier=Math.min(8,r.tier+1);r.last=this.clock;r.hits.push(event);if(r.hits.length>8)r.hits.shift();return r}
}
export function createImpactDamage(scene,solids,city){
 const ledger=new DamageLedger(),root=new T.Group();root.name='Session impact fractures';root.userData.runtimeOnly=true;scene.add(root);
 const atlas=typeof document!=='undefined'?fractureAtlas():new T.Texture(),surfaces=new Map(),ray=new T.Raycaster(),linked=new Map();
 const keyOf=(mesh,index)=>mesh.uuid+':'+(index??'mesh');
 for(const b of solids?.bodies||[]){const v=b.visual,m=v?.batch?.mesh||v?.mesh;if(m){const key=keyOf(m,v.index);if(!linked.has(key))linked.set(key,[]);linked.get(key).push(b)}}
 const shardMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.55,metalness:.15});
 const shards=new T.InstancedMesh(new T.TetrahedronGeometry(1),shardMat,480);shards.name='Pooled impact debris';shards.userData.runtimeOnly=true;shards.instanceMatrix.setUsage(T.DynamicDrawUsage);shards.frustumCulled=false;scene.add(shards);shards.count=0;
 const pool=Array.from({length:480},()=>({life:0,p:new T.Vector3(),v:new T.Vector3(),spin:0})),dummy=new T.Object3D();let cursor=0;
 const collapseSystem=createStructuralCollapse(root,solids),blocks=collapseSystem.blocks;
 function scatter(p,n,tier,color=new T.Color(0x9dccce)){for(let j=0;j<Math.min(180,25+tier*25);j++){const a=pool[cursor++%pool.length];a.life=1.3+Math.random()*2;a.p.copy(p);a.v.set((Math.random()-.5)*20,4+Math.random()*12,(Math.random()-.5)*20).addScaledVector(n,12);a.size=.05+Math.random()*.12*tier;a.spin=Math.random()*6;a.color=color}}
 function resolve(event){let mesh=event.body.visual?.batch?.mesh||event.body.visual?.mesh,index=event.body.visual?.index;
  if(!mesh&&city){const n=new T.Vector3().copy(event.normal);ray.set(new T.Vector3().copy(event.point).addScaledVector(n,3),n.negate());ray.far=9;const h=ray.intersectObject(city,true).find(h=>h.object.isMesh&&!h.object.userData.fracturedOriginal);if(h){mesh=h.object;index=h.instanceId;event.body.visual={mesh,index}}}return{mesh,index};
 }
 function surfaceFor(event){const {mesh,index}=resolve(event);if(!mesh)return null;mesh.onFracture?.();const key=keyOf(mesh,index);let surface=surfaces.get(key);if(surface)return surface;
  const original=mesh.baseMaterials||(Array.isArray(mesh.material)?mesh.material:[mesh.material]),fx=original.map(mat=>mat.isShaderMaterial?{material:mat.clone(),hit(){},points:[],normals:[],count:{value:0}}:fractureMaterial(mat,atlas)),cuts=createCuts();if(mesh.fragmentCuts){mesh.updateWorldMatrix(true,false);for(const h of mesh.fragmentCuts.cuts.holes){const p=new T.Vector3(h.x,h.y,h.z).sub(mesh.fragmentCuts.rest).applyMatrix4(mesh.matrixWorld);cuts.add(p,h.r)}}for(const f of fx)cuts.bind(f.material);
  const replacement=new T.Mesh(event.body.visual?.batch?.g||mesh.geometry,Array.isArray(mesh.material)?fx.map(f=>f.material):fx[0].material);replacement.name='Fractured '+mesh.name;replacement.castShadow=mesh.castShadow;replacement.receiveShadow=mesh.receiveShadow;replacement.matrixAutoUpdate=false;mesh.updateWorldMatrix(true,false);
  if(index!=null){const matrix=new T.Matrix4();mesh.getMatrixAt(index,matrix);replacement.matrix.multiplyMatrices(mesh.matrixWorld,matrix);mesh.setMatrixAt(index,new T.Matrix4().makeScale(0,0,0));mesh.instanceMatrix.needsUpdate=true}else{replacement.matrix.copy(mesh.matrixWorld);mesh.visible=false;mesh.userData.fracturedOriginal=true}
  root.add(replacement);replacement.updateMatrixWorld(true);surface={...fx[0],baseMaterials:original,hit:(p,n,t)=>fx.forEach(f=>f.hit(p,n,Math.min(3,t))),fx,cuts,mesh:replacement,source:mesh,index,lastMatrix:replacement.matrix.clone(),bodies:linked.get(key)||[event.body]};replacement.destructionCuts=cuts;surface.collision=damagedCollision(replacement,cuts);mesh.destructionSurface=surface;
  for(const body of surface.bodies){body.cuts=cuts;body.damageMesh=replacement;body.damageCollision=surface.collision}if(!surface.bodies.includes(event.body)){surface.bodies.push(event.body);event.body.cuts=cuts;event.body.damageMesh=replacement;event.body.damageCollision=surface.collision}surfaces.set(key,surface);return surface;
 }
 function fracture(event,tier,cutRadius=0){const surface=surfaceFor(event);if(!surface)return null;const p=new T.Vector3().copy(event.point),n=new T.Vector3().copy(event.normal).normalize();surface.hit(p,n,tier);if(cutRadius){surface.cuts.add(p,cutRadius);for(const f of surface.fx)for(let i=0;i<f.count.value;i++)if(new T.Vector3(f.points[i].x,f.points[i].y,f.points[i].z).distanceTo(p)<4)f.normals[i].w=cutRadius;for(const f of surface.fx){if(f.material.side!==T.DoubleSide){f.material.side=T.DoubleSide;f.material.needsUpdate=true}}}return surface}
 function erase(body,makeRubble=true,event=null){
  if(body.destroyed)return;
  const hit=event||{body,point:{x:body.x,y:(body.top+body.bottom)/2,z:body.z},normal:{x:0,y:1,z:0},speed:0},surface=surfaceFor({...hit,body});
  if(surface?.source.userData.structuralNetwork){surface.cuts.add(hit.point,impactDiameter(hit.speed)/2);solids?.remove(body);return}
  if(surface){if(makeRubble)collapseSystem.enqueue(surface,hit);surface.mesh.visible=makeRubble;surface.destroyed=true;for(const b of surface.bodies)solids?.remove(b)}else solids?.remove(body);
  body.destroyed=true;
 }
 function collapse(body,event,tier){
  const boat=body.carrier?.boat;if(boat){boat.destroyed=true;boat.manual=true;boat.speed=0;boat.lod.autoUpdate=false;boat.high.visible=true;boat.low.visible=false;for(const b of solids?.bodies||[])if(b.carrier===body.carrier)erase(b,true,event);boat.mesh.visible=false;return}
  if(!solids||body.footprint||body.seabed||body.fragment||body.interior)return;
  const width=body.r?body.r*2:body.w,depth=body.r?body.r*2:body.d;
  if(!width||!depth||Math.max(width,depth)>240)return;
  // The removed load path determines failure. Repeated blows weaken that path
  // without enlarging the blast sphere. Mid-height failure drops upper sections.
  const surface=surfaceFor(event);if(!surface)return;
  const sectionY=Math.max(body.bottom+.2,Math.min(body.top-.2,event.point.y));let removed=0,total=0;
  for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++){
   const local=new T.Vector3(x*width/10,0,z*depth/10).applyAxisAngle(new T.Vector3(0,1,0),body.ry||0),p={x:body.x+local.x,y:sectionY,z:body.z+local.z};
   if(!solids.horizontal(p,body))continue;total++;if(surface.cuts.contains(p))removed++;
  }
  const loss=removed/(total||1),baseHit=event.point.y<body.bottom+Math.max(5,(body.top-body.bottom)*.23);
  if(loss<.58&&!(baseHit&&loss>0&&loss*tier>.85))return;
  const radius=Math.hypot(width,depth)/2+.5,candidates=body.structure?[...body.structure.bodies]:[...solids.nearby(body,radius+35)];
  for(const b of candidates){
   if(b.destroyed||b.footprint||b.seabed||b.fragment||b.carrier||b.bottom<body.bottom-.5)continue;
   // Only components within this support footprint travel with it. Nearby towers
   // no longer vanish merely because their centers share a broad blast radius.
   const own=b===body||body.structure&&b.structure===body.structure||solids.horizontal({x:b.x,z:b.z},{...body,destroyed:false},-.05)&&Math.max(b.w||b.r*2||0,b.d||b.r*2||0)<=Math.max(width,depth)*1.3;
   if(own)erase(b,true,event);
  }
  erase(body,true,event);
 }
 function hit(event){const r=ledger.hit(event);if(!r)return null;const body=event.body,radius=impactDiameter(event.speed)/2;
  const before=surfaceFor(event);if(before&&radius>0)collapseSystem.impact(before,event,radius);const surface=fracture(event,r.tier,radius);if(surface&&solids)revealInterior(surface,body,root,solids);r.diameter=radius*2;scatter(new T.Vector3().copy(event.point),new T.Vector3().copy(event.normal),r.tier);
  const boat=body.carrier?.boat;if(boat){boat.damage=(boat.damage||0)+1;boat.lod.autoUpdate=false;boat.high.visible=true;boat.low.visible=false;if(boat.damage>=7||radius>8)collapse(body,event,8)}
  // Breaches also remove intersecting trim/road layers and their collision, so a
  // visible hole is traversable instead of hiding an intact collision box.
  if(solids)for(const other of solids.nearby(event.point,Math.max(10,radius))){if(other===body||other.destroyed||other.carrier!==body.carrier&&!!other.carrier)continue;const top=solids.heightAt(event.point,other),dx=Math.max(0,Math.abs(other.x-event.point.x)-(other.r??other.w/2)),dz=Math.max(0,Math.abs(other.z-event.point.z)-(other.r??other.d/2)),dy=Math.max(0,other.bottom-event.point.y,event.point.y-top);if(Math.hypot(dx,dy,dz)>Math.max(2,radius))continue;const e={...event,body:other};if(radius){fracture(e,r.tier,radius);if(!other.carrier&&other.top-other.bottom<radius&&Math.max(other.w||other.r*2||0,other.d||other.r*2||0)<radius*.9)erase(other,true,event)}else if(other.r>8)fracture(e,r.tier)}
  if(!body.destroyed)collapse(body,event,r.strikes);return r.tier;
 }
 function update(dt){ledger.clock+=dt;
  for(const surface of surfaces.values())if(!surface.destroyed&&surface.index==null){surface.source.updateWorldMatrix(true,false);const next=surface.source.matrixWorld;if(!next.equals(surface.lastMatrix)){const delta=new T.Matrix4().multiplyMatrices(next,surface.lastMatrix.clone().invert());for(const f of surface.fx)for(let i=0;i<f.count.value;i++){const point=f.points[i],normal=f.normals[i],p=new T.Vector3(point.x,point.y,point.z).applyMatrix4(delta),n=new T.Vector3(normal.x,normal.y,normal.z).transformDirection(delta);point.set(p.x,p.y,p.z,point.w);normal.set(n.x,n.y,n.z,normal.w)}for(const h of surface.cuts.holes){const p=new T.Vector3(h.x,h.y,h.z).applyMatrix4(delta);Object.assign(h,{x:p.x,y:p.y,z:p.z})}if(surface.cuts.holes.length)surface.cuts.sync();surface.mesh.matrix.copy(next);surface.mesh.updateMatrixWorld(true);surface.lastMatrix.copy(next)}}
  let count=0;for(const p of pool){p.life-=dt;if(p.life<=0)continue;p.v.y-=9.8*dt;p.p.addScaledVector(p.v,dt);dummy.position.copy(p.p);dummy.rotation.set(p.spin*ledger.clock,p.spin*.6*ledger.clock,ledger.clock);dummy.scale.setScalar(p.size*Math.min(1,p.life));dummy.updateMatrix();shards.setMatrixAt(count,dummy.matrix);shards.setColorAt(count++,p.color)}shards.count=count;shards.instanceMatrix.needsUpdate=true;if(shards.instanceColor)shards.instanceColor.needsUpdate=true;
  collapseSystem.update(dt);
 }
 return{hit,update,ledger,root,surfaces,blocks,erase,collapseSystem};
}
