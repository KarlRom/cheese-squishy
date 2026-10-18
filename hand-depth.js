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
  const fresh=!previous?.valid||time-previous.seen>500||Math.abs((previous.aspect??aspect)-aspect)>.01;
  const reference=fresh?copy(size):previous.reference;
  const pinchReference=pinched?(!fresh&&previous.pinched?previous.pinchReference:copy(size)):null;
  const approach=shift(size,reference),retreat=pinchReference?shift(size,pinchReference):null;
  const alpha=-Math.expm1(-Math.min(.15,Math.max(.005,dt))/.12);
  const toward=(fresh?0:previous.toward||0)+((approach.reliable?approach.value:0)-(fresh?0:previous.toward||0))*alpha;
  const awayBase=!fresh&&previous.pinched?previous.away||0:0;
  const away=awayBase+((retreat?.reliable?-retreat.value:0)-awayBase)*alpha;
  const pushing=approach.reliable&&toward>(previous?.pushing ? .05 : .08);
  return {reference,pinchReference,aspect,seen:time,valid:true,pinched,toward,away,
    pushing,push:pushing?clamp((toward-.04)/.38):0,
    pull:pinched&&retreat.reliable?clamp((away-.055)/.38):0};
}
