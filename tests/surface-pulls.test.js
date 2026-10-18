import test from 'node:test';
import assert from 'node:assert/strict';
import {fingerContact} from '../fingertips.js';
import {SquishyMaterial} from '../physics.js';
import {PinchGrips} from '../pinch-grip.js';
test('actual camera grips extend the connected surface by a restrained amount',()=>{
 const vertices=new Float32Array(Array.from({length:201},(_,i)=>[(i-100)*.016,0,1]).flat());
 const rest=vertices.slice(),p=new SquishyMaterial(vertices);
 const [grip]=new PinchGrips().update([{handId:1,tip:8,pinching:true,point:[0,0,1],normal:[0,0,1],drag:[.6,0,0],cameraPull:2.8,depth:.01,depthControlled:true,creep:1,radius:.21}]);
 for(let i=0;i<600;i++)p.step(1/60,[fingerContact(grip)]);
 const positions=new Float32Array(rest.length);p.writePositions(positions);
 assert.equal(positions.length,rest.length);assert.ok([...positions].every(Number.isFinite));
 const center=100*3;assert.ok(p.offset[center+2]>.2&&p.offset[center+2]<.6);
 for(let i=3;i<positions.length;i+=3){
  assert.ok(positions[i]>positions[i-3]);
  assert.ok(Math.hypot(positions[i]-positions[i-3],positions[i+2]-positions[i-1])<.06);
 }
 assert.equal(p.offset[2],0);assert.equal(p.offset[p.offset.length-1],0);
});
