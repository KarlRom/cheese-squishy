import * as THREE from './vendor/three.module.js';
function dotMaterial(color,pressing){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.strokeStyle=color;ctx.lineWidth=5;
  ctx.beginPath();ctx.arc(32,32,23,0,Math.PI*2);
  ctx.fillStyle=pressing?color:'rgba(255,255,255,.65)';ctx.fill();ctx.stroke();
  if(pressing){ctx.beginPath();ctx.arc(32,32,7,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();}
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({map,transparent:true,opacity:pressing?.95:.7,depthTest:true,depthWrite:false,toneMapped:false});
}
export function attachmentPoint(attachment,mesh,target=new THREE.Vector3()){
  target.set(0,0,0);
  const position=mesh.geometry.attributes.position,vertex=new THREE.Vector3();
  for(let i=0;i<3;i++)target.addScaledVector(vertex.fromBufferAttribute(position,attachment.triangle[i]),attachment.bary[i]);
  return mesh.localToWorld(target);
}
export class FingerPreview{
  constructor(scene){
    this.scene=scene;this.markers=new Map();this.seen=new Set();this.changed=false;
    this.materials=['#b48a4e','#aa82bc'].map(color=>[dotMaterial(color,false),dotMaterial(color,true)]);
    this.point=new THREE.Vector3();this.towardsCamera=new THREE.Vector3();
  }
  begin(){this.seen.clear();this.changed=false;}
  show(id,handId,attachment,mesh,camera,height,pressing){
    let marker=this.markers.get(id);
    if(!marker){marker=new THREE.Sprite(this.materials[handId%2][0]);marker.renderOrder=20;marker.visible=false;this.scene.add(marker);this.markers.set(id,marker);}
    const p=attachmentPoint(attachment,mesh,this.point);
    this.towardsCamera.copy(camera.position).sub(p).normalize();p.addScaledVector(this.towardsCamera,.018);
    const diameter=2*camera.position.distanceTo(p)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*11/(Math.max(1,height)*camera.zoom);
    const material=this.materials[handId%2][pressing?1:0];
    if(!marker.visible||marker.position.distanceToSquared(p)>1e-8||marker.material!==material||Math.abs(marker.scale.x-diameter)>1e-5)this.changed=true;
    marker.position.copy(p);marker.scale.setScalar(diameter);marker.material=material;marker.visible=true;this.seen.add(id);
  }
  end(){
    for(const [id,marker] of this.markers)if(!this.seen.has(id)&&marker.visible){marker.visible=false;this.changed=true;}
    // Tracking IDs can change after a hand leaves; keep GPU objects bounded.
    for(const [id,marker] of this.markers)if(!this.seen.has(id)&&this.markers.size>10){this.scene.remove(marker);this.markers.delete(id);}
    return this.changed;
  }
  clear(){this.begin();return this.end();}
}
