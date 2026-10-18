import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {TableBody,TABLE_Y} from '../table-physics.js';
import {makePearl} from '../toy-geometry.js';
import {dropPose,DROP_SECONDS} from '../pickup.js';
const cube=()=>new THREE.BoxGeometry(2,2,2,12,12,12).attributes.position.array;
function simulate(kind,hz=60){
  const b=new TableBody(kind==='pearl'?makePearl(16).attributes.position.array:cube(),{kind});
  const strength=kind==='pearl'?2:1;
  b.release({velocity:[.55*strength,0,0],spin:[0,.12,-.95*strength]});
  let impacts=0,maxTravel=0;
  for(let i=0;i<hz*14;i++){
    const floor=TABLE_Y+dropPose((i+1)/hz/DROP_SECONDS).roomY;
    if(b.step(1/hz,floor).impact)impacts++;
    assert.ok(b.position.y+b.support()>=floor-.00001);
    assert.ok(b.velocity.y<=0); // Collision never adds a vertical bounce velocity.
    assert.ok(Math.abs(b.quaternion.length()-1)<1e-8);
    maxTravel=Math.max(maxTravel,Math.hypot(b.position.x,b.position.z));
  }
  return {b,impacts,maxTravel};
}
test('released bodies accelerate downward under gravity',()=>{
  const b=new TableBody(cube());b.position.y=3;b.release({velocity:[0,0,0],spin:[0,0,0]});
  b.step(.05,-100);const first=3-b.position.y;
  b.step(.05,-100);assert.ok((3-first)-b.position.y>first);assert.ok(Math.abs(b.velocity.y+1.05)<1e-9);
});
test('both shapes land once, never penetrate the table, and settle without a bounce',()=>{
  for(const kind of ['cheese','pearl']){
    const {b,impacts,maxTravel}=simulate(kind);
    assert.equal(impacts,1);assert.equal(b.awake,false);
    assert.ok(maxTravel>.15&&maxTravel<2.8);
    assert.ok(b.compression<.001);
  }
});
test('gravity tips a tilted cube toward a flatter supporting face',()=>{
  const b=new TableBody(cube());b.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),.25);b.rest();b.awake=true;
  for(let i=0;i<240;i++)b.step(1/60);
  const roll=new THREE.Euler().setFromQuaternion(b.quaternion).z;
  assert.ok(Math.abs(roll)<.04);assert.equal(b.awake,false);
});
test('live deformed vertices change the resting height',()=>{
  const points=cube(),b=new TableBody(points);b.rest();const before=b.position.y;
  points[1]=-1.6;b.rest();assert.ok(b.position.y>before+.55);
  assert.ok(b.position.y+b.support()>TABLE_Y);
});
test('drop motion stays consistent at 30 and 120 frames per second',()=>{
  const a=simulate('pearl',30).b,b=simulate('pearl',120).b;
  assert.ok(a.position.distanceTo(b.position)<.12);
});
