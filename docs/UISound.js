// Quiet crystalline interface cues, sharing the world's audio context.
export class UISound {
 constructor(context,destination=context.destination){
  this.jumpVolume=.55;this.jumpBuffer=null;this.context=context;this.enabled=false;this.voices=new Set();this.lastHover=-Infinity;
  this.output=context.createGain();this.output.gain.value=0;this.output.connect(destination);
  this.delay=context.createDelay(.3);this.delay.delayTime.value=.095;
  this.echo=context.createGain();this.echo.gain.value=.19;
  this.delay.connect(this.echo).connect(this.output);
 }
 setJumpVolume(volume){this.jumpVolume=Math.max(0,Math.min(1,volume));}
 async loadJump(url){
  const response=await fetch(url);if(!response.ok)throw new Error('Jump sound could not load');
  const buffer=await this.context.decodeAudioData(await response.arrayBuffer());
  // Normalize the original sample so quiet source mastering does not bury it
  // under the city. With the shared .55 output, takeoff peaks around .55.
  let peak=0;for(let channel=0;channel<buffer.numberOfChannels;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs(data[i]));}
  this.jumpGain=peak>0?1/peak:1;this.jumpBuffer=buffer;
 }
 jump(){
  if(!this.jumpBuffer)return false;
  const source=this.context.createBufferSource(),gain=this.context.createGain();
  source.buffer=this.jumpBuffer;source.playbackRate.value=1;gain.gain.value=this.jumpGain*this.jumpVolume/.55;
  source.connect(gain).connect(this.output);this.voices.add(source);
  source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};
  source.start();return true;
 }
 setEnabled(enabled){
  this.enabled=enabled;const t=this.context.currentTime;
  this.output.gain.cancelScheduledValues(t);this.output.gain.setValueAtTime(enabled?.55:0,t);
  if(!enabled){for(const voice of this.voices)voice.stop();this.voices.clear();}
 }
 tone(frequency,offset,duration,volume,type='sine',endFrequency=frequency){
  const c=this.context,start=c.currentTime+offset,osc=c.createOscillator(),gain=c.createGain();
  osc.type=type;osc.frequency.setValueAtTime(frequency,start);
  osc.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(this.output);gain.connect(this.delay);
  this.voices.add(osc);osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect();};
  osc.start(start);osc.stop(start+duration+.02);
 }
 play(kind){
  const c=this.context;if(!this.enabled||c.state!=='running')return false;
  if(kind==='hover'){
   if(c.currentTime-this.lastHover<.09||this.voices.size>18)return false;
   this.lastHover=c.currentTime;
   this.tone(880,0,.17,.035,'sine',1174.66);this.tone(1760,.025,.22,.013);
  }else if(kind==='press'){
   this.tone(210,0,.09,.07,'triangle',90);this.tone(1320,0,.065,.018);
  }else if(kind==='confirm'){
   this.tone(587.33,0,.23,.06);this.tone(880,.035,.3,.036);this.tone(1174.66,.07,.36,.021);
  }else if(kind==='ping'){
   this.tone(1480,0,.55,.11,'sine',1320);this.tone(2220,.012,.42,.038);this.tone(2960,.025,.28,.017);
  }else if(kind==='jump'){
   return this.jump();
  }else if(kind==='boom'){
   this.tone(75,0,.7,.25,'triangle',24);this.tone(140,.015,.4,.1,'sine',35);
  }else if(kind==='enter'){
   // A warm descending bass under an ascending glass chord.
   this.tone(110,0,.95,.12,'sine',55);
   [293.66,440,587.33,880,1174.66].forEach((f,i)=>this.tone(f,.06+i*.07,.95,.045-i*.006));
  }else return false;
  return true;
 }
}

export function bindUISounds(root,{play,unlock}){
 const control=target=>target?.closest?.('button,summary,a[href],select,input[type="checkbox"]');
 const usable=element=>element&&!element.disabled&&!element.matches('[data-audio-preview]')&&!element.closest('[hidden],[inert]');
 let pointerFocus=null;
 root.addEventListener('pointerover',event=>{
  const target=control(event.target);
  if(event.pointerType!=='touch'&&usable(target)&&!target.contains(event.relatedTarget))play('hover');
 });
 root.addEventListener('pointerdown',event=>{
  pointerFocus=control(event.target);
  if(event.button===0&&usable(pointerFocus)){unlock();play('press');}
 },true);
 root.addEventListener('keydown',event=>{
  if(event.key==='Tab')pointerFocus=null;
  if(!event.repeat&&(event.key==='Enter'||event.key===' ')&&usable(control(event.target))){unlock();play('press');}
 },true);
 root.addEventListener('focusin',event=>{
  const target=control(event.target);if(usable(target)&&target!==pointerFocus)play('hover');
 });
 root.addEventListener('click',event=>{
  const target=control(event.target);
  // Entry and mute have dedicated handlers; select/checkbox confirm on change.
  if(usable(target)&&!['enter','sound'].includes(target.id)&&!target.matches('select,input'))play('confirm');
 });
 root.addEventListener('change',event=>{if(usable(control(event.target)))play('confirm');});
}
