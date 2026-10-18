const FINGER_STRENGTH=.85;
// A fingertip occupies about a tenth of the toy's width. Pulling widens only
// its small attachment region, rather than dragging or scaling the whole toy.
export function fingerContact(contact){
  const drag=[...(contact.drag||[0,0,0])];
  let length=Math.hypot(...drag);
  if(length>1.08){for(let i=0;i<3;i++)drag[i]*=1.08/length;length=1.08;}
  return {...contact,localized:true,drag:drag.map(v=>v*FINGER_STRENGTH),
    radius:Math.max(.17,Math.min(.28,contact.radius??.22))+Math.min(.06,length*.055),
    depth:Math.min(.46,Math.max(0,contact.depth??.34))*(1-Math.min(.68,length*.65))*FINGER_STRENGTH,
    pull:Math.min(.48,Math.max(0,length-.08)*.62)*FINGER_STRENGTH};
}
