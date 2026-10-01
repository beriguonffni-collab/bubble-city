// One shared direction rule for the sonic sound, roll and condensation column.
export function forwardTravel(input){return !!input&&input.f>0&&input.f>Math.abs(input.s||0)}
export const VORTEX_SECONDS=9.5;
export function vortexEnvelope(age){const u=Math.max(0,age)/VORTEX_SECONDS;return u>=1?0:Math.min(1,age/.12)*(1-u*u)*(1-u*u)}
export function arrivalEase(t){t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10)}

export function waterBoostVolume(vortex){return Math.max(0,Math.min(1,vortex))}
