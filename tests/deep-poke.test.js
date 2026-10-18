import test from 'node:test';
import assert from 'node:assert/strict';
import {fingerContact} from '../fingertips.js';
import {advanceCreep} from '../grip.js';
import {SquishyMaterial} from '../physics.js';
function hold(camera,seconds){
 const p=new SquishyMaterial(new Float32Array([0,0,1,.18,0,1,.5,0,1,.8,0,1,0,0,-1]));let creep=0;
 for(let i=0;i<seconds*60;i++){
  const c={point:[0,0,1],normal:[0,0,1],drag:[0,0,0],radius:.21,depth:.38,deepPoke:true,depthControlled:camera};
  creep=advanceCreep(creep,1/60,c);p.step(1/60,[fingerContact({...c,creep})]);
 }
 return p;
}
test('held clicks and camera pokes deepen with a finger-sized bottom and compact rim',()=>{
 for(const camera of [false,true]){
  const early=hold(camera,.2),late=hold(camera,12);
  assert.ok(late.offset[2]<-.85);assert.ok(Math.abs(late.offset[2])>Math.abs(early.offset[2])*2.5);
  assert.ok(Math.abs(late.offset[5])>.92*Math.abs(late.offset[2]));
  assert.ok(Math.abs(late.offset[8])<.5*Math.abs(late.offset[2]));
  assert.equal(late.offset[11],0);assert.equal(late.offset[14],0);
  let prev=late.offset[2];for(let i=0;i<120;i++){late.step(1/60);assert.ok(late.offset[2]>=prev&&late.offset[2]<0);prev=late.offset[2];}
 }
});
test('dragging out of a held poke restores the thick stretch field',()=>{
 const c=fingerContact({normal:[0,0,1],drag:[.8,0,0],depth:.38,deepPoke:true,creep:1});assert.equal(c.deepPoke,false);
});
