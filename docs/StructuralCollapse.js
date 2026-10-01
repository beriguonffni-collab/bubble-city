import * as T from './vendor/three.module.js';
import {createCuts} from './DestructionCuts.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {damagedCollision} from './DamagedCollision.js';

export const impactDiameter = speed => Number.isFinite(speed) ? Math.max(0, speed) / 5 : 0;

function struckGeometry(mesh,point,radius,oldCuts){
 const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,index=g.index,normalMatrix=new T.Matrix3().getNormalMatrix(mesh.matrixWorld),buckets=new Map(),origin=new T.Vector3().copy(point);
 const read=i=>({p:new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),n:n?new T.Vector3().fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize():new T.Vector3(0,1,0),uv:uv?new T.Vector2().fromBufferAttribute(uv,i):new T.Vector2()});
 const midpoint=(a,b)=>({p:a.p.clone().lerp(b.p,.5),n:a.n.clone().lerp(b.n,.5).normalize(),uv:a.uv.clone().lerp(b.uv,.5)});
 function emit(a,b,c,mi,depth=0){
  if(depth<5&&Math.max(a.p.distanceTo(b.p),b.p.distanceTo(c.p),c.p.distanceTo(a.p))>radius*.3){const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);for(const t of [[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]])emit(...t,mi,depth+1);return}
  const center=a.p.clone().add(b.p).add(c.p).multiplyScalar(1/3);
  if([a,b,c].some(v=>v.p.distanceTo(origin)>radius)||oldCuts.contains(center))return;
  const data=buckets.get(mi)||{p:[],n:[],uv:[]};buckets.set(mi,data);for(const v of [a,b,c]){data.p.push(...v.p);data.n.push(...v.n);data.uv.push(...v.uv)}
 }
 for(let t=0;t<(index?.count||p.count);t+=3){
  let poly=[0,1,2].map(j=>read(index?index.getX(t+j):t+j));
  for(const axis of ['x','y','z']){poly=clip(poly,axis,point[axis]-radius,1);poly=clip(poly,axis,point[axis]+radius,-1)}
  const mi=g.groups.find(gr=>t>=gr.start&&t<gr.start+gr.count)?.materialIndex||0;
  for(let j=1;j<poly.length-1;j++)emit(poly[0],poly[j],poly[j+1],mi);
 }
 const geometry=new T.BufferGeometry(),positions=[],normals=[],uvs=[];
 for(const [mi,a] of buckets){geometry.addGroup(positions.length/3,a.p.length/3,mi);positions.push(...a.p);normals.push(...a.n);uvs.push(...a.uv)}
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));return geometry;
}

// Clip the ORIGINAL triangles, interpolating their UVs and normals. A curved
// facade remains curved and textured after it detaches; no substitute rubble.
function clip(poly, axis, limit, sign) {
 const out=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=(a.p[axis]-limit)*sign,db=(b.p[axis]-limit)*sign;
  if(da>=-1e-7)out.push(a);
  if((da>0&&db<0)||(da<0&&db>0)){
   const t=da/(da-db);out.push({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),uv:a.uv.clone().lerp(b.uv,t)});
  }
 }
 return out;
}
export function structuralPieces(mesh){
 mesh.updateWorldMatrix(true,false);
 const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,index=g.index;
 const bounds=new T.Box3().setFromBufferAttribute(p).applyMatrix4(mesh.matrixWorld),size=bounds.getSize(new T.Vector3());
 const ny=Math.max(1,Math.min(18,Math.ceil(size.y/12))),nx=size.x>12?2:1,nz=size.z>12?2:1,buckets=new Map(),normalMatrix=new T.Matrix3().getNormalMatrix(mesh.matrixWorld);
 const read=i=>({p:new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),n:n?new T.Vector3().fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize():new T.Vector3(0,1,0),uv:uv?new T.Vector2().fromBufferAttribute(uv,i):new T.Vector2()});
 const count=index?index.count:p.count;
 for(let t=0;t<count;t+=3){
  const tri=[0,1,2].map(j=>read(index?index.getX(t+j):t+j)),mi=g.groups.find(gr=>t>=gr.start&&t<gr.start+gr.count)?.materialIndex||0;
  const lo=new T.Vector3(Infinity,Infinity,Infinity),hi=new T.Vector3(-Infinity,-Infinity,-Infinity);for(const v of tri){lo.min(v.p);hi.max(v.p)}
  const cell=(v,a,num)=>Math.max(0,Math.min(num-1,Math.floor((v[a]-bounds.min[a])/(size[a]||1)*num)));
  for(let y=cell(lo,'y',ny);y<=cell(hi,'y',ny);y++)for(let x=cell(lo,'x',nx);x<=cell(hi,'x',nx);x++)for(let z=cell(lo,'z',nz);z<=cell(hi,'z',nz);z++){
   let poly=tri;for(const [axis,i,num] of [['x',x,nx],['y',y,ny],['z',z,nz]]){poly=clip(poly,axis,bounds.min[axis]+size[axis]*i/num,1);poly=clip(poly,axis,bounds.min[axis]+size[axis]*(i+1)/num,-1);if(poly.length<3)break}
   if(poly.length<3)continue;const key=`${x}:${y}:${z}`,bucket=buckets.get(key)||new Map();buckets.set(key,bucket);const data=bucket.get(mi)||{p:[],n:[],uv:[]};bucket.set(mi,data);
   for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]]){data.p.push(...v.p);data.n.push(...v.n);data.uv.push(...v.uv)}
  }
 }
 return [...buckets.values()].map(bucket=>{
  const geo=new T.BufferGeometry(),positions=[],normals=[],uvs=[];
  for(const [mi,a] of bucket){geo.addGroup(positions.length/3,a.p.length/3,mi);positions.push(...a.p);normals.push(...a.n);uvs.push(...a.uv)}
  geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.computeBoundingBox();
  const center=geo.boundingBox.getCenter(new T.Vector3());geo.translate(-center.x,-center.y,-center.z);geo.computeBoundingBox();geo.computeBoundingSphere();return{geometry:geo,center};
 });
}

