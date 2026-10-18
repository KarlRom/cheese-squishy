import * as THREE from './vendor/three.module.js';
export const lightingPresets={
  daylight:{label:'Daylight',sky:0xfff9e9,ground:0xd6bd8a,ambient:1,key:0xfff9ed,keyPower:3,position:[-3,6,5],fill:0xffffff,fillPower:.7,environment:1,exposure:1,window:0xf6f9fc,patch:.32,lamp:0},
  dim:{label:'Dim',sky:0xdfe6f3,ground:0x8b8591,ambient:.34,key:0xe5eaff,keyPower:.80,position:[-3,5,4],fill:0xd0d9ed,fillPower:.22,environment:.30,exposure:.90,window:0x596477,patch:.07,lamp:.05},
  sunset:{label:'Sunset',sky:0xffdec7,ground:0xac7c78,ambient:.65,key:0xffac68,keyPower:2.8,position:[-5,1.5,4],fill:0xe3d9ff,fillPower:.38,environment:.62,exposure:.97,window:0xffb47c,patch:.38,lamp:.18},
  cozy:{label:'Cozy night',sky:0xeed2b6,ground:0x705970,ambient:.30,key:0xffc18c,keyPower:1.25,position:[2,2.8,3.5],fill:0xb4bfdf,fillPower:.17,environment:.23,exposure:.92,window:0x2b354b,patch:.025,lamp:1.6}
};
export function lightingFor(id){return Object.prototype.hasOwnProperty.call(lightingPresets,id)?lightingPresets[id]:lightingPresets.daylight;}
const colorKeys=['sky','ground','key','fill','window'];
const numberKeys=['ambient','keyPower','fillPower','environment','exposure','patch','lamp'];
export class LightingRig{
  constructor({renderer,hemisphere,key,fill,bedroom,toys}){
    Object.assign(this,{renderer,hemisphere,key,fill,bedroom,toys});
    this.id='daylight';this.target=lightingFor(this.id);this.current={};
    for(const name of colorKeys)this.current[name]=new THREE.Color(this.target[name]);
    for(const name of numberKeys)this.current[name]=this.target[name];
    this.position=new THREE.Vector3(...this.target.position);this.pending=false;
    this.roomMaterials=new Set();
    bedroom.traverse(object=>{
      for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[])
        if(material.isMeshStandardMaterial)this.roomMaterials.add(material);
    });
    this.refresh();
  }
  set(id,immediate=false){
    const target=lightingFor(id);this.id=target===lightingPresets.daylight?'daylight':id;
    if(this.target===target&&!immediate)return;
    this.target=target;this.pending=true;
    if(immediate)this.step(1,true);
  }
  step(dt,immediate=false){
    if(!this.pending)return false;
    const alpha=immediate?1:-Math.expm1(-Math.max(0,Math.min(.1,dt))/.22);
    let error=0;
    for(const name of colorKeys){
      const target=new THREE.Color(this.target[name]);this.current[name].lerp(target,alpha);
      error+=Math.abs(this.current[name].r-target.r)+Math.abs(this.current[name].g-target.g)+Math.abs(this.current[name].b-target.b);
    }
    for(const name of numberKeys){this.current[name]+=(this.target[name]-this.current[name])*alpha;error+=Math.abs(this.target[name]-this.current[name]);}
    const position=new THREE.Vector3(...this.target.position);this.position.lerp(position,alpha);error+=this.position.distanceTo(position);
    if(error<.0001){
      for(const name of colorKeys)this.current[name].set(this.target[name]);
      for(const name of numberKeys)this.current[name]=this.target[name];
      this.position.copy(position);this.pending=false;
    }
    this.refresh();return true;
  }
  refresh(){
    const c=this.current;
    this.hemisphere.color.copy(c.sky);this.hemisphere.groundColor.copy(c.ground);this.hemisphere.intensity=c.ambient;
    this.key.color.copy(c.key);this.key.intensity=c.keyPower;this.key.position.copy(this.position);
    this.fill.color.copy(c.fill);this.fill.intensity=c.fillPower;
    this.renderer.toneMappingExposure=c.exposure;
    for(const [id,state] of this.toys)state.material.envMapIntensity=(id==='pearl'?1.35:.65)*c.environment;
    for(const material of this.roomMaterials)material.envMapIntensity=c.environment;
    const room=this.bedroom.userData.lighting;
    if(room){
      room.window.color.copy(c.window);room.patch.color.copy(c.key);room.patch.opacity=c.patch;
      room.shade.emissive.set(0xffb66d);room.shade.emissiveIntensity=c.lamp;
      room.lamp.intensity=c.lamp*8;
    }
  }
}
