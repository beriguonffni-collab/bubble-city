import * as T from './vendor/three.module.js';

// A breached mesh is a collection of remaining surfaces, not a filled primitive.
// Build this narrow-phase tree lazily, only for damaged geometry; intact scenery
// keeps the inexpensive analytic broad phase. Moving vessels invalidate it.
export function damagedCollision(mesh,cuts){
 let tree=null,lastMatrix=new T.Matrix4();
 const start=new T.Vector3(),end=new T.Vector3(),point=new T.Vector3(),onRay=new T.Vector3(),onEdge=new T.Vector3(),axis=new T.Ray(new T.Vector3(),new T.Vector3(0,1,0)),bounds=new T.Box3();
 const radius=.3,radiusSq=radius*radius;
 function build(items){
  const box=new T.Box3();for(const item of items)box.union(item.box);
  if(items.length<=12)return{box,items};
  const size=box.getSize(new T.Vector3()),axis=size.x>size.y&&size.x>size.z?'x':size.y>size.z?'y':'z';
  items.sort((a,b)=>(a.box.min[axis]+a.box.max[axis])-(b.box.min[axis]+b.box.max[axis]));
  const mid=items.length>>1;return{box,left:build(items.slice(0,mid)),right:build(items.slice(mid))};
 }
 function prepare(){
  mesh.updateWorldMatrix(true,false);if(tree&&lastMatrix.equals(mesh.matrixWorld))return;
  const g=mesh.geometry,a=g.attributes.position,index=g.index,items=[];
  for(let i=0;i<(index?index.count:a.count);i+=3){
   const vertices=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(a,index?index.getX(i+k):i+k).applyMatrix4(mesh.matrixWorld));
   const triangle=new T.Triangle(...vertices);if(triangle.getArea()<1e-10)continue;
   items.push({triangle,box:new T.Box3().setFromPoints(vertices)});
  }
  tree=build(items);lastMatrix.copy(mesh.matrixWorld);
 }
 function uncut(p){return !cuts.contains(p,radius)}
 function touches(triangle){
  triangle.closestPointToPoint(start,point);if(point.distanceToSquared(start)<radiusSq&&uncut(point))return true;
  triangle.closestPointToPoint(end,point);if(point.distanceToSquared(end)<radiusSq&&uncut(point))return true;
  if(axis.intersectTriangle(triangle.a,triangle.b,triangle.c,false,point)&&point.y<=end.y&&uncut(point))return true;
  for(const [a,b] of [[triangle.a,triangle.b],[triangle.b,triangle.c],[triangle.c,triangle.a]]){
   const d=axis.distanceSqToSegment(a,b,onRay,onEdge);
   if(d<radiusSq&&onRay.y<=end.y&&uncut(onEdge))return true;
  }
  return false;
 }
 function visit(node){if(!node.box.intersectsBox(bounds))return false;return node.items?node.items.some(t=>t.box.intersectsBox(bounds)&&touches(t.triangle)):visit(node.left)||visit(node.right)}
 const floorRay=new T.Ray(new T.Vector3(),new T.Vector3(0,-1,0)),normal=new T.Vector3();
 function floorVisit(node,best){
  if(floorRay.origin.x<node.box.min.x||floorRay.origin.x>node.box.max.x||floorRay.origin.z<node.box.min.z||floorRay.origin.z>node.box.max.z||node.box.min.y>floorRay.origin.y||node.box.max.y<best)return best;
  if(!node.items)return floorVisit(node.right,floorVisit(node.left,best));
  for(const {triangle} of node.items){
   if(triangle.getNormal(normal).y<=.25)continue;
   if(floorRay.intersectTriangle(triangle.a,triangle.b,triangle.c,false,point)&&point.y>best&&!cuts.contains(point,.31))best=point.y;
  }
  return best;
 }
 return{
  overlap(p){prepare();start.set(p.x,p.y-1.35,p.z);end.set(p.x,p.y-.3,p.z);axis.origin.copy(start);bounds.set(start,end).expandByScalar(radius);return visit(tree)},
  floorAt(p,ceiling){prepare();floorRay.origin.set(p.x,ceiling+.01,p.z);return floorVisit(tree,-Infinity)}
 };

}
