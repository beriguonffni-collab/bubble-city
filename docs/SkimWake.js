import * as T from './vendor/three.module.js';
import {worldDepth} from './WorldDepth.js';
// World-space, distance-sampled wake: each crest travels sideways after the
// player passes, leaving a widening V instead of circles attached to the body.
export function createSkimWake(scene,emit){
 const capacity=768,positions=new Float32Array(capacity*8*3),uv=new Float32Array(capacity*8*2),opacity=new Float32Array(capacity*8),indices=[];
 for(let i=0;i<capacity*2;i++){const b=i*4;uv.set([0,0,1,0,0,1,1,1],b*2);indices.push(b,b+2,b+1,b+1,b+2,b+3)}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setAttribute('fade',new T.BufferAttribute(opacity,1).setUsage(T.DynamicDrawUsage));geometry.setIndex(indices);
 const material=new T.ShaderMaterial({...worldDepth({vertexShader:`attribute float fade;varying float a;varying vec2 v;varying vec2 world;void main(){a=fade;v=uv;world=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying float a;varying vec2 v;varying vec2 world;uniform float time;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){float foam=noise(world*1.6+time*.7)*.6+noise(world*5.3-time)*.4;float edge=sin(v.y*3.14159);float lace=smoothstep(.20,.68,foam);gl_FragColor=vec4(mix(vec3(.25,.85,.93),vec3(.96,1.,1.),lace),a*edge*(.2+lace*.75));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}),uniforms:{time:{value:0}},transparent:true,depthWrite:false,side:T.DoubleSide});
 const mesh=new T.Mesh(geometry,material);mesh.name='Skimming V wake and whitewater';mesh.frustumCulled=false;mesh.renderOrder=2;scene.add(mesh);
 const trail=Array.from({length:capacity},()=>({age:10}));let cursor=0,previous=null,carry=0,sprayCarry=0;
 function reset(){previous=null;carry=0;sprayCarry=0;for(const p of trail)p.age=10;mesh.visible=false}
 function update(player,t,dt,{active=true,reduced=false}={}){
  if(player.phase){reset();return{sections:0,spray:0}}
  const on=active&&player.skimming&&!player.swimming&&player.speed>3,p=player.position;
  const vx=player.flightVelocity?.x||0,vz=player.flightVelocity?.z||0,len=Math.hypot(vx,vz),dx=len?vx/len:-Math.sin(player.yaw),dz=len?vz/len:-Math.cos(player.yaw),sx=-dz,sz=dx;
  let spray=0;
  if(on){
   const distance=previous?Math.hypot(p.x-previous.x,p.z-previous.z):0;
   if(distance>80){previous=null;carry=0}
   const spacing=2,travel=previous?distance:0,n=Math.min(40,Math.floor((carry+travel)/spacing));
   for(let i=0;i<n;i++){const f=Math.min(1,((i+1)*spacing-carry)/Math.max(travel,.001)),q=trail[cursor++%capacity];Object.assign(q,{x:previous.x+(p.x-previous.x)*f,z:previous.z+(p.z-previous.z)*f,dx,dz,sx,sz,age:0,speed:player.speed})}
   carry=(carry+travel)%spacing;
   sprayCarry+=dt*Math.min(reduced?250:1000,100+player.speed*3);spray=Math.floor(sprayCarry);sprayCarry-=spray;
   for(let i=0;i<spray;i++){const f=(i+.5)/spray,x=previous?previous.x+(p.x-previous.x)*f:p.x,z=previous?previous.z+(p.z-previous.z)*f:p.z,sign=i%2?1:-1,power=Math.sqrt(player.speed),out=(2+power*.75)*(.6+Math.random()*.6);
    emit(new T.Vector3(x+sx*sign*.35,.12,z+sz*sign*.35),new T.Vector3(sx*sign*out+dx*player.speed*.035,(2+power*.45)*(.55+Math.random()*.65),sz*sign*out+dz*player.speed*.035),.045+Math.random()*.14,1.3+Math.random()*1.1,false);
   }
   previous={x:p.x,z:p.z};
  }else{previous=null;carry=0;sprayCarry=0}
  let visible=0;
  for(const q of trail){q.age+=dt;if(q.age>=4)continue;const spread=.5+q.age*(5+q.speed*.025),thickness=1.3+Math.sqrt(q.speed)*.13,fade=(1-q.age/4)**1.4;
   for(const sign of [-1,1])for(let corner=0;corner<4;corner++){
    const across=(corner>>1)*2-1,along=(corner%2*2-1)*1.12,r=spread+across*thickness*.5,idx=visible*8+(sign===-1?0:4)+corner;
    positions[idx*3]=q.x+q.sx*sign*r+q.dx*along;positions[idx*3+1]=.06+(across<0?.15+.25*Math.sin(Math.min(1,q.age)*Math.PI):0)*fade;positions[idx*3+2]=q.z+q.sz*sign*r+q.dz*along;opacity[idx]=fade*.85;
   }visible++;
  }
  geometry.setDrawRange(0,visible*12);geometry.attributes.position.needsUpdate=true;geometry.attributes.fade.needsUpdate=true;material.uniforms.time.value=t;mesh.visible=visible>0;
  return{sections:visible,spray};
 }
 return{update,reset};
}
