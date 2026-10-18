// One material attachment per thumb/index grip. Keep its original surface
// anchor until release, even when the two tracked fingertips trade visibility.
export class PinchGrips {
  constructor(){this.grips=new Map();this.sequence=0;}
  clear(){this.grips.clear();}
  update(contacts){
    const groups=new Map(),result=[];
    for(const c of contacts){
      if(!c.pinching){result.push(c);continue;}
      if(!groups.has(c.handId))groups.set(c.handId,[]);
      groups.get(c.handId).push(c);
    }
    for(const id of this.grips.keys())if(!groups.has(id))this.grips.delete(id);
    for(const [id,group] of groups){
      let anchor=this.grips.get(id);
      if(!anchor){const c=group.find(c=>c.tip===8)||group[0];anchor={stretchId:`hand:${id}:grip:${++this.sequence}`,point:[...c.point],normal:[...c.normal]};this.grips.set(id,anchor);}
      result.push({...group[0],...anchor,radius:.21,
        drag:[0,1,2].map(i=>group.reduce((sum,c)=>sum+c.drag[i],0)/group.length),
        depth:Math.max(...group.map(c=>c.depth)),cameraPull:Math.max(...group.map(c=>c.cameraPull||0)),
        creep:Math.max(...group.map(c=>c.creep||0))});
    }
    return result;
  }
}
