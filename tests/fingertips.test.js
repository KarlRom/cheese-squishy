import test from 'node:test';
import assert from 'node:assert/strict';
import {fingerContact} from '../fingertips.js';
import {SquishyMaterial} from '../physics.js';
const rest=new Float32Array([0,0,1,.2,0,1,.8,0,1,0,0,-1,1,0,1]);
function loaded(contact){const p=new SquishyMaterial(rest);for(let i=0;i<90;i++)p.step(1/60,[fingerContact(contact)]);return p;}
const press={point:[0,0,1],normal:[0,0,1],radius:.22,depth:.38,drag:[0,0,0]};
test('a fingertip dent moves its center and shoulder but leaves nearby and opposite regions untouched',()=>{
  const p=loaded(press);
  assert.ok(p.offset[2]<-.2);assert.ok(p.offset[5]<-.07);
  assert.equal(p.offset[8],0);assert.equal(p.offset[11],0);assert.equal(p.offset[14],0);
});
test('pulling stretches a local attachment outward without moving the whole toy',()=>{
  const p=loaded({...press,drag:[1,0,0]});
  assert.ok(p.offset[0]>.55);assert.ok(p.offset[2]>.1);
  assert.equal(p.offset[6],0);assert.equal(p.offset[11],0);
  for(const n of p.offset)assert.ok(Number.isFinite(n));
});
test('two separated fingertips make two dents with undisturbed material between them',()=>{
  const vertices=new Float32Array([-.6,0,1,0,0,1,.6,0,1,0,0,-1]);
  const p=new SquishyMaterial(vertices);
  const contacts=[-.6,.6].map(x=>fingerContact({...press,point:[x,0,1],radius:.20}));
  for(let i=0;i<90;i++)p.step(1/60,contacts);
  assert.ok(p.offset[2]<-.2);assert.ok(p.offset[8]<-.2);
  assert.equal(p.offset[5],0);assert.equal(p.offset[11],0);
});
test('a released fingertip pull recovers slowly without overshoot',()=>{
  const p=loaded({...press,drag:[1,0,0]});
  let before=p.offset.slice();
  for(let frame=0;frame<120;frame++){
    p.step(1/60);
    for(let i=0;i<before.length;i++){
      assert.ok(Math.abs(p.offset[i])<=Math.abs(before[i])+1e-8);
      assert.ok(p.offset[i]*before[i]>=0);
    }
    before=p.offset.slice();
  }
  assert.ok(p.offset[0]>.5);
});
