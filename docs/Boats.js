import {worldDepth} from './WorldDepth.js';
import * as T from './vendor/three.module.js';
import {deckMaterial,microSurface} from './Surfaces.js';
function hullGeometry(){const verts=[],uv=[],idx=[],N=36,R=32;for(let i=0;i<=N;i++){const u=i/N,x=-6.5+u*14.5,beam=2.9*Math.pow(Math.sin(Math.PI*(.13+u*.87)),.55)+.035;for(let j=0;j<=R;j++){const a=j/R*Math.PI*2;verts.push(x,Math.sin(a)>0?.55+Math.sin(a)*.48:-Math.pow(-Math.sin(a),.72)*1.7,Math.cos(a)*beam);uv.push(u,j/R);if(i<N&&j<R){const k=i*(R+1)+j;idx.push(k,k+R+1,k+1,k+1,k+R+1,k+R+2)}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.userData.hull=true;return g}
function rounded(w,h,d,r=.2){const x=-w/2,y=-h/2,s=new T.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.07,bevelThickness:.07,curveSegments:8});g.translate(0,0,-d/2);return g}
export function boatFactory(){
 const paint=new T.MeshPhysicalMaterial({color:'#f6f2df',roughness:.23,metalness:.18,clearcoat:1,clearcoatRoughness:.07});microSurface(paint,.035);
 const glass=new T.MeshPhysicalMaterial({color:'#6cc6d6',roughness:.08,metalness:.12,transparent:true,opacity:.28,side:T.DoubleSide,depthWrite:false,clearcoat:1});
 const metal=new T.MeshStandardMaterial({color:'#d5e7e9',metalness:.9,roughness:.2}),dark=new T.MeshStandardMaterial({color:'#183d4e',roughness:.52}),fabric=new T.MeshStandardMaterial({color:'#4da6aa',roughness:.88}),light=new T.MeshStandardMaterial({color:'#adfff2',emissive:'#42d8c2',emissiveIntensity:.8});
 const timber=typeof document==='undefined'?new T.MeshStandardMaterial({color:'#b99b70'}):deckMaterial();if(timber.map)timber.map.repeat.set(.1,.23);
 const hull=hullGeometry(),unit=new T.BoxGeometry(1,1,1);
 // Close both swept ends. The former hull was an open tube at its transom.
 const pos=hull.attributes.position,vertices=Array.from(pos.array),uvs=Array.from(hull.attributes.uv.array),indices=Array.from(hull.index.array);
 for(const end of [0,36]){const center=vertices.length/3;vertices.push(pos.getX(end*33),-.2,0);uvs.push(end/36,.5);for(let j=0;j<32;j++){const a=end*33+j,b=a+1;indices.push(center,...(end?[a,b]:[b,a]))}}
 hull.setAttribute('position',new T.Float32BufferAttribute(vertices,3));hull.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));hull.setIndex(indices);hull.computeVertexNormals();
 function part(parent,name,g,mat,x,y,z,sx=1,sy=1,sz=1){const o=new T.Mesh(g,mat);o.name=name;o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;parent.add(o);return o}
 const roundedCache=new Map();function box(p,n,m,x,y,z,w,h,d){if(m===fabric||n==='Helm console'||n==='Cabin roof'){const key=[w,h,d].join(',');if(!roundedCache.has(key))roundedCache.set(key,rounded(w,h,d,Math.min(.16,h*.3,w*.2)));return part(p,n,roundedCache.get(key),m,x,y,z)}return part(p,n,unit,m,x,y,z,w,h,d)}
 function tube(p,n,points,r=.035){return part(p,n,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),24,r,6,false),metal,0,0,0)}
 return function createBoat(index=0){
  const root=new T.Group();root.name='Pearl-class canal yacht '+String(index+1).padStart(2,'0');const lod=new T.LOD(),high=new T.Group(),low=new T.Group();root.add(lod);
  part(high,'Sealed displacement hull',hull,paint,0,0,0);part(low,'Distant yacht hull',hull,paint,0,0,0);
  box(high,'Continuous teak deck',timber,-.5,1.07,0,11.6,.18,4.9);
  box(high,'Closed stern transom',paint,-6.48,.35,0,.18,1.4,3.6);
  // A low bathing platform and four human-sized steps lead onto the aft deck.
  box(high,'Boarding swim platform',timber,-7.15,-.15,0,1.3,.2,3.2);
  for(let i=0;i<5;i++)box(high,'Stern boarding step '+i,paint,-7.4+i*.33,-.12+i*.24,0,.38,.16,1.5);
  // 2.48 m clear cabin headroom, 1.6 m aft doorway, 1.25 m central aisle.
  for(const side of [-1,1]){
   box(high,'Cabin lower coaming',paint,-.6,1.36,side*1.98,7,.4,.14);
   box(high,'Panoramic side glazing',glass,-.6,2.54,side*1.98,7,1.92,.065);
   for(let x=-4.1;x<3.1;x+=1.4)box(high,'Window mullion',metal,x,2.48,side*2,.045,2.42,.08);
   box(high,'Aft door surround',paint,-4.14,2.32,side*1.4,.16,2.4,1.2);
   box(high,'Lounge seat cushion',fabric,-1.6,1.64,side*1.26,3.7,.28,.72);
   box(high,'Lounge backrest',fabric,-1.6,2.02,side*1.62,3.7,.68,.16);
   box(high,'Lounge seat plinth',paint,-1.6,1.37,side*1.26,3.7,.28,.65);
   // Rail openings at the aft boarding steps stay clear.
   tube(high,'Safety rail',[[-5.9,2.06,side*2.36],[-3,2.06,side*2.58],[3.7,2.06,side*2.2],[6.35,1.65,side*.65]]);
   for(let x=-5.5;x<4;x+=1.8)part(high,'Rail stanchion',new T.CylinderGeometry(.028,.028,.9,6),metal,x,1.62,side*(x>2?2.15:2.43));
   box(high,'Navigation strip',light,-.7,.45,side*2.72,8.5,.07,.035);
   box(high,'Aft lounge',fabric,-5.3,1.55,side*1.65,1.2,.75,.65);
  }
  box(high,'Forward windscreen',glass,2.94,2.57,0,.075,2.02,3.9);
  box(high,'Cabin roof',paint,-.58,3.76,0,7.6,.22,4.32);
  box(low,'Distant cabin',glass,-.58,2.45,0,7.2,2.5,4);box(low,'Distant roof',paint,-.58,3.76,0,7.6,.22,4.32);
  box(high,'Helm console',dark,1.95,1.76,0,.66,1.2,1.15);
  const display=box(high,'Turquoise chart display',light,1.7,2.23,0,.025,.27,.7);display.rotation.z=-.25;
  const wheel=part(high,'Captain steering wheel',new T.TorusGeometry(.25,.026,8,32),metal,1.51,2.12,0);wheel.rotation.y=Math.PI/2;
  for(let j=0;j<3;j++){const spoke=box(high,'Wheel spoke',metal,1.51,2.12,0,.025,.48,.023);spoke.rotation.x=j*Math.PI/3}
  box(high,'Helm footrest',metal,1.36,1.3,0,.12,.12,.7);
  box(high,'Bow sun cushion',fabric,4.5,1.28,0,2.25,.25,2.8);
  part(high,'Radar mast',new T.CylinderGeometry(.055,.08,.9,8),metal,-2.4,4.22,0);
  const radar=part(high,'Radar dome',new T.SphereGeometry(.4,16,8),paint,-2.4,4.7,0);radar.scale.y=.4;
  for(const side of [-1,1]){const prop=part(high,'Propeller shaft',new T.CylinderGeometry(.12,.12,.6,8),metal,-6.4,-.8,side*.8);prop.rotation.z=Math.PI/2;part(high,'Propeller',new T.TorusGeometry(.3,.07,5,12),dark,-6.7,-.8,side*.8).rotation.y=Math.PI/2}
  lod.addLevel(high,0);lod.addLevel(low,260);
  const wakeMat=new T.ShaderMaterial(worldDepth({uniforms:{time:{value:0},power:{value:0}},transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float time,power;varying vec2 vUv;void main(){float x=vUv.x*2.-1.,y=vUv.y;float width=.08+y*.78;float edge=exp(-pow((abs(x)-width)*25.,2.));float ripples=.5+.5*sin(y*95.-time*6.+x*10.);float body=exp(-x*x/(.005+y*.12))*.22;gl_FragColor=vec4(.78,.98,1.,(edge*ripples+body)*(1.-y)*.65*power);}'}));
  const wake=part(root,'Foam wake',new T.PlaneGeometry(17,38),wakeMat,-24,-.76,0);wake.rotation.x=-Math.PI/2;wake.rotation.z=-Math.PI/2;wake.userData.runtimeOnly=true;
  const boat={mesh:root,high,low,lod,wheel,speed:0,manual:false,destroyed:false,helm:new T.Vector3(.7,2.86,0),boarding:new T.Vector3(-5.4,2.86,0),wake(t,speed=0){wakeMat.uniforms.time.value=t;wakeMat.uniforms.power.value=Math.min(1,Math.abs(speed)/16);wake.visible=!boat.destroyed&&Math.abs(speed)>.2}};
  high.boat=boat;root.boat=boat;root.userData.detail='14.5 m sealed hull; walk-in 2.48 m cabin, 1.6 m doorway, teak aft deck, helm and boarding steps';return boat;
 };
}
