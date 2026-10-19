import * as THREE from './vendor/three.module.js';
import {makePearl} from './toy-geometry.js';

export const PHOTO_RADII={x:1.08,y:1.24,z:.72};

// Keep the welded pearl topology so the photo follows the same soft mesh physics.
export function makePhotoPillow(segments=64){
  const geometry=makePearl(segments);
  const position=geometry.attributes.position;
  const uv=new Float32Array(position.count*2);
  for(let i=0;i<position.count;i++){
    const x=position.getX(i)*(PHOTO_RADII.x/1.32);
    const y=(position.getY(i)-.025)*(PHOTO_RADII.y/1.04);
    const z=position.getZ(i)*(PHOTO_RADII.z/1.25);
    position.setXYZ(i,x,y,z);
    // The rear and narrow edge sample the plain ivory corner of the texture.
    // The front projects the photo without a UV seam through the face.
    uv[i*2]=z>.015?.5+x/(2*PHOTO_RADII.x):0;
    uv[i*2+1]=z>.015?.5+y/(2*PHOTO_RADII.y):0;
  }
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return geometry;
}

export function photoTexture(image){
  const size=1024,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#eee2d7';ctx.fillRect(0,0,size,size);
  const layer=document.createElement('canvas');layer.width=layer.height=size;
  const c=layer.getContext('2d');
  const source=Math.min(image.naturalWidth||image.width,image.naturalHeight||image.height);
  const sx=((image.naturalWidth||image.width)-source)/2,sy=((image.naturalHeight||image.height)-source)/2;
  c.drawImage(image,sx,sy,source,source,0,0,size,size);
  const fade=c.createRadialGradient(512,512,340,512,512,512);
  fade.addColorStop(0,'rgba(255,255,255,1)');fade.addColorStop(1,'rgba(255,255,255,0)');
  c.globalCompositeOperation='destination-in';c.fillStyle=fade;c.fillRect(0,0,size,size);
  ctx.drawImage(layer,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;return texture;
}
