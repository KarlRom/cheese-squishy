import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../hand-worker.js',import.meta.url),'utf8');
function worker({faceInitFails=false,faceFrameFails=false}={}){
  const sent=[],calls=[],options={};let closed=0;
  const detector={detectForVideo(bitmap,time){calls.push(['hand',time]);return {landmarks:[],handedness:[]};}};
  const face={detectForVideo(bitmap,time){calls.push(['face',time]);if(faceFrameFails)throw Error('face');return {faceLandmarks:[[{x:.5,y:.5}]],faceBlendshapes:[{categories:[{categoryName:'jawOpen',score:.6}]}]};},close(){}};
  const self={location:{href:'https://example.com/hand-worker.js'},postMessage(message){sent.push(message);}};
  vm.runInNewContext(source,{self,URL,importScripts(){},SquishyVision:{
    FilesetResolver:{forVisionTasks:async()=>({})},HandLandmarker:{createFromOptions:async()=>detector},
    FaceLandmarker:{createFromOptions:async (files,opts)=>{options.face=opts;if(faceInitFails)throw Error('no face');return face;}}
  }});
  return {sent,calls,options,init:()=>self.onmessage({data:{type:'init'}}),frame:(time=100)=>self.onmessage({data:{type:'frame',bitmap:{close(){closed++;}},time}}),closed:()=>closed};
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

test('worker requests jaw expressions and prioritizes hand frames between face updates',async()=>{
  const w=worker();await w.init();assert.equal(w.options.face.outputFaceBlendshapes,true);
  await w.frame(100);await w.frame(160);await w.frame(250);
  assert.equal(w.calls.filter(c=>c[0]==='hand').length,3);
  assert.equal(w.calls.filter(c=>c[0]==='face').length,2);
  assert.equal(w.sent[1].faceBlendshapes[0].categoryName,'jawOpen');
  assert.equal(w.sent[2].faceUpdated,false);assert.equal(w.sent[3].faceUpdated,true);
  assert.equal(w.closed(),3);
});
