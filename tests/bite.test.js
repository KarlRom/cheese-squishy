import test from 'node:test';
import assert from 'node:assert/strict';
import {mouthPose,BiteGesture,toothLayout} from '../bite.js';
import {SquishyMaterial} from '../physics.js';
function face(ratio=.02,dx=0,chinRatio=.6){
  const p=Array.from({length:478},()=>({x:.5+dx,y:.5,z:0}));
  p[61]={x:.4+dx,y:.5};p[291]={x:.6+dx,y:.5};
  p[2]={x:.5+dx,y:.35};p[152]={x:.5+dx,y:.35+chinRatio*.4*4/3};p[234]={x:.3+dx,y:.45};p[454]={x:.7+dx,y:.45};
  p[13]={x:.5+dx,y:.5-ratio*.2*4/3/2};p[14]={x:.5+dx,y:.5+ratio*.2*4/3/2};return p;
}
const blends=jaw=>[{categoryName:'jawOpen',score:jaw}];
const sample=(g,ratio,jaw,time,dx=0,chin)=>g.update(face(ratio,dx,chin??.6+jaw*.3),time,4/3,blends(jaw));
test('closed mouths have no visible target, and lip-only closure cannot bite',()=>{
  const g=new BiteGesture();
  for(let t=0;t<600;t+=100){const m=sample(g,.01,.02,t);assert.equal(m.visible,false);assert.equal(m.bite,false);}
  sample(g,.5,.65,600);sample(g,.5,.65,750);
  assert.equal(sample(g,.01,.65,850).bite,false);
  // Even a misleading jaw coefficient cannot trigger while chin geometry stays open.
  assert.equal(sample(g,.01,.03,950,0,.795).bite,false);
});
test('bringing the jaw closed bites while lips remain parted and rearms only after cooldown',()=>{
  const g=new BiteGesture();sample(g,.5,.65,0);
  assert.equal(sample(g,.5,.65,150).armed,true);
  const closing=sample(g,.20,.07,250);
  assert.equal(closing.bite,true);assert.equal(closing.visible,false);
  assert.equal(sample(g,.20,.07,300).bite,false);
  sample(g,.5,.65,400);assert.equal(sample(g,.20,.07,550).bite,false);
  sample(g,.5,.65,1300);sample(g,.5,.65,1450);assert.equal(sample(g,.20,.07,1500).bite,true);
});
test('brief openings, missing jaw signals and a static smiling mouth never bite',()=>{
  const g=new BiteGesture();sample(g,.5,.65,0);assert.equal(sample(g,.20,.07,50).bite,false);
  assert.equal(g.update(face(.5),100,4/3,[]).visible,false);
  for(let t=150;t<700;t+=100)assert.equal(sample(g,.3,.04,t).bite,false);
});
test('face loss, stale tracking, large motion, timeout and reset cancel a pending jaw bite',()=>{
  for(const cancel of ['lost','stale','move','timeout','reset']){
    const g=new BiteGesture();sample(g,.5,.65,0);sample(g,.5,.65,150);
    if(cancel==='lost')g.update(null,200);
    if(cancel==='stale'){assert.equal(sample(g,.2,.07,800).bite,false);continue;}
    if(cancel==='move')sample(g,.5,.65,200,.2);
    if(cancel==='reset')g.reset();
    if(cancel==='timeout'){
      for(let t=200;t<2400;t+=100)sample(g,.5,.65,t);
      assert.equal(sample(g,.2,.07,2400).bite,false);continue;
    }
    assert.equal(sample(g,.2,.07,250).bite,false);
  }
});
test('mouth position is mirrored and lip ratio survives camera scale changes',()=>{
  const p=face(.4,.1),small=p.map(p=>({x:.5+(p.x-.5)*.6,y:.5+(p.y-.5)*.6}));
  assert.ok(Math.abs(mouthPose(p).ratio-mouthPose(small).ratio)<1e-10);
  assert.ok(Math.abs(mouthPose(p).x-.4)<1e-10);
  assert.equal(mouthPose([]),null);p[13].x=NaN;assert.equal(mouthPose(p),null);
});
const tooth={point:[0,0,1],normal:[0,0,1],right:[1,0,0],up:[0,1,0],width:.09,height:.075,depth:.12};
test('teeth indent actual geometry, leave gaps, persist through recovery and clear on Reset',()=>{
  const rest=new Float32Array([0,0,1,.045,0,1,.15,0,1,0,0,-1]);
  const p=new SquishyMaterial(rest);p.imprint([tooth]);
  const out=new Float32Array(rest.length);p.writePositions(out);
  assert.ok(out[2]<.89);assert.ok(out[5]>.89&&out[5]<1);
  assert.equal(out[8],1);assert.equal(out[11],-1);
  const dent=out[2];for(let i=0;i<600;i++)p.step(1/60);
  p.settle();p.writePositions(out);assert.equal(out[2],dent);
  p.reset();p.writePositions(out);assert.deepEqual(out,rest);
});
test('repeated bites remain bounded and animation builds a mark progressively',()=>{
  const p=new SquishyMaterial(new Float32Array([0,0,1]));
  p.imprint([tooth],.25);assert.ok(p.marks[2]<-.02&&p.marks[2]>-.04);
  p.imprint([tooth],.75);assert.ok(Math.abs(p.marks[2]+.12)<1e-6);
  for(let i=0;i<100;i++)p.imprint([tooth]);
  assert.ok(Math.abs(p.marks[2])<=.260001);
});
test('dental layout has two curved rows, central incisors and finite bounded dimensions',()=>{
  const teeth=toothLayout(100);assert.equal(teeth.length,12);
  assert.equal(teeth.filter(t=>t.y>0).length,6);
  assert.ok(teeth[2].width>teeth[0].width);assert.ok(Math.abs(teeth[2].y)>Math.abs(teeth[0].y));
  assert.ok(teeth.every(t=>Math.abs(t.x)<=.55&&t.depth<=.12));
});

