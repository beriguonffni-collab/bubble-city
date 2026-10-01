import {readAudioFavorites,writeAudioFavorites} from './AudioSettings.js';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
const button=(text,id,cls='')=>{const n=el('button',cls,text);n.type='button';if(id)n.id=id;return n;};
export function installAudioFavorites({panel,read,apply,announce,storage=localStorage}){
 let favorites=[],editing=null,deleted=null,storageError='';
 try{favorites=readAudioFavorites(storage);}catch{storageError='Saved audio favorites could not be read. Existing data has been kept.';}
 const section=el('section','audio-favorites');section.setAttribute('aria-labelledby','audio-favorites-title');
 const heading=el('h3',null,'Favorite Combinations');heading.id='audio-favorites-title';
 const intro=el('p','settings-intro','Save your footstep and jump levels as a reusable mix.');
 const form=el('form','audio-favorite-form'),field=el('div','settings-field'),label=el('label',null,'Mix name'),name=el('input');name.id='audio-favorite-name';label.htmlFor=name.id;name.type='text';name.maxLength=80;name.required=true;name.placeholder='e.g. Quiet exploring';name.autocomplete='off';field.append(label,name);
 const draft=el('p','audio-favorite-draft');draft.id='audio-favorite-draft';
 const actions=el('div','settings-actions'),save=button('Save favorite','save-audio-favorite','settings-primary'),copy=button('Save as new','copy-audio-favorite'),cancel=button('Cancel edit','cancel-audio-favorite');save.type='submit';copy.hidden=true;cancel.hidden=true;actions.append(save,copy,cancel);form.append(field,draft,actions);
 const count=el('p','audio-favorite-count'),grid=el('div','audio-favorite-grid');grid.id='audio-favorite-list';grid.setAttribute('aria-label','Favorite audio combinations');
 const undo=button('Undo delete','undo-audio-favorite');undo.hidden=true;
 section.append(heading,intro,form,count,grid,undo);panel.append(section);
 function summary(p){return 'Jump '+p.jump+'% / Walking '+p.walk+'%';}
 function commit(next){if(storageError){announce(storageError,true);return false;}try{writeAudioFavorites(storage,next);favorites=next;return true;}catch{announce('Could not save favorites. Your previous combinations are unchanged.',true);return false;}}
 function reset(){editing=null;name.value='';name.setCustomValidity('');save.textContent='Save favorite';copy.hidden=true;cancel.hidden=true;refresh();}
 function edit(p){editing=p.id;name.value=p.name;save.textContent='Update favorite';copy.hidden=false;cancel.hidden=false;apply({jump:p.jump,walk:p.walk});refresh();announce('Editing '+p.name+'. Adjust the sliders or name, then click Update favorite.');name.focus();}
 function saveDraft(asNew=false){
  name.setCustomValidity(name.value.trim()?'':'Give this combination a name.');if(!form.reportValidity())return;
  const p={id:!asNew&&editing?editing:crypto.randomUUID(),name:name.value.trim(),...read()};
  const next=favorites.some(f=>f.id===p.id)?favorites.map(f=>f.id===p.id?p:f):[...favorites,p];
  if(commit(next)){reset();announce('Saved '+p.name+'.');}
 }
 form.onsubmit=e=>{e.preventDefault();saveDraft();};name.oninput=()=>name.setCustomValidity('');copy.onclick=()=>saveDraft(true);cancel.onclick=()=>{reset();announce('Edit closed. The saved favorite is unchanged; current sound levels stay active.');};
 undo.onclick=()=>{if(!deleted)return;const next=[...favorites];next.splice(Math.min(deleted.index,next.length),0,deleted.favorite);if(commit(next)){deleted=null;undo.hidden=true;refresh();announce('Favorite restored.');}};
 function refresh(){
  const current=read();draft.textContent=summary(current);
  count.textContent=storageError||favorites.length+' saved '+(favorites.length===1?'mix':'mixes');
  grid.replaceChildren();
  if(!favorites.length)grid.append(el('p','presets-empty',storageError?'Favorites are unavailable until the saved data can be recovered.':'No saved mixes yet.'));
  for(const p of favorites){
   const card=el('article','audio-favorite-card');card.dataset.favoriteId=p.id;
   const use=button('',null,'audio-favorite-apply');use.setAttribute('aria-label','Apply '+p.name);use.setAttribute('aria-pressed',String(current.jump===p.jump&&current.walk===p.walk));use.append(el('strong',null,p.name),el('small',null,summary(p)));use.onclick=()=>{reset();apply({jump:p.jump,walk:p.walk});refresh();};
   const controls=el('div','audio-favorite-actions'),change=button('Edit'),remove=button('Delete',null,'settings-danger');change.setAttribute('aria-label','Edit '+p.name);remove.setAttribute('aria-label','Delete '+p.name);change.onclick=()=>edit(p);remove.onclick=()=>{const index=favorites.findIndex(f=>f.id===p.id);if(commit(favorites.filter(f=>f.id!==p.id))){deleted={favorite:p,index};undo.hidden=false;if(editing===p.id)reset();else refresh();announce('Deleted '+p.name+'. Undo is available.');}};
   controls.append(change,remove);card.append(use,controls);grid.append(card);
  }
 }
 refresh();return {refresh};
}
