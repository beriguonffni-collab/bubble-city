export const FAVORITES_KEY='t1-bubble-city.places.v1';
export const FAVORITES_LIMIT=5;
const validPoint=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]))&&Math.abs(p.x)<3750&&Math.abs(p.z+1700)<3750&&p.y>=-118.3&&p.y<=899.8;
const validSurface=s=>s&&['x','y','z'].every(k=>Number.isFinite(s.point?.[k])&&Number.isFinite(s.normal?.[k]))&&Math.abs(s.point.x)<=3750.001&&Math.abs(s.point.z+1700)<=3750.001&&s.point.y>=-120.001&&s.point.y<=900.001&&Math.hypot(s.normal.x,s.normal.y,s.normal.z)>.5;
export const coordinates=p=>`X ${p.x.toFixed(1)} · Y ${p.y.toFixed(1)} · Z ${p.z.toFixed(1)} m`;

export function areaName(p,landmarks={}){
 let nearest=null,distance=Infinity;
 for(const d of Object.values(landmarks)){const n=Math.hypot(p.x-d.p.x,p.y-d.p.y,p.z-d.p.z);if(n<distance){nearest=d;distance=n}}
 if(distance<180)return nearest.label;
 const columns=['Westhaven','Pearl Quarter','Eastwater'],rows=['Northlight','Central','Southgarden'];
 const x=Math.max(0,Math.min(2,Math.floor((p.x+3750)/2500))),z=Math.max(0,Math.min(2,Math.floor((p.z+5450)/2500)));
 return `${rows[z]} ${columns[x]} · ${p.y<-.25?'Undersea Gardens':p.y>70?'Skyways':'Canal District'}`;
}

export class FavoritePlaces{
 constructor(storage){this.storage=storage;this.items=[];this.selected=null;try{const data=JSON.parse(storage.getItem(FAVORITES_KEY));if(Array.isArray(data?.items)){const ids=new Set();this.items=data.items.filter(p=>p&&typeof p.id==='string'&&!ids.has(p.id)&&ids.add(p.id)&&validPoint(p.position)&&typeof p.name==='string'&&p.name.trim()).slice(0,5).map(p=>({...p,surface:validSurface(p.surface)?p.surface:undefined,name:p.name.slice(0,48),note:typeof p.note==='string'?p.note.slice(0,220):'',yaw:Number.isFinite(p.yaw)?p.yaw:0,pitch:Number.isFinite(p.pitch)?Math.max(-1.53,Math.min(1.53,p.pitch)):0,mode:['walk','free','gaze'].includes(p.mode)?p.mode:'free'}));this.selected=data.selected===null?null:this.items.some(p=>p.id===data.selected)?data.selected:this.items[0]?.id||null}}catch{}}
 commit(items,selected){this.storage.setItem(FAVORITES_KEY,JSON.stringify({items,selected}));this.items=items;this.selected=selected;}
 save({id,name,note='',position,surface,yaw=0,pitch=0,mode='free'}){
  name=name.trim().slice(0,48);if(!name)throw Error('Give this place a name.');
  const existing=this.items.find(p=>p.id===id);if(!existing&&this.items.length>=FAVORITES_LIMIT)throw Error('Five places saved. Remove one to make room.');
  if(!validPoint(position))throw Error('Choose a place inside the playable city.');
  if(surface&&!validSurface(surface))throw Error('Choose a real surface inside the playable city.');
  const item={surface:surface?structuredClone(surface):undefined,id:existing?.id||crypto.randomUUID(),name,note:note.trim().slice(0,220),position:{...position},yaw,pitch,mode};
  this.commit(existing?this.items.map(p=>p.id===id?item:p):[...this.items,item],existing?this.selected:item.id);return item;
 }
 migrateSurfaces(resolve){
  if(this.items.every(p=>p.surface))return;
  const items=this.items.map(item=>item.surface?item:{...item,...resolve(item)});
  if(items.every((p,i)=>p.surface===this.items[i].surface))return;
  const backup=FAVORITES_KEY+'.before-surfaces';if(!this.storage.getItem(backup))this.storage.setItem(backup,JSON.stringify({items:this.items,selected:this.selected}));
  this.commit(items,this.selected);
 }
 select(id){if(id===null||this.items.some(p=>p.id===id))this.commit(this.items,id)}
 remove(id){const items=this.items.filter(p=>p.id!==id);this.commit(items,this.selected===id?items[0]?.id||null:this.selected)}
 get current(){return this.items.find(p=>p.id===this.selected)}
}

// Defer a single press so a double press never teleports before placing a ping.
export class PlaceShortcut{
 constructor(single,double,{schedule=(fn,ms)=>setTimeout(fn,ms),clear=id=>clearTimeout(id)}={}){Object.assign(this,{single,double,schedule,clear});this.cancel()}
 down(repeat=false){if(repeat||this.pressed)return;this.pressed=true;if(this.timer!==null){this.clear(this.timer);this.timer=null;this.double()}else this.timer=this.schedule(()=>{this.timer=null;this.single()},300)}
 up(){this.pressed=false}
 cancel(){if(this.timer!=null)this.clear(this.timer);this.timer=null;this.pressed=false}
}
