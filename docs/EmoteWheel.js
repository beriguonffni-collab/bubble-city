export const EMOTES=[
 ['Pearlwave','Dance_Loop','Celebrate'],['Sovereign','Idle_FoldArms_Loop','Pose'],['Arcane tide','Spell_Simple_Idle_Loop','Mystic'],['Tidal pulse','Spell_Simple_Shoot','Mystic'],
 ['A quiet moment','Sitting_Idle_Loop','Relax'],['Storyteller','Idle_Talking_Loop','Social'],['Absolutely','Yes','Social'],['Not today','Idle_No_Loop','Social'],
 ['Calling the skyline','Idle_Rail_Call','Social'],['Pocket universe','Idle_TalkingPhone_Loop','Social'],['Lantern keeper','Idle_Lantern_Loop','Pose'],['Sentinel','Idle_Shield_Loop','Pose'],
 ['Shadow jab','Punch_Jab','Action'],['Cross current','Punch_Cross','Action'],['Riptide hook','Melee_Hook','Action'],['Meteor toss','OverhandThrow','Action'],
 ['Guardian burst','Shield_Dash','Action'],['Knight of pearls','Sword_Idle','Pose'],['Aurora arc','Sword_Attack','Action'],['Three tides','Sword_Regular_Combo','Action'],
 ['Deepwater artisan','Fixing_Kneeling','Life'],['Seed of tomorrow','Farm_PlantSeed','Life'],['Coral gardener','Farm_Watering','Life'],['Gather the light','Farm_Harvest','Life'],
 ['Hidden treasure','Chest_Open','Life'],['Tea break','Consume','Life'],['Skyline lookout','Idle_Rail_Loop','Relax'],['Conversations','Sitting_Talking_Loop','Social'],
 ['Awaken','LayToIdle','Action'],['Moonwalker','Zombie_Walk_Fwd_Loop','Play'],['Midnight visitor','Zombie_Idle_Loop','Play'],['Unstoppable','Sword_Heavy_Combo','Action'],
 ['Ninja spirit','NinjaJump_Idle_Loop','Pose'],['The conductor','Interact','Social'],['Carry a dream','Walk_Carry_Loop','Life'],['Torchbearer','Idle_Torch_Loop','Pose'],
 ['Gathering power','Spell_Simple_Enter','Mystic'],['Releasing power','Spell_Simple_Exit','Mystic'],['Emerald guard','Sword_Block','Pose'],['Grounded grace','Crouch_Idle_Loop','Pose']
].map(([name,clip,category])=>({name,clip,category}));
// Annular hit targets leave the player and world visible through the center.
export function sectorPath(index){
 const point=(r,a)=>[50+Math.sin(a)*r,50-Math.cos(a)*r].map(v=>v.toFixed(3)).join('% ')+'%';
 const start=(index-.5)*Math.PI/4+.012,end=(index+.5)*Math.PI/4-.012,points=[];
 for(let j=0;j<=16;j++)points.push(point(49,start+(end-start)*j/16));
 for(let j=16;j>=0;j--)points.push(point(29,start+(end-start)*j/16));
 return 'polygon('+points.join(',')+')';
}
export function createEmoteWheel({release,select}){
 const dialog=document.createElement('dialog');dialog.id='emote-wheel';dialog.setAttribute('aria-label','Emotes');
 dialog.innerHTML='<div class="wheel-heading"><h2>EMOTES</h2><span id="emote-page"></span></div><button class="wheel-close" aria-label="Close emotes">&#215;</button><div class="wheel-ring" role="group" aria-label="Choose an emote"></div><div class="wheel-caption"><strong id="emote-name">Pearlwave</strong><span id="emote-category">Celebrate</span></div><footer><button id="emote-prev" aria-label="Previous emotes">&#8592;</button><span>1&#8211;8 select &nbsp; / &nbsp; scroll pages &nbsp; / &nbsp; Esc close</span><button id="emote-next" aria-label="Next emotes">&#8594;</button></footer>';
 document.body.append(dialog);let page=0;
 function highlight(item,button){dialog.querySelectorAll('.emote-sector').forEach(b=>b.classList.toggle('selected',b===button));dialog.querySelector('#emote-name').textContent=item.name;dialog.querySelector('#emote-category').textContent=item.category}
 function choose(item){dialog.close();select(item)}
 function render(){
  const ring=dialog.querySelector('.wheel-ring');ring.replaceChildren();
  EMOTES.slice(page*8,page*8+8).forEach((item,i)=>{
   const a=i*Math.PI/4,b=document.createElement('button');b.className='emote-sector';b.setAttribute('aria-label',(i+1)+'. '+item.name);b.title=item.name;b.style.clipPath=sectorPath(i);
   b.style.setProperty('--x',(50+Math.sin(a)*39)+'%');b.style.setProperty('--y',(50-Math.cos(a)*39)+'%');
   b.innerHTML='<img src="./emotes/'+item.clip+'.png" alt="" draggable="false"><span class="emote-key">'+(i+1)+'</span>';
   b.onpointerenter=()=>highlight(item,b);b.onfocus=()=>highlight(item,b);b.onclick=()=>choose(item);ring.append(b);
   if(i===0)highlight(item,b);
  });
  dialog.querySelector('#emote-page').textContent=(page+1)+' / '+Math.ceil(EMOTES.length/8);
 }
 function change(d){page=(page+d+Math.ceil(EMOTES.length/8))%Math.ceil(EMOTES.length/8);render()}
 dialog.querySelector('#emote-prev').onclick=()=>change(-1);dialog.querySelector('#emote-next').onclick=()=>change(1);dialog.querySelector('.wheel-close').onclick=()=>dialog.close();
 let lastScroll=0;dialog.addEventListener('wheel',e=>{e.preventDefault();if(performance.now()-lastScroll>180&&e.deltaY){change(Math.sign(e.deltaY));lastScroll=performance.now()}},{passive:false});
 dialog.addEventListener('keydown',e=>{if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();change(e.code==='ArrowRight'?1:-1)}if(/^Digit[1-8]$/.test(e.code)&&!e.repeat){e.preventDefault();choose(EMOTES[page*8+Number(e.code.slice(-1))-1])}});
 return{open(){release();render();dialog.showModal()},get opened(){return dialog.open}};
}
