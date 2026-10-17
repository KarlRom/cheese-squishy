import test from 'node:test';
import assert from 'node:assert/strict';
import {HOME_RADIUS,MIN_RADIUS,MAX_RADIUS,pinchRadius,clampRadius,cameraZoom} from '../zoom.js';
test('spreading fingers enlarges the view; pinching inward reduces it',()=>{
 assert(pinchRadius(HOME_RADIUS,100,150)<HOME_RADIUS);
 assert(pinchRadius(HOME_RADIUS,100,70)>HOME_RADIUS);
 assert.equal(pinchRadius(HOME_RADIUS,100,100),HOME_RADIUS);
});
test('zoom uses absolute finger span and does not accumulate frame drift',()=>{
 const first=pinchRadius(HOME_RADIUS,100,130);
 for(let i=0;i<100;i++)assert.equal(pinchRadius(HOME_RADIUS,100,130),first);
 assert.equal(pinchRadius(first,130,100),HOME_RADIUS);
});
test('extreme spans remain inside safe zoom limits',()=>{
 assert.equal(pinchRadius(HOME_RADIUS,100,10000),MIN_RADIUS);
 assert.equal(pinchRadius(HOME_RADIUS,100,1),MAX_RADIUS);
 assert.equal(clampRadius(NaN),HOME_RADIUS);
});
test('degenerate contact spacing does not produce a camera jump',()=>{
 for(const span of [0,-1,NaN,Infinity])assert.equal(pinchRadius(HOME_RADIUS,100,span),HOME_RADIUS);
});

test('six-times close-up keeps the camera outside the mesh and resets to neutral optics',()=>{
 assert.equal(HOME_RADIUS/MIN_RADIUS,6);
 const close=cameraZoom(MIN_RADIUS);
 assert.equal(close.distance,4.2);assert(close.zoom>3);
 assert.deepEqual(cameraZoom(HOME_RADIUS),{distance:HOME_RADIUS,zoom:1});
 assert.equal(cameraZoom(4.2).zoom,1);
 assert(Math.abs(cameraZoom(4.19999).zoom-1)<.00001);
});
