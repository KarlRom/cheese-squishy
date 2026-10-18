import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {attachmentPoint} from '../finger-preview.js';
test('preview stays on its actual triangle as that surface deforms and moves',()=>{
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());
  const attachment={triangle:[0,1,2],bary:[.2,.3,.5]};
  assert.ok(attachmentPoint(attachment,mesh).distanceTo(new THREE.Vector3(.3,.5,0))<1e-7);
  geometry.attributes.position.setXYZ(2,0,1,.6);
  mesh.position.set(1,2,3);mesh.rotation.y=.4;mesh.scale.set(1,.9,1);
  const expected=mesh.localToWorld(new THREE.Vector3(.3,.5,.3));
  assert.ok(attachmentPoint(attachment,mesh).distanceTo(expected)<1e-7);
});
