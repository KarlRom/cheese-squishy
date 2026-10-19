const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

export class CameraRotate{
  constructor(){this.reset();}
  reset(){
    this.id=null;this.started=0;this.lastTime=-1;this.lastRoll=0;
    this.active=false;this.targetVelocity=0;this.velocity=0;
  }
  update(hands,time){
    if(time===this.lastTime)return this.id!==null;
    const hand=this.id===null?hands.find(h=>h.rotationPose):hands.find(h=>h.id===this.id&&h.rotationPose);
    if(!hand){
      // A deliberate release coasts briefly; stale tracking should stop outright.
      if(this.id!==null&&time-this.lastTime>500)this.velocity=0;
      this.id=null;this.active=false;this.targetVelocity=0;this.lastTime=time;
      return false;
    }
    if(this.id===null){
      this.id=hand.id;this.started=time;this.lastTime=time;this.lastRoll=hand.roll;
      this.targetVelocity=0;return true;
    }
    const elapsed=Math.max(1,time-this.lastTime);
    const movement=angleDelta(hand.roll,this.lastRoll);
    this.lastRoll=hand.roll;this.lastTime=time;
    if(time-this.started<220){this.targetVelocity=0;return true;}
    if(!this.active){this.active=true;this.targetVelocity=0;return true;}
    // Ignore impossible changes from landmark swaps, then filter the measured speed.
    this.targetVelocity=Math.abs(movement)>.34||elapsed>350?0:
      clamp(Math.abs(movement)<.006?0:movement/(elapsed/1000),-2.3,2.3);
    return true;
  }
  step(now,dt){
    const target=this.id!==null&&now-this.lastTime<180?this.targetVelocity:0;
    const decay=target===0?.20:.10;
    this.velocity+=(target-this.velocity)*(1-Math.exp(-Math.max(0,dt)/decay));
    if(Math.abs(this.velocity)<.015)this.velocity=0;
    return this.velocity*dt;
  }
}
