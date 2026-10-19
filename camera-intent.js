// A new camera contact needs a recent, steady press over the toy. The tracker
// may report a pinch or approach during an ordinary sweep across the frame.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class CameraIntent {
  constructor({holdMs=220,tipRadius=.04,palmRadius=.055}={}){
    this.holdMs=holdMs;this.tipRadius=tipRadius;this.palmRadius=palmRadius;
    this.candidates=new Map();
  }
  clear(){this.candidates.clear();}
  forget(key){this.candidates.delete(key);}
  prune(keys){for(const key of this.candidates.keys())if(!keys.has(key))this.forget(key);}
  ready(key,{pressing,tip,palm,sampleTime,hit}){
    if(!pressing||!hit||!tip||!palm||!Number.isFinite(sampleTime)){
      this.forget(key);return false;
    }
    const previous=this.candidates.get(key);
    if(previous?.sampleTime===sampleTime)return sampleTime-previous.since>=this.holdMs;
    const moved=previous&&(sampleTime-previous.sampleTime>300||sampleTime<previous.sampleTime||
      distance(tip,previous.startTip)>this.tipRadius||distance(palm,previous.startPalm)>this.palmRadius);
    const state=!previous||moved?{since:sampleTime,startTip:{...tip},startPalm:{...palm}}:previous;
    state.sampleTime=sampleTime;this.candidates.set(key,state);
    return sampleTime-state.since>=this.holdMs;
  }
}

export const pullFromGrip=(travel,origin)=>Math.max(0,(travel||0)-(origin||0));
