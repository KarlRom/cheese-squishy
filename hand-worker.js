/* Classic worker: MediaPipe's WASM loader uses importScripts. */
let detector=null;
self.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      importScripts('./vendor/hands/vision.js');
      const base=new URL('./vendor/hands/',self.location.href).href;
      const files=await SquishyVision.FilesetResolver.forVisionTasks(base+'wasm');
      detector=await SquishyVision.HandLandmarker.createFromOptions(files,{
        baseOptions:{modelAssetPath:base+'hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:2,
        minHandDetectionConfidence:.65,minHandPresenceConfidence:.7,minTrackingConfidence:.65
      });
      self.postMessage({type:'ready'});
    }else if(data.type==='frame'){
      try{
        const result=detector.detectForVideo(data.bitmap,data.time);
        self.postMessage({type:'result',landmarks:result.landmarks,handedness:result.handedness,time:data.time});
      }finally{data.bitmap.close();}
    }
  }catch(error){self.postMessage({type:'error',message:'Hand tracking could not start on this device. Touch controls are still available.'});}
};
