// One continuous, non-oscillating lift. Pure timing keeps it testable at any fps.
export const LIFT_SECONDS=1.45;
export function pickupPose(progress){
  const p=Math.max(0,Math.min(1,progress));
  const ease=p*p*p*(p*(p*6-15)+10);
  return {progress:p,ease,roomY:-3.4*ease,shadowOpacity:(1-ease)**2,
    toyY:.30*Math.sin(Math.PI*ease),fogNear:18*(1-ease),fogFar:45*(1-ease)+.3};
}