test('curved pearl retains real front-surface tooth impressions with finite shading and an intact rear',async()=>{
  const {makePearl}=await import('../toy-geometry.js');
  const THREE=await import('../vendor/three.module.js');
  const g=makePearl(36),rest=g.attributes.position.array.slice(),p=new SquishyMaterial(rest);
  const teeth=toothLayout().map(t=>{
    const z=1.25*Math.sqrt(1-(t.x/1.32)**2-((t.y-.025)/1.04)**2);
    const normal=new THREE.Vector3(t.x/1.32**2,(t.y-.025)/1.04**2,z/1.25**2).normalize();
    const right=new THREE.Vector3(1,0,0).addScaledVector(normal,-normal.x).normalize();
    return {...t,point:[t.x,t.y,z],normal:normal.toArray(),right:right.toArray(),up:new THREE.Vector3().crossVectors(normal,right).toArray()};
  });
  const field=p.toothField(teeth);p.applyImprint(field,.4);p.applyImprint(field,.6);p.writePositions(g.attributes.position.array);g.computeVertexNormals();
  let marked=0;
  for(let i=0;i<rest.length;i+=3){
    assert.ok(Number.isFinite(g.attributes.normal.array[i]));
    if(Math.hypot(...p.marks.slice(i,i+3))>.005)marked++;
    if(rest[i+2]<0)assert.equal(p.marks[i+2],0);
  }
  assert.ok(marked>20);g.dispose();
});

test('relaxed jaw bias calibrates automatically and a partly closed jaw does not bite early',()=>{
  const g=new BiteGesture();sample(g,.01,.15,0);
  sample(g,.5,.65,100);sample(g,.5,.65,250);
  assert.equal(sample(g,.25,.3,350).bite,false);
  const closed=sample(g,.16,.16,450);
  assert.equal(closed.bite,true);assert.equal(closed.visible,false);
});
