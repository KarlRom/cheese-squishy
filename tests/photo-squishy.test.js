import test from 'node:test';
import assert from 'node:assert/strict';
import {makePhotoPillow,PHOTO_RADII} from '../photo-squishy.js';
import {SquishyMaterial} from '../physics.js';
import {toyFor} from '../toys.js';

test('photo pillow is a closed oval with a neutral back and front-facing UVs',()=>{
  const geometry=makePhotoPillow(24),position=geometry.attributes.position,uv=geometry.attributes.uv;
  let front=0,back=0;
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    assert.ok(Number.isFinite(x+y+z+uv.getX(i)+uv.getY(i)));
    assert.ok(Math.abs(x)<=PHOTO_RADII.x*1.02&&Math.abs(y)<=PHOTO_RADII.y*1.02&&Math.abs(z)<=PHOTO_RADII.z*1.02);
    if(z>.1){front++;assert.ok(uv.getX(i)>=0&&uv.getX(i)<=1&&uv.getY(i)>=0&&uv.getY(i)<=1);}
    if(z<-.1){back++;assert.equal(uv.getX(i),0);assert.equal(uv.getY(i),0);}
  }
  assert.ok(front>100&&back>100);
  assert.equal(toyFor('face').entitlement,null);
  geometry.dispose();
});

test('photo surface keeps its texture coordinates while a press deforms it',()=>{
  const geometry=makePhotoPillow(16),rest=geometry.attributes.position.array.slice();
  const before=geometry.attributes.uv.array.slice(),physics=new SquishyMaterial(rest);
  for(let i=0;i<12;i++)physics.step(1/60,[{point:[0,0,PHOTO_RADII.z],normal:[0,0,1],depth:.4,radius:.25,drag:[0,0,0]}]);
  physics.writePositions(geometry.attributes.position.array);
  assert.deepEqual(geometry.attributes.uv.array,before);
  assert.ok(geometry.attributes.position.array.some((value,i)=>Math.abs(value-rest[i])>.01));
  geometry.dispose();
});
