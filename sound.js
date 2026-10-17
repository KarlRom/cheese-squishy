/** Recorded sticky-material foley; no oscillators, resonant sweeps or noise loops. */
export class SquishySound {
  constructor(){
    this.enabled=true;this.volume=.38;this.context=null;this.supported=true;
    this.previousLoad=0;
    this.grains=new Set();this.touchGeneration=0;
    this.lastRelease=-1;this.lastPress=-1;this.lastClip=-1;
    // Fetch locally hosted assets early; create/resume audio only on a user gesture.
    this.assets=Promise.all([
      fetch(new URL('./assets/sounds/sticky-foley.wav',import.meta.url)).then(r=>{if(!r.ok)throw Error('Foley unavailable');return r.arrayBuffer();}),
      fetch(new URL('./assets/sounds/clips.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Clip list unavailable');return r.json();})
    ]).catch(()=>null);
  }
  async unlock(){
    if(!this.enabled||!this.supported)return;
    try{
      if(!this.context)this.createGraph();
      if(this.context.state!=='running')await this.context.resume();
      await this.ready;
    }catch{this.supported=false;}
  }
  createGraph(){
    const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AudioContext)throw Error('Web Audio unavailable');
    const c=this.context=new AudioContext({latencyHint:'interactive'});
    const high=c.createBiquadFilter();high.type='highpass';high.frequency.value=180;high.Q.value=.5;
    const low=c.createBiquadFilter();low.type='lowpass';low.frequency.value=3400;low.Q.value=.5;
    this.input=high;high.connect(low);
    this.compressor=c.createDynamicsCompressor();
    this.compressor.threshold.value=-17;this.compressor.knee.value=18;
    this.compressor.ratio.value=2.2;this.compressor.attack.value=.012;this.compressor.release.value=.18;
    this.master=c.createGain();this.master.gain.value=this.enabled?this.volume:0;
    low.connect(this.compressor).connect(this.master).connect(c.destination);
    this.ready=this.assets.then(async assets=>{
      if(!assets)throw Error('Foley unavailable');
      const [bytes,clips]=assets;this.buffer=await c.decodeAudioData(bytes);this.clips=clips;
    });
    // A rejected load is observed again by unlock(), without an unhandled promise.
    this.ready.catch(()=>{this.supported=false;});
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
  drag(){ /* Surface contact is quiet while sliding; no repeated wet texture. */ }
  playFoley(strength=.7,kind='press'){
    const c=this.context;
    if(!this.enabled||!this.supported||!this.buffer||c?.state!=='running'||this.grains.size>=5)return;
    // Alternate real takes rather than repeating one sound with obvious pitch shifts.
    const pool=kind==='release'?[0,1,2,8,9]:[0,1,8];
    const choices=pool.filter(index=>index!==this.lastClip);
    const index=choices[Math.floor(Math.random()*choices.length)];this.lastClip=index;
    const clip=this.clips[index],now=c.currentTime;
    const source=c.createBufferSource();source.buffer=this.buffer;
    // Keep the recorded timbre nearly unchanged (less than a semitone variation).
    const rate=.98+Math.random()*.04;source.playbackRate.value=rate;
    // Keep the short tack of contact, cutting off the drawn-out squelchy tail.
    const length=Math.min(clip.duration,kind==='release'?.18:.14);
    const duration=length/rate;
    const gain=c.createGain();const level=Math.min(.95,Math.max(0,strength))*(kind==='release'?.40:.48);
    gain.gain.setValueAtTime(0,now);
    gain.gain.linearRampToValueAtTime(level,now+.009);
    gain.gain.setValueAtTime(level,now+Math.max(.01,duration-.045));
    gain.gain.linearRampToValueAtTime(0,now+duration);
    source.connect(gain).connect(this.input);
    const grain={source,gain};this.grains.add(grain);
    source.onended=()=>{source.disconnect();gain.disconnect();this.grains.delete(grain);};
    source.start(now,clip.offset,length);source.stop(now+duration+.02);

  }
  bubble(strength,releasing=false){this.playFoley(strength,releasing?'release':'press');}
  async touch(phase='press',strength=.7){
    const generation=this.touchGeneration;
    // Mark real contact immediately so animation callbacks cannot duplicate it.
    if(this.context){if(phase==='release')this.lastRelease=this.context.currentTime;else this.lastPress=this.context.currentTime;}
    await this.unlock();
    if(generation!==this.touchGeneration||!this.enabled||!this.supported)return;
    if(phase==='release')this.lastRelease=this.context.currentTime;else this.lastPress=this.context.currentTime;
    this.playFoley(strength,phase==='release'?'release':'contact');
  }
  update(dt,load){
    const pressed=this.previousLoad<=.001&&load>.05;
    const released=this.previousLoad>.05&&load<=.001;
    this.previousLoad=load;
    const c=this.context;
    if(!this.enabled||!this.supported||!this.buffer||c?.state!=='running')return;
    const now=c.currentTime;
    // Only contact boundaries make sound. Compression, dragging, holding and
    // slow recovery are silent, however much the mesh deforms in between.
    if(released&&now-this.lastRelease>.15){
      this.lastRelease=now;this.playFoley(.58,'release');
    }else if(pressed&&now-this.lastPress>.15){
      this.lastPress=now;this.playFoley(.55,'contact');
    }
  }
  silence(){
    this.touchGeneration++;this.previousLoad=0;
    if(!this.context)return;
    const now=this.context.currentTime;
    for(const grain of this.grains){
      grain.gain.gain.cancelScheduledValues(now);
      grain.gain.gain.setTargetAtTime(0,now,.008);grain.source.stop(now+.045);
    }
  }
  suspend(){this.silence();if(this.context?.state==='running')this.context.suspend().catch(()=>{});}
}
