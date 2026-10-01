// F/G/W use double taps. Z toggles Phase once; Shift is only traversal.
const actions={KeyW:'walk',KeyG:'gaze',KeyF:'free'};
export class FlightShortcuts {
  constructor(){this.reset();}
  reset(){this.held=new Set();this.pending=null;}
  keyup(code){this.held.delete(code);}
  keydown(event,now=performance.now()){
    const {code}=event;
    if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing){this.reset();return null;}
    if(event.repeat||this.held.has(code))return null;
    this.held.add(code);if(code==='KeyZ'){this.pending=null;return 'phase'}
    const key=code==='ShiftLeft'||code==='ShiftRight'?'Shift':code;
    if(!actions[key]){this.pending=null;return null;}
    const previous=this.pending;this.pending={key,time:now};
    if(previous?.key===key&&now-previous.time<=400){this.pending=null;return actions[key];}
    return null;
  }
}
