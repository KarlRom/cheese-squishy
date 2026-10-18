import test from 'node:test';
import assert from 'node:assert/strict';
import {PinchGrips} from '../pinch-grip.js';
import {fingerContact,balanceContacts} from '../fingertips.js';
import {SquishyMaterial} from '../physics.js';
const contact=(tip,x)=>({handId:'left',tip,pinching:true,point:[x,0,1],normal:[0,0,1],drag:[0,0,0],depth:.01,cameraPull:.8,depthControlled:true,creep:1,radius:.2});
test('a pinch is one full-strength persistent grip, surviving a fingertip visibility swap',()=>{
 const grips=new PinchGrips(),thumb=contact(4,-.1),index=contact(8,.1);
 const [grip]=grips.update([thumb,index]);
 assert.deepEqual(grip.point,index.point);assert.equal(grips.update([thumb,index]).length,1);
 assert.deepEqual(grips.update([{...thumb,point:[-.5,0,1]}])[0].point,index.point);
 assert.equal(balanceContacts([fingerContact(grip)])[0].weight,1);
 grips.update([]);assert.deepEqual(grips.update([thumb])[0].point,thumb.point);
 grips.clear();assert.equal(grips.grips.size,0);
});
test('two hands remain independent and nonpinched fingers keep separate contacts',()=>{
 const grips=new PinchGrips();
 assert.equal(grips.update([contact(4,0),contact(8,.1),{...contact(8,.7),handId:'right'},{...contact(12,.8),pinching:false}]).length,3);
});
test('a long grip transports a finger-width cap and underlying material with a thick shoulder',()=>{
 const p=new SquishyMaterial(new Float32Array([0,0,1,.18,0,1,.5,0,1,0,0,.6,0,0,-1,1.6,0,1]));
 const c=fingerContact(contact(8,0));for(let i=0;i<600;i++)p.step(1/60,[c]);
 assert.ok(p.offset[2]>1.4);assert.ok(p.offset[5]>.98*p.offset[2]);
 assert.ok(p.offset[8]>.7*p.offset[2]);assert.ok(p.offset[11]>.6*p.offset[2]);
 assert.equal(p.offset[14],0);assert.equal(p.offset[17],0);
});

test('releasing and re-pinching gives the same hand a fresh stretch identity',()=>{
 const grips=new PinchGrips(),first=grips.update([contact(8,0)])[0];
 assert.equal(grips.update([contact(8,0)])[0].stretchId,first.stretchId);
 grips.update([]);const next=grips.update([contact(8,.8)])[0];
 assert.notEqual(next.stretchId,first.stretchId);assert.deepEqual(next.point,[.8,0,1]);
});
