export const HOME_RADIUS=7.8, MIN_RADIUS=4.2, MAX_RADIUS=14;
export function clampRadius(radius){return Math.min(MAX_RADIUS,Math.max(MIN_RADIUS,Number.isFinite(radius)?radius:HOME_RADIUS));}
export function pinchRadius(startRadius,startDistance,distance){
  if(!Number.isFinite(startDistance)||!Number.isFinite(distance)||startDistance<1||distance<1)return clampRadius(startRadius);
  return clampRadius(startRadius*startDistance/distance);
}
