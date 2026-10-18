import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {LightingRig,lightingFor} from '../lighting.js';
function rig(){
  const renderer={toneMappingExposure:1},hemisphere=new THREE.HemisphereLight(),key=new THREE.DirectionalLight(),fill=new THREE.DirectionalLight();
  const bedroom=new THREE.Group(),roomMaterial=new THREE.MeshStandardMaterial();
  bedroom.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),roomMaterial));
  bedroom.userData.lighting={walls:new THREE.MeshStandardMaterial(),window:new THREE.MeshBasicMaterial(),patch:new THREE.MeshBasicMaterial(),shade:roomMaterial,lamp:new THREE.PointLight()};
  const toys=new Map([['cheese',{material:new THREE.MeshPhysicalMaterial({color:0xffd865})}],['pearl',{material:new THREE.MeshPhysicalMaterial({color:0xfffaf5})}]]);
  const background={};
  const lighting=new LightingRig({renderer,hemisphere,key,fill,bedroom,toys,onBackground:(color,id)=>{background.color=color.clone();background.id=id;}});
  return {lighting,renderer,hemisphere,key,fill,bedroom,roomMaterial,toys,background};
}
test('daylight preserves the original light powers and pearl reflections',()=>{
  const h=rig();assert.equal(h.key.intensity,3);assert.equal(h.fill.intensity,.7);
  assert.equal(h.hemisphere.intensity,1);assert.equal(h.renderer.toneMappingExposure,1);
  assert.equal(h.toys.get('pearl').material.envMapIntensity,1.35);
  assert.equal(h.roomMaterial.envMapIntensity,1);
});
test('dim reduces direct light and reflections together without changing toy pigmentation',()=>{
  const h=rig(),color=h.toys.get('cheese').material.color.clone();
  h.lighting.set('dim',true);
  assert.ok(h.key.intensity<1);assert.ok(h.hemisphere.intensity<.5);
  assert.ok(h.toys.get('pearl').material.envMapIntensity<.5);
  assert.equal(h.roomMaterial.envMapIntensity,.30);
  assert.ok(h.toys.get('cheese').material.color.equals(color));
});
test('sunset lowers the key light and warms the window; cozy night lights the bedside lamp',()=>{
  const h=rig();h.lighting.set('sunset',true);
  assert.equal(h.key.position.y,1.5);assert.ok(h.key.color.r>h.key.color.b);
  assert.ok(h.bedroom.userData.lighting.window.color.r>h.bedroom.userData.lighting.window.color.b);
  h.lighting.set('cozy',true);
  assert.ok(h.bedroom.userData.lighting.lamp.intensity>10);
  assert.ok(h.roomMaterial.emissiveIntensity>1);
  assert.ok(h.bedroom.userData.lighting.window.color.b>h.bedroom.userData.lighting.window.color.r);
});
test('preset changes blend monotonically, can reverse mid-transition, and settle',()=>{
  const h=rig();h.lighting.set('dim');let previous=3;
  for(let i=0;i<30;i++){h.lighting.step(1/60);assert.ok(h.key.intensity<=previous);assert.ok(h.key.intensity>=.8);previous=h.key.intensity;}
  const before=h.key.intensity;h.lighting.set('daylight');h.lighting.step(1/60);assert.ok(h.key.intensity>before&&h.key.intensity<3);
  for(let i=0;i<300;i++)h.lighting.step(1/60);
  assert.equal(h.key.intensity,3);assert.equal(h.lighting.step(1/60),false);
});
test('newly selected toys inherit the current lighting and unknown saved presets fall back safely',()=>{
  const h=rig();h.lighting.set('cozy',true);
  h.toys.set('pearl',{material:new THREE.MeshPhysicalMaterial()});h.lighting.refresh();
  assert.equal(h.toys.get('pearl').material.envMapIntensity,1.35*.23);
  for(const value of ['missing','__proto__',null])assert.equal(lightingFor(value),lightingFor('daylight'));
  h.lighting.set('missing',true);assert.equal(h.lighting.id,'daylight');assert.equal(h.key.intensity,3);
});

test('background follows the lighting preset and blends with it without flashes back to white',()=>{
  const h=rig();assert.equal(h.background.color.getHex(),0xffffff);
  h.lighting.set('sunset',true);assert.equal(h.background.color.getHex(),0xf6d2bb);
  h.lighting.set('cozy');const before=h.background.color.clone();
  h.lighting.step(1/60);
  assert.equal(h.background.id,'cozy');assert.ok(h.background.color.r<before.r&&h.background.color.r>new THREE.Color(lightingFor('cozy').background).r);
  for(let i=0;i<300;i++)h.lighting.step(1/60);
  assert.equal(h.background.color.getHex(),0x302b38);
  h.lighting.set('dim',true);assert.equal(h.background.color.getHex(),0xd8dde5);
  h.lighting.set('daylight',true);assert.equal(h.background.color.getHex(),0xffffff);
});

test('wall plaster blends with every lighting mood and restores its daylight color',()=>{
  const h=rig(),walls=h.bedroom.userData.lighting.walls;
  assert.equal(walls.color.getHex(),0xf0ede7);
  for(const id of ['dim','sunset','cozy','daylight']){
    const before=walls.color.clone(),target=new THREE.Color(lightingFor(id).wall);
    h.lighting.set(id);h.lighting.step(1/60);
    assert.ok(!walls.color.equals(before));assert.ok(!walls.color.equals(target));
    for(let i=0;i<300;i++)h.lighting.step(1/60);
    assert.equal(walls.color.getHex(),lightingFor(id).wall);
  }
});
