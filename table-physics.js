import * as THREE from './vendor/three.module.js';
export const TABLE_Y=-1.045;
// Rigid motion sits above the existing viscous mesh deformation. Contact uses
// samples of the current mesh, so a flattened face and a round pearl roll differently.
export class TableBody{
  constructor(vertices,{kind='cheese'}={}){
    this.vertices=vertices;this.kind=kind;
    this.position=new THREE.Vector3();this.quaternion=new THREE.Quaternion();
    this.scale=new THREE.Vector3(1,1,1);this.velocity=new THREE.Vector3();this.omega=new THREE.Vector3();
    this.compression=0;this.awake=false;this.landed=false;
    this.samples=[];
    const stride=Math.max(1,Math.floor(vertices.length/3/1000));
    for(let i=0;i<vertices.length;i+=stride*3)this.samples.push(i);
    // Include all six exact axis extrema, even when the mesh is densely sampled.
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      let index=axis;
      for(let i=axis;i<vertices.length;i+=3)if(vertices[i]*sign>vertices[index]*sign)index=i;
      this.samples.push(index-axis);
    }
    this.matrix=new THREE.Matrix3();this.rotation=new THREE.Matrix4();
    this.contactPoint=new THREE.Vector3();this.delta=new THREE.Quaternion();
    this.inertia=kind==='pearl'?.63:.70;
  }
  support(){
    this.rotation.makeRotationFromQuaternion(this.quaternion);this.matrix.setFromMatrix4(this.rotation);
    const m=this.matrix.elements,v=this.vertices,s=this.scale;
    let min=Infinity,lowestIndex=0;
    // Every vertex contributes to the lowest height, including freshly pulled tips.
    for(let i=0;i<v.length;i+=3){
      const y=m[1]*v[i]*s.x+m[4]*v[i+1]*s.y+m[7]*v[i+2]*s.z;
      if(y<min){min=y;lowestIndex=i;}
    }
    const lx=v[lowestIndex]*s.x,ly=v[lowestIndex+1]*s.y,lz=v[lowestIndex+2]*s.z;
    let total=1,cx=m[0]*lx+m[3]*ly+m[6]*lz,cy=min,cz=m[2]*lx+m[5]*ly+m[8]*lz;
    for(const i of this.samples){
      const x=v[i]*s.x,y=v[i+1]*s.y,z=v[i+2]*s.z;
      const ry=m[1]*x+m[4]*y+m[7]*z,w=Math.max(0,1-(ry-min)/.035);
      if(!w)continue;
      cx+=(m[0]*x+m[3]*y+m[6]*z)*w;cy+=ry*w;cz+=(m[2]*x+m[5]*y+m[8]*z)*w;total+=w;
    }
    this.contactPoint.set(cx/total,cy/total,cz/total);
    return min;
  }
  rest(floor=TABLE_Y){
    this.velocity.set(0,0,0);this.omega.set(0,0,0);this.compression=0;this.scale.set(1,1,1);
    this.position.y=floor-this.support()+.012;this.awake=false;this.landed=true;return this;
  }
  release({velocity=[.55,0,.10],spin=[.18,.10,-.85]}={}){
    this.velocity.fromArray(velocity);this.omega.fromArray(spin);this.awake=true;this.landed=false;
  }
  step(dt,floor=TABLE_Y){
    const elapsed=Math.max(0,Math.min(dt,.05));
    const count=Math.max(1,Math.ceil(elapsed*120)),h=elapsed/count;
    let impact=0;
    for(let k=0;k<count;k++){
      this.compression*=Math.exp(-h*1.4);
      this.scale.set(1+this.compression*.22,1-this.compression,1+this.compression*.22);
      this.velocity.y-=10.5*h;
      this.position.addScaledVector(this.velocity,h);
      const speed=this.omega.length();
      if(speed>1e-7){this.delta.setFromAxisAngle(this.omega.clone().divideScalar(speed),speed*h);this.quaternion.premultiply(this.delta).normalize();}
      const min=this.support(),surface=floor-min+.012;
      if(this.position.y<=surface){
        if(!this.landed&&this.velocity.y<-.25){
          impact=Math.max(impact,-this.velocity.y);this.compression=Math.min(.12,impact*.018);this.landed=true;
          this.scale.set(1+this.compression*.22,1-this.compression,1+this.compression*.22);
        }
        this.position.y=floor-this.support()+.012;this.velocity.y=0; // No bounce impulse.
        const r=this.contactPoint;
        // Gravity rotates the center of mass down around its actual support patch.
        this.omega.x+=-r.z*10.5*h/this.inertia;this.omega.z+=r.x*10.5*h/this.inertia;
        const slipX=this.velocity.x+this.omega.y*r.z-this.omega.z*r.y;
        const slipZ=this.velocity.z+this.omega.x*r.y-this.omega.y*r.x;
        let jx=-slipX/(1+r.y*r.y/this.inertia),jz=-slipZ/(1+r.y*r.y/this.inertia);
        const maxImpulse=(this.kind==='pearl'?.45:.85)*10.5*h,magnitude=Math.hypot(jx,jz);
        if(magnitude>maxImpulse){jx*=maxImpulse/magnitude;jz*=maxImpulse/magnitude;}
        this.velocity.x+=jx;this.velocity.z+=jz;
        this.omega.x+=r.y*jz/this.inertia;this.omega.z-=r.y*jx/this.inertia;
        const drag=this.kind==='pearl'?.8:3.8;
        this.velocity.x*=Math.exp(-drag*h);this.velocity.z*=Math.exp(-drag*h);
        this.omega.multiplyScalar(Math.exp(-(this.kind==='pearl'?1.0:4.8)*h));
        // Static rolling resistance holds a nearly settled flat face or soft pearl.
        if(this.velocity.length()<.025&&this.omega.length()<.06){this.velocity.set(0,0,0);this.omega.set(0,0,0);}
      }else this.omega.multiplyScalar(Math.exp(-h*.12));
    }
    this.awake=this.velocity.lengthSq()>.00001||this.omega.lengthSq()>.0001||this.compression>.001;
    return {impact,awake:this.awake};
  }
  apply(mesh){mesh.position.copy(this.position);mesh.quaternion.copy(this.quaternion);mesh.scale.copy(this.scale);}
}
