const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
// Continuous viscoelastic creep: pressure recruits material over seconds,
// without a timed gesture ending or an unbounded stretching velocity.
export function advanceCreep(previous,dt,contact){
  const load=Math.max((contact.depth||0)/.42,(contact.cameraPull||0)/.36,Math.hypot(...(contact.drag||[0,0,0]))/.9);
  const target=clamp((load-.18)/.82),before=clamp(previous||0);
  const alpha=-Math.expm1(-Math.max(0,Math.min(.05,dt))/(target>before?2.6:.8));
  return before+(target-before)*alpha;
}
// Keep an established pinch through ambiguous opening, but never turn a
// clearly open hand or palm-folded tips into a retained grab.
export function pinchContinuity(ratio,outsidePalm,previous,time){
  if(!outsidePalm||ratio>=.75)return {pinched:false,uncertainSince:null};
  if(ratio<(previous?.pinched ? .52 : .34))return {pinched:true,uncertainSince:null};
  if(!previous?.pinched)return {pinched:false,uncertainSince:null};
  const uncertainSince=previous.uncertainSince??time;
  return {pinched:time-uncertainSince<180,uncertainSince};
}
// Only existing surface contacts can survive a missing detection. A visible
// hand's release/fold always wins. Never acquire new points from stale hands.
export function retainMissingGrip(contact,hands,now,observedTime){
  if(hands.some(hand=>hand.id===contact.handId||contact.palm&&hand.palm&&Math.hypot(hand.palm.x-contact.palm.x,hand.palm.y-contact.palm.y)<.12)){contact.missingSince=null;return false;}
  contact.missingSince??=observedTime;
  return now-contact.missingSince<650;
}
