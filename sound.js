/** Live petrolatum-style foley: damp squelches and granular adhesive peels. */
export class SquishySound {
  constructor() {
    this.enabled=true; this.volume=.38; this.context=null; this.supported=true;
    this.previousLoad=0; this.previousPinch=0; this.lastBubble=-1; this.motion=0;
    this.grains=new Set();this.touchGeneration=0;
  }
  async unlock() {
    if(!this.enabled||!this.supported)return;
    try {
      if(!this.context)this.createGraph();
      if(this.context&&this.context.state!=='running')await this.context.resume();
    }catch{this.supported=false;}
  }
  createGraph() {
    const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AudioContext){this.supported=false;return;}
    const c=this.context=new AudioContext({latencyHint:'interactive'});
    this.buffer=c.createBuffer(1,c.sampleRate*3,c.sampleRate);
    const data=this.buffer.getChannelData(0);
    let brown=0,grit=0;
    for(let i=0;i<data.length;i++){
      const white=Math.random()*2-1;
      brown=(brown+white*.09)/1.09;
      // Irregular microscopic breaks in adhesion, rather than a musical pop.
      if(Math.random()<.0015)grit=.4+Math.random()*.6;
      grit*=.985;
      data[i]=brown*2.3+white*(.13+grit*.25);
    }
    this.source=c.createBufferSource();this.source.buffer=this.buffer;this.source.loop=true;
    const highpass=c.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=75;
    this.filter=c.createBiquadFilter();this.filter.type='lowpass';
    this.filter.frequency.value=420;this.filter.Q.value=3;
    this.tackFilter=c.createBiquadFilter();this.tackFilter.type='bandpass';
    this.tackFilter.frequency.value=1100;this.tackFilter.Q.value=3.5;
    this.tack=c.createGain();this.tack.gain.value=0;
    this.body=c.createGain();this.body.gain.value=0;
    this.master=c.createGain();this.master.gain.value=this.enabled?this.volume:0;
    this.compressor=c.createDynamicsCompressor();
    this.compressor.threshold.value=-19;this.compressor.knee.value=15;
    this.compressor.ratio.value=5;this.compressor.attack.value=.003;this.compressor.release.value=.16;
    this.source.connect(highpass);
    highpass.connect(this.filter).connect(this.body).connect(this.compressor);
    highpass.connect(this.tackFilter).connect(this.tack).connect(this.compressor);
    this.compressor.connect(this.master).connect(c.destination);
    this.wobble=c.createOscillator();this.wobble.frequency.value=9;
    const depth=c.createGain();depth.gain.value=75;
    this.wobble.connect(depth).connect(this.filter.frequency);
    this.source.start();this.wobble.start();
  }
  setPreferences(enabled,volume){
    this.enabled=enabled;this.volume=Math.min(1,Math.max(0,volume));
    if(this.context&&this.master){
      const now=this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(enabled?this.volume:0,now,.025);
    }
    if(!enabled)this.silence();
  }
  drag(pixelsPerSecond){this.motion=Math.max(this.motion,Math.min(1,pixelsPerSecond/550));}
  // Short resonant noise packets mimic sticky strings pulling apart. No pitched sine pops.
  bubble(strength,releasing=false){
    const c=this.context;
    if(!c||c.state!=='running'||!this.enabled||this.grains.size>8)return;
    const now=c.currentTime;
    if(now-this.lastBubble<.095)return;
    this.lastBubble=now;
    const count=releasing?3:2;
    for(let n=0;n<count;n++){
      const start=now+n*(releasing?.062:.035)+Math.random()*.012;
      const duration=(releasing?.17:.12)+Math.random()*.045;
      const source=c.createBufferSource();source.buffer=this.buffer;
      source.playbackRate.value=.65+Math.random()*.35;
      const wet=c.createBiquadFilter();wet.type='lowpass';wet.Q.value=5+Math.random()*2;
      // A tacky opening sound followed by a damp closing squelch.
      wet.frequency.setValueAtTime(releasing?350:650,start);
      wet.frequency.exponentialRampToValueAtTime(releasing?1250:230,start+duration*.4);
      wet.frequency.exponentialRampToValueAtTime(160,start+duration);
      const gain=c.createGain();
      gain.gain.setValueAtTime(0,start);
      gain.gain.linearRampToValueAtTime(strength*.44/(1+n*.55),start+.008);
      gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      source.connect(wet).connect(gain).connect(this.compressor);
      const grain={source,gain};this.grains.add(grain);
      source.onended=()=>{source.disconnect();wet.disconnect();gain.disconnect();this.grains.delete(grain);};
      source.start(start,Math.random()*2);source.stop(start+duration+.025);
    }
  }
  // Direct contact foley is independent of animation frames, so a fast tap is audible.
  async touch(phase='press',strength=.7){
    const generation=this.touchGeneration;
    await this.unlock();
    const c=this.context;
    if(generation!==this.touchGeneration||!this.enabled||!this.supported||!this.buffer||!c||c.state!=='running')return;
    const release=phase==='release';
    const count=release?3:1;
    const level=Math.min(1,Math.max(.2,strength));
    for(let i=0;i<count&&this.grains.size<14;i++){
      const start=c.currentTime+i*.038;
      const duration=release?.095+Math.random()*.025:.115;
      const source=c.createBufferSource();source.buffer=this.buffer;
      source.playbackRate.value=release?1.0+Math.random()*.35:.85;
      const high=c.createBiquadFilter();high.type='highpass';high.frequency.value=release?320:180;
      const rubber=c.createBiquadFilter();rubber.type='lowpass';rubber.Q.value=release?2.8:2.0;
      rubber.frequency.setValueAtTime(release?2300:1500,start);
      rubber.frequency.exponentialRampToValueAtTime(release?650:280,start+duration);
      const gain=c.createGain();gain.gain.setValueAtTime(0,start);
      gain.gain.linearRampToValueAtTime(level*(release?.40:.65)/(1+i*.6),start+.003);
      gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      source.connect(high).connect(rubber).connect(gain).connect(this.compressor);
      const grain={source,gain};this.grains.add(grain);
      source.onended=()=>{source.disconnect();high.disconnect();rubber.disconnect();gain.disconnect();this.grains.delete(grain);};
      source.start(start,Math.random()*2);source.stop(start+duration+.02);
    }
  }
  update(dt,load,pinch=0){
    const delta=(load-this.previousLoad)/Math.max(dt,.008);
    const pinchChange=Math.abs(pinch-this.previousPinch)/Math.max(dt,.008);
    const released=this.previousLoad>.05&&load<=.001;
    this.previousLoad=load;this.previousPinch=pinch;
    this.motion*=Math.exp(-dt*9);
    const c=this.context;
    if(!c||c.state!=='running'||!this.enabled||!this.supported)return;
    const now=c.currentTime;
    const movement=Math.min(1,Math.abs(delta)*.48+pinchChange*.4+this.motion);
    const active=load>.001;
    this.body.gain.setTargetAtTime(active?movement*.58+load*.009:0,now,.025);
    this.tack.gain.setTargetAtTime(active?movement*(.065+this.motion*.13):0,now,.018);
    this.filter.frequency.setTargetAtTime(250+movement*350+pinch*130,now,.04);
    this.filter.Q.setTargetAtTime(2.5+movement*2.5,now,.04);
    this.tackFilter.frequency.setTargetAtTime(700+this.motion*1050+movement*170,now,.035);
    this.source.playbackRate.setTargetAtTime(.62+movement*.33,now,.05);
    this.wobble.frequency.setTargetAtTime(8+movement*22,now,.05);
    if(released)this.bubble(.7,true);
    else if(movement>.2&&now-this.lastBubble>.12+Math.random()*.12)this.bubble(.4+movement*.5,this.motion>.25);
  }
  silence(){
    this.touchGeneration++;
    this.previousLoad=0;this.previousPinch=0;this.motion=0;
    if(!this.context||!this.body)return;
    const now=this.context.currentTime;
    for(const node of [this.body,this.tack]){
      node.gain.cancelScheduledValues(now);node.gain.setTargetAtTime(0,now,.012);
    }
    for(const grain of this.grains){
      grain.gain.gain.cancelScheduledValues(now);
      grain.gain.gain.setTargetAtTime(0,now,.008);
      grain.source.stop(now+.045);
    }
  }
  suspend(){
    this.silence();
    if(this.context&&this.context.state==='running')this.context.suspend().catch(()=>{});
  }
}
