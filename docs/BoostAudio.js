// Layered water cavitation / air rush. Driven by actual movement, not Shift alone.
export class BoostAudio {
 constructor(ctx,output){
  this.ctx=ctx;this.kind=null;this.sonic=false;this.lastLaunch=-10;this.boomBuffer=null;this.boomVoices=[];
  this.gain=ctx.createGain();this.gain.gain.value=0;this.gain.connect(output);
  const buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),samples=buffer.getChannelData(0);
  let low=0;for(let i=0;i<samples.length;i++){const white=Math.random()*2-1;low=.97*low+.03*white;samples[i]=white*.35+low*3}
  this.noise=ctx.createBufferSource();this.noise.buffer=buffer;this.noise.loop=true;
  this.filter=ctx.createBiquadFilter();this.filter.type='bandpass';this.filter.Q.value=.55;
  this.noise.connect(this.filter).connect(this.gain);this.noise.start();
  this.body=ctx.createOscillator();this.body.type='sine';this.body.frequency.value=48;
  this.bodyGain=ctx.createGain();this.bodyGain.gain.value=0;this.body.connect(this.bodyGain).connect(output);this.body.start();
  this.burstGain=ctx.createGain();this.burstGain.connect(output);
 }
 async loadBoom(url='./audio/sonic-boom.mp3'){const response=await fetch(url);if(!response.ok)throw Error('Sonic boom sample unavailable');this.boomBuffer=await this.ctx.decodeAudioData(await response.arrayBuffer())}
 launch(volume=1){this.lastLaunch=this.ctx.currentTime;this.sonic=true;this.burstGain.gain.setValueAtTime(volume,this.ctx.currentTime);this.burst(false,2.2)}
 burst(water=false,strength=1){
  if(!water&&this.boomBuffer){const c=this.ctx,source=c.createBufferSource(),gain=c.createGain();source.buffer=this.boomBuffer;gain.gain.value=.88;source.connect(gain).connect(this.burstGain);source.start();this.boomVoices.push(source);if(this.boomVoices.length>3)this.boomVoices.shift().stop();source.onended=()=>{this.boomVoices=this.boomVoices.filter(s=>s!==source);source.disconnect();gain.disconnect()}}

  const power=Math.min(2.2,Math.sqrt(Math.max(1,strength)));const c=this.ctx,t=c.currentTime,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
  source.buffer=this.noise.buffer;filter.type='lowpass';filter.frequency.setValueAtTime(water?2200:7000,t);filter.frequency.exponentialRampToValueAtTime(110,t+.8);
  gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime((water?.18:.24)*power,t+.035);gain.gain.exponentialRampToValueAtTime(.001,t+.85);
  source.connect(filter).connect(gain).connect(this.burstGain);source.start();source.stop(t+.9);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};
  // A low pressure doublet gives the sonic event weight; water gets smaller bubbling transients.
  for(let i=0;i<(water?4:2);i++){
   const tone=c.createOscillator(),envelope=c.createGain(),start=t+i*(water?.075:.11);
   tone.frequency.setValueAtTime(water?(i<2?78-i*16:180+i*65):86-i*14,start);tone.frequency.exponentialRampToValueAtTime(water?28:26,start+(water?.13:.65));
   envelope.gain.setValueAtTime(.001,start);envelope.gain.exponentialRampToValueAtTime((water?(i<2?.14:.035):.18)*power,start+.018);envelope.gain.exponentialRampToValueAtTime(.001,start+(water?.16:.75));
   tone.connect(envelope).connect(this.burstGain);tone.start(start);tone.stop(start+.8);tone.onended=()=>{tone.disconnect();envelope.disconnect()};
  }
 }
 update({kind=null,speed=0,enabled=true,volume=1,sonicAllowed=true}){
  const c=this.ctx,t=c.currentTime,skim=kind==='skim',water=kind==='water'||skim,active=enabled&&!!kind;
  this.burstGain.gain.setTargetAtTime(enabled?volume:0,t,.025);
  if(active&&kind!==this.kind&&water&&!skim)this.burst(true);
  if(active&&!water&&sonicAllowed&&speed>=343&&!this.sonic&&t-this.lastLaunch>.8){this.burst();this.sonic=true}
  if((!active||water||speed<300)&&t-this.lastLaunch>.8)this.sonic=false;
  this.kind=active?kind:null;
  const intensity=Math.min(1,speed/(skim?240:water?38:420));
  this.filter.frequency.setTargetAtTime(water?380+intensity*1600:650+intensity*3600,t,.12);
  this.gain.gain.setTargetAtTime(active?volume*(water?.6:.35)*intensity:0,t,active?.12:.08);
  this.body.frequency.setTargetAtTime(water?42+intensity*40:38+intensity*65,t,.15);
  this.bodyGain.gain.setTargetAtTime(active?volume*.035*intensity:0,t,.08);
 }
 stop(){this.update({enabled:false})}
}
