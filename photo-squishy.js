import * as THREE from './vendor/three.module.js';
import {makePearl} from './toy-geometry.js';

export const PHOTO_RADII={x:1.08,y:1.24,z:.72};

// Keep the welded pearl topology so the photo follows the same soft mesh physics.
export function faceCrop(landmarks,width,height){
  if(!Array.isArray(landmarks)||landmarks.length<400)return null;
  const points=landmarks.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  if(points.length<400)return null;
  const xs=points.map(p=>p.x*width),ys=points.map(p=>p.y*height);
  const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
  if(right-left<width*.06||bottom-top<height*.06)return null;
  const size=Math.min(Math.max((right-left)*1.65,(bottom-top)*1.43),Math.max(width,height)*1.8);
  const cx=(left+right)/2,cy=(top+bottom)/2-size*.015;
  return {x:cx-size/2,y:cy-size/2,size,points:landmarks.map(p=>({u:(p.x*width-(cx-size/2))/size,v:(p.y*height-(cy-size/2))/size}))};
}
const bell=(x,y,cx,cy,rx,ry)=>Math.exp(-3*((x-cx)**2/(rx*rx)+(y-cy)**2/(ry*ry)));
export function faceRelief(u,v,face){
  const p=face?.points;if(!p)return 0;
  const feature=(id,rx,ry,height)=>p[id]?height*bell(u,v,p[id].u,p[id].v,rx,ry):0;
  // Broad anatomy reads as a solid face; fine image detail remains in the texture.
  return feature(1,.16,.26,.21)+feature(168,.15,.25,.10)
    +feature(205,.25,.23,.085)+feature(425,.25,.23,.085)
    +feature(152,.25,.20,.085)+feature(13,.16,.10,.045)
    -feature(33,.15,.10,.035)-feature(263,.15,.10,.035);
}
export function makePhotoPillow(segments=64,face=null){
  const geometry=makePearl(segments);
  const position=geometry.attributes.position;
  const uv=new Float32Array(position.count*2);
  for(let i=0;i<position.count;i++){
    const x=position.getX(i)*(PHOTO_RADII.x/1.32);
    const y=(position.getY(i)-.025)*(PHOTO_RADII.y/1.04);
    const z=position.getZ(i)*(PHOTO_RADII.z/1.25);
    const u=.5+x/(2*PHOTO_RADII.x),v=.5-y/(2*PHOTO_RADII.y);
    position.setXYZ(i,x,y,z+(z>.04?faceRelief(u,v,face)*Math.min(1,(z-.04)/.20):0));
    // The rear and narrow edge sample the plain ivory corner of the texture.
    // The front projects the photo without a UV seam through the face.
    uv[i*2]=z>.015?.5+x/(2*PHOTO_RADII.x):0;
    uv[i*2+1]=z>.015?.5+y/(2*PHOTO_RADII.y):0;
  }
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return geometry;
}

export function photoTexture(image,face=null){
  const size=1024,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#eee2d7';ctx.fillRect(0,0,size,size);
  const layer=document.createElement('canvas');layer.width=layer.height=size;
  const c=layer.getContext('2d');
  const source=face?.size??Math.min(image.naturalWidth||image.width,image.naturalHeight||image.height);
  const sx=face?.x??((image.naturalWidth||image.width)-source)/2,sy=face?.y??((image.naturalHeight||image.height)-source)/2;
  c.drawImage(image,sx,sy,source,source,0,0,size,size);
  const fade=c.createRadialGradient(512,512,340,512,512,512);
  fade.addColorStop(0,'rgba(255,255,255,1)');fade.addColorStop(1,'rgba(255,255,255,0)');
  c.globalCompositeOperation='destination-in';c.fillStyle=fade;c.fillRect(0,0,size,size);
  ctx.drawImage(layer,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;return texture;
}
