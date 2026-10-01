import * as T from './vendor/three.module.js';
import {FavoritePlaces,PlaceShortcut,areaName,coordinates} from './FavoritePlaces.js';
import {createSurfaceTarget,surfaceArrival,packSurface} from './SurfaceTarget.js';
import {WorldPings} from './WorldPings.js';
import {createLocationPreview} from './LocationPreview.js';
import {createWorldBeacon} from './WorldBeacon.js';

export function installPlaces({player,world,landmarks,release,travel,toast,available,pingSound=()=>{}}){
 const store=new FavoritePlaces({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)});
 const targets=createSurfaceTarget(world);
 try{store.migrateSurfaces(item=>{const hit=targets.fromPose(item.position,item.yaw,item.pitch),position=hit&&surfaceArrival(hit,world.solids);return position?{position,surface:packSurface(hit)}:{}})}catch(error){toast('Saved places could not be updated: '+error.message)}
 const panel=document.createElement('details');panel.id='favorite-places';
 panel.innerHTML='<summary><span>Ping</span><span id="places-count">0/0</span></summary><div class="places-content"><button id="mark-place">＋ Save what I’m looking at</button><div id="places-list"></div><div id="active-pings"></div></div>';
 document.getElementById('help').after(panel);
 panel.querySelector('summary').title='X: travel. XX: place/move a ping or remove the ping you aim at. Shift + XX: add a numbered ping.';
 panel.addEventListener('pointerdown',release);panel.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')release()});
 const overlay=document.createElement('div');overlay.id='place-markers';overlay.setAttribute('aria-label','Saved place markers');document.body.append(overlay);
 const dialog=document.createElement('dialog');dialog.id='place-dialog';dialog.setAttribute('aria-labelledby','place-title');document.body.append(dialog);
 let markers=[],draft=null,preview=null,pingMultiple=false;const pings=new WorldPings(world.scene);
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
 function guarded(fn){try{fn()}catch(error){toast(error.name==='QuotaExceededError'?'Your browser could not save this place. Free some browser storage and try again.':error.message)}}
 function disposePreview(){preview?.dispose();preview=null;dialog.classList.remove('place-editor')}
 dialog.addEventListener('close',()=>{if(!dialog.open)disposePreview()});
 function close(){disposePreview();dialog.close();draft=null}
 function open(title){release();disposePreview();dialog.replaceChildren();const heading=el('h2',title);heading.id='place-title';dialog.append(heading);if(!dialog.open)dialog.showModal()}
 function actions(primary,callback){const row=el('div',undefined,'place-actions'),cancel=el('button','Cancel'),ok=el('button',primary,'place-primary');cancel.type='button';cancel.onclick=close;ok.type='button';ok.onclick=()=>guarded(callback);row.append(cancel,ok);dialog.append(row)}
 function edit(item){
  if(!item&&store.items.length>=5){toast('Five places saved. Remove one to make room.');return}
  const target=item?(item.surface||targets.fromPose(item.position,item.yaw,item.pitch)):targets.look(world.camera);
  const arrival=target&&surfaceArrival(target,world.solids);if(!target||!arrival){toast('Look at a surface with room to arrive beside it.');return}
  draft={...(item||{}),position:arrival,surface:packSurface(target),yaw:item?.yaw??player.yaw,pitch:item?.pitch??player.pitch,mode:item?.mode||(player.climbing?'free':player.mode)};
  open(item?'Edit favorite place':'Mark location as favorite?');
  const area=el('p',areaName(draft.surface.point,landmarks),'place-area'),coords=el('p',coordinates(draft.surface.point),'place-coordinates');dialog.append(area,coords);
  const form=el('form'),nameLabel=el('label','Location name'),name=el('input'),noteLabel=el('label','Why is this a favorite?'),note=el('textarea');
  name.id='place-name';name.type='text';name.maxLength=48;name.required=true;name.value=item?.name||areaName(draft.surface.point,landmarks);nameLabel.htmlFor=name.id;
  note.id='place-note';note.maxLength=220;note.rows=3;note.placeholder='A little memory, a beautiful view…';note.value=item?.note||'';noteLabel.htmlFor=note.id;
  form.append(nameLabel,name,noteLabel,note);
  const layout=el('div',undefined,'place-edit-layout');layout.append(form);dialog.append(layout);
  let selectedSurface=draft.surface,selectedArrival=draft.position;
  if(item){
   dialog.classList.add('place-editor');const axes=el('fieldset',undefined,'place-axes');axes.append(el('legend','Surface coordinates · meters'));const inputs={};
   for(const [axis,min,max] of [['x',-3750,3750],['y',-120,900],['z',-5450,2050]]){const label=el('label',axis.toUpperCase()),input=el('input');input.type='number';input.id='place-'+axis;input.min=min;input.max=max;input.step='any';input.required=true;input.value=String(draft.surface.point[axis]);label.htmlFor=input.id;label.append(input);axes.append(label);inputs[axis]=input}form.append(axes);
   const aside=el('aside',undefined,'place-preview'),heading=el('h3','Destination preview'),canvas=el('canvas'),hint=el('p','Drag to look around. Your character stays where it is.'),state=el('p','', 'place-preview-state');canvas.setAttribute('aria-label','Favorite destination preview');layout.append(aside);aside.append(heading,canvas,hint,state);
   preview=createLocationPreview(world,canvas,draft);const readPosition=()=>Object.fromEntries(Object.entries(inputs).map(([axis,input])=>[axis,input.valueAsNumber]));
   const update=()=>{if(!Object.values(inputs).every(input=>input.validity.valid)){selectedArrival=null;return}const p=readPosition(),hit=targets.nearest(p,draft.surface.normal);selectedSurface=hit&&packSurface(hit);selectedArrival=hit&&surfaceArrival(hit,world.solids);if(selectedArrival){preview.set(selectedArrival);area.textContent=areaName(hit.point,landmarks);coords.textContent=coordinates(hit.point)}state.textContent=selectedArrival?'Attached to '+hit.kind+' · '+coordinates(hit.point):'No safe arrival beside that surface';state.classList.toggle('blocked',!selectedArrival)};for(const input of Object.values(inputs))input.oninput=update;update();
  }

  const save=()=>{if(!form.reportValidity())return;const position=selectedArrival;if(!position||!selectedSurface||!world.solids.clear(position)){toast('Choose a surface with room to arrive beside it.');return}store.save({...draft,position,surface:selectedSurface,name:name.value,note:note.value});close();render();toast('Favorite saved · press X to return')};
  form.onsubmit=e=>{e.preventDefault();guarded(save)};actions('Save favorite',save);name.focus();name.select();
 }
 function confirmTravel(item){open('Travel to favorite?');dialog.append(el('h3',item.name),el('p',item.note),el('p',areaName(item.surface?.point||item.position,landmarks),'place-area'),el('p',coordinates(item.surface?.point||item.position),'place-coordinates'));actions('Travel',()=>{close();travel(item)})}
 function remove(item){open('Remove favorite?');dialog.append(el('p',`Remove “${item.name}” and its world marker?`));actions('Remove',()=>{store.remove(item.id);close();render()})}
 function render(){
  const count=document.getElementById('places-count');count.textContent=`${store.current?1:0}/${store.items.length}`;count.title=`${store.current?1:0} selected for X · ${store.items.length} saved · limit 5`;
  const list=document.getElementById('places-list');list.replaceChildren();
  document.getElementById('mark-place').disabled=store.items.length>=5;
  if(!store.items.length)list.append(el('p','Your saved spots appear here.','places-empty'));
  for(const item of store.items){
   const card=el('article',undefined,'place-card'),go=el('button',undefined,'place-go');go.setAttribute('aria-label','Travel to '+item.name);go.title=item.note||item.name;go.onclick=()=>travel(item);go.append(el('span',store.selected===item.id?'★':'☆','place-star'),el('span',item.name,'place-name'));
   const more=el('details',undefined,'place-more'),summary=el('summary','⋯');summary.setAttribute('aria-label','Options for '+item.name);const menu=el('div',undefined,'place-menu');
   for(const [label,fn] of [['Edit',()=>edit(item)],[store.selected===item.id?'Disable X':'Use for X',()=>{store.select(store.selected===item.id?null:item.id);render()}],['Remove',()=>remove(item)]]){const button=el('button',label);button.onclick=()=>guarded(fn);menu.append(button)}more.append(summary,menu);card.append(go,more);list.append(card);

  }
  for(const marker of markers)marker.beacon.dispose();
  overlay.replaceChildren();markers=store.items.filter(item=>item.surface).map(item=>{const b=el('button',undefined,'favorite-marker'),name=el('strong','★ '+item.name),distance=el('small','');b.append(name,distance);b.setAttribute('aria-label',`Travel to favorite ${item.name}`);b.onclick=()=>confirmTravel(item);overlay.append(b);const beacon=createWorldBeacon(world.scene,{color:0x80ffe0,height:130});beacon.set(item.surface.point,item.surface.normal);return{item,button:b,beacon,distance,position:new T.Vector3(item.surface.point.x,item.surface.point.y,item.surface.point.z)}});
 }
 function syncPings(){const list=document.getElementById('active-pings');list.replaceChildren();for(const item of pings.items){const row=el('div',undefined,'active-ping-row');row.append(el('span',item.name));const remove=el('button','×');remove.setAttribute('aria-label','Remove '+item.name);remove.onclick=()=>{pings.remove(item);syncPings()};row.append(remove);list.append(row)}world.renderer.domElement.dataset.locationPings=JSON.stringify(pings.items.map(p=>({name:p.name,...p.position})));}
 function pingLook(){
  const ray=new T.Raycaster();world.camera.updateMatrixWorld();ray.setFromCamera(new T.Vector2(0,0),world.camera);ray.far=11000;
  const aimed=pings.aimed(ray.ray);if(aimed){pings.remove(aimed);syncPings();pingSound();return}
  const hit=targets.cast(ray.ray);if(!hit){toast('No surface in view. Aim at something in the world.');return}
  pings.place(hit.point,pingMultiple,hit.normal);syncPings();pingSound();
 }
 const shortcut=new PlaceShortcut(()=>{if(!available())return;if(store.current)travel(store.current);else{panel.open=true;release();toast(store.items.length?'Choose Use for X on a saved place to enable travel.':'Mark a favorite first, then press X to return.')}},()=>{if(available())pingLook()});
 document.addEventListener('keydown',e=>{if(e.code!=='KeyX'||!available()||document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.target.closest('input,textarea,select,button,a,summary,[contenteditable=true]'))return;e.preventDefault();pingMultiple=e.shiftKey;shortcut.down(e.repeat)});
 document.addEventListener('keyup',e=>{if(e.code==='KeyX')shortcut.up()});
 document.getElementById('mark-place').onclick=()=>edit();
 const local=new T.Vector3();
 function place(node,p,camera,width,height){
  local.set(p.x,p.y,p.z).applyMatrix4(camera.matrixWorldInverse);
  const depth=Math.max(.001,Math.abs(local.z)),tan=Math.tan(camera.fov*Math.PI/360),behind=local.z>0;
  let x=local.x/(depth*tan*camera.aspect),y=-local.y/(depth*tan);if(behind&&Math.abs(x)+Math.abs(y)<.001)y=1;
  const off=behind||Math.abs(x)>.88||Math.abs(y)>.8;
  if(off){const scale=Math.max(Math.abs(x)/.85,Math.abs(y)/.75,.001);x/=scale;y/=scale}
  const px=Math.max(100,Math.min(width-100,(x*.5+.5)*width)),py=Math.max(90,Math.min(height-100,(y*.5+.5)*height));node.style.transform=`translate3d(${px}px,${py}px,0) translate(-50%,-100%)`;node.classList.toggle('offscreen',off);node.dataset.direction=behind?'Behind · ':off?'Offscreen · ':'';
 }
 render();
 return {cancelShortcut:()=>shortcut.cancel(),update(now){
  if(dialog.open)preview?.update();
  const playing=available();pings.update(world.camera,now/1000,playing);
  for(const marker of markers){marker.beacon.root.visible=playing;marker.beacon.update(world.camera,now/1000)}
  overlay.hidden=!playing||document.body.classList.contains('clean');if(overlay.hidden)return;
  const c=world.camera;c.updateMatrixWorld();const width=innerWidth,height=innerHeight;
  // Project against the finalized camera every rendered frame. CSS must not ease
  // these transforms: that would make a fixed world point trail camera movement.
  for(const marker of markers){place(marker.button,marker.position,c,width,height);const meters=Math.round(marker.position.distanceTo(player.position)),text=meters>=1000?(meters/1000).toFixed(1)+' km':meters+' m';if(marker.distance.textContent!==text)marker.distance.textContent=text;}
 }};
}
