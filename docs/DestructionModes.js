// Capture movement at contact, before collision response changes swimming or speed.
export function readCoolModes(preferences={}) {
 return {coolFly:preferences.coolFly===true,coolWalk:preferences.coolWalk===true};
}

export function canDamageImpact(event,modes={}) {
 if(!event || event.phase || !Number.isFinite(event.speed) || event.speed<=0) return false;
 if(event.movement==='swim') return event.boosted===true;
 if(event.movement==='fly') return event.boosted===true || modes.coolFly===true;
 if(event.movement==='walk') return modes.coolWalk===true;
 return false;
}
