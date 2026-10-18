// One continuous, non-oscillating lift. Pure timing keeps it testable at any fps.
export const LIFT_SECONDS=1.45;
export function pickupPose(progress){
  const p=Math.max(0,Math.min(1,progress));
  const ease=p*p*p*(p*(p*6-15)+10);
  return {progress:p,ease,roomY:-3.4*ease,shadowOpacity:(1-ease)**2,
    toyY:.30*Math.sin(Math.PI*ease),fogNear:18*(1-ease),fogFar:45*(1-ease)+.3};
}

export const SLIDE_SECONDS=.65;
export const DROP_SECONDS=1.2;
export function slidePose(progress){
  const p=Math.max(0,Math.min(1,progress));
  const ease=p*p*(3-2*p);
  return {progress:p,outgoing:-ease,incoming:1-ease};
}
export function dropPose(progress){
  const p=Math.max(0,Math.min(1,progress));
  const ease=p*p*p*(p*(p*6-15)+10);
  return {progress:p,ease,roomY:-3.4*(1-ease),toyY:-.35*Math.sin(Math.PI*ease),
    shadowOpacity:ease*ease,fogNear:18*ease,fogFar:45*ease+.3};
}
