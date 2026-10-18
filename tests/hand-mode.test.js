import test from 'node:test';
import assert from 'node:assert/strict';
import {HandMode} from '../hand-mode.js';
function harness(getUserMedia){
  const previous=new Map();
  const set=(key,value)=>{previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
  const workers=[];
  class Worker{
    constructor(){workers.push(this);this.terminated=false;}
    postMessage(data){if(data.type==='init')queueMicrotask(()=>this.onmessage?.({data:{type:'ready'}}));}
    terminate(){this.terminated=true;}
  }
  set('window',{Worker,createImageBitmap:()=>{}});set('Worker',Worker);
  set('navigator',{mediaDevices:{getUserMedia}});set('document',{baseURI:'https://example.com/squishy/'});
  set('requestAnimationFrame',()=>1);set('cancelAnimationFrame',()=>{});
  const video={srcObject:null,play:async()=>{},pause:()=>{}};
  const statuses=[],hands=[],overlay={width:320,height:240,getContext:()=>({clearRect:()=>{}})};
  const mode=new HandMode({video,overlay,onHands:v=>hands.push(v),onStatus:(phase,message)=>statuses.push({phase,message})});
  return {mode,workers,statuses,hands,video,restore(){mode.stop();for(const [k,desc]of previous){if(desc)Object.defineProperty(globalThis,k,desc);else delete globalThis[k];}}};
}
function stream(){const track={stopped:false,stop(){this.stopped=true;},addEventListener(){}};return {track,getTracks:()=>[track],getVideoTracks:()=>[track]};}
test('camera is opt-in, audio is never requested, and stopping releases camera and worker',async()=>{
  let calls=0,options;const input=stream();
  const h=harness(async opts=>{calls++;options=opts;return input;});
  try{
    assert.equal(calls,0);await h.mode.start();assert.equal(options.audio,false);
    assert.equal(h.mode.active,true);assert.equal(h.video.srcObject,input);
    h.mode.stop();assert.equal(input.track.stopped,true);assert.equal(h.workers[0].terminated,true);
    assert.equal(h.video.srcObject,null);assert.deepEqual(h.hands.at(-1),[]);
  }finally{h.restore();}
});
test('cancelling while permission is pending closes any late camera stream',async()=>{
  let allow;const input=stream();const h=harness(()=>new Promise(resolve=>{allow=resolve;}));
  try{
    const start=h.mode.start();h.mode.stop();allow(input);await start;
    assert.equal(input.track.stopped,true);assert.equal(h.workers.length,0);assert.equal(h.mode.active,false);
  }finally{h.restore();}
});
test('permission denial produces a useful error and leaves controls recoverable',async()=>{
  const h=harness(async()=>{throw Object.assign(new Error('denied'),{name:'NotAllowedError'});});
  try{
    await h.mode.start();assert.equal(h.mode.phase,'error');assert.equal(h.mode.active,false);
    assert.match(h.statuses.at(-1).message,/not allowed/);assert.equal(h.video.srcObject,null);
  }finally{h.restore();}
});
test('worker failure stops camera and clears hand input',async()=>{
  const input=stream();const h=harness(async()=>input);
  try{
    await h.mode.start();h.workers[0].onmessage({data:{type:'error',message:'Tracking stopped.'}});
    assert.equal(h.mode.phase,'error');assert.equal(input.track.stopped,true);assert.deepEqual(h.hands.at(-1),[]);
  }finally{h.restore();}
});
