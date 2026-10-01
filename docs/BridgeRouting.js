// Route each span around existing architecture before generating its mesh.
// The same clearance includes both sidewalks, not only the road center.
export function routeBridge(points,width,solids){
 const pad=width/2+1.2;
 const blocked=(x,z,y)=>solids.nearby({x,z},pad).some(b=>!b.bridgePart&&!b.dynamic&&!b.slope&&b.top>y+.08&&b.bottom<y+3&&solids.horizontal({x,z},b,pad));
 const open=p=>!blocked(p[0],p[2],p[1]);
 const anchors=points.map(p=>{if(open(p))return p.slice();for(let r=8;r<130;r+=8)for(let i=0;i<24;i++){const a=i*Math.PI/12,q=[p[0]+Math.cos(a)*r,p[1],p[2]+Math.sin(a)*r];if(open(q))return q}return p.slice()});
 const result=[anchors[0]];
 for(let k=1;k<anchors.length;k++){
  const a=anchors[k-1],b=anchors[k],len=Math.hypot(b[0]-a[0],b[2]-a[2]);
  const lineOpen=(p,q)=>{const n=Math.ceil(Math.hypot(q[0]-p[0],q[2]-p[2])/3);for(let i=0;i<=n;i++){const t=i/n;if(!open([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,p[2]+(q[2]-p[2])*t]))return false}return true};
  if(lineOpen(a,b)){result.push(b);continue}
  const cell=8,dx=b[0]-a[0],dz=b[2]-a[2],height=(x,z)=>a[1]+(b[1]-a[1])*Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/(len*len||1)));
  const queue=[{ix:0,iz:0,x:a[0],z:a[2],g:0,f:len,parent:null}],best=new Map([['0,0',0]]);let goal=null;
  for(let count=0;queue.length&&count<18000;count++){
   let i=0;for(let j=1;j<queue.length;j++)if(queue[j].f<queue[i].f)i=j;const n=queue.splice(i,1)[0];
   if(Math.hypot(n.x-b[0],n.z-b[2])<12&&lineOpen([n.x,height(n.x,n.z),n.z],b)){goal=n;break}
   for(const [ox,oz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const ix=n.ix+ox,iz=n.iz+oz,x=a[0]+ix*cell,z=a[2]+iz*cell,g=n.g+Math.hypot(ox,oz)*cell,key=ix+','+iz;
    if(x<Math.min(a[0],b[0])-150||x>Math.max(a[0],b[0])+150||z<Math.min(a[2],b[2])-150||z>Math.max(a[2],b[2])+150||(best.get(key)??Infinity)<=g)continue;
    if(!lineOpen([n.x,height(n.x,n.z),n.z],[x,height(x,z),z]))continue;
    best.set(key,g);queue.push({ix,iz,x,z,g,f:g+Math.hypot(x-b[0],z-b[2]),parent:n});
   }
  }
  if(!goal){result.push(b);continue}
  const path=[b];for(let n=goal;n;n=n.parent)path.push([n.x,height(n.x,n.z),n.z]);path.reverse();
  let i=0;while(i<path.length-1){let j=path.length-1;while(j>i+1&&!lineOpen(path[i],path[j]))j--;result.push(path[j]);i=j}
 }
 return result;
}
