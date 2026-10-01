import './vendor/polygon-clipping.js';
import {inFootprint} from './Footprint.js';
import {random} from './Assets.js';
const pc=globalThis.polygonClipping;
export function polygonArea(polygons){return polygons.reduce((n,p)=>n+p.reduce((s,r,i)=>s+(i?-1:1)*Math.abs(r.reduce((a,v,j)=>{const b=r[(j+1)%r.length];return a+v[0]*b[1]-b[0]*v[1]},0)/2),0),0)}
const ellipse=(x,z,rx,rz=rx)=>[Array.from({length:65},(_,i)=>[x+Math.cos(i*Math.PI/32)*rx,z+Math.sin(i*Math.PI/32)*rz])];
function ribbon(points,width){const a=[],b=[];for(let i=0;i<points.length;i++){const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],dx=next[0]-prev[0],dz=next[1]-prev[1],n=Math.hypot(dx,dz),p=points[i];a.push([p[0]-dz/n*width/2,p[1]+dx/n*width/2]);b.push([p[0]+dz/n*width/2,p[1]-dx/n*width/2])}const ring=[...a,...b.reverse()];ring.push(ring[0]);return[ring]}
export function districtLayout(core=[]){
 const boundary=[[[-3750,-5450],[3750,-5450],[3750,2050],[-3750,2050],[-3750,-5450]]],routes=[];
 for(const [j,x] of [-3100,-2330,-1560,-800,0,800,1560,2330,3100].entries())routes.push({kind:'avenue',points:Array.from({length:49},(_,i)=>{const z=-5280+i*7160/48,meander=x===0&&z>-2250&&z<650?0:Math.sin(z*.0019+j*.7)*90+Math.sin(z*.004+j)*24;return[x+meander,z]})});
 for(const [j,z] of [-4770,-3960,-3160,-2360,-1630,-760,550,1300].entries())routes.push({kind:'cross',points:Array.from({length:49},(_,i)=>{const x=-3580+i*7160/48;return[x,z+Math.sin(x*.002+j*.8)*82]})});
 for(const x of [-295,295])routes.push({kind:'harbor',points:[[x,-2270],[x,680]]});
 const reserves=core.map(p=>ellipse(p.x,p.z,p.r+5));
 function waterAt(width){const paths=routes.map(r=>ribbon(r.points,r.kind==='harbor'?56:width));const basins=[ellipse(-640,760,215,170),ellipse(720,-1210,200,160),ellipse(-1690,-3350,180,225),ellipse(2310,-4350,200,170)];let water=pc.union(...paths,...basins);water=pc.difference(water,...reserves);return pc.intersection(boundary,water)}
 let lo=60,hi=145,water;for(let i=0;i<9;i++){const mid=(lo+hi)/2;water=waterAt(mid);if(polygonArea(water)/56250000>.2)hi=mid;else lo=mid}
 water=waterAt((lo+hi)/2);const polygons=pc.difference(boundary,water),area=polygonArea(polygons);
 return{polygons,water,routes,canalWidth:(lo+hi)/2,links:routes.length,area,landFraction:area/56250000};
}
export function urbanLots(layout){const rand=random(445503),lots=[],onLand=(x,z)=>layout.polygons.some(p=>inFootprint(x,z,p));for(let z=-5260;z<1920;z+=168)for(let x=-3570;x<3650;x+=168){const px=x+(rand()-.5)*70,pz=z+(rand()-.5)*70,r=26+rand()*29;if(Math.abs(px)<620&&pz>-2080&&pz<510)continue;if(!Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return onLand(px+Math.sin(a)*(r+19),pz+Math.cos(a)*(r+19))}).every(Boolean))continue;lots.push({x:px,z:pz,r,h:35+Math.pow(rand(),1.3)*260,style:Math.floor(rand()*8),seed:lots.length})}return lots}

export function infillLots(layout,primary,landings=[]){const rand=random(290414),lots=[],onLand=(x,z)=>layout.polygons.some(p=>inFootprint(x,z,p));for(let z=-5280;z<1960;z+=91)for(let x=-3600;x<3680;x+=91){const px=x+(rand()-.5)*22,pz=z+(rand()-.5)*22,r=11+rand()*9;if(Math.abs(px)<610&&pz>-2060&&pz<490)continue;if(primary.some(p=>Math.hypot(px-p.x,pz-p.z)<p.r+r+19)||landings.some(p=>Math.hypot(px-p.x,pz-p.z)<r+22))continue;if(![0,1,2,3].every(i=>onLand(px+Math.sin(i*Math.PI/2)*(r+10),pz+Math.cos(i*Math.PI/2)*(r+10))))continue;lots.push({x:px,z:pz,r,h:18+rand()*34,style:[2,3,5,7][Math.floor(rand()*4)],seed:lots.length+3000,small:true})}return lots}
