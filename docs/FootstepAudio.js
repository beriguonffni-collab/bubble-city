// Local Roblox footstep sample. Provenance is stored in audio/source.json.
export class FootstepAudio {
 constructor(url,{enabled=true,volume=.28,fetcher=fetch,createContext=()=>new (window.AudioContext||window.webkitAudioContext)()}={}){
  this.enabled=enabled;this.volume=volume;this.createContext=createContext;
  this.context=null;this.buffer=null;this.source=null;this.gain=null;this.loading=null;
  this.moving=false;this.rate=1.85;this.failed=false;
  this.bytes=fetcher(url).then(r=>{if(!r.ok)throw new Error('Footstep audio could not load');return r.arrayBuffer();});
  // Keep a failed request handled even if the user has not interacted yet.
  this.bytes.catch(()=>{this.failed=true;});
 }
 async unlock(){
  if(this.failed)return;
  try{
   if(!this.context)this.context=this.createContext();
   if(this.context.state==='suspended')await this.context.resume();
   if(!this.loading)this.loading=this.bytes.then(bytes=>this.context.decodeAudioData(bytes)).then(buffer=>{this.buffer=buffer;this.reconcile();});
   await this.loading;
  }catch(error){this.failed=true;this.stop();console.warn('Walking sound unavailable:',error.message);}
 }
 setVolume(volume){
  this.volume=Math.max(0,Math.min(1,volume));
  for(const gain of [this.gain,this.previewGain])if(gain)gain.gain.setTargetAtTime(this.volume,this.context.currentTime,.02);
 }
 async preview(){
  this.stopPreview();const ticket=this.previewTicket;await this.unlock();
  if(ticket!==this.previewTicket||!this.enabled||!this.buffer||this.context?.state!=='running')return false;
  const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.buffer;source.loop=true;source.playbackRate.value=1.85;
  const now=this.context.currentTime;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(this.volume,now+.015);gain.gain.setValueAtTime(this.volume,now+.7);gain.gain.linearRampToValueAtTime(0,now+.8);
  source.connect(gain).connect(this.context.destination);this.previewSource=source;this.previewGain=gain;
  source.onended=()=>{source.disconnect();gain.disconnect();if(this.previewSource===source){this.previewSource=null;this.previewGain=null;}};
  source.start();source.stop(now+.82);return true;
 }
 stopPreview(){this.previewTicket=(this.previewTicket||0)+1;if(this.previewSource){this.previewSource.stop();this.previewSource=null;this.previewGain=null;}}
 setEnabled(value){this.enabled=Boolean(value);if(!this.enabled){this.stop();this.stopPreview();}else this.reconcile();}
 update({walking,distance,dt,baseSpeed}){
  this.moving=Boolean(walking&&dt>0&&distance>baseSpeed*dt*.015);
  if(this.moving){const ratio=distance/(dt*baseSpeed);this.rate=1.85*Math.max(.65,Math.min(1.4,Math.sqrt(ratio)));}
  this.reconcile();
 }
 reconcile(){
  if(!this.enabled||!this.moving||this.failed){this.stop();return;}
  if(!this.buffer||this.context?.state!=='running')return;
  if(!this.source){
   const source=this.context.createBufferSource(),gain=this.context.createGain();
   source.buffer=this.buffer;source.loop=true;source.playbackRate.value=this.rate;
   gain.gain.setValueAtTime(0,this.context.currentTime);gain.gain.linearRampToValueAtTime(this.volume,this.context.currentTime+.015);
   source.connect(gain);gain.connect(this.context.destination);source.onended=()=>{source.disconnect();gain.disconnect();};
   this.source=source;this.gain=gain;source.start();
  }else this.source.playbackRate.setTargetAtTime(this.rate,this.context.currentTime,.06);
 }
 stop(){
  this.moving=false;
  if(!this.source)return;
  const source=this.source,gain=this.gain,now=this.context.currentTime;
  this.source=null;this.gain=null;gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(0,now,.006);source.stop(now+.03);
 }
}
