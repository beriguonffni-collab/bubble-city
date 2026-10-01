import {worldDepth} from './WorldDepth.js';
import * as T from './vendor/three.module.js';
export function createAtmosphere(renderer,scene){
 const mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{},vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 varying vec3 direction;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=a*noise(p);p=mat2(1.6,-1.2,1.2,1.6)*p;a*=.5;}return n;}
 void main(){vec3 d=normalize(direction);float elevation=max(d.y,0.);vec3 sky=mix(vec3(.36,.70,.88),vec3(.025,.22,.58),pow(elevation,.42));vec3 sun=normalize(vec3(-.5,.9,.5));float alignment=max(dot(d,sun),0.);sky+=vec3(1.,.85,.6)*pow(alignment,12.)*.24+vec3(4.,3.3,2.4)*pow(alignment,1800.);
 if(d.y>.015){vec2 p=d.xz/(d.y+.17)*2.3+vec2(21.,13.);float n=fbm(p);float density=smoothstep(.45,.69,n)*smoothstep(.015,.18,d.y);float shade=fbm(p+vec2(.13,.08));vec3 cloud=mix(vec3(.48,.61,.72),vec3(1.5,1.48,1.38),smoothstep(.34,.65,shade));sky=mix(sky,cloud,density*.96);}
 gl_FragColor=vec4(sky,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 Object.assign(mat,worldDepth({vertexShader:mat.vertexShader,fragmentShader:mat.fragmentShader}));
 const dome=new T.Mesh(new T.SphereGeometry(9000,48,24),mat);dome.frustumCulled=false;dome.renderOrder=-100;dome.name='Sunlit atmosphere';
 const envScene=new T.Scene();envScene.add(dome);const cube=new T.WebGLCubeRenderTarget(512,{type:T.HalfFloatType}),probe=new T.CubeCamera(1,20000,cube);probe.update(renderer,envScene);const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromCubemap(cube.texture);scene.environment=environment.texture;cube.dispose();pmrem.dispose();scene.add(dome);
 return{update(camera,underwater){dome.visible=!underwater;dome.position.copy(camera.position)}};
}
