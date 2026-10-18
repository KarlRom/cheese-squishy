import test from 'node:test';
import assert from 'node:assert/strict';
import {trackHandDepth} from '../hand-depth.js';
const size=(scale=1)=>({width:.30*scale,length:.32*scale,visible:true});
function run(scale,pinched=false,previous=null,start=0,frames=15){
  let state=previous;
  for(let i=0;i<frames;i++)state=trackHandDepth(size(scale),state,start+i*50,.05,pinched);
  return state;
}
test('larger apparent palms press progressively; stationary and small jitter remain neutral',()=>{
  const neutral=run(1);assert.equal(neutral.push,0);
  const jitter=run(1.025,false,neutral,750);assert.equal(jitter.push,0);
  const nearer=run(1.25,false,neutral,750);assert.ok(nearer.push>.4);assert.equal(nearer.pull,0);
  const closest=run(1.6,false,nearer,1500);assert.ok(closest.push>nearer.push&&closest.push<=1);
});
test('only retreating while pinched creates outward pull, with a fresh reference on each pinch',()=>{
  const neutral=run(1),pinched=run(1,true,neutral,750);
  const away=run(.75,true,pinched,1500);assert.ok(away.pull>.5);assert.equal(away.push,0);
  const released=run(.75,false,away,2250);assert.equal(released.pull,0);
  const again=run(.75,true,released,3000);assert.equal(again.pull,0);
});
test('moving away without a pinch never pulls; moving a pinch closer only presses',()=>{
  const neutral=run(1);
  assert.equal(run(.65,false,neutral,750).pull,0);
  const pinch=run(1,true,neutral,750),closer=run(1.3,true,pinch,1500);
  assert.ok(closer.push>.5);assert.equal(closer.pull,0);
});
test('one-axis foreshortening from turning the hand is rejected',()=>{
  const previous=run(1,true);
  let state=previous;
  for(let i=0;i<20;i++)state=trackHandDepth({...size(),width:.18},state,750+i*50,.05,true);
  assert.equal(state.push,0);assert.equal(state.pull,0);assert.equal(state.pushing,false);
});
test('tracking loss, clipped palms and camera aspect changes reset depth without a jump',()=>{
  const close=run(1.4,true,run(1,true),750);
  const lost=trackHandDepth(size(.7),close,2500,.05,true);
  assert.equal(lost.push,0);assert.equal(lost.pull,0);
  const clipped=trackHandDepth({...size(1.7),visible:false},lost,2550,.05,true);
  assert.equal(clipped.valid,false);assert.equal(clipped.push,0);
  const aspect=trackHandDepth(size(1.5),close,1500,.05,true,.75);
  assert.equal(aspect.push,0);assert.equal(aspect.pull,0);
});
test('depth smoothing ramps instead of snapping and repeated frames do not accumulate travel',()=>{
  const neutral=run(1,true),first=run(.75,true,neutral,750,1),settled=run(.75,true,first,800,50);
  assert.ok(first.pull<settled.pull);assert.ok(settled.pull<.7);
  const later=run(.75,true,settled,3300,50);
  assert.ok(Math.abs(later.pull-settled.pull)<1e-5);
});
test('extended depth travel remains expressive beyond the old normalized ceiling',()=>{
 const base=run(1),pinch=run(1,true,base,750);
 const away=run(.6,true,pinch,1500),farther=run(.4,true,away,2250);
 assert.equal(away.pull,1);assert.equal(farther.pull,1);assert.ok(farther.pullTravel>away.pullTravel);
 const near=run(1.7,false,base,750),nearer=run(2.2,false,near,1500);
 assert.ok(nearer.pushTravel>near.pushTravel);assert.equal(run(.4,false,farther,3000).pullTravel,0);
});
