import test from 'node:test';
import assert from 'node:assert/strict';
import {denseContact,handCompression} from '../dense-feel.js';
import {fingerContact,scrunchContact,balanceContacts} from '../fingertips.js';
import {SquishyMaterial} from '../physics.js';
const raw={stretchId:'pointer:1',point:[0,0,1],normal:[0,0,1],drag:[.8,0,0],radius:.21,depth:.38,creep:1};
function simulate(contacts,squeeze=0){
 const p=new SquishyMaterial(new Float32Array([0,0,1,.2,0,1,.8,0,1,0,0,-1,-.8,.8,1,.8,.8,1,0,-1,0]));
 for(let i=0;i<180;i++)p.step(1/60,contacts,null,squeeze);return p;
}
test('production mouse and camera pulls have 65 percent less tensile displacement without weakening dents',()=>{
 for(const c of [raw,{...raw,depthControlled:true,cameraPull:.6}]){
  const before=fingerContact(c),after=denseContact(c);
  assert.ok(Math.abs(after.pull-before.pull*.35)<1e-9);
  after.drag.forEach((v,i)=>assert.ok(Math.abs(v-before.drag[i]*.35)<1e-9));
  assert.equal(after.depth,before.depth);
 }
 const poke={...raw,drag:[0,0,0],deepPoke:true};
 const p=simulate([denseContact(poke)]),depth=p.offset[2];assert.ok(depth<-.85);
 for(let i=0;i<600;i++)p.step(1/60);
 assert.ok(Math.abs(p.offset[2])>Math.abs(depth)*.9);assert.ok(p.recoveryTime>100);
});
test('full-hand squeeze requires at least two attached fingers and does not mistake a pinch for a fist',()=>{
 const h={id:1,closed:true,pinched:false,scrunchStrength:.55};
 assert.equal(handCompression([h],[{handId:1}]),0);
 assert.equal(handCompression([{...h,pinched:true}],[{handId:1},{handId:1}]),0);
 assert.equal(handCompression([h],[{handId:1},{handId:1}]),1);
});
test('dense scrunch folds inward with shallow creases and a retained compressed silhouette',()=>{
 const contacts=[-.55,.55].map(x=>denseContact(scrunchContact({...raw,point:[x,0,1],drag:[0,0,0]},[0,0,1],.8)));
 assert.ok(contacts.every(c=>c.pull===0&&c.fold>0&&c.fold<.025));
 const p=simulate(balanceContacts(contacts),.65),before=p.offset.slice();
 assert.ok(p.offset[13]<-.3);assert.ok(p.offset[16]<-.3);
 for(let i=0;i<120;i++)p.step(1/60);
 for(let i=0;i<before.length;i++){assert.ok(Math.abs(p.offset[i])<=Math.abs(before[i])+1e-7);assert.ok(p.offset[i]*before[i]>=0);}
 assert.ok(Math.abs(p.offset[13])>Math.abs(before[13])*.97);
 assert.ok([...p.offset].every(Number.isFinite));
});
