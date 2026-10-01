import * as T from './vendor/three.module.js';
import {inFootprint} from './Footprint.js';

// A straight, parallel-to-bank stair with a submerged toe and a broad top
// landing. The landing crosses the coping at street height, never through it.
export function buildCanalStairs({layout,solids,box,cylinder,m,city=new T.Group(),landings=[]}){
 const exits=[];
 for(const rings of layout.polygons)for(const ring of rings)for(let j=1;j<ring.length;j++){
  const a=ring[j-1],b=ring[j],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  if(length<48)continue;
  const tx=dx/length,tz=dz/length,mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
  if(Math.abs(mx)>3630||mz>1930||mz< -5330||exits.some(e=>Math.hypot(e.top.x-mx,e.top.z-mz)<270)||landings.some(e=>Math.hypot(e.x-mx,e.z-mz)<28))continue;
  let nx=-tz,nz=tx;if(!inFootprint(mx+nx*2,mz+nz*2,rings)){nx=-nx;nz=-nz}
  const top={x:mx-nx*5+tx*18,y:7.96,z:mz-nz*5+tz*18},toe={x:top.x-tx*39,y:-2.3,z:top.z-tz*39};
  const shore={x:top.x+nx*10,y:7.96,z:top.z+nz*10};
  if(!inFootprint(shore.x,shore.z,rings)||!solids.clear({...shore,y:9.7}))continue;
  let clear=true;for(let i=0;i<=20;i++){const t=i/20,x=toe.x+(top.x-toe.x)*t,z=toe.z+(top.z-toe.z)*t,y=toe.y+(top.y-toe.y)*t;for(const side of [-1,0,1]){const p={x:x+nx*side*3.1,z:z+nz*side*3.1,y:y+1.7};if(!solids.clear(p))clear=false}}
  if(!clear)continue;
  const ry=Math.atan2(tx,tz),steps=58,run=39/steps,rise=(top.y-toe.y)/steps;
  // Real risers and treads; one continuous support plane prevents camera jitter.
  for(let k=0;k<steps;k++){const t=(k+.5)/steps,y=toe.y+(k+1)*rise;
   box(m.ivory,toe.x+tx*39*t,y-.22,toe.z+tz*39*t,6,.44,run+.008,true,ry);
  }
  const body=solids.add({x:(toe.x+top.x)/2,z:(toe.z+top.z)/2,w:6,d:39,ry,top:top.y,bottom:toe.y-.44,slope:[toe,top],thickness:.44,waterExit:true,climbable:false});
  // Identify the tread bodies so swimming can step onto the first wet tread.
  for(const b of solids.nearby(body,45))if(b.visual?.batch?.mat===m.ivory&&b.w===6&&Math.abs(b.d-run-.008)<.001)b.waterExit=true;
  // The level landing begins AFTER the last riser; centering it on the
  // last riser put a 79 cm wall across the final four steps.
  box(m.ivory,(top.x+shore.x)/2+tx*3,7.74,(top.z+shore.z)/2+tz*3,6,.44,16,true,Math.atan2(nx,nz));
  for(const side of [-1,1])for(let k=0;k<=13;k++){const t=k/13,x=toe.x+tx*39*t+nx*side*3.05,z=toe.z+tz*39*t+nz*side*3.05,y=toe.y+(top.y-toe.y)*t;cylinder(m.edge,x,y+.52,z,.08,1.05)}
  for(const side of [-1,1]){const a=new T.Vector3(toe.x+nx*side*3.05,toe.y+1.06,toe.z+nz*side*3.05),b=new T.Vector3(top.x+nx*side*3.05,top.y+1.06,top.z+nz*side*3.05);
   const rail=new T.Mesh(new T.CylinderGeometry(.07,.07,a.distanceTo(b),8),m.edge);rail.position.copy(a).add(b).multiplyScalar(.5);rail.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());rail.userData.physical=true;city.add(rail);
   solids.add({x:rail.position.x,z:rail.position.z,w:.14,d:39,ry,top:b.y+.07,bottom:a.y-.07,slope:[{x:a.x,y:a.y+.07,z:a.z},{x:b.x,y:b.y+.07,z:b.z}],thickness:.14,climbable:false,visual:{mesh:rail}});rail.updateMatrix();rail.geometry.applyMatrix4(rail.matrix);rail.position.set(0,0,0);rail.quaternion.identity();rail.userData.mergeStructure=true;
  }
  for(const t of [0,.5,1]){const x=toe.x+(top.x-toe.x)*t,z=toe.z+(top.z-toe.z)*t,y=toe.y+(top.y-toe.y)*t;cylinder(m.stone,x,(-120+y-.7)/2,z,.65,y+119.3)}
  cylinder(m.gold,shore.x+tx*3.6,10,shore.z+tz*3.6,.13,4.4);cylinder(m.glow,shore.x+tx*3.6,12.2,shore.z+tz*3.6,.38,.6);
  exits.push({toe,top:{...top,x:top.x+tx*3,z:top.z+tz*3},shore:{...shore,x:shore.x+tx*3,z:shore.z+tz*3},tx,tz});
 }
 return exits;
}
