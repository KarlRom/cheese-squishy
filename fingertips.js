const FINGER_STRENGTH=.85;
// Thick rubber resists extension progressively and recruits a wider shoulder
// around a pulling finger. A press keeps its small, localized footprint.
export function fingerContact(contact){
  const drag=[...(contact.drag||[0,0,0])];
  if(contact.depthControlled){
    const along=drag.reduce((sum,v,i)=>sum+v*contact.normal[i],0);
    for(let i=0;i<3;i++)drag[i]-=contact.normal[i]*along;
  }
  let length=Math.hypot(...drag);
  if(length>1.08){for(let i=0;i<3;i++)drag[i]*=1.08/length;length=1.08;}
  const creep=Math.max(0,Math.min(1,contact.creep||0));
  const stretch=contact.scrunch?0:Math.max(0,length-.08);
  const deepPoke=!!contact.deepPoke&&!contact.scrunch&&length<.12&&!(contact.cameraPull>0);
  const pokeHold=deepPoke?creep:0;
  const cameraHold=contact.depthControlled&&!contact.scrunch?creep:0;
  const lift=contact.depthControlled?Math.max(0,Math.min(2.35,(contact.cameraPull||0)*(1+creep*.5+cameraHold*2.4))):0;
  const thickness=Math.max(creep*.8,1-Math.exp(-Math.max(stretch,lift*2.5)/.28));
  const travel=contact.scrunch?length:Math.min(length,(.40+creep*.20)*Math.tanh(length/(.55+creep*.10)));
  const dragScale=length>0?travel/length:1;
  return {...contact,localized:true,thickness,deepPoke,fingerPad:Math.max(cameraHold,pokeHold),volumeContact:deepPoke||contact.depthControlled&&!contact.scrunch,contactRadius:deepPoke?.13:Math.max(.17,Math.min(.24,contact.radius??.21)),
    drag:drag.map(v=>v*dragScale*FINGER_STRENGTH),
    radius:Math.max(.17,Math.min(.28,contact.radius??.22))+(contact.scrunch?Math.min(.06,length*.055):thickness*.20)+creep*.14,
    depth:Math.min(.46+creep*.16+cameraHold*.65+pokeHold*.9,Math.max(0,contact.depth??.34)*(1+creep*.40+cameraHold*1.6+pokeHold*2.8))*(1-Math.min(contact.scrunch ? .68 : .82,length*(contact.scrunch ? .65 : .82)))*FINGER_STRENGTH,
    pull:contact.scrunch?0:(contact.depthControlled?lift:(.22+creep*.10)*Math.tanh(stretch*1.8))*FINGER_STRENGTH};
}

// Overlapping fingers share a pressure budget. Separated fingertips retain
// individual dents; coincident fingertips cannot multiply the deformation.
export function balanceContacts(contacts){
  return contacts.map(contact=>{
    let density=0;
    for(const other of contacts){
      const distance2=contact.point.reduce((sum,v,i)=>sum+(v-other.point[i])**2,0);
      const width=Math.max(.22,contact.radius,other.radius);
      density+=Math.exp(-distance2/(2*width*width));
    }
    return {...contact,weight:1/Math.max(1,density)};
  });
}

// A closing hand gathers the attached patches toward their shared center.
// Keep this tangential so gathering cannot turn into outward sticky pulling.
export function scrunchContact(contact,center,strength){
  const amount=Math.max(0,Math.min(1,strength));
  const delta=center.map((v,i)=>v-contact.point[i]);
  const normalAmount=delta.reduce((sum,v,i)=>sum+v*contact.normal[i],0);
  const tangent=delta.map((v,i)=>(v-contact.normal[i]*normalAmount)*amount*.30);
  const length=Math.hypot(...tangent),limit=.22;
  return {...contact,scrunch:true,
    drag:tangent.map(v=>v*Math.min(1,limit/Math.max(.0001,length))),
    radius:Math.max(contact.radius,.21),depth:.12+amount*.28};
}

// Closing fingers can leave their screen hit while still holding that spot.
// Only a recent real surface hit can seed a grip; never grab empty space.
export function recentGripHit(cached,now,closing){
  return closing&&cached?.lastAttachment&&now-cached.lastSeen<=400?cached.lastAttachment:null;
}
