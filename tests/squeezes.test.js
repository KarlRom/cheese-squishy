import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSqueeze,squeezeNames } from '../squeezes.js';
import { SquishyMaterial } from '../physics.js';
const frame={normal:[0,0,1],right:[1,0,0],up:[0,1,0]};
const vertices=[];
for(let axis=0;axis<3;axis++)for(const sign of [-1,1])for(let a=-1;a<=1.001;a+=.2)for(let b=-1;b<=1.001;b+=.2){
 const p=[];p[axis]=sign;p[(axis+1)%3]=a;p[(axis+2)%3]=b;vertices.push(...p);
}
const rest=new Float32Array(vertices);
test('six successive profiles produce distinct, stable deformation fields',()=>{
 const shapes=[];
 for(let kind=0;kind<6;kind++){
  const p=makeSqueeze(kind,frame),m=new SquishyMaterial(rest);
  for(let i=0;i<80;i++)m.step(1/60,p.contacts,p.pinch,p.squeeze);
  const positions=new Float32Array(rest.length);m.writePositions(positions);
  assert(positions.every(Number.isFinite));
  for(let i=1;i<positions.length;i+=3)assert(positions[i]>=-1.01501);
  assert(m.activity>.02,p.name+' should visibly deform the mesh');
  shapes.push(m.offset.slice());
  const before=m.offset.slice();m.step(1/60);
  for(let i=0;i<before.length;i++)assert(Math.abs(m.offset[i])<=Math.abs(before[i])+1e-8,'release must remain non-oscillating');
 }
 for(let a=0;a<shapes.length;a++)for(let b=a+1;b<shapes.length;b++){
  const distance=Math.sqrt(shapes[a].reduce((sum,v,i)=>sum+(v-shapes[b][i])**2,0)/rest.length);
  assert(distance>.025,`${squeezeNames[a]} and ${squeezeNames[b]} must feel different`);
 }
});
test('local automatic presses follow an alternate visible face',()=>{
 const side={normal:[-1,0,0],right:[0,0,1],up:[0,1,0]};
 const front=makeSqueeze(2,frame).contacts[0],back=makeSqueeze(2,side).contacts[0];
 assert.equal(front.point[2],.97);assert.equal(back.point[0],-.97);
 assert.deepEqual(back.normal,[-1,0,0]);
});
test('the sequence wraps only after all six profiles',()=>{
 assert.equal(new Set(Array.from({length:6},(_,i)=>makeSqueeze(i,frame).name)).size,6);
 assert.equal(makeSqueeze(6,frame).name,makeSqueeze(0,frame).name);
});
