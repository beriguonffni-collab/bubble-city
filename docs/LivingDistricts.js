import * as T from './vendor/three.module.js';
import {districtLayout} from './DistrictLayout.js';
import {random} from './Assets.js';
import {inFootprint} from './Footprint.js';
export function buildLivingDistricts({city,solids,core,outer,allLots,landings,layout,m,geo,box,cylinder,instance,tree,screen}){
 const rand=random(73021),promenades=[],piers=[];
 const tiles=document.createElement('canvas');tiles.width=tiles.height=256;const ctx=tiles.getContext('2d');ctx.fillStyle='#abb9b3';ctx.fillRect(0,0,256,256);for(let y=0;y<8;y++)for(let x=0;x<8;x++){const v=190+Math.floor(rand()*28);ctx.fillStyle=`rgb(${v+13},${v+17},${v+7})`;ctx.fillRect(x*32+1,y*32+1,30,30)}const map=new T.CanvasTexture(tiles);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(.08,.08);map.anisotropy=8;const paving=new T.MeshStandardMaterial({map,color:0xc0c9be,roughness:.67});
 for(const [index,rings] of layout.polygons.entries()){
  const shape=new T.Shape(rings[0].map(p=>new T.Vector2(p[0],-p[1])));for(const ring of rings.slice(1))shape.holes.push(new T.Path(ring.map(p=>new T.Vector2(p[0],-p[1]))));
  const geometry=new T.ExtrudeGeometry(shape,{depth:4.8,bevelEnabled:false,curveSegments:1});geometry.rotateX(-Math.PI/2);geometry.translate(0,3,0);
  const mesh=new T.Mesh(geometry,[paving,m.stone]);mesh.name='Connected waterfront district '+index;mesh.userData.physical=true;mesh.receiveShadow=true;city.add(mesh);
  const xs=rings[0].map(p=>p[0]),zs=rings[0].map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  solids.add({x:(minX+maxX)/2,z:(minZ+maxZ)/2,w:maxX-minX,d:maxZ-minZ,footprint:rings,bottom:3,top:7.8,climbable:false,visual:{mesh}});
  // Matching coast collision and solid, rounded coping. There is no ring across the canal entrances.
  for(const ring of rings){let walked=0;for(let j=1;j<ring.length;j++){const a=ring[j-1],b=ring[j],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.05)continue;const ry=Math.atan2(dx,dz),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
   box(m.ivory,x,7.63,z,.65,.35,len+.02,true,ry);solids.add({x,z,w:.15,d:len+.02,ry,bottom:3,top:7.8,visual:{mesh}});
   walked+=len;if(walked>32){walked=0;const inward=new T.Vector2(-dz,dx).normalize();if(!inFootprint(x+inward.x*4,z+inward.y*4,rings))inward.negate();const px=x+inward.x*5,pz=z+inward.y*5;
    if(inFootprint(px,pz,rings)&&!([...core,...outer].some(t=>Math.hypot(px-t.x,pz-t.z)<t.r+8))){promenades.push({x:px,z:pz,ry});cylinder(m.white,px,10.3,pz,.12,5);instance(geo.sphere,m.glow,px,12.85,pz,.4,.16,.4);if(promenades.length%2===0)tree(px+inward.x*5,7.8,pz+inward.y*5,1.1,promenades.length%4===0)}}
  }}
  // Load-bearing piers leave an open, swimmable undercroft under the broad land.
  for(let x=Math.ceil(minX/230)*230;x<maxX;x+=230)for(let z=Math.ceil(minZ/230)*230;z<maxZ;z+=230)if(inFootprint(x,z,rings)&&!([...core,...outer].some(t=>Math.hypot(x-t.x,z-t.z)<t.r+13))){cylinder(m.stone,x,-58,z,4.5,122);cylinder(m.ivory,x,1.5,z,7,3);piers.push({x,z})}
 }

 let shops=0;
 for(const [i,p] of outer.entries()){
  for(let j=0;j<5;j++){const a=j*Math.PI*2/5+(i%5)*.4,r=p.r+10,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;tree(x,7.8,z,1.4,j%2===0)}
  const side=i%2?1:-1,px=p.x+side*(p.r+16),pz=p.z+(i%3-1)*14;
  if(layout.polygons.some(poly=>inFootprint(px+side*18,pz,poly))){
   if(i%3===0){cylinder(m.lawn,px,7.88,pz,17,.16);cylinder(m.ivory,px,8.05,pz,5,.3);cylinder(m.window,px,8.23,pz,4.5,.06)}
   else box(m.lawn,px,7.88,pz,25,.16,40);
   for(let j=0;j<7;j++){const a=j*.897;tree(px+Math.sin(a)*10,7.98,pz+Math.cos(a)*16,1.4+(j%3)*.25,j%3===0)}
  }
  if(i%3===0){const x=p.x,z=p.z+p.r+13;box(m.dark,x,10,z,13,4,6);box(m.window,x,10.15,z+3.08,11.7,2.6,.1);box(i%2?m.pink:m.gold,x,12.45,z+2,15,.35,10);for(const side of [-1,1])cylinder(m.gold,x+side*6.8,10,z+6,.12,4.2);shops++}
 }
 let streets=0;const onLand=(x,z)=>layout.polygons.some(p=>inFootprint(x,z,p));
 for(let gx=-3654;gx<3700;gx+=168)for(let gz=-5344;gz<2000;gz+=168)for(const axis of [0,1]){
  const x=gx+(axis?0:84),z=gz+(axis?84:0),near=allLots.some(p=>Math.abs(x-p.x)<p.r+10&&Math.abs(z-p.z)<p.r+10)||core.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+5);if(near)continue;
  if([-.5,0,.5].every(t=>onLand(x+(axis?0:168*t),z+(axis?168*t:0)))){box(m.road,x,7.84,z,axis?11:168,.08,axis?168:11);box(m.ivory,x,7.895,z,axis?.14:160,.025,axis?160:.14);streets++}
 }
 // Larger planted commons occupy otherwise vacant blocks rather than leaving a white desert.
 let commons=0;for(let x=-3500;x<3600;x+=245)for(let z=-5160;z<1900;z+=245){const r=28+(commons%3)*5;if(allLots.some(p=>Math.hypot(p.x-x,p.z-z)<p.r+r+10)||landings.some(p=>Math.hypot(p.x-x,p.z-z)<r+15)||core.some(p=>Math.hypot(p.x-x,p.z-z)<p.r+r))continue;if(![0,1,2,3].every(i=>onLand(x+Math.sin(i*1.57)*r,z+Math.cos(i*1.57)*r)))continue;
  if(commons%2)box(m.lawn,x,7.88,z,r*1.6,.16,r*1.7);else cylinder(m.lawn,x,7.88,z,r,.16);
  for(let j=0;j<13;j++){const a=j*2.399,rr=Math.sqrt(j/13)*r*.82;tree(x+Math.sin(a)*rr,7.98,z+Math.cos(a)*rr,1.6+(j%4)*.35,j%4===0)}commons++;
 }
 // Infill parks between the original islands create substantial walkable waterfronts.
 for(let col=0;col<4;col++)for(let row=0;row<6;row++)if(row!==2&&row!==5){const a=core[row*4+col],b=core[(row+1)*4+col],z=(a.z+b.z)/2;
  for(const side of [-1,1])for(let j=0;j<6;j++){const x=a.x+side*(30+j%2*10),zz=z+(j-2.5)*13;cylinder(m.ivory,x,8,zz,7,.4);cylinder(m.lawn,x,8.28,zz,6.5,.12);tree(x,8.4,zz,1.65,j%2===0)}
  box(m.ivory,a.x,8.2,z,20,.8,15);box(m.window,a.x,8.66,z,18,.12,13); // reflecting pool, clear central promenade around it
  for(const side of [-1,1]){box(m.gold,a.x+side*20,8.7,z,1,.6,8);box(m.dark,a.x+side*45,10.3,z-28,16,5,8);box(m.window,a.x+side*45,10.5,z-23.9,14,3.1,.12);box(m.pink,a.x+side*45,13.1,z-25,18,.35,13);shops++}
 }
 return{...layout,promenades,piers,shops,streets,commons};
}
