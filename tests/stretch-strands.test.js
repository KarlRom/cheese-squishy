import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {strandTarget,writeStrand,StretchStrands} from '../stretch-strands.js';
const grip={stretchId:'hand:0',point:[0,0,1],normal:[0,0,1],drag:[0,0,0],cameraPull:.65,depth:.01,creep:1};
test('camera and pointer pulls retain controlled travel while stationary pokes do not',()=>{
 assert.ok(Math.hypot(...strandTarget(grip).delta)>1);
 assert.ok(Math.hypot(...strandTarget({...grip,cameraPull:0,drag:[1,0,0]}).delta)>.9);
 assert.equal(strandTarget({...grip,cameraPull:0}),null);
 assert.equal(strandTarget({...grip,stretchId:undefined}),null);
 assert.ok(Math.hypot(...strandTarget({...grip,cameraPull:100}).delta)<=1.600001);
});
test('added rings form a continuously tapered patch and rounded tip',()=>{
 const out=new Float32Array(65*25*3);writeStrand(out,[0,0,1],[0,0,1],[0,0,5]);
 assert.ok([...out].every(Number.isFinite));
 let previous=Infinity;
 for(const ring of [0,16,32,48]){
  const a=ring*25*3,b=(ring*25+12)*3;
  const diameter=Math.hypot(out[a]-out[b],out[a+1]-out[b+1],out[a+2]-out[b+2]);
  assert.ok(diameter<previous);assert.ok(diameter>.08);previous=diameter;
 }
 const tip=64*25*3;assert.ok(Math.abs(out[tip+2]-6)<1e-6);
 assert.ok(Math.hypot(out[tip],out[tip+1])<1e-6);
});
test('strand meshes attach, shade, retract without overshoot and dispose on reset',()=>{
 const g=new THREE.BoxGeometry(),m=new THREE.MeshPhysicalMaterial({color:0xffcc55});
 const parent=new THREE.Mesh(g,m),strands=new StretchStrands();
 for(let i=0;i<120;i++)strands.update(1/60,[grip],parent,m,53);
 assert.equal(parent.children.length,1);
 const child=parent.children[0];assert.ok(child.material.color.equals(m.color));
 const normal=child.geometry.attributes.normal;assert.ok([...normal.array].every(Number.isFinite));
 // At the middle of a straight strand the front faces point outward.
 const p=child.geometry.attributes.position,idx=child.geometry.index.array,a=idx[32*24*6],b=idx[32*24*6+1],c=idx[32*24*6+2];
 const v=i=>new THREE.Vector3().fromBufferAttribute(p,i),va=v(a);
 assert.ok(v(b).sub(va).cross(v(c).sub(va)).dot(new THREE.Vector3(va.x,va.y,0))>0);
 let before=strands.states.get(grip.stretchId).delta.length();
 for(let i=0;i<120;i++){strands.update(1/60,[],parent,m,53);const next=strands.states.get(grip.stretchId).delta.length();assert.ok(next<=before&&next>0);before=next;}
 const loads=strands.update(1/60,[grip],parent,m,53).loads;assert.ok(loads[0].cameraPull<.05);
 strands.clear();assert.equal(parent.children.length,0);assert.equal(strands.states.size,0);
});

test('tamer strand travel stays below a compact extension even for extreme input',()=>{
 for(const drag of [[1,0,0],[100,0,0]])for(const cameraPull of [0,.65,100]){
  const target=strandTarget({...grip,drag,cameraPull});assert.ok(Math.hypot(...target.delta)<=1.600001);
 }
 assert.ok(Math.hypot(...strandTarget({...grip,cameraPull:0,drag:[1,0,0]}).delta)<1.1);
});
