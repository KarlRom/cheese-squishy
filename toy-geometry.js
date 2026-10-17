import * as THREE from './vendor/three.module.js';
// A welded cube-sphere avoids the split pole/seam normals of a UV sphere.
export function makePearl(segments) {
  const box = new THREE.BoxGeometry(2,2,2,segments,segments,segments);
  const source=box.attributes.position, vertices=[], colors=[], remap=[], welded=new Map();
  const p=new THREE.Vector3();
  for(let i=0;i<source.count;i++){
    p.fromBufferAttribute(source,i);
    const hash=[p.x,p.y,p.z].map(v=>Math.round(v*100000)).join(',');
    if(!welded.has(hash)){
      welded.set(hash,vertices.length/3);
      // Equal-area cube-sphere mapping: even detail across every direction.
      const {x,y,z}=p;
      p.set(x*Math.sqrt(1-y*y/2-z*z/2+y*y*z*z/3),
        y*Math.sqrt(1-z*z/2-x*x/2+z*z*x*x/3),
        z*Math.sqrt(1-x*x/2-y*y/2+x*x*y*y/3));
      const skin=1+.007*Math.sin(p.x*3+p.z*2)*Math.sin(p.y*4);
      vertices.push(p.x*1.32*skin,p.y*1.04*skin+.025,p.z*1.25*skin);
      // Very low-contrast nacre clouds under the glossy skin, never glitter.
      const cloud=.5+.5*Math.sin(p.x*3.1+p.z*2.0)*Math.cos(p.y*2.8-p.z);
      const warmth=.5+.5*Math.sin(p.y*3.0-p.x*1.8);
      const tint=new THREE.Color().setRGB(.94+.055*warmth,.925+.06*cloud,.95+.045*(1-warmth));
      colors.push(tint.r,tint.g,tint.b);
    }
    remap.push(welded.get(hash));
  }
  const indices=Array.from(box.index.array,i=>remap[i]);box.dispose();
  const result=new THREE.BufferGeometry();
  result.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3).setUsage(THREE.DynamicDrawUsage));
  result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  result.setIndex(indices);result.computeVertexNormals();result.computeBoundingSphere();
  return result;
}
