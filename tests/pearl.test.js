import test from 'node:test';
import assert from 'node:assert/strict';
import {makePearl} from '../toy-geometry.js';
import {SquishyMaterial} from '../physics.js';
import {makeSqueeze} from '../squeezes.js';
import {toyFor} from '../toys.js';
test('pearl is a closed, welded, smooth surface with outward normals',()=>{
  const g=makePearl(24), p=g.attributes.position, n=g.attributes.normal, edges=new Map();
  assert.equal(p.count,6*24*24+2);
  for(let i=0;i<g.index.count;i+=3){
    const tri=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];
    for(let k=0;k<3;k++){const edge=[tri[k],tri[(k+1)%3]].sort((a,b)=>a-b).join(',');edges.set(edge,(edges.get(edge)||0)+1);}
  }
  for(const count of edges.values())assert.equal(count,2);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i)-.025,z=p.getZ(i);
    assert.ok(Math.abs((x/1.32)**2+(y/1.04)**2+(z/1.25)**2-1)<.016);
    assert.ok(x*n.getX(i)+y*n.getY(i)+z*n.getZ(i)>0);
    assert.ok(p.getY(i)>-1.025);
  }
  g.dispose();
});
test('all six squeezes keep the pearl finite and recover without overshoot',()=>{
  const g=makePearl(12),rest=g.attributes.position.array;
  for(let kind=0;kind<6;kind++){
    const physics=new SquishyMaterial(rest), gesture=makeSqueeze(kind,{normal:[0,0,1],right:[1,0,0],up:[0,1,0]});
    for(let i=0;i<80;i++)physics.step(1/60,gesture.contacts,gesture.pinch,gesture.squeeze);
    assert.ok(physics.activity>.01);
    const before=physics.offset.slice();
    physics.step(1/60);
    for(let i=0;i<before.length;i++){
      assert.ok(Number.isFinite(physics.offset[i]));
      assert.ok(Math.abs(physics.offset[i])<=Math.abs(before[i])+1e-8);
      assert.ok(physics.offset[i]*before[i]>=0);
    }
  }
  g.dispose();
});
test('unknown saved choices fall back to cheese; pearl is available without payment',()=>{
  assert.equal(toyFor('obsolete').id,'cheese');assert.equal(toyFor(null).id,'cheese');
  assert.equal(toyFor('pearl').included,true);assert.equal(toyFor('pearl').entitlement,'pearl-coconut-oil');
});
