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

test('five overlapping fingertips share pressure instead of multiplying it',async()=>{
  const {balanceContacts}=await import('../fingertips.js');
  const one=loaded(press),many=new SquishyMaterial(rest);
  const contacts=balanceContacts(Array.from({length:5},()=>fingerContact(press)));
  for(let i=0;i<90;i++)many.step(1/60,contacts);
  for(let i=0;i<one.offset.length;i++)assert.ok(Math.abs(one.offset[i]-many.offset[i])<1e-6);
});

test('scrunching gathers two surface patches inward without outward pull or moving the center',async()=>{
  const {scrunchContact,balanceContacts}=await import('../fingertips.js');
  const vertices=new Float32Array([-.6,0,1,0,0,1,.6,0,1,0,0,-1]);
  const p=new SquishyMaterial(vertices);
  const contacts=[-.6,.6].map(x=>fingerContact(scrunchContact({...press,point:[x,0,1]},[0,0,1],.75)));
  assert.ok(contacts.every(c=>c.pull===0));
  for(let i=0;i<90;i++)p.step(1/60,balanceContacts(contacts));
  assert.ok(p.offset[0]>.08);assert.ok(p.offset[6]<-.08);
  assert.ok(p.offset[2]<-.10&&p.offset[8]<-.10);
  assert.equal(p.offset[3],0);assert.equal(p.offset[11],0);
  let before=p.offset.slice();
  for(let i=0;i<90;i++){
    p.step(1/60);
    for(let j=0;j<before.length;j++)assert.ok(Math.abs(p.offset[j])<=Math.abs(before[j])+1e-8);
    before=p.offset.slice();
  }
});
test('scrunch gathering is tangential, bounded and keeps the gentler strength scale',async()=>{
  const {scrunchContact}=await import('../fingertips.js');
  const c=scrunchContact(press,[100,0,100],5),f=fingerContact(c);
  assert.equal(c.drag[2],0);assert.ok(Math.hypot(...c.drag)<=.22+1e-10);
  assert.equal(f.pull,0);assert.equal(f.drag[0],c.drag[0]*.85);
  assert.ok(f.depth<=.40*.85);
});
test('grips may use recent surface hits during closure but never stale or absent hits',async()=>{
  const {recentGripHit}=await import('../fingertips.js');
  const attachment={triangle:[0,1,2],bary:[.3,.4,.3]};
  const cached={lastAttachment:attachment,lastSeen:100};
  assert.equal(recentGripHit(cached,450,true),attachment);
  assert.equal(recentGripHit(cached,501,true),null);
  assert.equal(recentGripHit(cached,200,false),null);
  assert.equal(recentGripHit(undefined,200,true),null);
});
