import test from 'node:test';
import assert from 'node:assert/strict';
import {SquishyMaterial} from '../physics.js';
import {fingerContact} from '../fingertips.js';
import {StretchStrands} from '../stretch-strands.js';
import * as THREE from '../vendor/three.module.js';
const c={point:[0,0,1],normal:[0,0,1],drag:[1,0,0],depth:.03,radius:.22};
function simulate(hz,contacts,seconds=10){
 const p=new SquishyMaterial(new Float32Array([0,0,1,1.8,0,1,0,0,-1]));p.marks[2]=p.marks[5]=p.marks[8]=-.12;
 for(let i=0;i<hz*seconds;i++)p.step(1/hz,contacts);
 return p;
}
test('stretching slowly smooths only bite marks in the stretched patch',()=>{
 const contacts=[fingerContact(c)],early=simulate(60,contacts,1),late=simulate(60,contacts);
 assert.ok(early.marks[2]<-.09);assert.ok(Math.abs(late.marks[2])<Math.abs(early.marks[2])*.4);
 assert.equal(late.marks[5],Math.fround(-.12));assert.equal(late.marks[8],Math.fround(-.12));
 assert.ok(late.marks[2]<0);assert.ok(Math.abs(simulate(30,contacts).marks[2]-simulate(120,contacts).marks[2])<1e-5);
});
test('idle recovery and deep pokes preserve bite marks',()=>{
 for(const contacts of [[],[fingerContact({...c,drag:[0,0,0],deepPoke:true,creep:1})]]){
  assert.equal(simulate(60,contacts).marks[2],Math.fround(-.12));
 }
});
test('long strand grips keep smoothing marks despite their reduced body deformation',()=>{
 const strands=new StretchStrands(),parent=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshPhysicalMaterial());
 const result=strands.update(1/60,[{...c,stretchId:'pointer:1'}],parent,parent.material,53);
 assert.ok(result.loads[0].stretchWork>.5);
 assert.ok(Math.abs(simulate(60,result.loads.map(fingerContact)).marks[2])<.06);strands.clear();
});
