import test from 'node:test';
import assert from 'node:assert/strict';
import {describeHand,HandGestures} from '../hand-gestures.js';
function hand({pinch=false,fist=false,dx=0,scale=1}={}){
  const p=Array.from({length:21},()=>({x:.5,y:.6,z:0}));
  Object.assign(p,{0:{x:.5,y:.8},5:{x:.4,y:.55},9:{x:.5,y:.5},13:{x:.58,y:.55},17:{x:.67,y:.58},
    4:{x:pinch?.42:.25,y:pinch?.25:.5},8:{x:.4,y:.23},12:{x:.5,y:fist?.68:.2},16:{x:.58,y:fist?.69:.25},20:{x:.67,y:fist?.70:.3}});
  return p.map(v=>({x:.5+(v.x-.5)*scale+dx,y:.5+(v.y-.5)*scale,z:0}));
}
test('open hands do not squeeze; pinch and fist gestures are distinguished',()=>{
  const gestures=new HandGestures();
  assert.equal(gestures.update([hand()],0)[0].gripping,false);
  const pinch=gestures.update([hand({pinch:true})],100)[0];
  assert.equal(pinch.pinched,true);assert.equal(pinch.closed,false);assert.ok(pinch.strength>.6);
  const fist=gestures.update([hand({fist:true})],200)[0];
  assert.equal(fist.closed,true);assert.equal(fist.gripping,true);
});
test('pinch strength is normalized by palm size and cursor is mirrored',()=>{
  const a=describeHand(hand({pinch:true})),b=describeHand(hand({pinch:true,scale:.6}));
  assert.ok(Math.abs(a.pinchRatio-b.pinchRatio)<1e-10);
  assert.ok(Math.abs(a.x-.59)<1e-10);
});
test('pinch hysteresis filters threshold jitter and releases when fingers open',()=>{
  const tracker=new HandGestures(),points=hand({pinch:true});
  tracker.update([points],0);
  const palm=Math.max(Math.hypot((points[5].x-points[17].x)*4/3,points[5].y-points[17].y),Math.hypot((points[0].x-points[9].x)*4/3,points[0].y-points[9].y));
  points[4]={x:points[8].x+.42*palm/(4/3),y:points[8].y};
  assert.equal(tracker.update([points],60)[0].pinched,true);
  points[4]={x:points[8].x+.60*palm/(4/3),y:points[8].y};
  assert.equal(tracker.update([points],120)[0].pinched,false);
});
test('two hands keep identity when detector order changes; loss clears all grips',()=>{
  const tracker=new HandGestures(),a=hand({dx:-.2}),b=hand({dx:.2});
  const first=tracker.update([a,b],0),second=tracker.update([b,a],70);
  assert.equal(first[0].id,second[1].id);assert.equal(first[1].id,second[0].id);
  assert.deepEqual(tracker.update([],140),[]);
});
test('invalid, distant, and malformed hands produce no loads',()=>{
  const tracker=new HandGestures();
  assert.deepEqual(tracker.update([[],hand({scale:.01}),Array(21).fill({x:NaN,y:0})],0),[]);
});

test('two hands expose ten named, separate fingertip targets',()=>{
  const tracker=new HandGestures(),slots=tracker.update([hand({dx:-.2}),hand({dx:.2})],10);
  assert.equal(slots.flatMap(h=>h.fingers).length,10);
  assert.deepEqual(slots[0].fingers.map(f=>f.tip),[4,8,12,16,20]);
  assert.ok(slots[0].fingers.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y)));
  assert.notEqual(slots[0].fingers[0].x,slots[0].fingers[1].x);
});
test('a curled-in middle finger is excluded while the other fingers remain available',()=>{
  const points=hand();points[12]={x:.5,y:.69,z:0};points[10]={x:.5,y:.43,z:0};
  const slot=new HandGestures().update([points],10)[0];
  assert.equal(slot.fingers[2].active,false);assert.equal(slot.fingers[2].pressing,false);
  assert.ok(slot.fingers.filter((_,i)=>i!==2).every(f=>f.active));
  assert.equal(slot.fingers[1].pressing,false);assert.equal(slot.fingers[3].pressing,false);assert.equal(slot.fingers[4].pressing,false);
});
test('hand labels preserve identities through a crossing',()=>{
  const tracker=new HandGestures(),labels=[[{categoryName:'Left',score:.99}],[{categoryName:'Right',score:.99}]];
  const before=tracker.update([hand({dx:-.2}),hand({dx:.2})],0,4/3,labels);
  const after=tracker.update([hand({dx:.2}),hand({dx:-.2})],60,4/3,labels);
  assert.equal(after[0].id,before[0].id);assert.equal(after[1].id,before[1].id);
});
test('a second arriving hand does not steal the existing hand identity',()=>{
  const tracker=new HandGestures(),left=[{categoryName:'Left',score:.99}],right=[{categoryName:'Right',score:.99}];
  const original=tracker.update([hand({dx:.2})],0,4/3,[right])[0];
  const both=tracker.update([hand({dx:-.2}),hand({dx:.2})],60,4/3,[left,right]);
  assert.equal(both[1].id,original.id);assert.notEqual(both[0].id,original.id);
});
test('adaptive filtering reduces idle jitter and follows deliberate finger movement',()=>{
  const tracker=new HandGestures();let last,largest=0;
  for(let i=0;i<20;i++){
    const h=tracker.update([hand({dx:i%2?.003:-.003})],i*50)[0];
    const x=h.fingers[1].x;if(last!==undefined)largest=Math.max(largest,Math.abs(x-last));last=x;
  }
  assert.ok(largest<.006);
  for(let i=20;i<24;i++)tracker.update([hand({dx:.15})],i*50);
  const x=tracker.slots[0].fingers[1].x;assert.ok(Math.abs(x-(1-.4-.15))<.025);
});

