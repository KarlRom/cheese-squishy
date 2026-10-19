import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraIntent,pullFromGrip} from '../camera-intent.js';
const sample=(sampleTime,x=0,y=0,pressing=true,hit=true)=>({sampleTime,tip:{x,y},palm:{x:x+.1,y:y+.1},pressing,hit});
test('a brief crossing or pinch flick cannot create a camera contact',()=>{
 const gate=new CameraIntent();
 for(let t=0;t<=240;t+=40)assert.equal(gate.ready('index',sample(t,t/240*.5)),false);
 assert.equal(gate.ready('index',sample(280,.5,0,false)),false);
 assert.equal(gate.candidates.size,0);
});
test('a steady deliberate press engages after the hold and repeated render frames do not advance it',()=>{
 const gate=new CameraIntent();
 assert.equal(gate.ready('index',sample(100)),false);
 for(let i=0;i<20;i++)assert.equal(gate.ready('index',sample(100)),false);
 for(const t of [140,180,220])assert.equal(gate.ready('index',sample(t,.005)),false);
 assert.equal(gate.ready('index',sample(280,.007)),false);
 assert.equal(gate.ready('index',sample(340,.007)),true);
});
test('a missing surface hit, tracking gap, or released finger resets engagement',()=>{
 const gate=new CameraIntent();
 gate.ready('index',sample(0));gate.ready('index',sample(100));
 assert.equal(gate.ready('index',sample(200,0,0,true,false)),false);
 assert.equal(gate.ready('index',sample(240)),false);
 assert.equal(gate.ready('index',sample(460)),true);
 assert.equal(gate.ready('index',sample(500,0,0,false)),false);
 assert.equal(gate.ready('index',sample(520)),false);
 assert.equal(gate.ready('index',sample(900)),false);
});
test('tracked hands and fingertips have independent intent lifetimes',()=>{
 const gate=new CameraIntent();
 gate.ready('left:8',sample(0));gate.ready('right:8',sample(0,.3));
 gate.ready('left:8',sample(200));
 assert.equal(gate.ready('right:8',sample(200,.3)),false);
 assert.equal(gate.ready('right:8',sample(240,.3)),true);
 gate.prune(new Set(['right:8']));assert.equal(gate.candidates.has('left:8'),false);
 gate.clear();assert.equal(gate.candidates.size,0);
});

test('a new pinch starts with zero pull even if hand size changed before it engaged',()=>{
 const origin=1.4;
 assert.equal(pullFromGrip(origin,origin),0);
 assert.equal(pullFromGrip(1.1,origin),0);
 assert.ok(Math.abs(pullFromGrip(1.8,origin)-.4)<1e-10);
});
