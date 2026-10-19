// Map mirrored landmark coordinates into an object-fit:cover camera backdrop.
// The camera crop is centered, matching the CSS video, so dots land on the
// same visible fingertips even when a phone stage is much taller than 4:3.
export function coverPoint(x,y,videoWidth,videoHeight,stageWidth,stageHeight){
  if(![videoWidth,videoHeight,stageWidth,stageHeight].every(v=>Number.isFinite(v)&&v>0))
    return {x,y,scaleX:1,scaleY:1};
  const scale=Math.max(stageWidth/videoWidth,stageHeight/videoHeight);
  const scaleX=videoWidth*scale/stageWidth,scaleY=videoHeight*scale/stageHeight;
  return {x:.5+(x-.5)*scaleX,y:.5+(y-.5)*scaleY,scaleX,scaleY};
}
