/** Six material-space gestures; the view frame makes local presses face the viewer. */
export const squeezeNames=['Side squeeze','Palm squash','Thumb press','Corner fold','Front-to-back pinch','Diagonal squeeze'];
export function makeSqueeze(index,frame){
  const {normal:n,right:r,up:u}=frame;
  const add=(a,b,k=1)=>a.map((v,i)=>v+b[i]*k);
  const scale=(a,k)=>a.map(v=>v*k);
  const unit=a=>scale(a,1/Math.hypot(...a));
  const press=(x,y,depth,radius,dx=0,dy=0)=>({
    point:add(add(scale(n,.97),r,x),u,y),normal:[...n],
    drag:add(scale(r,dx),u,dy),depth,radius
  });
  const kind=((index%6)+6)%6;
  const result={name:squeezeNames[kind],duration:1250,contacts:[],pinch:null,squeeze:0};
  switch(kind){
    case 0:
      result.contacts=[press(-.42,.08,.35,.5),press(.42,.08,.35,.5)];
      result.pinch={axis:[...r],amount:.5};break;
    case 1:
      result.contacts=[{point:[0,.98,0],normal:[0,1,0],drag:[.08,0,.04],radius:.74,depth:.42}];
      result.squeeze=.82;result.duration=1450;break;
    case 2:
      result.contacts=[press(.23,-.13,.88,.42,-.08,-.05)];result.duration=1100;break;
    case 3:
      result.contacts=[press(-.40,.43,.76,.47,.28,-.22),press(-.12,.62,.39,.4,.17,-.16)];break;
    case 4:
      result.contacts=[press(.02,.05,.39,.63)];
      result.pinch={axis:[...n],amount:.50};result.duration=1350;break;
    case 5:
      result.contacts=[press(-.38,-.3,.5,.44,.13,.12),press(.36,.34,.5,.44,-.13,-.12)];
      result.pinch={axis:unit(add(r,u,.7)),amount:.47};break;
  }
  return result;
}