export function createStructuralCollapse(root,solids){
 const blocks=[],queue=[],queuedEvents=new WeakMap(),settledBatches=new Map(),dirtyBatches=new Set();let clock=0;
 function settle(a){
  const mats=Array.isArray(a.mesh.material)?a.mesh.material:[a.mesh.material],key=mats.map(m=>m.uuid).join(':')+':'+Math.floor(a.p.x/100)+':'+Math.floor(a.p.z/100);
  const batch=settledBatches.get(key)||{parts:[],mesh:null};settledBatches.set(key,batch);batch.parts.push(a);a.batch=batch;dirtyBatches.add(batch);
 }
 function rebuild(batch){
  if(batch.mesh){root.remove(batch.mesh);batch.mesh.geometry.dispose();batch.mesh=null}
  const parts=batch.parts.filter(a=>!a.detached&&!a.body?.destroyed);if(!parts.length)return;
  const geometries=parts.map(a=>{a.mesh.updateMatrixWorld(true);return a.mesh.geometry.clone().applyMatrix4(a.mesh.matrixWorld)}),geometry=mergeGeometries(geometries,false);
  // mergeGeometries does not preserve input material groups.
  geometry.clearGroups();let offset=0;for(const g of geometries){for(const group of g.groups)geometry.addGroup(offset+group.start,group.count,group.materialIndex);offset+=g.index?.count||g.attributes.position.count;g.dispose()}
  batch.mesh=new T.Mesh(geometry,parts[0].mesh.material);batch.mesh.name='Settled original building sections';batch.mesh.castShadow=true;batch.mesh.receiveShadow=true;root.add(batch.mesh);for(const a of parts)a.mesh.visible=false;
 }
 function enqueue(surface,event){
  if(surface.collapseQueued)return;surface.collapseQueued=true;
  const mats=surface.baseMaterials||(Array.isArray(surface.source.material)?surface.source.material:[surface.source.material]),key=mats.map(m=>m.uuid).join(':');
  let groups=queuedEvents.get(event);if(!groups){groups=new Map();queuedEvents.set(event,groups)}
  let item=groups.get(key);if(!item||item.started){item={surface,event,members:[],started:false};groups.set(key,item);queue.push(item)}item.members.push(surface);
 }
 function impact(surface,event,radius){
  const cuts=createCuts();for(const h of surface.cuts.holes)cuts.add(h,h.r);
  const mesh=new T.Mesh(surface.mesh.geometry,surface.mesh.material);mesh.matrixAutoUpdate=false;mesh.matrix.copy(surface.mesh.matrixWorld);mesh.updateMatrixWorld(true);mesh.name='Impact fragments of '+surface.source.name;
  queue.push({surface:{...surface,mesh,cuts},event,blastRadius:radius});
 }
 function spawn(item){
  item.started=true;let {surface,event,blastRadius,members}=item,extracted=null;
  if(members?.length>1){
   const geometries=[],cuts=createCuts();for(const s of members){s.mesh.visible=false;s.mesh.updateMatrixWorld(true);let g=s.mesh.geometry.clone();if(g.index){const indexed=g;g=g.toNonIndexed();indexed.dispose()}g.applyMatrix4(s.mesh.matrixWorld);for(const key of Object.keys(g.attributes))if(!['position','normal','uv'].includes(key))g.deleteAttribute(key);geometries.push(g);for(const h of s.cuts.holes)cuts.add(h,h.r)}
   extracted=mergeGeometries(geometries,false);extracted.clearGroups();let offset=0;for(const g of geometries){for(const gr of g.groups)extracted.addGroup(offset+gr.start,gr.count,gr.materialIndex);offset+=g.attributes.position.count;g.dispose()}
   const mesh=new T.Mesh(extracted,surface.mesh.material);mesh.name=surface.mesh.name;mesh.updateMatrixWorld(true);surface={...surface,mesh,cuts,componentNames:[...new Set(members.map(s=>s.mesh.name))]};
  }
  if(blastRadius){extracted=struckGeometry(surface.mesh,event.point,blastRadius,surface.cuts);if(!extracted.attributes.position.count){extracted.dispose();return}surface.mesh.geometry=extracted;surface.mesh.matrix.identity();surface.mesh.updateMatrixWorld(true)}
  surface.mesh.visible=false;
  const source=surface.baseMaterials||(Array.isArray(surface.source.material)?surface.source.material:[surface.source.material]);
  const cuts=createCuts();for(const h of surface.cuts.holes)cuts.add(h,h.r);
  const mats=source.map(m=>{const a=m.clone();a.onBeforeCompile=m.onBeforeCompile;a.customProgramCacheKey=m.customProgramCacheKey.bind(m);a.side=T.DoubleSide;cuts.bind(a,true);return a});
  for(const {geometry,center} of structuralPieces(surface.mesh)){
   const vertices=geometry.attributes.position;
   if(surface.cuts.holes.some(h=>{for(let i=0;i<vertices.count;i++){const p=new T.Vector3().fromBufferAttribute(vertices,i).add(center);if(p.distanceTo(new T.Vector3(h.x,h.y,h.z))>=h.r)return false}return true})){geometry.dispose();continue}
   const rest=new Float32Array(vertices.count*3);for(let i=0;i<vertices.count;i++)rest.set([vertices.getX(i)+center.x,vertices.getY(i)+center.y,vertices.getZ(i)+center.z],i*3);geometry.setAttribute('cutRestPosition',new T.BufferAttribute(rest,3));
   const mesh=new T.Mesh(geometry,Array.isArray(surface.source.material)?mats:mats[0]);mesh.sourceComponents=surface.componentNames||[surface.mesh.name];mesh.baseMaterials=source;mesh.fragmentCuts={cuts,rest:center.clone()};mesh.name='Falling '+surface.mesh.name;mesh.position.copy(center);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
   const delay=Math.max(0,center.y-event.point.y)*.006,away=new T.Vector3(center.x-event.point.x,0,center.z-event.point.z).normalize();
   const a={mesh,p:mesh.position,size:geometry.boundingBox.getSize(new T.Vector3()),v:away.multiplyScalar(Math.min(9,event.speed*.015)),rotation:mesh.rotation,spin:new T.Vector3(.08*(center.z-event.point.z>=0?1:-1),.035,.09*(center.x-event.point.x>=0?1:-1)),start:clock+delay,settled:false,body:null,cuts,rest:center.clone()};
   blocks.push(a);mesh.onFracture=()=>{a.detached=true;if(a.batch)dirtyBatches.add(a.batch)};
   mesh.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(mesh),empty={holes:[{}],contains(point,pad){const local=new T.Vector3().copy(point);mesh.worldToLocal(local);local.add(a.rest);return cuts.contains(local,pad)}};
   const floorRay=new T.Raycaster();a.floorAt=(p,ceiling)=>{floorRay.set(new T.Vector3(p.x,ceiling+.01,p.z),new T.Vector3(0,-1,0));const target=a.body?.damageMesh||mesh,mask=a.body?.cuts||empty;return floorRay.intersectObject(target,false).find(hit=>hit.face.normal.clone().transformDirection(target.matrixWorld).y>.25&&!mask.contains(hit.point,.31))?.point.y??-Infinity};
   a.body=solids?.add({floorAt:a.floorAt,x:center.x,z:center.z,w:bounds.max.x-bounds.min.x,d:bounds.max.z-bounds.min.z,bottom:bounds.min.y,top:bounds.max.y,rubble:true,fragment:true,visual:{mesh},cuts:empty,damageCollision:damagedCollision(mesh,empty)});
  }
  extracted?.dispose();
 }
 function update(dt){
  clock+=dt;
  // Generate a bounded number of source meshes each frame rather than blocking
  // one frame with every floor of a skyscraper.
  for(let i=0;i<3&&queue.length;i++)spawn(queue.shift());
  for(const a of blocks){
   if(a.body?.destroyed){a.mesh.visible=false;if(!a.detached&&a.batch)dirtyBatches.add(a.batch);a.detached=true;a.settled=true;continue}
   if(a.settled||clock<a.start)continue;
   const steps=Math.max(1,Math.ceil(dt/.025)),h=dt/steps;
   for(let i=0;i<steps&&!a.settled;i++){
    const oldBottom=new T.Box3().setFromObject(a.mesh).min.y;
    a.v.y-=9.81*h;a.p.addScaledVector(a.v,h);a.rotation.x+=a.spin.x*h;a.rotation.y+=a.spin.y*h;a.rotation.z+=a.spin.z*h;a.mesh.updateMatrixWorld(true);
    const bb=new T.Box3().setFromObject(a.mesh);let floor=-120;
    for(const b of solids?.nearby(a.p)||[])if(b!==a.body&&!b.destroyed&&!b.fragment&&solids.horizontal(a.p,b)&&b.top<=oldBottom+.1&&!solids.cutAt({x:a.p.x,y:b.top,z:a.p.z},b))floor=Math.max(floor,b.top);
    if(bb.min.y<=floor){a.p.y+=floor-bb.min.y;a.v.set(0,0,0);a.settled=true;a.mesh.updateMatrixWorld(true);settle(a)}
   }
   if(a.body){const b=new T.Box3().setFromObject(a.mesh);Object.assign(a.body,{x:(b.min.x+b.max.x)/2,z:(b.min.z+b.max.z)/2,w:b.max.x-b.min.x,d:b.max.z-b.min.z,bottom:b.min.y,top:b.max.y});solids.reindex(a.body)}
  }
  const dirty=dirtyBatches.values().next().value;if(dirty){dirtyBatches.delete(dirty);rebuild(dirty)}
 }
 return{blocks,enqueue,impact,update,queue};
}