test('a loose three-finger scrunch engages before a tight fist and releases on opening',()=>{
  const tracker=new HandGestures(),open=hand(),fist=hand({fist:true});
  const loose=open.map((p,i)=>({...p,y:p.y+(fist[i].y-p.y)*.60}));
  tracker.update([open],0);
  let grip;
  for(let i=1;i<=6;i++)grip=tracker.update([loose],i*50)[0];
  assert.equal(grip.closed,true);assert.ok(grip.scrunchStrength>.15&&grip.scrunchStrength<.9);
  assert.ok(grip.fingers.some(f=>f.pressing));
  assert.ok(grip.fingers.every(f=>f.pressing===f.active));
  const released=tracker.update([open],400)[0];
  assert.equal(released.closed,false);assert.equal(released.gripping,false);
  assert.ok(released.fingers.every(f=>!f.pressing));
});
test('gradual closure changes scrunch strength smoothly and remains scale independent',()=>{
  const tracker=new HandGestures();tracker.update([hand()],0);
  const first=tracker.update([hand({fist:true})],50)[0];
  const next=tracker.update([hand({fist:true})],100)[0];
  assert.ok(first.scrunchStrength>0&&first.scrunchStrength<next.scrunchStrength);
  assert.ok(next.scrunchStrength-first.scrunchStrength<.3);
  const small=new HandGestures().update([hand({fist:true,scale:.6})],100)[0];
  const large=new HandGestures().update([hand({fist:true})],100)[0];
  assert.ok(Math.abs(small.scrunchStrength-large.scrunchStrength)<1e-10);
});

function folded(){
  const p=hand({fist:true});
  p[4]={x:.53,y:.60,z:0};p[8]={x:.44,y:.70,z:0};
  return p;
}
test('a fully folded hand has no active fingertips or pinch despite nearby thumb and index',()=>{
  const tracker=new HandGestures();tracker.update([hand({pinch:true})],0);
  const slot=tracker.update([folded()],60)[0];
  assert.equal(slot.pinched,false);assert.equal(slot.gripping,false);assert.equal(slot.strength,0);
  assert.ok(slot.fingers.every(f=>!f.active&&!f.pressing&&f.strength===0));
});
test('opening just one finger restores only its target and folding it releases immediately',()=>{
  const tracker=new HandGestures();tracker.update([folded()],0);
  const p=folded();p[12]=hand()[12];
  const open=tracker.update([p],60)[0];
  assert.deepEqual(open.fingers.filter(f=>f.active).map(f=>f.tip),[12]);
  const shut=tracker.update([folded()],120)[0];
  assert.ok(shut.fingers.every(f=>!f.active&&!f.pressing));
});
test('folded-finger hysteresis prevents partially reopened fingertips from flickering',()=>{
  const tracker=new HandGestures(),p=hand();p[12]={x:.5,y:.69,z:0};
  tracker.update([p],0);
  const middle=hand();
  // Find a partly bent pose between the exclusion and reopening thresholds.
  for(let y=.20;y<.69;y+=.001){
    middle[12]={x:.5,y,z:0};
    const curl=describeHand(middle).fingers[2].curl;
    if(curl>.45&&curl<.55)break;
  }
  assert.ok(describeHand(middle).fingers[2].curl>.45);
  assert.equal(tracker.update([middle],60)[0].fingers[2].active,false);
  assert.equal(tracker.update([hand()],120)[0].fingers[2].active,true);
});
test('a finger pointing toward the camera uses depth instead of appearing folded from its screen projection',()=>{
  const p=hand();p[12]={x:.5,y:.69,z:-.6};
  const slot=new HandGestures().update([p],0)[0];
  assert.equal(slot.fingers[2].active,true);
});
test('two hands filter curled fingers independently',()=>{
  const [open,closed]=new HandGestures().update([hand({dx:-.2}),folded().map(p=>({...p,x:p.x+.2}))],0);
  assert.equal(open.fingers.filter(f=>f.active).length,5);
  assert.equal(closed.fingers.filter(f=>f.active).length,0);
});
