const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function distance(a,b,aspect){return Math.hypot((a.x-b.x)*aspect,a.y-b.y);}
export function describeHand(points,aspect=4/3){
  if(!Array.isArray(points)||points.length!==21||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
  const scale=Math.max(distance(points[5],points[17],aspect),distance(points[0],points[9],aspect));
  if(scale<.025)return null;
  const pinchRatio=distance(points[4],points[8],aspect)/scale;
  let curl=0;
  for(const [tip,mcp] of [[12,9],[16,13],[20,17]]){
    const extension=distance(points[tip],points[0],aspect)/Math.max(.01,distance(points[mcp],points[0],aspect));
    curl+=clamp((1.65-extension)/.65)/3;
  }
  const palm=[0,5,9,13,17].reduce((a,i)=>({x:a.x+points[i].x/5,y:a.y+points[i].y/5}),{x:0,y:0});
  return {pinchRatio,curl,palm,x:1-(points[4].x+points[8].x)/2,y:(points[4].y+points[8].y)/2};
}
export class HandGestures{
  constructor(){this.slots=[];this.nextId=0;this.lastTime=0;}
  reset(){this.slots=[];this.lastTime=0;}
  update(landmarks,time,aspect=4/3){
    const hands=(landmarks||[]).slice(0,2).map(p=>describeHand(p,aspect)).filter(Boolean);
    const available=[...this.slots],output=[];
    const alpha=this.lastTime?1-Math.exp(-clamp((time-this.lastTime)/1000,.001,.2)/.065):1;
    for(const hand of hands){
      const x=hand.curl>.65?1-hand.palm.x:hand.x,y=hand.curl>.65?hand.palm.y:hand.y;
      let nearest=-1,best=Infinity;
      for(let i=0;i<available.length;i++){
        const d=Math.hypot(available[i].x-x,available[i].y-y);
        if(d<best){best=d;nearest=i;}
      }
      const old=nearest>=0?available.splice(nearest,1)[0]:null;
      const pinched=hand.pinchRatio<(old?.pinched ? .52 : .34);
      const closed=hand.curl>(old?.closed ? .45 : .65);
      const slot={id:old?.id??this.nextId++,x:clamp(old?old.x+(x-old.x)*alpha:x),y:clamp(old?old.y+(y-old.y)*alpha:y),
        pinched,closed,gripping:pinched||closed,strength:Math.max(closed?hand.curl:0,pinched?clamp(1-hand.pinchRatio/.65):0)};
      output.push(slot);
    }
    this.slots=output;this.lastTime=time;return output;
  }
}
