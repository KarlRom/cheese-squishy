import test from 'node:test';
import assert from 'node:assert/strict';
import {coverPoint} from '../camera-space.js';

test('camera landmarks match a centered cover crop on a tall phone',()=>{
  const center=coverPoint(.5,.5,960,720,360,600);
  assert.equal(center.x,.5);assert.equal(center.y,.5);
  assert.ok(center.scaleX>2&&Math.abs(center.scaleY-1)<1e-10);
  const left=coverPoint(.3,.5,960,720,360,600);
  assert.ok(left.x<.1);
});

test('wide stages crop vertically and invalid dimensions leave coordinates alone',()=>{
  const point=coverPoint(.5,.2,960,720,900,450);
  assert.equal(point.x,.5);assert.ok(point.y<.2);
  assert.deepEqual(coverPoint(.2,.7,0,720,900,450),{x:.2,y:.7,scaleX:1,scaleY:1});
});
