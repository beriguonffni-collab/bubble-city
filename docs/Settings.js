import {readCoolModes} from './DestructionModes.js';
import {PROFILES} from './RenderProfile.js';

import {installAudioFavorites} from './AudioFavorites.js';

const $=id=>document.getElementById(id);

const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};

const button=(text,id,cls)=>{const b=el('button',cls,text);b.type='button';if(id)b.id=id;return b};

export function installSettings({audio,release,applyDisplay}){

 const dialog=el('dialog','universe-settings');dialog.id='settings-dialog';dialog.setAttribute('aria-labelledby','settings-title');

 const head=el('div','settings-heading'),brand=el('div','settings-brand'),emblem=el('img');emblem.src='./emblem.svg';emblem.alt='';

 const titles=el('div'),title=el('h2',null,'Settings');title.id='settings-title';titles.append(el('p','settings-kicker','BUBBLE CITY'),title);brand.append(emblem,titles);

 const close=button('×','close-settings');close.setAttribute('aria-label','Close settings');head.append(brand,close);

 const tabs=el('div','settings-tabs'),content=el('div','settings-content'),panels={},buttons={};tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Settings sections');

 const footer=el('div','settings-footer'),saved=el('span','settings-saved','Saved automatically'),done=button('Done',null,'settings-done');footer.append(saved,done);

 const status=el('p','settings-status');status.id='settings-status';status.setAttribute('role','status');const announce=t=>{status.textContent=t};let opener,favorites;

 function select(key){key=key==='display'?'display':'audio';audio.stopPreview();status.textContent='';content.scrollTop=0;for(const k of Object.keys(panels)){panels[k].hidden=k!==key;buttons[k].setAttribute('aria-selected',String(k===key));buttons[k].tabIndex=k===key?0:-1}}

 for(const [key,label] of [['display','Display'],['audio','Sound']]){

  const b=button(label,'settings-tab-'+key),p=el('section','settings-panel');p.id='settings-panel-'+key;b.setAttribute('role','tab');b.setAttribute('aria-controls',p.id);p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby',b.id);tabs.append(b);content.append(p);buttons[key]=b;panels[key]=p;

  b.onclick=()=>select(key);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?'display':e.key==='End'?'audio':key==='audio'?'display':'audio';select(next);buttons[next].focus()};

 }

 dialog.append(head,tabs,content,status,footer);document.body.append(dialog);const toggles={},ranges={};

 function switchControl(key,label){const input=el('input','settings-switch');input.type='checkbox';input.id='setting-'+key;input.setAttribute('role','switch');input.setAttribute('aria-label',label);toggles[key]=input;

  input.onchange=async()=>{try{audio.set({[key]:input.checked});if(key==='enabled'&&input.checked)await audio.unlock();refresh()}catch{announce('Applied for this visit. Could not save this preference.')}};return input;

 }

 function toggle(parent,key,label,description){const row=el('div','setting-toggle'),copy=el('div'),lab=el('label',null,label);lab.htmlFor='setting-'+key;copy.append(lab);if(description)copy.append(el('small',null,description));row.append(copy,switchControl(key,label));parent.append(row);return row}

 function level(parent,key,label,enabledKey,preview){

  const row=el('div','sound-row'),heading=el('div','sound-row-heading'),lab=el('label',null,label),input=el('input'),out=el('output'),right=el('div','sound-row-actions');

  input.type='range';input.min=0;input.max=100;input.step=1;input.id=key==='walk'||key==='jump'?'audio-'+key:'setting-'+key;lab.htmlFor=input.id;input.setAttribute('aria-label',label+' volume');out.htmlFor=input.id;right.append(out);

  if(preview){const test=button('▷','preview-'+preview,'sound-preview');test.setAttribute('aria-label','Preview '+label.toLowerCase());test.title='Preview '+label.toLowerCase();test.dataset.audioPreview=preview;test.onclick=async()=>{try{if(!await audio.preview(preview))announce('Enable sound and '+label.toLowerCase()+' to preview.')}catch{announce('This sound could not load.')}};right.append(test)}

  right.append(switchControl(enabledKey,label+' enabled'));heading.append(lab,right);row.append(heading,input);parent.append(row);ranges[key]={input,out,row,enabledKey};

  input.oninput=()=>{try{const value=Number(input.value);if(key==='walk'||key==='jump')audio.setLevels({[key]:value});else audio.set({[key]:value});refresh();favorites?.refresh()}catch{refresh();announce('Volume applied for this visit. Could not save it.')}};return row;

 }

 function disclosure(parent,title){const details=el('details','settings-disclosure');details.append(el('summary',null,title));const body=el('div','disclosure-body');details.append(body);parent.append(details);return{details,body}}

 const master=toggle(panels.audio,'enabled','All sound');master.classList.add('sound-master');const muted=el('span','sound-muted','Muted');master.firstChild.append(muted);

 const mix=el('div','sound-mix');panels.audio.append(mix);level(mix,'musicVolume','Music','musicEnabled');const playback=disclosure(mix,'Music playback');

 const seek=el('input'),time=el('output','music-time');seek.type='range';seek.min=0;seek.max=194;seek.step=.1;seek.value=0;seek.id='music-position';seek.setAttribute('aria-label','Music position');seek.oninput=()=>{if(Number.isFinite(audio.music.duration))audio.music.currentTime=Number(seek.value)};

 const timeline=el('div','music-timeline');timeline.append(time,seek);playback.body.append(timeline);toggle(playback.body,'loop','Loop');

 level(mix,'boostVolume','Flight & swimming','boostEnabled');level(mix,'ambienceVolume','Water ambience','ambienceEnabled');

 const movement=disclosure(mix,'Footsteps & jumping');level(movement.body,'walk','Footsteps','walkEnabled','walk');level(movement.body,'jump','Jump','jumpEnabled','jump');

 const savedMixes=disclosure(movement.body,'Saved movement mixes');favorites=installAudioFavorites({panel:savedMixes.body,read:()=>({...audio.levels}),apply:levels=>{try{audio.setLevels(levels);refresh();announce('Mix applied.')}catch(e){announce(e.message)}},announce});toggle(mix,'uiEnabled','Interface sounds');

 const extras=el('div','settings-extras'),reset=button('Reset sound','reset-audio');reset.onclick=()=>{audio.reset();refresh();favorites.refresh();announce('Sound defaults restored.')};extras.append(reset);

 const credits=disclosure(extras,'Credits');credits.body.innerHTML='<small>Sonic boom by <a href="https://commons.wikimedia.org/wiki/File:Sonic-boom-massive-sound.ogg" target="_blank" rel="noopener">AirMan</a> · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>. Edited and layered.</small>';panels.audio.append(extras);

 const display=$('graphics-settings');display.hidden=false;panels.display.append(display);

 const motion=$('motion'),motionLabel=motion.closest('label');motionLabel.className='setting-toggle';motion.className='settings-switch';motion.setAttribute('role','switch');motionLabel.append(motion);

 const fpsRow=el('label','setting-toggle'),fps=el('input','settings-switch');fps.type='checkbox';fps.id='show-fps';fps.setAttribute('role','switch');fpsRow.append(el('span',null,'Performance stats'),fps);panels.display.append(fpsRow);

 const distanceRow=el('div','render-distance-control'),distanceHeading=el('div','sound-row-heading'),distanceLabel=el('label',null,'Render distance'),distanceOutput=el('output'),distance=el('input');distance.id='render-distance';distance.type='range';distance.min=500;distance.max=11000;distance.step=500;distanceLabel.htmlFor=distance.id;distanceOutput.htmlFor=distance.id;distanceHeading.append(distanceLabel,distanceOutput);distanceRow.append(distanceHeading,distance,el('small',null,'Draw less distant scenery for better performance.'));panels.display.append(distanceRow);
 const graphicsToggles={},performancePanel=el('div','performance-controls');performancePanel.append(el('h3',null,'Performance controls'),el('p',null,'Switch off expensive effects for smoother play. Changes apply immediately.'));panels.display.append(performancePanel);for(const [key,label,description] of [['reflections','Live water reflections','Off uses a cached city panorama for faster rendering.'],['shadows','Real-time shadows','Off removes cast shadows; sunlight and materials stay.'],['distantDetail','Distant detail','Off draws simpler distant shapes and nearby greenery only.']]){const row=el('label','setting-toggle'),copy=el('span'),input=el('input','settings-switch');copy.append(el('span',null,label),el('small',null,description));input.type='checkbox';input.id='graphics-'+key;input.setAttribute('role','switch');input.setAttribute('aria-label',label);row.append(copy,input);performancePanel.append(row);graphicsToggles[key]=input;input.onchange=()=>{displayPrefs[key]=input.checked;displayApply(true)}}
 const coolToggles={},coolPanel=el('section','performance-controls cool-modes');
 coolPanel.setAttribute('aria-labelledby','cool-modes-title');
 const coolTitle=el('h3',null,'Cool modes');coolTitle.id='cool-modes-title';
 coolPanel.append(coolTitle,el('p',null,'Normally, only Shift-boosted flight and swimming cause damage.'));
 panels.display.append(coolPanel);
 for(const [key,label,description] of [
  ['coolFly','Fly','Cause damage during ordinary flight, too.'],
  ['coolWalk','Walk','Cause damage while walking or sprinting.']
 ]){
  const row=el('label','setting-toggle'),copy=el('span'),input=el('input','settings-switch');
  copy.append(el('span',null,label),el('small',null,description));
  input.type='checkbox';input.id='setting-'+key;input.setAttribute('role','switch');input.setAttribute('aria-label',label);
  row.append(copy,input);coolPanel.append(row);coolToggles[key]=input;
  input.onchange=()=>{displayPrefs[key]=input.checked;displayApply(true)};
 }
 let displayPrefs={coolFly:false,coolWalk:false,reflections:false,shadows:false,distantDetail:false,quality:'balanced',reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,fps:true,renderDistance:3000,renderDistanceVersion:2};try{const v=JSON.parse(localStorage.getItem('t1-bubble-city.display.v1'));if(v&&typeof v.reduced==='boolean'&&typeof v.fps==='boolean')displayPrefs={...displayPrefs,...v,renderDistanceVersion:2,renderDistance:v.renderDistanceVersion===2?Math.max(500,Math.min(11000,Math.round((Number(v.renderDistance)||3000)/500)*500)):3000,quality:Object.hasOwn(PROFILES,v.quality)?v.quality:'balanced'}}catch{}

 Object.assign(displayPrefs,readCoolModes(displayPrefs));
 const resolution=$('settings-resolution'),worldCanvas=document.querySelector('canvas'),resolutionSelect=$('resolution-select');

 function updateResolution(){resolution.textContent='Rendering at '+worldCanvas.dataset.resolution+' px';const p=PROFILES[displayPrefs.quality],actual=Number(worldCanvas.dataset.resolution.split(' × ')[0]),target=p.longEdge?p.longEdge*innerWidth/Math.max(innerWidth,innerHeight):innerWidth*Math.max(1,devicePixelRatio)*p.scale;display.querySelector('.quality-note').textContent=actual<Math.floor(target)-1?'Limited to this render size by the device or performance pixel limit.':displayPrefs.quality==='balanced'?'Native matches your window. Choose a lower pixel size for less GPU work.':'Fixed resolution, fitted to your window’s proportions. Lower pixel sizes use less GPU power.'}

 new MutationObserver(updateResolution).observe(worldCanvas,{attributes:true,attributeFilter:['data-resolution']});

 function displayApply(save=false){for(const [key,input] of Object.entries(coolToggles))input.checked=displayPrefs[key]===true;for(const [key,input] of Object.entries(graphicsToggles))input.checked=displayPrefs[key]!==false;applyDisplay(displayPrefs);updateResolution();resolutionSelect.value=displayPrefs.quality;motion.checked=displayPrefs.reduced;fps.checked=displayPrefs.fps;distance.value=displayPrefs.renderDistance;distanceOutput.textContent=(displayPrefs.renderDistance/1000).toFixed(1)+' km';distance.style.setProperty('--fill',100*(displayPrefs.renderDistance-500)/10500+'%');distance.setAttribute('aria-valuetext',distanceOutput.textContent);if(save)try{localStorage.setItem('t1-bubble-city.display.v1',JSON.stringify(displayPrefs))}catch{announce('Display preferences applied for this visit.')}}

 resolutionSelect.onchange=()=>{displayPrefs.quality=resolutionSelect.value;displayApply(true)};motion.onchange=e=>{displayPrefs.reduced=e.target.checked;displayApply(true)};fps.onchange=()=>{displayPrefs.fps=fps.checked;displayApply(true)};distance.oninput=()=>{displayPrefs.renderDistance=Number(distance.value);displayApply(true)};displayApply();

 function refresh(){for(const [key,input] of Object.entries(toggles))input.checked=audio.preferences[key];for(const [key,{input,out,row,enabledKey}] of Object.entries(ranges)){input.value=key in audio.levels?audio.levels[key]:audio.preferences[key];out.textContent=input.value+'%';input.style.setProperty('--fill',input.value+'%');row.classList.toggle('is-muted',!audio.preferences[enabledKey])}muted.hidden=audio.enabled;}

 audio.onChange=()=>{refresh();$('sound').textContent=audio.enabled?'SOUND ON ♪':'SOUND OFF ♪';$('sound').setAttribute('aria-pressed',String(audio.enabled))};audio.isSettingsOpen=()=>dialog.open;

 const clock=s=>Math.floor((s||0)/60)+':'+String(Math.floor((s||0)%60)).padStart(2,'0');audio.onProgress=()=>{if(!dialog.open||panels.audio.hidden)return;const d=audio.music.duration;if(Number.isFinite(d)){seek.max=d;if(document.activeElement!==seek)seek.value=audio.music.currentTime;time.textContent=clock(audio.music.currentTime)+' / '+clock(d);seek.style.setProperty('--fill',100*audio.music.currentTime/d+'%')}};

 function finish(){audio.stopPreview();dialog.close();release();opener?.focus()};close.onclick=done.onclick=finish;dialog.addEventListener('cancel',e=>{e.preventDefault();finish()});

 audio.sync();select('display');return{open(section='display',from=$('settings')){opener=from;release();select(section);if(section==='music')playback.details.open=true;refresh();announce('');dialog.showModal();buttons[section==='display'?'display':'audio'].focus()}};

}

