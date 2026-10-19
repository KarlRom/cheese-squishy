const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

export class CameraRotate{
  constructor(){this.reset();}
  reset(){this.id=null;this.started=0;this.lastTime=-1;this.lastRoll=0;this.active=false;}
  update(hands,time){
    if(time===this.lastTime)return {engaged:this.id!==null,active:this.active,delta:0};
    this.lastTime=time;
    const hand=this.id===null?hands.find(h=>h.rotationPose):hands.find(h=>h.id===this.id&&h.rotationPose);
    if(!hand){this.reset();return {engaged:false,active:false,delta:0};}
    if(this.id===null){this.id=hand.id;this.started=time;this.lastRoll=hand.roll;return {engaged:true,active:false,delta:0};}
    const movement=angleDelta(hand.roll,this.lastRoll);
    this.lastRoll=hand.roll;
    if(time-this.started<220)return {engaged:true,active:false,delta:0};
    if(!this.active){this.active=true;return {engaged:true,active:true,delta:0};}
    // Tracking jumps must not spin the model. A wrist turn is slow enough to stay below this bound.
    const delta=Math.abs(movement)>.34?0:clamp(movement,-.13,.13);
    return {engaged:true,active:true,delta:Math.abs(delta)<.006?0:delta};
  }
}
