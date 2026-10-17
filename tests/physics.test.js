import test from 'node:test';
import assert from 'node:assert/strict';
import { SquishyMaterial } from '../physics.js';
const rest = new Float32Array([0,0,1, .9,.9,-1, .25,0,1, 0,-1,0]);
const contact = {point:[0,0,1],normal:[0,0,1],drag:[.1,0,0],radius:.45,depth:.65};
function load(material, frames=120, contacts=[contact], pinch=null, squeeze=0) {
  for(let i=0;i<frames;i++)material.step(1/60,contacts,pinch,squeeze);
}
test('a press is local; nearby mesh moves more than the far side',()=>{
  const m=new SquishyMaterial(rest);load(m);
  assert(m.offset[2]<-.3);
  assert(Math.abs(m.offset[2])>Math.abs(m.offset[5])*10);
});
test('release decays monotonically, never reverses or overshoots, and matches exponential recovery',()=>{
  const m=new SquishyMaterial(rest);load(m);
  const initial=m.offset.slice();
  for(let frame=0;frame<600;frame++){
    const previous=m.offset.slice();m.step(1/60);
    for(let i=0;i<previous.length;i++){
      assert(Math.abs(m.offset[i])<=Math.abs(previous[i])+1e-8);
      assert(m.offset[i]*initial[i]>=0);
    }
  }
  assert(Math.abs(m.offset[2]/initial[2]-Math.exp(-10/m.recoveryTime))<.0001);
  assert(Math.abs(m.offset[2])>Math.abs(initial[2])*.7,'default should retain a substantial dent after 10 seconds');
});
test('firm resistance yields a shallower press',()=>{
  const soft=new SquishyMaterial(rest),firm=new SquishyMaterial(rest);soft.resistance=0;firm.resistance=1;
  load(soft);load(firm);assert(Math.abs(firm.offset[2])<Math.abs(soft.offset[2])*.4);
});
test('recovery slider changes release speed',()=>{
  const slow=new SquishyMaterial(rest),fast=new SquishyMaterial(rest);slow.recovery=0;fast.recovery=1;
  load(slow);load(fast);for(let i=0;i<600;i++){slow.step(1/60);fast.step(1/60);}
  assert(Math.abs(slow.offset[2])>Math.abs(fast.offset[2])*4);
});
test('pinch compresses along its axis and preserves transverse bulge',()=>{
  const m=new SquishyMaterial(new Float32Array([1,0,0, 0,1,0]));
  load(m,120,[],{axis:[1,0,0],amount:.5});assert(m.offset[0]<-.3);assert(m.offset[4]>.05);
});
test('stress: overlapping contacts, big dt, floor constraint, and reset remain finite',()=>{
  const m=new SquishyMaterial(rest);
  for(let i=0;i<100;i++)m.step(10,[contact,contact,contact,contact],{axis:[1,0,0],amount:.65},1);
  const out=new Float32Array(rest.length);m.writePositions(out);
  assert(out.every(Number.isFinite));
  for(let i=1;i<out.length;i+=3)assert(out[i]>=-1.01501);
  m.reset();m.writePositions(out);assert.deepEqual(out,rest);assert.equal(m.activity,0);
});
test('same elapsed time gives consistent recovery at 30 and 120 Hz',()=>{
  const a=new SquishyMaterial(rest),b=new SquishyMaterial(rest);load(a);load(b);
  for(let i=0;i<300;i++)a.step(1/30);
  for(let i=0;i<1200;i++)b.step(1/120);
  assert(Math.abs(a.offset[2]-b.offset[2])<.00001);
});
