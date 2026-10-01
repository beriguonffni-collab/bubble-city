import * as T from './vendor/three.module.js';
import {meshContact} from './ClimbSurface.js';
// Conservative oriented bounds for solid props, updated in the same spatial hash
// as architecture. Effects (wake, particles, atmosphere) never enter this path.
export function createSceneCollisions(solids){
 const entries=[],seen=new WeakSet(),scale=new T.Vector3(),quaternion=new T.Quaternion(),translation=new T.Vector3(),unrotate=new T.Matrix4(),aligned=new T.Matrix4(),bounds=new T.Box3(),center=new T.Vector3(),size=new T.Vector3(),rotate=new T.Matrix4(),updated=new Set(),prepared=new Set();
 function refresh(entry,initial=false){if(entry.body.destroyed)return;const {body,matrix}=entry;if(entry.object){if(!prepared.has(entry.body.carrier)&&!updated.has(entry.object)){entry.object.updateWorldMatrix(true,false);updated.add(entry.object)}if(!initial&&matrix.equals(entry.object.matrixWorld))return;matrix.copy(entry.object.matrixWorld)}matrix.decompose(translation,quaternion,scale);const e=matrix.elements,yaw=Math.atan2(e[8],e[10]);unrotate.makeRotationY(-yaw);aligned.multiplyMatrices(unrotate,matrix);bounds.copy(entry.localBounds).applyMatrix4(aligned);bounds.getCenter(center);bounds.getSize(size);center.applyMatrix4(rotate.makeRotationY(yaw));Object.assign(body,{x:center.x,z:center.z,w:Math.max(.02,size.x),d:Math.max(.02,size.z),ry:yaw,top:bounds.max.y,bottom:bounds.min.y});if(initial)solids.add(body);else solids.reindex(body);}
 function geometry(g,matrix,visual={},object=null,carrier=null){if(!g.boundingBox)g.computeBoundingBox();const body={visual,carrier,dynamic:!!object},entry={geometry:g,matrix:matrix.clone(),localBounds:g.boundingBox.clone(),body,object};body.contactAt=(p,n)=>{const m=entry.object?(entry.object.updateWorldMatrix(true,false),entry.object.matrixWorld):entry.matrix;return meshContact(g,m)(p,n)};refresh(entry,true);if(object)entries.push(entry);return body}
 function mesh(object,carrier=null){if(seen.has(object)||object.userData.runtimeOnly||object.userData.physical)return;seen.add(object);if(!object.isMesh||object.isInstancedMesh)return;object.updateWorldMatrix(true,false);
  if(object.geometry.userData.hull){
   const g=object.geometry,a=g.attributes.position,sections=36,stride=33;
   for(let i=0;i<sections;i+=2){const local=new T.Box3();for(let j=i*stride;j<=Math.min(a.count-1,(i+2)*stride+stride-1);j++)local.expandByPoint(new T.Vector3().fromBufferAttribute(a,j));const proxy=g.clone();proxy.boundingBox=local;geometry(proxy,object.matrixWorld,{mesh:object},object,carrier)}
  }else geometry(object.geometry,object.matrixWorld,{mesh:object},carrier?object:null,carrier);
 }
 function hierarchy(root,dynamic=false){root.updateWorldMatrix(true,true);root.traverse(o=>mesh(o,dynamic?root:null))}
 function instance(g,matrix,visual){return geometry(g,matrix,visual)}
 function update(position){updated.clear();prepared.clear();const distant=new Set();for(const e of entries){const carrier=e.body.carrier;if(carrier&&!prepared.has(carrier)&&!distant.has(carrier)){carrier.updateWorldMatrix(true,false);const a=carrier.matrixWorld.elements;if(position&&Math.hypot(a[12]-position.x,a[13]-position.y,a[14]-position.z)>240){distant.add(carrier)}else{carrier.updateWorldMatrix(false,true);prepared.add(carrier)}}if(!distant.has(carrier)||(position&&Math.hypot(e.body.x-position.x,(e.body.top+e.body.bottom)/2-position.y,e.body.z-position.z)<80))refresh(e)}}
 function audit(roots){let meshes=0,instances=0,effects=0;const missing=[],visited=new Set();for(const root of roots)root.traverse(o=>{if(!o.isMesh||visited.has(o))return;visited.add(o);if(o.userData.runtimeOnly){effects++;return}meshes++;if(o.isInstancedMesh){instances+=o.count;if(o.userData.collisionInstances!==o.count)missing.push(o.name||o.uuid)}else if(!seen.has(o)&&!o.userData.physical)missing.push(o.name||o.uuid)});return{meshes,instances,effects,missing,pass:missing.length===0}}
 return{instance,hierarchy,update,entries,audit};
}
