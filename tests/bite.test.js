import test from 'node:test';
import assert from 'node:assert/strict';
import {mouthPose,BiteGesture,toothLayout} from '../bite.js';
import {SquishyMaterial} from '../physics.js';
function face(ratio=.02,dx=0){
  const p=Array.from({length:478},()=>({x:.5+dx,y:.5,z:0}));
  p[61]={x:.4+dx,y:.5};p[291]={x:.6+dx,y:.5};
  p[13]={x:.5+dx,y:.5-ratio*.2*4/3/2};p[14]={x:.5+dx,y:.5+ratio*.2*4/3/2};return p;
}
test('closed mouths, lip jitter and brief openings never bite',()=>{
  const g=new BiteGesture();
  for(let t=0;t<1000;t+=50)assert.equal(g.update(face(t%100?.1:.02),t).bite,false);
  g.update(face(.5),1000);assert.equal(g.update(face(),1050).bite,false);
});
test('a deliberate open and close triggers once and needs rearming after cooldown',()=>{
  const g=new BiteGesture();g.update(face(.5),0);
  assert.equal(g.update(face(.5),150).armed,true);
  assert.equal(g.update(face(),250).bite,true);
  assert.equal(g.update(face(),300).bite,false);
  g.update(face(.5),400);assert.equal(g.update(face(),550).bite,false);
  g.update(face(.5),1300);g.update(face(.5),1450);assert.equal(g.update(face(),1500).bite,true);
});
test('face loss, stale tracking, large motion, timeout and reset cancel a pending bite',()=>{
  for(const cancel of ['lost','stale','move','timeout','reset']){
    const g=new BiteGesture();g.update(face(.5),0);g.update(face(.5),150);
    if(cancel==='lost')g.update(null,200);
    if(cancel==='stale'){assert.equal(g.update(face(),600).bite,false);continue;}
    if(cancel==='move')g.update(face(.5,.2),200);
    if(cancel==='reset')g.reset();
    if(cancel==='timeout'){
      for(let t=200;t<2200;t+=100)g.update(face(.5),t);
      assert.equal(g.update(face(),2200).bite,false);continue;
    }
    assert.equal(g.update(face(),250).bite,false);
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
