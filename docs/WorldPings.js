import * as T from './vendor/three.module.js';
import {createWorldBeacon} from './WorldBeacon.js';

export class WorldPings{
 constructor(scene){this.scene=scene;this.items=[];this.serial=0;this.top=new T.Vector3();this.onRay=new T.Vector3();this.onBeam=new T.Vector3()}
 aimed(ray){let best=null,nearest=Infinity;for(const item of this.items){this.top.copy(item.position);this.top.y+=260;const distanceSq=ray.distanceSqToSegment(item.position,this.top,this.onRay,this.onBeam),distance=ray.origin.distanceTo(this.onBeam);if(this.onRay.clone().sub(ray.origin).dot(ray.direction)<=0)continue;if(distanceSq<Math.max(2,distance*.012)**2&&distance<nearest){best=item;nearest=distance}}return best}
 remove(item){item.beacon.dispose();this.items=this.items.filter(p=>p!==item)}
 place(position,multiple=false,normal={x:0,y:1,z:0}){let item=multiple?null:this.items.find(p=>!p.multiple);if(!item){item={name:multiple?'Ping '+(++this.serial):'Ping',multiple,position:new T.Vector3(),beacon:createWorldBeacon(this.scene)};this.items.push(item)}item.position.copy(position);item.beacon.set(position,normal);return item}
 update(camera,time,visible){for(const item of this.items){item.beacon.root.visible=visible;item.beacon.update(camera,time)}}
}
