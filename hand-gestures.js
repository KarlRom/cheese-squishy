const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const names=['Thumb','Index','Middle','Ring','Little'];
const tips=[4,8,12,16,20],mcps=[2,5,9,13,17],pips=[3,6,10,14,18];
function distance(a,b,aspect){return Math.hypot((a.x-b.x)*aspect,a.y-b.y);}
function jointCurl(a,b,c,aspect){
  const av=[(a.x-b.x)*aspect,a.y-b.y,((a.z||0)-(b.z||0))*aspect];
  const cv=[(c.x-b.x)*aspect,c.y-b.y,((c.z||0)-(b.z||0))*aspect];
  const length=Math.hypot(...av)*Math.hypot(...cv);
  if(length<.00005)return null;
  const angle=Math.acos(clamp(av.reduce((sum,v,i)=>sum+v*cv[i],0)/length,-1,1));
  return clamp((Math.PI-angle)/1.65);
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
  const fingers=tips.map((tip,i)=>{
    const extension=distance(points[tip],points[0],aspect)/Math.max(.01,distance(points[mcps[i]],points[0],aspect));
    const extensionCurl=clamp((1.65-extension)/.65);
    const angle=jointCurl(points[mcps[i]],points[pips[i]],points[tip],aspect);
    // Distances carry most of the estimate; joint shape helps with foreshortening.
    const curl=i===0?0:extensionCurl*.8+(angle??extensionCurl)*.2;
    return {name:names[i],tip,x:1-points[tip].x,y:points[tip].y,curl};
  });
  const curl=fingers.slice(1).reduce((sum,f)=>sum+f.curl/4,0);
  const palm=[0,5,9,13,17].reduce((a,i)=>({x:a.x+points[i].x/5,y:a.y+points[i].y/5}),{x:0,y:0});
  return {pinchRatio,curl,palm,fingers,x:1-(points[4].x+points[8].x)/2,y:(points[4].y+points[8].y)/2};
}
export class HandGestures{
  constructor(){this.slots=[];this.nextId=0;this.lastTime=0;}
  reset(){this.slots=[];this.lastTime=0;}
  update(landmarks,time,aspect=4/3,handedness=[]){
    const hands=(landmarks||[]).slice(0,2).map((points,i)=>{
      const hand=describeHand(points,aspect);if(!hand)return null;
      const label=handedness[i]?.[0];
      return {...hand,label:label?.score>.8?label.categoryName:null};
    }).filter(Boolean);
    const previous=this.slots.filter(slot=>time-slot.seen<180);
    const cost=(hand,slot)=>Math.hypot(hand.palm.x-slot.palm.x,hand.palm.y-slot.palm.y)+(hand.label&&slot.label&&hand.label!==slot.label ? .65 : 0);
    let order=previous;
    if(hands.length===2&&previous.length===2&&cost(hands[0],previous[1])+cost(hands[1],previous[0])<cost(hands[0],previous[0])+cost(hands[1],previous[1]))order=[previous[1],previous[0]];
    if(hands.length===2&&previous.length===1&&cost(hands[1],previous[0])<cost(hands[0],previous[0]))order=[undefined,previous[0]];
    if(hands.length===1&&previous.length===2)order=[...previous].sort((a,b)=>cost(hands[0],a)-cost(hands[0],b));
    const dt=this.lastTime?clamp((time-this.lastTime)/1000,.005,.15):.05;
    const output=hands.map((hand,i)=>{
      const old=order[i],pinched=hand.pinchRatio<(old?.pinched ? .52 : .34);
      // A loose multi-finger curl is enough; an isolated bent finger still presses alone.
      const curled=hand.fingers.slice(1).filter(f=>f.curl>(old?.closed ? .22 : .35)).length;
      const closed=curled>=2&&hand.curl>(old?.closed ? .18 : .30);
      const target=closed?clamp((hand.curl-.16)/.68):0;
      const scrunchStrength=(old?.scrunchStrength??target)+(target-(old?.scrunchStrength??target))*(1-Math.exp(-dt/.085));
      const point=smooth(hand,old,time-(old?.seen??time)>120?.15:dt);
      const fingers=hand.fingers.map((finger,j)=>{
        const before=old?.fingers?.[j],position=smooth(finger,before,dt);
        const pressing=closed||(j<2&&pinched)||(j>0&&finger.curl>(before?.pressing ? .40 : .57));
        return {...finger,...position,x:clamp(position.x),y:clamp(position.y),pressing,
          strength:pressing?Math.max(j<2&&pinched?clamp(1-hand.pinchRatio/.65):0,finger.curl,closed?scrunchStrength:0):0};
      });
      return {id:old?.id??this.nextId++,label:hand.label||old?.label,palm:hand.palm,seen:time,...point,
        x:clamp(point.x),y:clamp(point.y),pinched,closed,scrunchStrength,fingers,
        gripping:pinched||closed||fingers.some(f=>f.pressing),strength:Math.max(0,...fingers.map(f=>f.strength))};
    });
    this.slots=[...output,...previous.filter(old=>!output.some(slot=>slot.id===old.id))].slice(0,2);
    this.lastTime=time;return output;
  }
}
