const clamp=v=>Math.max(0,Math.min(1,v));
const copy=size=>({width:size.width,length:size.length});
function shift(size,reference){
  const width=Math.log(size.width/reference.width),length=Math.log(size.length/reference.length);
  // Reject one-axis foreshortening rather than interpreting a hand turn as depth.
  return {value:(width+length)/2,reliable:Math.abs(width-length)<.20};
}
export function trackHandDepth(size,previous,time,dt,pinched,aspect=4/3){
  const valid=size&&size.visible&&size.width>.025&&size.length>.025&&Number.isFinite(size.width+size.length);
  if(!valid)return {seen:time,push:0,pull:0,pushing:false,valid:false};
  const fresh=!previous?.valid||time-previous.seen>850||Math.abs((previous.aspect??aspect)-aspect)>.01;
  const reference=fresh?copy(size):previous.reference;
  const pinchReference=pinched?(!fresh&&previous.pinched?previous.pinchReference:copy(size)):null;
  // A pinch has one depth origin for both directions. Mixing its retreat
  // origin with the older open-hand push origin can report push and pull at once.
  const approach=shift(size,pinchReference||reference);
  const alpha=-Math.expm1(-Math.min(.15,Math.max(.005,dt))/.12);
  const sameOrigin=!fresh&&pinched===!!previous.pinched;
  const signed=(sameOrigin?previous.signed||0:0)+((approach.reliable?approach.value:0)-(sameOrigin?previous.signed||0:0))*alpha;
  const toward=Math.max(0,signed),away=pinched?Math.max(0,-signed):0;
  const pushing=approach.reliable&&toward>(sameOrigin&&previous?.pushing ? .05 : .08);
  return {reference,pinchReference,aspect,seen:time,valid:true,pinched,toward,away,
    signed,
    // Extended travel remains responsive beyond the old normalized gesture ceiling.
    pushTravel:pushing?Math.max(0,Math.min(2.8,(toward-.04)/.38)):0,
    pullTravel:pinched&&approach.reliable?Math.max(0,Math.min(2.8,(away-.055)/.38)):0,
    pushing,push:pushing?clamp((toward-.04)/.38):0,
    pull:pinched&&approach.reliable?clamp((away-.055)/.38):0};
}
