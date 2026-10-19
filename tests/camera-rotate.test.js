import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraRotate} from '../camera-rotate.js';

const hand=(roll=0,id=1,rotationPose=true)=>({id,roll,rotationPose});

test('wrist rotation arms without a jump and moves only after a held upright pose',()=>{
  const rotate=new CameraRotate();
  assert.equal(rotate.update([hand(0)],0),true);
  assert.equal(rotate.step(0,.016),0);
  rotate.update([hand(.1)],120);assert.equal(rotate.step(120,.016),0);
  rotate.update([hand(.2)],240);assert.equal(rotate.step(240,.016),0);
  rotate.update([hand(.25)],290);
  assert.ok(rotate.step(290,.016)>0);
  assert.equal(rotate.update([hand(.25)],290),true);
  assert.ok(rotate.step(306,.016)>0);
});

test('lost pose, hand replacement, and tracking jumps cannot move the view',()=>{
  const rotate=new CameraRotate();
  rotate.update([hand(0)],0);rotate.update([hand(0)],230);
  rotate.update([hand(1)],280);assert.equal(rotate.step(280,.016),0);
  assert.equal(rotate.update([hand(1,1,false)],330),false);
  assert.equal(rotate.update([hand(1,2)],380),true);
  assert.equal(rotate.step(380,.016),0);
  rotate.update([hand(1,2)],620);assert.equal(rotate.step(620,.016),0);
});

test('rotation eases between camera samples and coasts briefly after stopping',()=>{
  const rotate=new CameraRotate();
  rotate.update([hand(0)],0);rotate.update([hand(0)],230);
  rotate.update([hand(.1)],280);
  const frames=[280,296,312,328].map(now=>rotate.step(now,.016));
  assert.ok(frames.every(delta=>delta>0));
  assert.ok(frames[0]<frames[1]&&frames[1]<frames[2]);
  rotate.update([hand(.1)],330);
  const coast=[346,362,378].map(now=>rotate.step(now,.016));
  assert.ok(coast[0]>coast[1]&&coast[1]>coast[2]&&coast[2]>0);
  for(let now=394;now<1300;now+=16)rotate.step(now,.016);
  assert.equal(rotate.velocity,0);
});

test('release retains momentum but a tracking gap cancels it',()=>{
  const rotate=new CameraRotate();
  rotate.update([hand(0)],0);rotate.update([hand(0)],230);
  rotate.update([hand(.1)],280);rotate.step(280,.016);
  rotate.update([],330);assert.ok(rotate.step(346,.016)>0);
  rotate.reset();assert.equal(rotate.step(362,.016),0);
  rotate.update([hand(0)],400);rotate.update([hand(0)],640);
  rotate.update([hand(.1)],690);rotate.step(690,.016);
  rotate.update([],1300);assert.equal(rotate.step(1316,.016),0);
});
