// Eight interleaved architectural families, varied footprint proportions, setbacks,
// courtyards, bridged pairs and garden terraces share the city's material palette.
export function cityArchitect({m,geo,instance,box,cylinder,tree,screen}){
 return function build(p){const {x,z,r,h}=p,kind=p.style??p.seed%8,base=8;
  const roofGarden=(xx,yy,zz,rr)=>{cylinder(m.ivory,xx,yy,zz,rr,1.5);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;tree(xx+Math.sin(a)*(rr-3),yy+.8,zz+Math.cos(a)*(rr-3),.72,i%2===0)}};
  const facade=(xx,zz,w,d,hh,yy=base)=>{box(m.glass,xx,yy+hh/2,zz,w,hh,d);for(let y=yy+7;y<yy+hh;y+=12){box(m.edge,xx,y,zz,w+.16,.27,d+.16)}box(m.ivory,xx,yy+hh,zz,w+1.4,1.2,d+1.4)};
  if(kind===0){ // oval terraced landmark
   for(let k=0;k<3;k++){const rr=r*(1-k*.19),yy=base+k*h*.31;instance(geo.cyl,m.glass,x,yy+h*.155,z,rr,h*.31,rr*.68);cylinder(m.ivory,x,yy+h*.31,z,rr+1,1.5);for(let j=0;j<5;j++)tree(x+Math.sin(j*1.26)*(rr-3),yy+h*.31+1,z+Math.cos(j*1.26)*(rr*.58),.7,true)}
  }else if(kind===1){ // offset paired towers joined by an inhabited skybridge
   facade(x-r*.43,z-r*.16,r*.65,r*.92,h);facade(x+r*.43,z+r*.13,r*.6,r*.82,h*.77);box(m.dark,x,base+h*.58,z,r*1.4,5,7);roofGarden(x+r*.43,base+h*.77+1,z+r*.13,r*.29);
  }else if(kind===2){ // U-shaped courtyard, three heights and a planted open square
   facade(x-r*.63,z,r*.42,r*1.6,h*.5);facade(x+r*.63,z,r*.42,r*1.6,h*.64);facade(x,z-r*.65,r*1.5,r*.4,h*.4);cylinder(m.lawn,x,8.1,z,r*.37,.2);for(let i=0;i<6;i++){const a=i*1.047;tree(x+Math.sin(a)*r*.27,8.2,z+Math.cos(a)*r*.27,1.4)}
  }else if(kind===3){ // staggered rectangular terraces
   for(let k=0;k<4;k++){const w=r*(1.65-k*.27),d=r*(1.2-k*.17),yy=base+k*h*.2,xx=x+k*r*.09;facade(xx,z,w,d,h*.2,yy);for(const side of [-1,1])tree(xx+side*w*.4,yy+h*.2+1,z+d*.32,.8,true)}
  }else if(kind===4){ // circular gallery around a rectangular spire
   cylinder(m.glass,x,base+12,z,r,24);roofGarden(x,base+24,z,r+3);facade(x+r*.12,z-r*.12,r*.77,r*.65,h*.77,base+25);
  }else if(kind===5){ // lower waterfront market with unequal wings
   facade(x-r*.25,z,r*1.4,r*.65,28+h*.12);facade(x+r*.48,z-r*.42,r*.4,r*.9,22+h*.1);for(let i=0;i<5;i++){box(i%2?m.pink:m.gold,x-r*.78+i*r*.3,12,z+r*.4,r*.27,.4,10);tree(x-r*.7+i*r*.31,8,z+r*.67,1.1,true)}
  }else if(kind===6){ // three slender stems over an asymmetric podium
   facade(x,z,r*1.8,r*.75,12);for(let j=0;j<3;j++){const xx=x+(j-1)*r*.58,zz=z+(j%2)*r*.3,rr=r*.2,hh=h*(.56+j*.19);cylinder(m.glass,xx,20+hh/2,zz,rr,hh);roofGarden(xx,20+hh,zz,rr+1.5);for(let y=32;y<20+hh;y+=16)cylinder(m.edge,xx,y,zz,rr+.14,.3)}
  }else{ // L-plan civic hall and cylindrical observatory
   facade(x-r*.3,z,r*.65,r*1.7,h*.38);facade(x+r*.27,z-r*.52,r*1.1,r*.45,h*.24);cylinder(m.glass,x+r*.36,base+h*.32,z+r*.32,r*.34,h*.64);roofGarden(x+r*.36,base+h*.64,z+r*.32,r*.38);
  }
  if((p.seed??0)%3===0){const mounts=[{x,z,depth:r*.68,w:r*.7},{x:x-r*.43,z:z-r*.16,depth:r*.46,w:r*.52},{x:x+r*.63,z,depth:r*.8,w:r*.32},{x,z,depth:r*.6,w:r*.72},{x,z,depth:r,w:r*.6},{x:x-r*.25,z,depth:r*.325,w:r*.7},{x,z,depth:r*.375,w:r*.7},{x:x-r*.3,z,depth:r*.85,w:r*.5}],a=mounts[kind];screen(a.x,base+Math.min(h*.14,15),a.z,a.depth,Math.min(22,a.w),Math.min(18,h*.16),0,p.seed??0)}
 };
}
