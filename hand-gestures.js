import {pinchContinuity} from './grip.js?v=2.20.0';
import {trackHandDepth} from './hand-depth.js?v=2.38.0';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const names=['Thumb','Index','Middle','Ring','Little'];
const tips=[4,8,12,16,20],mcps=[2,5,9,13,17],pips=[3,6,10,14,18];
function distance(a,b,aspect){return Math.hypot((a.x-b.x)*aspect,a.y-b.y,((a.z||0)-(b.z||0))*aspect);}
function jointCurl(a,b,c,aspect){
  const av=[(a.x-b.x)*aspect,a.y-b.y,((a.z||0)-(b.z||0))*aspect];
  const cv=[(c.x-b.x)*aspect,c.y-b.y,((c.z||0)-(b.z||0))*aspect];
  const length=Math.hypot(...av)*Math.hypot(...cv);
  if(length<1e-12)return null;
  const angle=Math.acos(clamp(av.reduce((sum,v,i)=>sum+v*cv[i],0)/length,-1,1));
  return clamp((Math.PI-angle)/1.65);
}
// Conservative anatomical vetoes are separate from the pressure estimate.
// A depth guess must not turn a fingertip projected inside the palm into a touch.
export function fingerShape(points,index,aspect=4/3){
  const tip=tips[index],mcp=mcps[index],pip=pips[index],dip=index===0?3:tip-1;
  // Actual projected palm outline, rather than a wide rectangular exclusion zone.
  const outline=[0,5,9,13,17].map(i=>points[i]),target=points[tip];
  let inPalm=false;
  for(let i=0,j=outline.length-1;i<outline.length;j=i++){
    const a=outline[i],b=outline[j];
    if((a.y>target.y)!==(b.y>target.y)&&target.x<(b.x-a.x)*(target.y-a.y)/(b.y-a.y)+a.x)inPalm=!inPalm;
  }
  const bend=jointCurl(points[mcp],points[pip],points[index===0?tip:dip],aspect)??0;
  const endBend=index===0?0:(jointCurl(points[pip],points[dip],points[tip],aspect)??0);
  // Distal joints can fold back even when a noisy tip-to-wrist distance looks long.
  const returning=distance(points[tip],points[0],aspect)<distance(points[pip],points[0],aspect)*1.12;
  const folded=inPalm||((bend>.58||endBend>.58)&&returning)||endBend>.95;
  const clear=!inPalm&&bend<.30&&endBend<.30;
  return {folded,clear,inPalm};
}
function smooth(point,old,dt){
  if(!old)return {...point,speed:0};
  const speed=Math.hypot(point.x-old.x,point.y-old.y)/dt;
  const filteredSpeed=old.speed+(speed-old.speed)*(1-Math.exp(-2*Math.PI*dt));
  // Stronger filtering at rest; low lag for deliberate fast movement.
  const alpha=1-Math.exp(-2*Math.PI*(1.8+8*filteredSpeed)*dt);
  return {x:old.x+(point.x-old.x)*alpha,y:old.y+(point.y-old.y)*alpha,speed:filteredSpeed};
}
export function describeHand(points,aspect=4/3){
  if(!Array.isArray(points)||points.length!==21||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
  const scale=Math.max(distance(points[5],points[17],aspect),distance(points[0],points[9],aspect));
  if(scale<.025)return null;
  const pinchRatio=distance(points[4],points[8],aspect)/scale;
  const palm=[0,5,9,13,17].reduce((a,i)=>({x:a.x+points[i].x/5,y:a.y+points[i].y/5,z:a.z+(points[i].z||0)/5}),{x:0,y:0,z:0});
  const fingers=tips.map((tip,i)=>{
    const extension=distance(points[tip],points[0],aspect)/Math.max(.01,distance(points[mcps[i]],points[0],aspect));
    const extensionCurl=clamp((1.65-extension)/.65);
    const angle=jointCurl(points[mcps[i]],points[pips[i]],points[tip],aspect);
    // Distances carry most of the estimate; joint shape helps with foreshortening.
    const curl=i===0?clamp(1-distance(points[tip],palm,aspect)/(.60*scale)):extensionCurl*.8+(angle??extensionCurl)*.2;
    return {name:names[i],tip,x:1-points[tip].x,y:points[tip].y,curl,...fingerShape(points,i,aspect)};
  });
  const curl=fingers.slice(1).reduce((sum,f)=>sum+f.curl/4,0);
  const projected=(a,b)=>Math.hypot((a.x-b.x)*aspect,a.y-b.y);
  const size={width:projected(points[5],points[17]),length:projected(points[0],points[9]),
    visible:[0,5,9,13,17].every(i=>points[i].x>.015&&points[i].x<.985&&points[i].y>.015&&points[i].y<.985)};
  const up={x:(points[9].x-points[0].x)*aspect,y:points[0].y-points[9].y};
  const upright=up.y>.055&&Math.abs(up.x)<up.y*.8;
  const open=fingers.slice(1).every(f=>f.clear&&f.curl<.25)&&pinchRatio>.55;
  // Across the knuckles, measured independently of hand translation.
  const roll=Math.atan2(points[17].y-points[5].y,(points[17].x-points[5].x)*aspect);
  // Wrist-to-knuckle depth gives a tilt axis independent of hand position and scale.
  const pitch=Math.atan2(((points[9].z||0)-(points[0].z||0))*aspect,Math.max(.01,size.length));
  return {pinchRatio,curl,palm,fingers,size,rotationPose:upright&&open&&size.visible,roll,pitch,
    x:1-(points[4].x+points[8].x)/2,y:(points[4].y+points[8].y)/2};
}
export class HandGestures{
  constructor(){this.slots=[];this.nextId=0;this.lastTime=0;}
  reset(){this.slots=[];this.lastTime=0;}
  update(landmarks,time,aspect=4/3,handedness=[]){
    const hands=(landmarks||[]).slice(0,2).map((points,i)=>{
      const hand=describeHand(points,aspect);if(!hand)return null;
      const label=handedness[i]?.[0];
      return {...hand,sourceIndex:i,label:label?.score>.8?label.categoryName:null};
    }).filter(Boolean);
    const previous=this.slots.filter(slot=>time-slot.seen<900);
    const cost=(hand,slot)=>Math.hypot(hand.palm.x-slot.palm.x,hand.palm.y-slot.palm.y)+(hand.label&&slot.label&&hand.label!==slot.label ? .65 : 0);
    let order=previous;
    if(hands.length===2&&previous.length===2&&cost(hands[0],previous[1])+cost(hands[1],previous[0])<cost(hands[0],previous[0])+cost(hands[1],previous[1]))order=[previous[1],previous[0]];
    if(hands.length===2&&previous.length===1&&cost(hands[1],previous[0])<cost(hands[0],previous[0]))order=[undefined,previous[0]];
    if(hands.length===1&&previous.length===2)order=[...previous].sort((a,b)=>cost(hands[0],a)-cost(hands[0],b));
    const dt=this.lastTime?clamp((time-this.lastTime)/1000,.005,.15):.05;
    const output=hands.map((hand,i)=>{
      const candidate=order[i],old=candidate&&cost(hand,candidate)<.55?candidate:null;
      // Folded fingertips are not contact candidates. Reopen farther before
      // restoring a target so a partly hidden finger cannot flicker on/off.
      const pinchState=pinchContinuity(hand.pinchRatio,!hand.fingers[0].inPalm&&!hand.fingers[1].inPalm,
        old?{pinched:old.pinched,uncertainSince:old.pinchUncertainSince}:null,time);
      const pinchCandidate=pinchState.pinched;
      const available=hand.fingers.map((finger,j)=>{
        const before=old?.fingers?.[j];
        const pinchTip=j<2&&pinchCandidate;
        const safe=!finger.inPalm&&(pinchTip||!finger.folded&&finger.curl<.55);
        const reopening=safe&&(pinchTip||finger.clear&&finger.curl<.32);
        const clearFrames=reopening?(before?.clearFrames??0)+1:0;
        const active=safe&&(before?.active!==false||clearFrames>=2);
        return {...finger,active,clearFrames};
      });
      const pinched=available[0].active&&available[1].active&&pinchCandidate;
      const depth=trackHandDepth(hand.size,old?.depth,time,dt,pinched,aspect);
      // A loose multi-finger curl is enough; an isolated bent finger still presses alone.
      const curled=available.slice(1).filter(f=>f.active&&f.curl>(old?.closed ? .18 : .25)).length;
      const eligibleCurl=available.slice(1).reduce((sum,f)=>sum+(f.active?f.curl:0)/4,0);
      const closed=curled>=2&&eligibleCurl>(old?.closed ? .10 : .15);
      const target=closed?clamp((hand.curl-.16)/.68):0;
      const scrunchStrength=(old?.scrunchStrength??target)+(target-(old?.scrunchStrength??target))*(1-Math.exp(-dt/.085));
      const point=smooth(hand,old,time-(old?.seen??time)>120?.15:dt);
      // Approaching the camera with an open palm must not press every tip.
      // A clear index with the other long fingers folded can still poke.
      const pointing=available[1].active&&available.slice(2).filter(f=>f.active&&f.clear).length<=1;
      const fingers=available.map((finger,j)=>{
        const before=old?.fingers?.[j],position=smooth(finger,before,dt);
        const approachPress=depth.pushing&&j===1&&pointing;
        const pressing=finger.active&&(approachPress||closed||(j<2&&pinched)||(j>0&&finger.curl>(before?.pressing ? .25 : .35)));
        return {...finger,...position,x:clamp(position.x),y:clamp(position.y),pressing,
          strength:pressing?Math.max(j<2&&pinched?clamp(1-hand.pinchRatio/.65):0,finger.curl,closed?scrunchStrength:0,depth.push):0};
      });
      return {id:old?.id??this.nextId++,sourceIndex:hand.sourceIndex,label:hand.label||old?.label,palm:hand.palm,seen:time,...point,
        x:clamp(point.x),y:clamp(point.y),pinched,pinchUncertainSince:pinchState.uncertainSince,closed,scrunchStrength,fingers,depth,
        rotationPose:hand.rotationPose&&!pinched&&!closed,roll:hand.roll,pitch:hand.pitch,
        gripping:fingers.some(f=>f.pressing),strength:Math.max(0,...fingers.map(f=>f.strength))};
    });
    this.slots=[...output,...previous.filter(old=>!output.some(slot=>slot.id===old.id))].slice(0,2);
    this.lastTime=time;return output;
  }
}
