import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {pickupPose,LIFT_SECONDS} from '../pickup.js';
import {createBedroom} from '../room.js';
import {makePearl} from '../toy-geometry.js';

test('pickup has continuous endpoints and a monotonically receding room and shadow',()=>{
  const start=pickupPose(0),end=pickupPose(1);
  assert.equal(start.toyY,0);assert.ok(Math.abs(start.roomY)<1e-12);assert.equal(start.shadowOpacity,1);
  assert.ok(Math.abs(end.toyY)<1e-12);assert.equal(end.shadowOpacity,0);
  let previous=start;
  for(let frame=1;frame<=180;frame++){
    const p=pickupPose(frame/180);
    assert.ok(p.roomY<=previous.roomY);assert.ok(p.shadowOpacity<=previous.shadowOpacity);
    assert.ok(p.fogFar>p.fogNear);assert.ok(p.toyY>=0);
    previous=p;
  }
  assert.equal(pickupPose(-1).progress,0);assert.equal(pickupPose(2).progress,1);
  assert.ok(LIFT_SECONDS>1&&LIFT_SECONDS<2);
});
test('bedroom is finite with a receiving table surface just under the toy',()=>{
  const room=createBedroom(new THREE.Texture());
  const table=room.children[0];table.geometry.computeBoundingBox();
  assert.ok(Math.abs(table.geometry.boundingBox.max.y+table.position.y-(-1.045))<1e-5);
  assert.equal(table.receiveShadow,true);
  room.traverse(object=>{
    if(!object.isMesh)return;
    for(const v of object.geometry.attributes.position.array)assert.ok(Number.isFinite(v));
  });
});
test('the pearl can be picked at the center of the bedroom camera view',()=>{
  const camera=new THREE.PerspectiveCamera(34,1,.1,60);
  camera.position.set(6,4.5,10.5);camera.lookAt(0,-.15,0);camera.updateMatrixWorld();
  const pearl=new THREE.Mesh(makePearl(16),new THREE.MeshBasicMaterial());
  pearl.updateMatrixWorld();
  const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(0,0),camera);
  assert.ok(ray.intersectObject(pearl).length>0);
});

test('slide positions stay ordered and travel continuously in a single direction',async()=>{
  const {slidePose}=await import('../pickup.js');
  assert.equal(slidePose(0).incoming,1);assert.equal(slidePose(1).incoming,0);
  let previous=slidePose(0);
  for(let i=1;i<=120;i++){
    const pose=slidePose(i/120);
    assert.ok(pose.incoming<=previous.incoming);
    assert.ok(pose.outgoing<=previous.outgoing);
    assert.ok(Math.abs(pose.incoming-pose.outgoing-1)<1e-12);
    previous=pose;
  }
});
test('drop closes the gap to the tabletop monotonically without crossing it or bouncing',async()=>{
  const {dropPose}=await import('../pickup.js');
  let gap=Infinity,opacity=0;
  for(let i=0;i<=150;i++){
    const pose=dropPose(i/150);
    const nextGap=pose.toyY-pose.roomY;
    assert.ok(nextGap>=-1e-12);assert.ok(nextGap<=gap+1e-12);
    assert.ok(pose.shadowOpacity>=opacity);assert.ok(pose.fogFar>pose.fogNear);
    gap=nextGap;opacity=pose.shadowOpacity;
  }
  assert.ok(gap<1e-12);assert.equal(opacity,1);
});
