import {fingerContact} from './fingertips.js?v=2.32.0';
// Compression remains soft and deep; tensile motion is 20% less pronounced.
export function denseContact(raw){
  const c=fingerContact(raw);
  return {...c,pull:c.pull*.8,
    drag:c.drag.map(v=>v*(c.scrunch?1:.8)),
    fold:c.scrunch?Math.min(.022,c.depth*.055):0};
}
export function handCompression(hands,contacts){
  let strength=0;
  for(const hand of hands){
    if(!hand.closed||hand.pinched)continue;
    const attached=contacts.filter(c=>c.handId===hand.id);
    if(attached.length<2)continue;
    strength=Math.max(strength,Math.max(0,Math.min(1,(hand.scrunchStrength||0)/.55)));
  }
  return strength;
}
