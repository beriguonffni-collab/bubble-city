// Continuous attenuation and delayed propagation, in world meters / seconds.
export function pressureAtWater(height,speed){return Math.min(3.5,(speed/180)**2)/(1+(Math.abs(height)/32)**2)}
export class WaterDynamics{
 constructor(emit){this.emit=emit;this.previous=null;this.lastWake=-10;this.lastPressure=-10;this.lastSplash=-10;this.sonic=false}
 splash(t,p){if(t-this.lastSplash<.16)return false;this.lastSplash=t;this.emit({x:p.x,z:p.z,time:t,amplitude:2.2,width:1.5,speed:9,spray:1});return true}
 update(t,p,active=true,solids=null){
  if(p.phase){this.previous=null;this.sonic=false;return}const v=p.position,old=this.previous;const inside=!solids||solids.inside(v);
  // Teleports aren't impacts. Crossing is interpolated so fast flight cannot skip the surface.
  if(active&&inside&&old&&Math.hypot(v.x-old.x,v.y-old.y,v.z-old.z)<80&&old.y*v.y<0){
   const a=old.y/(old.y-v.y),impactSpeed=Math.max(p.speed,old.speed||0),strength=Math.min(24,.7+Math.pow(impactSpeed/45,1.25));
   this.emit({x:old.x+(v.x-old.x)*a,z:old.z+(v.z-old.z)*a,time:t,amplitude:strength,width:2+strength*.55,speed:10+strength*2.4,spray:strength});
  }
  this.previous={...v,speed:p.speed};
  if(!active||!inside){this.sonic=false;return}
  if((p.swimming||p.skimming)&&p.speed>.3&&t-this.lastWake>.16){this.lastWake=t;const strength=p.skimming?Math.min(2.8,.25+p.speed*.009):(.16+p.speed*.025)/(1+(Math.abs(v.y)/5)**2);this.emit({x:v.x,z:v.z,time:t+Math.abs(v.y)/1480,amplitude:strength,width:1,speed:5,spray:0})}
  if(p.mode!=='walk'&&v.y>=0&&p.speed>40&&t-this.lastPressure>.12){this.lastPressure=t;const a=pressureAtWater(v.y,p.speed);this.emit({x:v.x,z:v.z,time:t+Math.abs(v.y)/343,amplitude:a,width:2+Math.abs(v.y)*.07,speed:14,spray:0})}
  const sonic=p.mode!=='walk'&&v.y>=0&&p.speed>=343;
  if(sonic&&!this.sonic)this.emit({x:v.x,z:v.z,time:t+Math.abs(v.y)/343,amplitude:pressureAtWater(v.y,p.speed)*2,width:3+Math.abs(v.y)*.08,speed:26,spray:0});
  this.sonic=sonic;
 }
 reset(){this.previous=null;this.sonic=false}
}
