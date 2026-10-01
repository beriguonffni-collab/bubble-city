import * as T from './vendor/three.module.js';
import {OCEAN,contain} from './Physics.js';
const point=p=>new T.Vector3(p.x,p.y,p.z);
const material=new T.MeshBasicMaterial({side:T.DoubleSide});
const directions=[new T.Vector3(0,-1,0),new T.Vector3(0,1,0),new T.Vector3(1,0,0),new T.Vector3(-1,0,0),new T.Vector3(0,0,1),new T.Vector3(0,0,-1)];
export const packSurface=hit=>({point:{x:hit.point.x,y:hit.point.y,z:hit.point.z},normal:{x:hit.normal.x,y:hit.normal.y,z:hit.normal.z},kind:hit.kind});

// The same surface query is used by pings, favorites and coordinate editing.
// Grid traversal visits every crossed collision cell, including diagonal corners.
export function createSurfaceTarget(world){
 const solids=world.solids,proxy=new T.Mesh(undefined,material),matrix=new T.Matrix4(),normalMatrix=new T.Matrix3();
 const extras=[];world.city?.traverse(mesh=>{if(mesh.isMesh&&!mesh.isInstancedMesh&&mesh.userData.physical&&!mesh.userData.runtimeOnly)extras.push(mesh)});
 function cast(input,maxDistance=12000){
  const ray=new T.Raycaster();ray.ray.copy(input);ray.near=.00001;ray.far=maxDistance;let best=null;
  const offer=(p,n,kind,distance)=>{if(distance<ray.near||distance>ray.far||best&&distance>=best.distance)return;if(n.dot(input.direction)>0)n.negate();best={point:p.clone(),normal:n.clone().normalize(),kind,distance};ray.far=distance};
  // The actual six enclosing surfaces, not a point arbitrarily placed in space.
  for(const [axis,value,n] of [['x',-OCEAN.half,[1,0,0]],['x',OCEAN.half,[-1,0,0]],['z',OCEAN.z-OCEAN.half,[0,0,1]],['z',OCEAN.z+OCEAN.half,[0,0,-1]],['y',OCEAN.floor,[0,1,0]],['y',OCEAN.ceiling,[0,-1,0]]]){
   if(Math.abs(input.direction[axis])<1e-9)continue;const d=(value-input.origin[axis])/input.direction[axis],p=input.at(d,new T.Vector3());if(Math.abs(p.x)<=OCEAN.half+.001&&Math.abs(p.z-OCEAN.z)<=OCEAN.half+.001&&p.y>=OCEAN.floor-.001&&p.y<=OCEAN.ceiling+.001)offer(p,new T.Vector3(...n),value===OCEAN.floor&&axis==='y'?'seabed':'boundary',d);
  }
  if(Math.abs(input.direction.y)>1e-9){const d=-input.origin.y/input.direction.y,p=input.at(d,new T.Vector3());if(solids.water({...p,y:.3}))offer(p,new T.Vector3(0,1,0),'water',d)}
  const checked=new Set(),checkedMesh=new Set();
  function hitMesh(mesh,geometry,instance){
   mesh.updateWorldMatrix(true,false);proxy.geometry=geometry||mesh.geometry;
   if(mesh.isInstancedMesh){if(!Number.isInteger(instance))return;mesh.getMatrixAt(instance,matrix);proxy.matrixWorld.multiplyMatrices(mesh.matrixWorld,matrix)}else proxy.matrixWorld.copy(mesh.matrixWorld);
   const hits=[];proxy.raycast(ray,hits);normalMatrix.getNormalMatrix(proxy.matrixWorld);
   for(const hit of hits)if(!mesh.destructionCuts?.contains(hit.point))offer(hit.point,hit.face.normal.clone().applyMatrix3(normalMatrix),'solid',hit.distance);
  }
  let cx=Math.floor(input.origin.x/100),cz=Math.floor(input.origin.z/100),t=0;
  const dx=input.direction.x,dz=input.direction.z,sx=Math.sign(dx),sz=Math.sign(dz),stepX=dx?100/Math.abs(dx):Infinity,stepZ=dz?100/Math.abs(dz):Infinity;
  let tx=dx?((cx+(sx>0?1:0))*100-input.origin.x)/dx:Infinity,tz=dz?((cz+(sz>0?1:0))*100-input.origin.z)/dz:Infinity;
  for(let cells=0;cells<500&&t<=ray.far;cells++){
   for(const body of solids.nearby({x:(cx+.5)*100,z:(cz+.5)*100})){
    if(body.destroyed||checked.has(body))continue;checked.add(body);const v=body.visual,mesh=body.damageMesh||v?.batch?.mesh||v?.mesh;if(!mesh)continue;
    const key=mesh.uuid+':'+(v.index??'');if(checkedMesh.has(key))continue;checkedMesh.add(key);hitMesh(mesh,body.damageMesh?mesh.geometry:v.batch?.g,body.damageMesh?undefined:v.index);
   }
   if(!Number.isFinite(Math.min(tx,tz)))break;
   t=Math.min(tx,tz);if(tx<=tz){cx+=sx;tx+=stepX}else{cz+=sz;tz+=stepZ}
  }
  // Physical bridge ribbons/rails are merged for rendering. Their precise meshes
  // supplement the collision instances without raycasting the entire city.
  for(const mesh of extras)if(!mesh.userData.fracturedOriginal&&!checkedMesh.has(mesh.uuid+':'))hitMesh(mesh);
  return best;
 }
 function look(camera){camera.updateMatrixWorld();const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(),camera);return cast(ray.ray)}
 function nearest(p,normal={x:0,y:1,z:0}){
  const origin=point(p),preferred=point(normal).normalize().negate(),rays=[preferred,...directions];let best=null,distance=Infinity;
  for(const d of rays){const hit=cast(new T.Ray(origin.clone().addScaledVector(d,-.02),d));if(hit){const gap=origin.distanceTo(hit.point);if(gap<distance){distance=gap;best=hit}if(gap<.001)break}}return best;
 }
 function fromPose(p,yaw,pitch){const direction=new T.Vector3(0,0,-1).applyEuler(new T.Euler(pitch,yaw,0,'YXZ'));return cast(new T.Ray(point(p),direction))}
 return{cast,look,nearest,fromPose};
}

// A marker sits on the hit point; the player's eye needs separate body clearance.
export function surfaceArrival(hit,solids){
 const p=point(hit.point),n=point(hit.normal).normalize();
 const lift=hit.kind==='water'?(n.y>0?.6:-.4):n.y>.45?1.7:n.y<-.45?-.25:.8;
 for(const gap of [0,.45,.8,1.5,3,6]){const candidate=p.clone().addScaledVector(n,gap);candidate.y+=lift;contain(candidate);if(candidate.distanceTo(p)<9&&solids.clear(candidate))return{x:candidate.x,y:candidate.y,z:candidate.z}}
 return null;
}
