import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../hand-worker.js',import.meta.url),'utf8');
function worker({faceInitFails=false,faceFrameFails=false}={}){
  const sent=[],calls=[];let closed=0;
  const detector={detectForVideo(bitmap,time){calls.push(['hand',time]);return {landmarks:[],handedness:[]};}};
  const face={detectForVideo(bitmap,time){calls.push(['face',time]);if(faceFrameFails)throw Error('face');return {faceLandmarks:[[{x:.5,y:.5}]]};},close(){}};
  const self={location:{href:'https://example.com/hand-worker.js'},postMessage(message){sent.push(message);}};
  vm.runInNewContext(source,{self,URL,importScripts(){},SquishyVision:{
    FilesetResolver:{forVisionTasks:async()=>({})},HandLandmarker:{createFromOptions:async()=>detector},
    FaceLandmarker:{createFromOptions:async()=>{if(faceInitFails)throw Error('no face');return face;}}
  }});
  return {sent,calls,init:()=>self.onmessage({data:{type:'init'}}),frame:()=>self.onmessage({data:{type:'frame',bitmap:{close(){closed++;}},time:100}}),closed:()=>closed};
}
test('camera worker detects hands and one face from the same frame and closes it',async()=>{
  const w=worker();await w.init();assert.equal(w.sent[0].faceAvailable,true);
  await w.frame();assert.equal(w.sent[1].faceLandmarks.length,1);
  assert.deepEqual(w.calls,[['hand',100],['face',100]]);assert.equal(w.closed(),1);
});
test('a missing face model leaves hand tracking usable',async()=>{
  const w=worker({faceInitFails:true});await w.init();await w.frame();
  assert.equal(w.sent[0].faceAvailable,false);assert.equal(w.sent[1].type,'result');assert.equal(w.sent[1].faceLandmarks,null);
});
test('face inference failure degrades to hands and releases the bitmap',async()=>{
  const w=worker({faceFrameFails:true});await w.init();await w.frame();
  assert.equal(w.sent[1].faceAvailable,false);assert.equal(w.sent[1].type,'result');assert.equal(w.closed(),1);
});