// Interiors are realized only when their envelope is opened. This avoids adding
// thousands of hidden floor draw calls to the untouched city.
export function revealInterior(surface,body,root,solids){
 const material=Array.isArray(surface.source.material)?surface.source.material[0]:surface.source.material;
 if(surface.interior||!material.userData.buildingEnvelope||body.carrier||body.fragment||body.bottom<0)return;
 surface.interior=[];
 const w=body.w||body.r*2,d=body.d||body.r*2,height=body.top-body.bottom;if(Math.min(w,d)<5||height<8)return;
 const concrete=new T.MeshStandardMaterial({color:0xb1bbb8,roughness:.88}),floorGeometry=body.r?new T.CylinderGeometry(body.r*.96,body.r*.96,.26,40):new T.BoxGeometry(w*.96,.26,d*.96);
 const levels=Math.floor(height/4),floors=new T.InstancedMesh(floorGeometry,concrete,levels);floors.name='Interior concrete floor plates';root.add(floors);
 const matrix=new T.Matrix4(),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),body.ry||0);
 for(let i=0;i<levels;i++){
  const y=body.bottom+.3+i*4;matrix.compose(new T.Vector3(body.x,y,body.z),q,new T.Vector3(1,1,1));floors.setMatrixAt(i,matrix);
  surface.interior.push(solids.add({x:body.x,z:body.z,w:w*.96,d:d*.96,r:body.r?body.r*.96:undefined,ry:body.ry||0,bottom:y-.13,top:y+.13,interior:true,visual:{mesh:floors,index:i}}));
 }
 const columns=new T.InstancedMesh(new T.BoxGeometry(.6,height,.6),concrete,4);columns.name='Interior load bearing columns';root.add(columns);
 for(let i=0;i<4;i++){
  const p=new T.Vector3((i%2?1:-1)*w*.22,0,(i<2?1:-1)*d*.22).applyQuaternion(q);p.add(new T.Vector3(body.x,(body.bottom+body.top)/2,body.z));matrix.compose(p,q,new T.Vector3(1,1,1));columns.setMatrixAt(i,matrix);
  surface.interior.push(solids.add({x:p.x,z:p.z,w:.6,d:.6,ry:body.ry||0,bottom:body.bottom,top:body.top,interior:true,visual:{mesh:columns,index:i}}));
 }
 if(body.structure)for(const b of surface.interior){b.structure=body.structure;body.structure.bodies.push(b)}
}
