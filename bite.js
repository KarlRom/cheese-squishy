const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Inner lip separation relative to mouth width, independent of camera distance.
export function mouthPose(points,aspect=4/3){
  if(!Array.isArray(points)||points.length<292)return null;
  const [left,right,upper,lower]=[61,291,13,14].map(i=>points[i]);
  if([left,right,upper,lower].some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
  const width=Math.hypot((right.x-left.x)*aspect,right.y-left.y);
  if(width<.035)return null;
  return {x:1-(upper.x+lower.x)/2,y:(upper.y+lower.y)/2,
    width:width/aspect,ratio:Math.hypot((upper.x-lower.x)*aspect,upper.y-lower.y)/width,
    angle:Math.atan2(right.y-left.y,-(right.x-left.x)*aspect)};
}
export class BiteGesture{
  constructor(){this.reset();}
  reset(){this.openSince=null;this.armed=false;this.lastTime=null;this.cooldown=0;this.origin=null;}
  update(points,time,aspect){
    const mouth=mouthPose(points,aspect);
    if(!mouth||this.lastTime!==null&&time-this.lastTime>350){this.openSince=null;this.armed=false;this.origin=null;}
    this.lastTime=time;
    if(!mouth)return null;
    let bite=false;
    if(time<this.cooldown)return {...mouth,armed:false,bite:false};
    if(this.origin&&Math.hypot(mouth.x-this.origin.x,mouth.y-this.origin.y)>.12){this.openSince=null;this.armed=false;this.origin=null;}
    if(mouth.ratio>.30){
      if(this.openSince===null){this.openSince=time;this.origin=mouth;}
      this.armed=time-this.openSince>=120;
    }else if(mouth.ratio<.12){
      bite=this.armed&&time-this.openSince<2000;
      this.openSince=null;this.armed=false;this.origin=null;
      if(bite)this.cooldown=time+900;
    }
    if(this.openSince!==null&&time-this.openSince>=2000){this.armed=false;}
    return {...mouth,armed:this.armed,bite};
  }
}
// Two shallow dental arches with wider front incisors and smaller side teeth.
export function toothLayout(width=.85){
  width=clamp(width,.55,1.1);
  return [-1,1].flatMap(row=>Array.from({length:6},(_,i)=>{
    const t=(i-2.5)/2.5;
    return {x:t*width*.5,y:row*(.16+.08*(1-t*t)),width:width*(Math.abs(t)<.3?.09:.075),height:.075,depth:Math.abs(t)>.7?.095:.12};
  }));
}
// Permanent shallow rounded tooth impressions. Independent of transient loads,
// bounded across repeated bites, and cleared by the ordinary material reset.
export function imprintTeeth(rest,marks,teeth,strength=1){
  for(let i=0;i<rest.length;i+=3){
    let ax=0,ay=0,az=0;
    for(const tooth of teeth){
      const dx=rest[i]-tooth.point[0],dy=rest[i+1]-tooth.point[1],dz=rest[i+2]-tooth.point[2];
      const r=tooth.right,u=tooth.up,n=tooth.normal;
      const x=(dx*r[0]+dy*r[1]+dz*r[2])/tooth.width;
      const y=(dx*u[0]+dy*u[1]+dz*u[2])/tooth.height;
      const z=(dx*n[0]+dy*n[1]+dz*n[2])/.16;
      const q=1-x*x*x*x-y*y*y*y-z*z;
      if(q<=0)continue;
      const depth=tooth.depth*q*q*clamp(strength,0,1);
      ax-=n[0]*depth;ay-=n[1]*depth;az-=n[2]*depth;
    }
    marks[i]+=ax;marks[i+1]+=ay;marks[i+2]+=az;
    const size=Math.hypot(marks[i],marks[i+1],marks[i+2]);
    if(size>.26)for(let j=0;j<3;j++)marks[i+j]*=.26/size;
  }
}
