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
