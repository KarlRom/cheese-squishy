import * as THREE from './vendor/three.module.js';

// Baked wood grain and simple solid furniture keep the room offline and light.
function oakTexture(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#d9bd96';ctx.fillRect(0,0,1024,512);
  let seed=84;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let row=0;row<5;row++){
    const y=row*103;
    ctx.fillStyle=`rgba(115,78,40,${.025+random()*.035})`;ctx.fillRect(0,y,1024,102);
    for(let i=0;i<165;i++){
      const lineY=y+random()*102,phase=random()*6.28,amplitude=1+random()*3;
      ctx.beginPath();
      for(let x=0;x<=1024;x+=8){
        const bend=Math.sin(x*.008+phase)*amplitude+Math.sin(x*.024+phase)*.55;
        if(!x)ctx.moveTo(x,lineY+bend);else ctx.lineTo(x,lineY+bend);
      }
      ctx.strokeStyle=`rgba(112,77,43,${.018+random()*.085})`;ctx.lineWidth=.3+random()*.7;ctx.stroke();
    }
    ctx.fillStyle='rgba(93,69,41,.10)';ctx.fillRect(0,y,1024,.6);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;return texture;
}
export function createBedroom(oak=oakTexture()){
  const room=new THREE.Group();
  const wood=new THREE.MeshStandardMaterial({map:oak,color:0xf2dfc1,roughness:.48});
  const plaster=new THREE.MeshStandardMaterial({color:0xf0ede7,roughness:.95});
  const linen=new THREE.MeshStandardMaterial({color:0xf8f6ef,roughness:1});
  const oatmeal=new THREE.MeshStandardMaterial({color:0xd5c9b8,roughness:.94});
  const frame=new THREE.MeshStandardMaterial({color:0xa38b71,roughness:.7});
  function box(w,h,d,x,y,z,material,cast=true){
    const geometry=new THREE.BoxGeometry(w,h,d,4,4,4);
    const positions=geometry.attributes.position,normals=geometry.attributes.normal;
    const radius=Math.min(.12,Math.min(w,h,d)*.30),v=new THREE.Vector3(),core=new THREE.Vector3();
    for(let i=0;i<positions.count;i++){
      v.fromBufferAttribute(positions,i);
      core.set(THREE.MathUtils.clamp(v.x,-w/2+radius,w/2-radius),THREE.MathUtils.clamp(v.y,-h/2+radius,h/2-radius),THREE.MathUtils.clamp(v.z,-d/2+radius,d/2-radius));
      v.sub(core).normalize();normals.setXYZ(i,v.x,v.y,v.z);
      v.multiplyScalar(radius).add(core);positions.setXYZ(i,v.x,v.y,v.z);
    }
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);mesh.castShadow=cast;mesh.receiveShadow=true;room.add(mesh);return mesh;
  }
  // Table top meets the untouched underside of either squishy.
  box(12.4,.50,9.2,0,-1.295,-.35,wood);
  for(const x of [-5.5,5.5])for(const z of [-4.25,3.55])box(.32,3.3,.32,x,-3.195,z,wood);
  box(32,.12,32,0,-4.9,0,new THREE.MeshStandardMaterial({color:0xd4c2aa,roughness:.8}),false);
  box(32,18,.18,0,3,-9,plaster,false);
  box(.18,18,30,-11,3,0,plaster,false);
  // Low upholstered bed, layered linen, two pillows, and an oak bedside table.
  box(5.6,1.0,6.6,-5.4,-4.22,-5.25,frame);
  box(5.5,.7,6.45,-5.4,-3.50,-5.2,linen);
  box(5.65,2.6,.28,-5.4,-3.1,-8.25,oatmeal);
  box(5.55,.17,4.35,-5.4,-3.075,-4.25,oatmeal);
  for(const x of [-6.75,-4.05]){
    const pillow=box(2.25,.34,1.18,x,-2.99,-7.4,linen);pillow.rotation.x=.10;
  }
  box(1.65,.15,1.5,.65,-3.18,-7.0,wood);
  for(const x of [.02,1.28])for(const z of [-7.58,-6.42])box(.09,1.65,.09,x,-4.08,z,wood);
  // A warm ceramic bedside lamp with a linen shade.
  const lampBase=new THREE.Mesh(new THREE.CylinderGeometry(.22,.3,.62,32),new THREE.MeshStandardMaterial({color:0xded4c5,roughness:.55}));
  lampBase.position.set(.65,-2.8,-7.0);room.add(lampBase);
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(.44,.64,.7,40),new THREE.MeshStandardMaterial({color:0xfff7e5,roughness:1}));
  shade.position.set(.65,-2.17,-7.0);room.add(shade);
  // Large daylight window and sheer side curtains on the back wall.
  const daylight=new THREE.MeshBasicMaterial({color:0xf6f9fc});
  box(4.2,4.8,.05,5.4,1.1,-8.85,daylight,false);
  for(const x of [3.23,7.57])box(.12,5.05,.12,x,1.1,-8.75,linen,false);
  for(const y of [-1.4,3.6])box(4.45,.12,.12,5.4,y,-8.75,linen,false);
  box(.07,4.8,.08,5.4,1.1,-8.72,linen,false);
  box(4.2,.07,.08,5.4,1.1,-8.72,linen,false);
  for(const side of [2.7,8.05])for(let i=0;i<5;i++){
    const curtain=box(.24,7,.18,side+i*.12,-.05,-8.4+(i%2)*.07,linen,false);
    curtain.rotation.y=(i%2?1:-1)*.12;
  }
  // Soft, static window-light patch on the wall complements the cast toy shadow.
  const patchMaterial=new THREE.MeshBasicMaterial({color:0xfffcf1,transparent:true,opacity:.32,depthWrite:false});
  const patch=new THREE.Mesh(new THREE.PlaneGeometry(5,4),patchMaterial);
  patch.position.set(-6.1,1.1,-8.88);patch.rotation.z=-.17;room.add(patch);
  const lamp=new THREE.PointLight(0xffbd83,0,14,2);
  lamp.position.set(.65,-2.25,-7);room.add(lamp);
  room.userData.lighting={walls:plaster,window:daylight,patch:patchMaterial,shade:shade.material,lamp};
  room.userData.oak=oak;return room;
}
