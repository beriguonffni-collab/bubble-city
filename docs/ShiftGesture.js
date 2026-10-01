export const ROLL_SECONDS=.42;
export const SHIFT_TAP_MS=250;
export function rollBurstSpeed(progress){return 160+680*Math.pow(Math.max(0,Math.sin(Math.PI*Math.min(1,Math.max(0,progress)))),.7)}
// A boom is only knowable on release: held Shift never schedules one.
export class ShiftGesture{
 constructor(){this.cancel()}
 down(code,input,now){if(this.code)return;this.code=code;this.input={...input};this.started=now}
 held(now){return !!this.code&&now-this.started>SHIFT_TAP_MS}
 up(code,now){if(code!==this.code)return null;const result=now-this.started<=SHIFT_TAP_MS?this.input:null;this.cancel();return result}
 cancel(){this.code=null;this.input=null;this.started=0}
}
