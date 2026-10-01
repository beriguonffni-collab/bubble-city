import * as T from './vendor/three.module.js';
const contactMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});

// Raycast the SAME local geometry and transform used by the visible surface.
// Collision envelopes are deliberately conservative; handholds cannot use them.
export function meshContact(geometry,matrix){
 const mesh=new T.Mesh(geometry,contactMaterial);
 mesh.matrixAutoUpdate=false;mesh.matrix.copy(matrix);mesh.updateMatrixWorld(true);
 const ray=new T.Raycaster();
 return(point,normal)=>{
  const n=new T.Vector3(normal.x,0,normal.z).normalize();
  ray.set(new T.Vector3(point.x,point.y,point.z).addScaledVector(n,5),n.clone().negate());ray.far=10;
  const hit=ray.intersectObject(mesh,false)[0];
  if(!hit)return null;
  const face=hit.face.normal.clone().transformDirection(mesh.matrixWorld);
  if(face.dot(n)<0)face.negate();
  return{point:hit.point,normal:face};
 };
}
