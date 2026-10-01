import * as T from './vendor/three.module.js';
// Damage is evaluated inside the struck mesh's own physical material. No lines,
// decals or duplicate facade are drawn in front of it.
export function fractureAtlas(){
 const canvas=document.createElement('canvas');canvas.width=3072;canvas.height=1024;const c=canvas.getContext('2d');c.fillStyle='black';c.fillRect(0,0,3072,1024);
 for(let tier=1;tier<=3;tier++){
  c.save();c.translate((tier-1)*1024,0);c.beginPath();c.rect(0,0,1024,1024);c.clip();let seed=812+tier*341;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const haze=c.createRadialGradient(512,512,0,512,512,160+tier*65);haze.addColorStop(0,`rgb(0,${50+tier*35},0)`);haze.addColorStop(1,'black');c.fillStyle=haze;c.fillRect(0,0,1024,1024);
  const paths=[],count=15+tier*8;
  const line=(a,b,width=1)=>{c.strokeStyle='rgb(255,0,0)';c.lineWidth=width;c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke()};
  for(let j=0;j<count;j++){const angle=j/count*Math.PI*2,length=290+rand()*180,p=[[512,512]];for(let k=1;k<=12;k++){const a=angle+(rand()-.5)*.11,r=length*k/12;p.push([512+Math.cos(a)*r,512+Math.sin(a)*r]);line(p[k-1],p[k],.7+tier*.35);if(k>2&&rand()>.25){const q=a+(rand()>.5?1:-1)*(.3+rand()*.5);line(p[k],[p[k][0]+Math.cos(q)*r*.16,p[k][1]+Math.sin(q)*r*.16],.65)}}paths.push(p)}
  for(let k=2;k<tier*3+2;k++)for(let j=0;j<count;j++)if(rand()>.12){const a=paths[j][k],b=paths[(j+1)%count][k];line(a,b,.7);if(tier>1&&rand()>.45){c.fillStyle=`rgb(0,${30+rand()*100},${40+rand()*150})`;c.beginPath();c.moveTo(...a);c.lineTo(...b);c.lineTo(...paths[j][k-1]);c.closePath();c.fill()}}
  // Densely crushed glass at the strike point, with small irregular facets.
  for(let i=0;i<tier*85;i++){const a=rand()*Math.PI*2,r=Math.pow(rand(),.7)*(25+tier*20),x=512+Math.cos(a)*r,y=512+Math.sin(a)*r,size=2+rand()*9;c.fillStyle=`rgb(${70+rand()*150},${90+rand()*145},${rand()*255})`;c.beginPath();c.moveTo(x-size,y);c.lineTo(x+size*.8,y-size*.5);c.lineTo(x+rand()*size,y+size);c.closePath();c.fill()}
  c.restore();
 }
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.NoColorSpace;texture.anisotropy=4;return texture;
}
export function fractureMaterial(original,atlas){
 const material=original.clone(),points=Array.from({length:32},()=>new T.Vector4()),normals=Array.from({length:32},()=>new T.Vector4()),count={value:0};
 const before=original.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{
  before.call(material,shader,renderer);Object.assign(shader.uniforms,{fractureAtlas:{value:atlas},fractureCount:count,fracturePoints:{value:points},fractureNormals:{value:normals}});
  shader.vertexShader='varying vec3 fractureWorld,fractureNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   fractureWorld=(modelMatrix*vec4(transformed,1.)).xyz;fractureNormal=normalize(mat3(modelMatrix)*normal);`);
  shader.fragmentShader=`uniform sampler2D fractureAtlas;uniform int fractureCount;uniform vec4 fracturePoints[32],fractureNormals[32];varying vec3 fractureWorld,fractureNormal;
   vec3 fractureMask(){vec3 mask=vec3(0.);for(int i=0;i<32;i++){if(i>=fractureCount)break;vec3 n=fractureNormals[i].xyz,delta=fractureWorld-fracturePoints[i].xyz;float radius=fractureNormals[i].w;
    if(dot(normalize(fractureNormal),n)<.25||abs(dot(delta,n))>radius*.7)continue;
    vec3 right=normalize(cross(abs(n.y)>.9?vec3(0.,0.,1.):vec3(0.,1.,0.),n)),up=cross(n,right);vec2 q=vec2(dot(delta,right),dot(delta,up))/(radius*2.)+.5;
    if(any(lessThan(q,vec2(0.)))||any(greaterThan(q,vec2(1.))))continue;
    vec2 uv=vec2((fracturePoints[i].w-1.+q.x)/3.,q.y);vec3 sampleDamage=texture2D(fractureAtlas,uv).rgb;mask=max(mask,sampleDamage);
   }return mask;}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 damage=fractureMask();diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.018,.085,.10),damage.r*.8);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.62,.82,.80),damage.g*.62);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=mix(roughnessFactor,.92,max(damage.g,damage.r*.7));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
   metalnessFactor*=1.-damage.g*.7;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float fractureHeight=-damage.r*.018+damage.b*.045;vec3 sigmaX=dFdx(-vViewPosition),sigmaY=dFdy(-vViewPosition);vec3 rx=cross(sigmaY,normal),ry=cross(normal,sigmaX);float determinant=dot(sigmaX,rx);
   normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(fractureHeight)*rx+dFdy(fractureHeight)*ry));
   `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <clearcoat_normal_fragment_maps>',`#include <clearcoat_normal_fragment_maps>
   #ifdef USE_CLEARCOAT
   clearcoatNormal=mix(clearcoatNormal,normal,max(damage.r,damage.g));
   #endif
  `);
 };
 material.customProgramCacheKey=()=>original.customProgramCacheKey()+'-surface-fracture-v1';
 function hit(point,normal,tier){let index=points.findIndex((p,i)=>i<count.value&&new T.Vector3(p.x,p.y,p.z).distanceTo(point)<4);if(index<0)index=Math.min(31,count.value++);count.value=Math.min(32,count.value);points[index].set(point.x,point.y,point.z,tier);normals[index].set(normal.x,normal.y,normal.z,2.4+tier*2.7)}
 return{material,hit,points,normals,count};
}
