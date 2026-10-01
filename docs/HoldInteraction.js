export class HoldInteraction{
 constructor(tap,hold,delay=450){this.tap=tap;this.hold=hold;this.delay=delay;this.started=null;this.held=false}
 down(now){if(this.started===null){this.started=now;this.held=false}}
 update(now){if(this.started!==null&&!this.held&&now-this.started>=this.delay){this.held=true;this.hold()}}
 up(now){if(this.started===null)return;const short=!this.held&&now-this.started<this.delay,long=!this.held&&!short;this.started=null;if(short)this.tap();else if(long)this.hold()}
 cancel(){this.started=null;this.held=false}
}
