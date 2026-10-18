import {HandGestures} from './hand-gestures.js?v=2.12.0';
export class HandMode{
  constructor({video,overlay,onHands,onStatus}){
    Object.assign(this,{video,overlay,onHands,onStatus});
    this.gestures=new HandGestures();this.session=0;this.active=false;this.phase='off';
  }
  status(phase,message){this.phase=phase;this.onStatus(phase,message);}
  async start(){
    if(this.phase==='starting'||this.active)return;
    const token=++this.session;
    if(!navigator.mediaDevices?.getUserMedia||!window.Worker||!window.createImageBitmap){
      this.status('error','Hand mode is unavailable here. Try Safari or Chrome over HTTPS.');return;
    }
    this.status('starting','Allow camera access to use your hands.');
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:960},height:{ideal:720},frameRate:{ideal:24,max:30}}});
      if(token!==this.session){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;
      stream.getVideoTracks().forEach(track=>track.addEventListener('ended',()=>{if(token===this.session)this.stop();},{once:true}));
      this.video.srcObject=stream;await this.video.play();
      if(token!==this.session)return;
      this.status('starting','Loading hand tracking… First use may take a moment.');
      const worker=new Worker(new URL('./hand-worker.js?v=2.12.0',document.baseURI));this.worker=worker;
      await new Promise((resolve,reject)=>{
        this.rejectInit=reject;
        const timer=setTimeout(()=>reject(new Error('load')),40000);this.initTimer=timer;
        worker.onerror=()=>reject(new Error('worker'));
        worker.onmessage=({data})=>{
          if(data.type==='ready'){clearTimeout(timer);this.rejectInit=null;resolve();}
          else if(data.type==='error'){clearTimeout(timer);reject(new Error('model'));}
        };
        worker.postMessage({type:'init'});
      });
      if(token!==this.session)return;
      this.active=true;this.busy=false;this.lastSent=0;this.lastVideoTime=-1;this.frameInterval=50;
      this.status('active','Only extended fingertips interact. Curled-in fingers are ignored. Pinch and move to pull.');
      worker.onerror=()=>this.fail(token,'Hand tracking stopped. You can retry or use touch.');
      worker.onmessage=({data})=>{
        if(token!==this.session)return;
        if(data.type==='error'){this.fail(token,data.message);return;}
        if(data.type==='result'){
          this.busy=false;
          if(performance.now()-data.time>400){this.gestures.reset();this.onHands([]);return;}
          const hands=this.gestures.update(data.landmarks,performance.now(),this.video.videoWidth/Math.max(1,this.video.videoHeight),data.handedness);
          this.frameInterval=Math.max(50,Math.min(110,this.frameInterval*.8+(performance.now()-data.time)*.22));
          this.draw(data.landmarks,hands);this.onHands(hands);
        }
      };
      const frame=async(now)=>{
        if(token!==this.session||!this.active)return;
        this.frameHandle=requestAnimationFrame(frame);
        if(this.busy||now-this.lastSent<this.frameInterval||this.video.readyState<2||this.lastVideoTime===this.video.currentTime)return;
        this.busy=true;this.lastSent=now;this.lastVideoTime=this.video.currentTime;
        try{
          const bitmap=await createImageBitmap(this.video);
          if(token!==this.session||!this.active){bitmap.close();return;}
          worker.postMessage({type:'frame',bitmap,time:now},[bitmap]);
        }catch{this.fail(token,'Camera frames could not be read. Try restarting Hand mode.');}
      };
      this.frameHandle=requestAnimationFrame(frame);
    }catch(error){
      if(token!==this.session)return;
      const message=error.name==='NotAllowedError'?'Camera access was not allowed. You can enable it in browser settings.':error.name==='NotFoundError'?'No camera was found. Touch controls still work.':error.name==='NotReadableError'?'The camera is busy. Close other camera apps and retry.':'Hand mode could not start. Please retry or use touch.';
      this.fail(token,message);
    }
  }
  draw(landmarks,hands=[]){
    const canvas=this.overlay,ctx=canvas.getContext('2d');
    const w=canvas.width=320,h=canvas.height=240;ctx.clearRect(0,0,w,h);
    for(const [handIndex,points] of landmarks.entries()){
      if(points.length!==21||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))continue;
      ctx.lineWidth=2;ctx.strokeStyle=(hands[handIndex]?.id||0)%2?'#d3bedf':'#f4deb5';ctx.beginPath();
      for(const [a,b] of [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]]){
        ctx.moveTo((1-points[a].x)*w,points[a].y*h);ctx.lineTo((1-points[b].x)*w,points[b].y*h);
      }
      ctx.stroke();
      for(const [fingerIndex,i] of [4,8,12,16,20].entries()){if(!hands[handIndex]?.fingers[fingerIndex]?.active)continue;ctx.beginPath();ctx.arc((1-points[i].x)*w,points[i].y*h,4,0,Math.PI*2);ctx.fillStyle=hands[handIndex]?.fingers[fingerIndex]?.pressing?ctx.strokeStyle:'#ffffff';ctx.fill();}
    }
  }
  fail(token,message){if(token!==this.session)return;this.stop();this.status('error',message);}
  stop(){
    ++this.session;this.active=false;cancelAnimationFrame(this.frameHandle);clearTimeout(this.initTimer);
    this.rejectInit?.(new Error('cancelled'));this.rejectInit=null;
    this.worker?.terminate();this.worker=null;
    this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;
    this.video.pause();this.video.srcObject=null;this.gestures.reset();this.onHands([]);
    this.overlay.getContext('2d').clearRect(0,0,this.overlay.width,this.overlay.height);
    this.status('off','Camera off.');
  }
}
