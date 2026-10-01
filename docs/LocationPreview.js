import * as T from './vendor/three.module.js';

// Render only after a coordinate/look change, never as a second perpetual game loop.
export function createLocationPreview(world,canvas,pose){
 const width=480,height=300,ctx=canvas.getContext('2d'),target=new T.WebGLRenderTarget(width,height,{depthBuffer:true});target.texture.colorSpace=T.SRGBColorSpace;
 canvas.width=width;canvas.height=height;
 const view=new T.PerspectiveCamera(62,width/height,.12,world.camera.far);view.rotation.order='YXZ';view.position.copy(pose.position);view.rotation.set(pose.pitch,pose.yaw,0);view.rotation.x=pose.pitch;
 // Player pitch is applied with the same sign as the gameplay camera.
 const pixels=new Uint8Array(width*height*4),frame=ctx.createImageData(width,height);let dirty=true,drag=null;
 function draw(){if(!dirty)return;dirty=false;view.updateMatrixWorld();world.renderPlacePreview(view,target);world.renderer.readRenderTargetPixels(target,0,0,width,height,pixels);const stride=width*4;for(let y=0;y<height;y++)frame.data.set(pixels.subarray(y*stride,(y+1)*stride),(height-1-y)*stride);ctx.putImageData(frame,0,0);canvas.dataset.previewPosition=JSON.stringify(view.position);canvas.dataset.previewRevision=String(Number(canvas.dataset.previewRevision||0)+1)}
 canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)};
 canvas.onpointermove=e=>{if(!drag)return;view.rotation.y-=(e.clientX-drag.x)*.004;view.rotation.x=T.MathUtils.clamp(view.rotation.x-(e.clientY-drag.y)*.004,-1.5,1.5);drag={x:e.clientX,y:e.clientY};dirty=true};
 canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
 return{set(p){view.position.copy(p);dirty=true},update:draw,dispose(){target.dispose();canvas.onpointerdown=canvas.onpointermove=canvas.onpointerup=canvas.onpointercancel=null}};
}
