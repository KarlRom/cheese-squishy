/* Face detection for a user-selected image runs locally and off the render thread. */
self.onmessage=async({data})=>{
  const bitmap=data.bitmap;
  try{
    importScripts('./vendor/hands/vision.js');
    const base=new URL('./vendor/hands/',self.location.href).href;
    const files=await SquishyVision.FilesetResolver.forVisionTasks(base+'wasm');
    const detector=await SquishyVision.FaceLandmarker.createFromOptions(files,{
      baseOptions:{modelAssetPath:base+'face_landmarker.task',delegate:'CPU'},
      runningMode:'IMAGE',numFaces:1,minFaceDetectionConfidence:.55,minFacePresenceConfidence:.55
    });
    const result=detector.detect(bitmap);
    self.postMessage({landmarks:result.faceLandmarks?.[0]??null});
    detector.close();
  }catch{self.postMessage({landmarks:null});}
  finally{bitmap.close();}
};
