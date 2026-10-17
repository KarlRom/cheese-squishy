/** Gesture-unlocked, sample-free soft squelches that follow live manipulation. */
export class SquishySound {
  constructor() {
    this.enabled = true; this.volume = .38; this.context = null; this.supported = true;
    this.previousLoad = 0; this.previousPinch = 0; this.lastBubble = -1; this.motion = 0;
  }
  async unlock() {
    if (!this.enabled || !this.supported) return;
    try {
      if (!this.context) this.createGraph();
      if (this.context && this.context.state !== 'running') await this.context.resume();
    } catch { this.supported = false; }
  }
  createGraph() {
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) { this.supported = false; return; }
    const c = this.context = new AudioContext({ latencyHint: 'interactive' });
    const buffer = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      brown = (brown + (Math.random() * 2 - 1) * .055) / 1.055;
      data[i] = brown * 3.6;
    }
    this.source = c.createBufferSource(); this.source.buffer = buffer; this.source.loop = true;
    const lowpass = c.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 1200;
    this.filter = c.createBiquadFilter(); this.filter.type = 'bandpass';
    this.filter.frequency.value = 330; this.filter.Q.value = 1.8;
    this.body = c.createGain(); this.body.gain.value = 0;
    this.master = c.createGain(); this.master.gain.value = this.enabled ? this.volume : 0;
    const highpass = c.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 65;
    this.compressor = c.createDynamicsCompressor();
    this.compressor.threshold.value = -16; this.compressor.knee.value = 12;
    this.compressor.ratio.value = 5; this.compressor.attack.value = .004; this.compressor.release.value = .14;
    this.source.connect(lowpass).connect(this.filter).connect(this.body).connect(highpass);
    highpass.connect(this.compressor).connect(this.master).connect(c.destination);
    this.wobble = c.createOscillator(); this.wobble.frequency.value = 7;
    const depth = c.createGain(); depth.gain.value = 45;
    this.wobble.connect(depth).connect(this.filter.frequency);
    this.source.start(); this.wobble.start();
  }
  setPreferences(enabled, volume) {
    this.enabled = enabled; this.volume = Math.min(1, Math.max(0, volume));
    if (this.context && this.master) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(enabled ? this.volume : 0, now, .025);
    }
    if (!enabled) this.silence();
  }
  drag(pixelsPerSecond) { this.motion = Math.max(this.motion, Math.min(1, pixelsPerSecond / 650)); }
  bubble(strength, releasing = false) {
    const c = this.context;
    if (!c || c.state !== 'running' || !this.enabled) return;
    const now = c.currentTime;
    if (now - this.lastBubble < .10) return;
    this.lastBubble = now;
    const oscillator = c.createOscillator(); oscillator.type = 'sine';
    const gain = c.createGain();
    oscillator.frequency.setValueAtTime((releasing ? 165 : 230) + Math.random() * 110, now);
    oscillator.frequency.exponentialRampToValueAtTime(releasing ? 100 : 65, now + .12);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(.11 * strength, now + .009);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
    oscillator.connect(gain).connect(this.compressor);
    oscillator.start(now); oscillator.stop(now + .18);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  update(dt, load, pinch = 0) {
    const loadChange = Math.abs(load - this.previousLoad) / Math.max(dt, .008);
    const pinchChange = Math.abs(pinch - this.previousPinch) / Math.max(dt, .008);
    const released = this.previousLoad > .05 && load <= .001;
    this.previousLoad = load; this.previousPinch = pinch;
    this.motion *= Math.exp(-dt * 12);
    const c = this.context;
    if (!c || c.state !== 'running' || !this.enabled || !this.supported) return;
    const now = c.currentTime;
    const movement = Math.min(1, loadChange * .55 + pinchChange * .35 + this.motion);
    // Texture subsides during a stationary hold, with silence after release.
    const amount = load > .001 ? Math.min(.7, movement * .62 + load * .025) : 0;
    this.body.gain.setTargetAtTime(amount, now, .035);
    this.filter.frequency.setTargetAtTime(180 + movement * 650 + pinch * 180, now, .045);
    this.filter.Q.setTargetAtTime(1.3 + movement * 2.1, now, .045);
    this.source.playbackRate.setTargetAtTime(.7 + movement * .55, now, .05);
    this.wobble.frequency.setTargetAtTime(5 + movement * 18, now, .05);
    if (released) this.bubble(.45, true);
    else if (movement > .22 && now - this.lastBubble > .15 + Math.random() * .17) this.bubble(.35 + movement * .65);
  }
  silence() {
    this.previousLoad = 0; this.previousPinch = 0; this.motion = 0;
    if (!this.context || !this.body) return;
    const now = this.context.currentTime;
    this.body.gain.cancelScheduledValues(now);
    this.body.gain.setTargetAtTime(0, now, .015);
  }
  suspend() {
    this.silence();
    if (this.context && this.context.state === 'running') this.context.suspend().catch(() => {});
  }
}
