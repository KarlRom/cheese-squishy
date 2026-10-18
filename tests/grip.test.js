import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceCreep,pinchContinuity,retainMissingGrip} from '../grip.js';
import {fingerContact,balanceContacts} from '../fingertips.js';
import {SquishyMaterial} from '../physics.js';
const press={point:[0,0,1],normal:[0,0,1],radius:.22,depth:.40,drag:[0,0,0]};
function sustain(contact,seconds,hz=60){
  const p=new SquishyMaterial(new Float32Array([0,0,1,.4,0,1,1.6,0,1,0,0,-1]));
  let creep=0;
  for(let i=0;i<seconds*hz;i++){
    creep=advanceCreep(creep,1/hz,contact);p.step(1/hz,[fingerContact({...contact,creep})]);
  }
  return {p,creep};
}
test('holding pressure continues to deepen and broaden the dent over several seconds',()=>{
  const early=sustain(press,1).p,late=sustain(press,7).p;
  assert.ok(late.offset[2]<early.offset[2]-.04);
  assert.ok(late.offset[5]<early.offset[5]-.03);
  assert.equal(late.offset[8],0);assert.equal(late.offset[11],0);
});
test('a held retreat stretches farther over time with a broad shoulder and slow non-bouncing release',()=>{
  const contact={...press,depth:.02,depthControlled:true,cameraPull:.32};
  const early=sustain(contact,1).p,late=sustain(contact,7).p;
  assert.ok(late.offset[2]>early.offset[2]+.04);assert.ok(late.offset[5]>.5*late.offset[2]);
  let previous=late.offset.slice();
  for(let i=0;i<120;i++){
    late.step(1/60);
    for(let j=0;j<previous.length;j++)assert.ok(Math.abs(late.offset[j])<=Math.abs(previous[j])+1e-8);
    previous=late.offset.slice();
  }
  assert.ok(late.offset[2]>.15);
});
test('sustained creep is frame-rate independent, has no timed cutoff, and remains bounded',()=>{
  const a=sustain(press,6,30),b=sustain(press,6,120),long=sustain(press,45);
  assert.ok(Math.abs(a.creep-b.creep)<1e-8);
  assert.ok(Math.abs(a.p.offset[2]-b.p.offset[2])<.005);
  assert.ok(long.creep>0&&long.creep<=1);assert.ok(long.p.offset[2]<-.3&&long.p.offset[2]>-.6);
  assert.equal(advanceCreep(0,1/60,{depth:.07}),0);
});
test('expressive sideways stretch retains ordered vertices under maximum sustained creep',()=>{
  const rest=new Float32Array(Array.from({length:401},(_,i)=>[(i-200)*.01,0,1]).flat());
  for(const paired of [false,true]){
    const p=new SquishyMaterial(rest);
    const contacts=(paired?[-.3,.3]:[0]).map(x=>fingerContact({...press,point:[x,0,1],drag:[paired?Math.sign(x)*10:10,0,0],radius:.17,creep:1}));
    for(let i=0;i<240;i++)p.step(1/60,balanceContacts(contacts));
    for(let i=3;i<rest.length;i+=3)assert.ok(rest[i]+p.offset[i]-rest[i-3]-p.offset[i-3]>.0005);
  }
});
test('pinch uncertainty is brief, a wide opening releases immediately, and folded tips never latch',()=>{
  const initial=pinchContinuity(.2,true,null,0);
  const uncertain=pinchContinuity(.6,true,initial,100);assert.equal(uncertain.pinched,true);
  assert.equal(pinchContinuity(.6,true,uncertain,270).pinched,true);
  assert.equal(pinchContinuity(.6,true,uncertain,281).pinched,false);
  assert.equal(pinchContinuity(.8,true,initial,110).pinched,false);
  assert.equal(pinchContinuity(.2,false,initial,110).pinched,false);
  assert.equal(pinchContinuity(.6,true,null,0).pinched,false);
});
test('only an existing missing-hand grip receives grace; visible release and expiry win',()=>{
  const contact={handId:5};
  assert.equal(retainMissingGrip(contact,[],1000,1000),true);
  assert.equal(retainMissingGrip(contact,[],1640,1500),true);
  assert.equal(retainMissingGrip(contact,[],1651,1650),false);
  assert.equal(retainMissingGrip(contact,[{id:5,fingers:[]}],1100,1100),false);
  assert.equal(contact.missingSince,null);
});

test('a confirmed pinch remains active for an extended hold without a duration cutoff',()=>{
  let state=pinchContinuity(.2,true,null,0);
  for(let t=50;t<=60000;t+=50){state=pinchContinuity(.25,true,state,t);assert.equal(state.pinched,true);}
  assert.equal(pinchContinuity(.85,true,state,60050).pinched,false);
});

test('reidentified nearby hands cannot duplicate the old held contact',()=>{
  const contact={handId:5,palm:{x:.4,y:.5}};
  assert.equal(retainMissingGrip(contact,[{id:7,palm:{x:.42,y:.51}}],1000,1000),false);
});

test('held camera pokes and pulls grow exaggerated while short touches stay gentle',()=>{
  const push={...press,depthControlled:true};
  const pull={...press,depth:.02,depthControlled:true,cameraPull:.36};
  const earlyPush=sustain(push,.25).p,latePush=sustain(push,12).p;
  const earlyPull=sustain(pull,.25).p,latePull=sustain(pull,12).p;
  assert.ok(latePush.offset[2]<-.72);
  assert.ok(latePull.offset[2]>.85);
  assert.ok(Math.abs(latePush.offset[2])>Math.abs(earlyPush.offset[2])*2);
  assert.ok(latePull.offset[2]>earlyPull.offset[2]*2);
  for(const p of [latePush,latePull]){
    assert.equal(p.offset[8],0);assert.equal(p.offset[11],0);
    assert.ok([...p.offset].every(Number.isFinite));
  }
});
test('held camera pull has a finger-thick cap rather than a pointed tip',()=>{
  const contact=fingerContact({...press,depth:.02,depthControlled:true,cameraPull:.36,creep:1});
  const p=new SquishyMaterial(new Float32Array([0,0,1,.18,0,1,.4,0,1,1.6,0,1]));
  for(let i=0;i<600;i++)p.step(1/60,[contact]);
  assert.ok(p.offset[5]>.95*p.offset[2]);
  assert.ok(p.offset[8]>.7*p.offset[2]);
  assert.equal(p.offset[11],0);
  let previous=p.offset[2];
  for(let i=0;i<180;i++){p.step(1/60);assert.ok(p.offset[2]<=previous);assert.ok(p.offset[2]>0);previous=p.offset[2];}
});
