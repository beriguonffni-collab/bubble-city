import {worldDepth} from './WorldDepth.js';
import * as T from './vendor/three.module.js';

// A world-anchored light column: one soft light ribbon and a surface halo.
// No DOM labels, lights, shadow maps, textures, or postprocessing passes.
export function createWorldBeacon(scene,{color=0xd67aff,height=260}={}){
 const root=new T.Group();root.name='Location light beacon';root.userData.runtimeOnly=true;root.visible=false;scene.add(root);
 const material=new T.ShaderMaterial(worldDepth({transparent:true,depthWrite:false,depthTest:true,blending:T.NormalBlending,side:T.DoubleSide,toneMapped:false,
  uniforms:{tint:{value:new T.Color(color)},strength:{value:1}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec2 vUv;uniform vec3 tint;uniform float strength;void main(){
   float x=abs(vUv.x-.5)*2.;float core=exp(-x*x*460.);float glow=exp(-x*x*9.);
   float ends=smoothstep(0.,.0003,vUv.y)*(1.-smoothstep(.72,1.,vUv.y));
   gl_FragColor=vec4(mix(tint,vec3(1.),core*.4),(core*.98+glow*.5)*ends*strength);
   #include <colorspace_fragment>
  }`}));
 const column=new T.Mesh(new T.PlaneGeometry(1,1),material);column.position.y=height/2;column.scale.set(5,height,1);column.renderOrder=20;root.add(column);
 const haloMaterial=new T.MeshBasicMaterial({color,transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
 const halo=new T.Mesh(new T.RingGeometry(.38,.46,40),haloMaterial);halo.rotation.x=-Math.PI/2;halo.position.y=.08;root.add(halo);
 const diamond=new T.Mesh(new T.OctahedronGeometry(.13),new T.MeshBasicMaterial({color:0xf0caff,wireframe:true,transparent:true,opacity:.95,depthWrite:false,toneMapped:false}));diamond.position.y=1;root.add(diamond);
 return {root,set(p,normal={x:0,y:1,z:0}){root.position.set(p.x,p.y,p.z);const n=new T.Vector3(normal.x,normal.y,normal.z).normalize();halo.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),n);halo.position.copy(n).multiplyScalar(.025);diamond.position.copy(n).multiplyScalar(.14);column.position.set(n.x*.025,height/2+n.y*.025,n.z*.025);root.visible=true},clear(){root.visible=false},update(camera,time){if(!root.visible)return;const d=camera.position.distanceTo(root.position);column.rotation.y=Math.atan2(camera.position.x-root.position.x,camera.position.z-root.position.z);column.scale.x=Math.max(5,Math.min(90,d*.025));material.uniforms.strength.value=.92+Math.sin(time*1.5)*.08;halo.scale.setScalar(1+Math.sin(time*1.5)*.035);diamond.rotation.y=time*.35},dispose(){scene.remove(root);root.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}};
}
