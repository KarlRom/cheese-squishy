import * as THREE from './vendor/three.module.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function strandTarget(c){
  if(c.stretchId===undefined||c.scrunch)return null;
  const drag=new THREE.Vector3(...(c.drag||[0,0,0]));
  const normal=new THREE.Vector3(...c.normal).normalize();
  drag.addScaledVector(normal,-drag.dot(normal));
  const pull=Math.max(0,c.cameraPull||0),side=drag.length();
  if(side<.22&&pull<.075)return null;
  const hold=clamp(c.creep||0,0,1);
  const delta=drag.multiplyScalar(.72+hold*.28).addScaledVector(normal,.10+pull*(1.35+hold*.35));
  delta.clampLength(0,1.6);
  return {id:c.stretchId,point:[...c.point],normal:normal.toArray(),delta:delta.toArray()};
}
// A continuously narrowing, flattened patch replaces the cylindrical shaft.
export function writeStrand(out,point,normal,delta,rings=64,sides=24){
  const start=new THREE.Vector3(...point),n=new THREE.Vector3(...normal).normalize(),d=new THREE.Vector3(...delta);
  const end=start.clone().add(d),p0=start.clone().addScaledVector(n,-.18);
  const p1=start.clone().addScaledVector(n,Math.min(.32,d.length()*.45)),p2=end.clone().addScaledVector(d.clone().normalize(),-Math.min(.18,d.length()*.22));
  const curve=new THREE.CubicBezierCurve3(p0,p1,p2,end);
  const frames=curve.computeFrenetFrames(rings,false);
  for(let i=0;i<=rings;i++){
    const t=i/rings,center=curve.getPoint(t);
    const cap=clamp((1-t)*Math.max(.2,d.length())/.18,0,1);
    const thinning=1/Math.sqrt(1+d.length()*.45);
    const emergence=clamp(d.length()/.45,0,1);
    const radius=emergence*(.36*(1-t)**1.65+.075*thinning)*Math.sqrt(1-(1-cap)**2);
    const flatten=1-.30*Math.sin(Math.PI*t);
    for(let j=0;j<=sides;j++){
      const angle=j/sides*Math.PI*2,v=center.clone().addScaledVector(frames.normals[i],Math.cos(angle)*radius).addScaledVector(frames.binormals[i],Math.sin(angle)*radius*flatten);
      v.toArray(out,(i*(sides+1)+j)*3);
    }
  }
}
export class StretchStrands{
  constructor(){this.states=new Map();this.active=new Map();this.sequence=0;}
  clear(){for(const s of this.states.values()){s.mesh.removeFromParent();s.mesh.geometry.dispose();s.mesh.material.dispose();}this.states.clear();this.active.clear();}
  update(dt,contacts,parent,material,recoveryTime){
    const targets=new Map(contacts.map(strandTarget).filter(Boolean).map(c=>[c.id,c]));
    let changed=false;
    for(const [id,key] of this.active)if(!targets.has(id)){
      this.states.get(key).held=false;this.active.delete(id);
    }
    for(const [id,target] of targets){
      let key=this.active.get(id),s=this.states.get(key);
      // A fresh attachment must never inherit an older recovering extension.
      if(s&&new THREE.Vector3(...s.point).distanceTo(new THREE.Vector3(...target.point))>.15){s.held=false;this.active.delete(id);s=null;}

      if(!s){
        const g=new THREE.BufferGeometry(),rings=64,sides=24,index=[];
        g.setAttribute('position',new THREE.BufferAttribute(new Float32Array((rings+1)*(sides+1)*3),3));
        for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;index.push(a,a+1,b,b,a+1,b+1);}
        g.setIndex(index);
        const m=material.clone();m.vertexColors=false;
        if(material.vertexColors&&parent.geometry.attributes.color){
          const p=parent.geometry.attributes.position,c=parent.geometry.attributes.color,v=new THREE.Vector3(...target.point);let nearest=0,best=Infinity;
          for(let i=0;i<p.count;i++){const dist=v.distanceToSquared(new THREE.Vector3().fromBufferAttribute(p,i));if(dist<best){best=dist;nearest=i;}}
          m.color.multiply(new THREE.Color().fromBufferAttribute(c,nearest));
        }
        const mesh=new THREE.Mesh(g,m);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
        key=`${id}:stretch:${++this.sequence}`;
        s={mesh,held:true,point:target.point,normal:target.normal,delta:new THREE.Vector3(...target.delta).normalize().multiplyScalar(.001)};
        this.states.set(key,s);this.active.set(id,key);
      }
      s.mesh.material.envMapIntensity=material.envMapIntensity;
      s.delta.lerp(new THREE.Vector3(...target.delta),-Math.expm1(-dt*4.5));
    }
    for(const [id,s] of this.states){
      if(!s.held){
        s.delta.multiplyScalar(Math.exp(-dt/Math.max(2,recoveryTime*.18)));
        if(s.delta.length()<.008){s.mesh.removeFromParent();s.mesh.geometry.dispose();s.mesh.material.dispose();this.states.delete(id);changed=true;continue;}
      }
      const g=s.mesh.geometry;writeStrand(g.attributes.position.array,s.point,s.normal,s.delta.toArray());
      g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();changed=true;
    }
    // The body supplies only the rooted shoulder; the added rings carry length.
    const loads=contacts.map(c=>{
      const s=this.states.get(this.active.get(c.stretchId));if(!s)return c;
      const blend=clamp((s.delta.length()-.08)/.35,0,1);
      return {...c,drag:c.drag.map(v=>v*(1-.92*blend)),
        stretchWork:Math.min(1,Math.hypot(...targets.get(c.stretchId).delta)/.75),
        cameraPull:(c.cameraPull||0)*(1-blend)+Math.min(.045,c.cameraPull||0)*blend,
        depth:c.depth*(1-blend)+.015*blend,deepPoke:false,creep:(c.creep||0)*(1-blend)};
    });
    return {loads,changed};
  }
}
