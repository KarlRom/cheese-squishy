/* Classic worker: MediaPipe's WASM loader uses importScripts. */
let detector=null,face=null,lastFaceTime=-Infinity;
self.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      importScripts('./vendor/hands/vision.js');
      const base=new URL('./vendor/hands/',self.location.href).href;
      const files=await SquishyVision.FilesetResolver.forVisionTasks(base+'wasm');
      detector=await SquishyVision.HandLandmarker.createFromOptions(files,{
        baseOptions:{modelAssetPath:base+'hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:2,
        minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.5
      });
      try{
        face=await SquishyVision.FaceLandmarker.createFromOptions(files,{
          baseOptions:{modelAssetPath:base+'face_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:true,
          minFaceDetectionConfidence:.65,minFacePresenceConfidence:.65,minTrackingConfidence:.65
        });
      }catch{face=null;}
      self.postMessage({type:'ready',faceAvailable:!!face});
    }else if(data.type==='frame'){
      try{
        const result=detector.detectForVideo(data.bitmap,data.time);
        let mouth=null,blendshapes=null,faceUpdated=false;
        // Hands run on every frame; face inference is throttled to protect hand cadence.
        if(face&&data.time-lastFaceTime>=120){
          faceUpdated=true;lastFaceTime=data.time;
          try{
            const result=face.detectForVideo(data.bitmap,data.time);
            mouth=result.faceLandmarks[0]||null;blendshapes=result.faceBlendshapes?.[0]?.categories||[];
          }catch{try{face.close();}catch{}face=null;}
        }
        self.postMessage({type:'result',faceUpdated,faceAvailable:!!face,faceLandmarks:mouth,faceBlendshapes:blendshapes,
          landmarks:result.landmarks,handedness:result.handedness,time:data.time});
      }finally{data.bitmap.close();}
    }
  }catch(error){self.postMessage({type:'error',message:'Hand tracking could not start on this device. Touch controls are still available.'});}
};
