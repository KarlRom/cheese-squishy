import {imprintTeeth} from './bite.js?v=2.15.0';
/** Overdamped material-space deformation. Units: cube half-widths and seconds.
 * There is deliberately no velocity/spring integrator: release cannot oscillate.
 * Geometry, cavity walls and pigmentation all share these moving vertices.
 */
export class SquishyMaterial {
  constructor(rest) {
    this.rest = rest;
    this.offset = new Float32Array(rest.length);
    this.marks = new Float32Array(rest.length);
    this.target = new Float32Array(rest.length);
    this.resistance = 0.32;
    this.recovery = 0.25;
    this.activity = 0;
  }
  get recoveryTime() { return 6 + 84 * (1 - this.recovery) ** 2; }
  toothField(teeth) { const field=new Float32Array(this.rest.length);imprintTeeth(this.rest,field,teeth);return field; }
  applyImprint(field,strength=1) {
    for(let i=0;i<this.marks.length;i+=3){
      for(let j=0;j<3;j++)this.marks[i+j]+=field[i+j]*strength;
      const size=Math.hypot(this.marks[i],this.marks[i+1],this.marks[i+2]);
      if(size>.26)for(let j=0;j<3;j++)this.marks[i+j]*=.26/size;
    }
  }
  imprint(teeth,strength=1) { this.applyImprint(this.toothField(teeth),Math.max(0,Math.min(1,strength))); }
  settle() { this.offset.fill(0); this.target.fill(0); this.activity = 0; }
  reset() { this.marks.fill(0); this.settle(); }
  step(dt, contacts = [], pinch = null, squeeze = 0) {
    // Cap long gaps (tab switching) to avoid discontinuities on resume.
    dt = Math.min(Math.max(dt, 0), 0.05);
    const { rest, offset, target } = this;
    const hasLoad = contacts.length > 0 || squeeze > 0 || (pinch && pinch.amount > 0);
    const stiffness = 1 - this.resistance * 0.68;
    const loadingAlpha = -Math.expm1(-dt * (13 - this.resistance * 7));
    const releaseAlpha = -Math.expm1(-dt / this.recoveryTime);
    let energy = 0;
    for (let i = 0; i < rest.length; i += 3) {
      const x = rest[i], y = rest[i + 1], z = rest[i + 2];
      let tx = 0, ty = 0, tz = 0, influence = 0, extensionLimit = .92;
      for (const c of contacts) {
        const dx = x - c.point[0], dy = y - c.point[1], dz = z - c.point[2];
        const d2 = dx * dx + dy * dy + dz * dz;
        const normalDistance=dx*c.normal[0]+dy*c.normal[1]+dz*c.normal[2];
        const lateral2=Math.max(0,d2-normalDistance*normalDistance);
        const travel=Math.hypot(...c.drag)+Math.abs((c.pull||0)-c.depth);
        const support=c.deepPoke?.48:c.volumeContact?Math.min(1.5,Math.max(c.radius*2.4,.65+travel*1.15)):c.radius*2.4;
        const support2=support*support;
        // Transport a column of material, not just a thin surface patch.
        const volumeDepth=c.volumeContact?Math.max(0,1-Math.abs(normalDistance)/1.65):1;
        const fieldDistance=c.volumeContact?lateral2:d2;
        if(fieldDistance>(c.localized?support2:c.radius*c.radius*12)||volumeDepth===0)continue;
        // Compact fingertip support has zero displacement and slope at its edge.
        // A second press cannot tug on a distant dent or the opposite face.
        const q=Math.max(0,1-fieldDistance/support2);
        // A broad, rounded shoulder carries a thick-skin pull into adjacent
        // material instead of stretching a tiny patch into a sharp membrane.
        const core=q*q*q,shoulder=q*q*(3-2*q);
        const rounded=core+(shoulder-core)*(c.thickness||0)*.65;
        // A rounded fingertip cap keeps held camera stretches thick.
        const padT=Math.max(0,Math.min(1,(Math.sqrt(d2)-c.radius*.55)/(c.radius*1.85)));
        const pad=1-padT*padT*(3-2*padT);
        const held=Math.max(0,Math.min(1,c.fingerPad||0));
        const cap=c.contactRadius||.2;
        const tubeT=Math.max(0,Math.min(1,(Math.sqrt(lateral2)-cap)/(Math.max(cap+.01,support)-cap)));
        const tube=(1-tubeT*tubeT*(3-2*tubeT))*volumeDepth*volumeDepth*(3-2*volumeDepth);
        const footprint=c.localized?(c.volumeContact?rounded+(tube-rounded)*held:rounded+(pad-rounded)*held):Math.exp(-d2/(2*c.radius*c.radius));
        extensionLimit=Math.max(extensionLimit,.92+held*1.05*footprint);
        const w=footprint*(c.weight??1);
        const depth = c.depth * stiffness;
        const dot = dx * c.normal[0] + dy * c.normal[1] + dz * c.normal[2];
        // Local compression, tangential drag, and a soft displaced rim.
        const bulge = depth * (c.localized?.25:.38) * w;
        const normalLoad=depth-(c.pull||0)*stiffness;
        tx += -c.normal[0] * normalLoad * w + (dx - dot * c.normal[0]) * bulge + c.drag[0] * w;
        ty += -c.normal[1] * normalLoad * w + (dy - dot * c.normal[1]) * bulge + c.drag[1] * w;
        tz += -c.normal[2] * normalLoad * w + (dz - dot * c.normal[2]) * bulge + c.drag[2] * w;
        influence = Math.max(influence, footprint);
      }
      if (pinch && pinch.amount > 0) {
        const a = pinch.axis, along = x * a[0] + y * a[1] + z * a[2];
        const amount = pinch.amount * stiffness;
        tx += amount * (-a[0] * along + (x - a[0] * along) * 0.24);
        ty += amount * (-a[1] * along + (y - a[1] * along) * 0.24);
        tz += amount * (-a[2] * along + (z - a[2] * along) * 0.24);
        influence = 1;
      }
      if (squeeze > 0) {
        // Accessible squeeze: compress vertically, leaving a broad soft bulge.
        const amount = squeeze * stiffness;
        tx += x * amount * 0.27; ty -= (y + 0.88) * amount * 0.49; tz += z * amount * 0.24;
        influence = 1;
      }
      // Keep the material intact under multiple overlapping fingers.
      const length = Math.hypot(tx, ty, tz);
      if (length > extensionLimit) { const scale = extensionLimit / length; tx *= scale; ty *= scale; tz *= scale; }
      ty = Math.max(ty, -1.015 - y);
      target[i] = tx; target[i + 1] = ty; target[i + 2] = tz;
      // Untouched vertices retain their old dents even during another press.
      const alpha = hasLoad ? releaseAlpha + (loadingAlpha - releaseAlpha) * Math.min(1, influence * 2.5) : releaseAlpha;
      for (let j = 0; j < 3; j++) {
        offset[i + j] += (target[i + j] - offset[i + j]) * alpha;
        energy += offset[i + j] * offset[i + j];
      }
    }
    this.activity = Math.sqrt(energy / rest.length);
    return this.activity;
  }
  writePositions(out) {
    for (let i = 0; i < out.length; i++) out[i] = this.rest[i] + this.offset[i] + this.marks[i];
  }
}
