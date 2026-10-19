import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraRotate} from '../camera-rotate.js';

const hand=(roll=0,id=1,rotationPose=true)=>({id,roll,rotationPose});

test('wrist rotation arms without a jump and moves only after a held upright pose',()=>{
  const rotate=new CameraRotate();
  assert.equal(rotate.update([hand(0)],0).delta,0);
  assert.equal(rotate.update([hand(.1)],120).delta,0);
  assert.equal(rotate.update([hand(.2)],240).delta,0);
  assert.ok(rotate.update([hand(.25)],290).delta>.04);
  assert.equal(rotate.update([hand(.25)],290).delta,0);
});

test('lost pose, hand replacement, and tracking jumps cannot move the view',()=>{
  const rotate=new CameraRotate();
  rotate.update([hand(0)],0);rotate.update([hand(0)],230);
  assert.equal(rotate.update([hand(1)],280).delta,0);
  assert.equal(rotate.update([hand(1,1,false)],330).engaged,false);
  assert.equal(rotate.update([hand(1,2)],380).delta,0);
  assert.equal(rotate.update([hand(1,2)],620).delta,0);
});
