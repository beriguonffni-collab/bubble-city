export const PROFILES={
 balanced:{label:'Native',longEdge:0,scale:1,reflection:768,shadow:1024},
 '1080p':{label:'1080p',longEdge:1920,reflection:768,shadow:1024},
 '1440p':{label:'1440p',longEdge:2560,reflection:1024,shadow:2048},
 '4k':{label:'4K',longEdge:3840,reflection:2048,shadow:4096},
 '8k':{label:'8K',longEdge:7680,reflection:4096,shadow:4096}
};
export function renderSize(name,w,h,dpr=1,max=8192){const p=PROFILES[name]||PROFILES.balanced;let ratio=p.longEdge?p.longEdge/Math.max(w,h):Math.max(1,dpr)*p.scale;ratio=Math.min(ratio,max/Math.max(w,h));if(!p.longEdge)ratio=Math.min(ratio,Math.sqrt(8294400/(w*h)));return{width:Math.max(1,Math.floor(w*ratio)),height:Math.max(1,Math.floor(h*ratio)),ratio}}
export class FrameMeter{constructor(){this.reset()}reset(){this.seconds=0;this.frames=0;this.fps=0}sample(delta){if(!(delta>0)||delta>2){this.reset();return null}this.seconds+=delta;this.frames++;if(this.seconds<.6)return null;this.fps=Math.round(this.frames/this.seconds);const report={fps:this.fps,ms:this.seconds*1000/this.frames};this.seconds=0;this.frames=0;return report}}
