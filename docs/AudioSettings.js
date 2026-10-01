export const AUDIO_KEY='t1-bubble-city.audio-levels.v1';
export const DEFAULT_AUDIO={jump:55,walk:65};
export function validLevel(value){return Number.isFinite(value)&&value>=0&&value<=100;}
export function readAudioLevels(storage){
 let saved={};try{saved=JSON.parse(storage.getItem(AUDIO_KEY))||{};}catch{}
 return Object.fromEntries(Object.entries(DEFAULT_AUDIO).map(([key,value])=>[key,validLevel(saved[key])?saved[key]:value]));
}
export function writeAudioLevels(storage,levels){
 if(!Object.keys(DEFAULT_AUDIO).every(key=>validLevel(levels[key])))throw Error('Volume must be between 0 and 100.');
 storage.setItem(AUDIO_KEY,JSON.stringify({jump:levels.jump,walk:levels.walk}));
}

export const AUDIO_FAVORITES_KEY='t1-bubble-city.audio-favorites.v1';
export function validAudioFavorite(p){return !!p&&typeof p.id==='string'&&p.id.length>0&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=80&&validLevel(p.jump)&&validLevel(p.walk);}
function validFavorites(items){return Array.isArray(items)&&items.every(validAudioFavorite)&&new Set(items.map(p=>p.id)).size===items.length;}
export function readAudioFavorites(storage){
 const raw=storage.getItem(AUDIO_FAVORITES_KEY);if(raw===null)return [];
 const items=JSON.parse(raw);if(!validFavorites(items))throw Error('Saved audio favorites could not be read. Existing data has been kept.');return items;
}
export function writeAudioFavorites(storage,items){
 if(!validFavorites(items))throw Error('Check the favorite name and volume levels.');
 storage.setItem(AUDIO_FAVORITES_KEY,JSON.stringify(items));
}
