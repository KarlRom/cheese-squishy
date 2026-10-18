import {FingerPreview} from './finger-preview.js?v=2.11.0';
import {TableBody,TABLE_Y} from './table-physics.js?v=2.9.0';
import {fingerContact,balanceContacts,scrunchContact,recentGripHit} from './fingertips.js?v=2.11.0';
import {HandMode} from './hand-mode.js?v=2.11.0';
import {createBedroom} from './room.js?v=2.5.0';
import {pickupPose,slidePose,dropPose,LIFT_SECONDS,SLIDE_SECONDS,DROP_SECONDS} from './pickup.js?v=2.9.0';
import { makePearl } from './toy-geometry.js?v=2.4.1';
import * as THREE from './vendor/three.module.js';
import { toys, toyFor } from './toys.js?v=2.2.0';
import { SquishyMaterial } from './physics.js?v=2.11.0';
import { HOME_RADIUS, clampRadius, pinchRadius, cameraZoom } from './zoom.js?v=2.1.0';
import { makeSqueeze } from './squeezes.js';
import { SquishySound } from './sound.js?v=2.0.0';
const sound = new SquishySound();
async function unlockSound() {
  await sound.unlock();
  if (!sound.supported) {
    $('sound-hint').textContent = 'Sound unavailable in this browser.';
    $('sound-hint').classList.remove('sr-only');
    $('sound-enabled').disabled = true; $('volume').disabled = true;
  }
}

const $ = id => document.getElementById(id);
const canvas = $('squishy'), stage = $('stage');
const status = $('status');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'default' });
} catch (error) {
  $('loading').hidden = true; $('error').hidden = false;
  $('squeeze').disabled = true; $('reset').disabled = true;
  throw error;
}
renderer.setClearColor(0xffffff, 1);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
let needsRender = true;
let introPhase='table',liftElapsed=0,toySlide=null,dropStart=null;
let tableBody=null,liftFrom=null,dropIndex=0;
const identityRotation=new THREE.Quaternion(),unitScale=new THREE.Vector3(1,1,1);
function isTransitioning(){return !!toySlide||introPhase==='lifting'||introPhase==='dropping';}
const bedroomCamera=new THREE.Vector3(6,4.5,10.5);
const bedroomTarget=new THREE.Vector3(0,-.15,0);
const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
const homeView = {theta: .635, phi: 1.16};
const view = {...homeView, radius: HOME_RADIUS};
let interactionMode='squish';
const orbitPointers=new Map();
let zoomStart=null;
function turnView(dx=0,dy=0) {
  view.theta -= dx; view.phi = THREE.MathUtils.clamp(view.phi-dy,.12,Math.PI-.12);
  const optics=cameraZoom(view.radius);
  camera.position.setFromSphericalCoords(optics.distance,view.phi,view.theta);
  camera.zoom=optics.zoom;camera.updateProjectionMatrix();
  camera.lookAt(0,0,0);
  if(introPhase==='table'){camera.position.copy(bedroomCamera);camera.zoom=1;camera.lookAt(bedroomTarget);camera.updateProjectionMatrix();}
  camera.updateMatrixWorld();
  canvas.dataset.view = `${view.theta.toFixed(3)},${view.phi.toFixed(3)}`;
  canvas.dataset.zoom=(HOME_RADIUS/view.radius).toFixed(3);
  needsRender=true;
}
function setZoom(radius){view.radius=clampRadius(radius);turnView();}
function resetView() {view.theta=homeView.theta;view.phi=homeView.phi;view.radius=HOME_RADIUS;turnView();}
turnView();
const hemisphere=new THREE.HemisphereLight(0xfff9e9,0xd6bd8a,1.0);scene.add(hemisphere);
const key = new THREE.DirectionalLight(0xfff9ed, 3.0);
key.position.set(-3, 6, 5);
key.castShadow=true; key.shadow.mapSize.set(1024,1024);
Object.assign(key.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:1,far:15});
key.shadow.bias=-.00015; key.shadow.normalBias=.008;
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.7);
fill.position.set(4, 2, -4); scene.add(fill);

// A local studio environment: bright softboxes, no downloads or image assets.
const studio = new THREE.Scene();
studio.background = new THREE.Color(0xc5c1b9);
function softbox(w, h, position, strength) {
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(strength, strength, strength), side: THREE.DoubleSide }));
  panel.position.set(...position); panel.lookAt(0, 0, 0); studio.add(panel);
}
softbox(5, 5, [-3, 5, 4], 4); softbox(3, 6, [5, 2, 1], 2); softbox(6, 4, [0, 4, -4], 3);
const pmrem = new THREE.PMREMGenerator(renderer);
const environment = pmrem.fromScene(studio, 0.08, 0.1, 30);
scene.environment = environment.texture;
pmrem.dispose();
for (const object of studio.children) { object.geometry.dispose(); object.material.dispose(); }

// Pearl needs reflected light shapes, rather than a brighter diffuse surface.
// Soft gradients on these private studio cards produce broad nacre highlights.
// The cards are baked once and never appear in the white scene itself.
function makePearlEnvironment(){
  const room=new THREE.Scene();room.background=new THREE.Color(0x777981);
  const panelCanvas=document.createElement('canvas');panelCanvas.width=panelCanvas.height=128;
  const context=panelCanvas.getContext('2d');
  const glow=context.createRadialGradient(64,64,14,64,64,64);
  glow.addColorStop(0,'#ffffff');glow.addColorStop(.64,'#fbfbfb');glow.addColorStop(.88,'#a5a5a5');glow.addColorStop(1,'#000000');
  context.fillStyle=glow;context.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(panelCanvas);texture.colorSpace=THREE.SRGBColorSpace;
  function card(w,h,position,strength,color=0xffffff,soft=true){
    const material=new THREE.MeshBasicMaterial({color,map:soft?texture:null,side:THREE.DoubleSide});
    material.color.multiplyScalar(strength);
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
    panel.position.set(...position);panel.lookAt(0,0,0);room.add(panel);
  }
  card(5.5,3.6,[-3,4.6,4.2],5.0); // Broad creamy upper-left reflection.
  card(1.2,5.0,[4.2,1.3,3.0],3.0,0xfff7f0); // Narrow silver ribbon.
  card(4.5,2.2,[-1.0,2.0,-4.0],2.4,0xfff2e9);
  card(6.5,4.0,[0,-4.0,2.0],.12,0x85828b,false); // Contour below the milky body.
  const generator=new THREE.PMREMGenerator(renderer);
  const result=generator.fromScene(room,.025,.1,30);generator.dispose();
  for(const panel of room.children){panel.geometry.dispose();panel.material.dispose();}
  texture.dispose();return result;
}
let pearlEnvironment=null;

// Regular grid on six faces, welded BEFORE rounding so all edges stay seamless.
function makeCheese(segments) {
  const box = new THREE.BoxGeometry(2, 2, 2, segments, segments, segments);
  const source = box.attributes.position, map = new Map(), vertices = [], remap = [];
  for (let i = 0; i < source.count; i++) {
    const p = [source.getX(i), source.getY(i), source.getZ(i)];
    const hash = p.map(v => Math.round(v * 100000)).join(',');
    if (!map.has(hash)) { map.set(hash, vertices.length / 3); vertices.push(...p); }
    remap.push(map.get(hash));
  }
  const index = Array.from(box.index.array, i => remap[i]); box.dispose();
  // Sculpted oval cavities: axis, sign, center u/v, radii u/v, depth, rotation.
  // Each face mixes deep pockets, broad shallow bowls and small pinholes.
  const pores = [
    [2,1,-.47,.43,.265,.205,.205,.24], [2,1,.40,.55,.105,.145,.105,-.4],
    [2,1,.10,.01,.225,.285,.245,-.3], [2,1,-.55,-.35,.125,.185,.13,.5],
    [2,1,.46,-.49,.245,.145,.17,.35], [2,1,.64,.10,.065,.08,.075,-.2],
    [2,1,-.17,-.60,.055,.07,.042,.2], [2,1,-.16,.64,.06,.045,.035,.4],
    [0,1,-.45,.45,.195,.26,.23,-.32], [0,1,.34,.13,.285,.165,.18,.42],
    [0,1,-.31,-.39,.235,.20,.19,-.65], [0,1,.48,-.56,.095,.07,.07,.2],
    [0,1,.57,.58,.075,.115,.10,-.2], [0,1,-.65,-.03,.06,.075,.04,.3],
    [0,1,.07,.64,.065,.05,.045,.4],
    [1,1,-.45,.34,.275,.205,.18,-.3], [1,1,.36,.43,.105,.145,.13,.55],
    [1,1,.06,-.26,.24,.275,.25,.3], [1,1,-.57,-.48,.075,.11,.065,-.4],
    [1,1,.59,-.49,.105,.075,.085,.35], [1,1,.62,.02,.055,.065,.035,-.2],
    [1,1,-.08,.64,.07,.055,.045,.15],
    [0,-1,.07,.18,.265,.21,.22,.45], [0,-1,-.44,-.47,.145,.19,.15,-.3],
    [0,-1,.50,.51,.105,.16,.14,.3], [0,-1,-.48,.52,.18,.12,.10,.2],
    [0,-1,.48,-.43,.19,.14,.17,-.35], [0,-1,-.62,.04,.055,.075,.04,.2],
    [2,-1,-.34,.42,.225,.16,.17,-.5], [2,-1,.40,-.27,.25,.29,.25,.3],
    [2,-1,.43,.51,.095,.14,.11,-.3], [2,-1,-.45,-.44,.19,.135,.14,.4],
    [2,-1,-.04,.02,.08,.065,.045,-.2], [2,-1,-.01,-.65,.055,.065,.06,.1],
    [1,-1,-.32,.34,.205,.265,.20,-.2], [1,-1,.41,-.42,.255,.17,.20,.45],
    [1,-1,-.48,-.43,.12,.085,.08,.1], [1,-1,.43,.44,.14,.095,.13,-.4],
    [1,-1,.02,-.08,.07,.05,.04,.2]
  ].map((pore,index)=>({values:pore,phase:index*2.399963,irregularity:.025+(index%3)*.012}));
  const colors = [], p = new THREE.Vector3(), core = new THREE.Vector3();
  const yellow = new THREE.Color('#eab019');
  for (let i = 0; i < vertices.length; i += 3) {
    p.fromArray(vertices, i);
    core.set(THREE.MathUtils.clamp(p.x,-.79,.79),THREE.MathUtils.clamp(p.y,-.79,.79),THREE.MathUtils.clamp(p.z,-.79,.79));
    p.sub(core).normalize().multiplyScalar(.21).add(core);
    let cavity = 0;
    for (const {values,phase,irregularity} of pores) {
      const [axis,sign,u,v,ru,rv,depth,angle]=values;
      if (vertices[i+axis]*sign < .98) continue;
      const axes=axis===0?[2,1]:axis===1?[0,2]:[0,1];
      const du=vertices[i+axes[0]]-u,dv=vertices[i+axes[1]]-v;
      const cu=Math.cos(angle),su=Math.sin(angle);
      const x=(du*cu+dv*su)/ru,y=(-du*su+dv*cu)/rv;
      const theta=Math.atan2(y,x);
      const edge=1+irregularity*Math.sin(theta*3+phase)+.016*Math.cos(theta*2-phase);
      const r2=(x*x+y*y)/(edge*edge);
      if(r2<1){
        const t=1-r2;
        // Zero slope at the mouth and floor; no hard lip or grain across the skin.
        const bowl=t*t*(3-2*t);
        p.setComponent(axis,p.getComponent(axis)-sign*depth*bowl);
        cavity=Math.max(cavity,bowl);
      }
    }
    p.toArray(vertices, i);
    const ao = 1 - cavity * .29;
    const variation = .994 + .006 * Math.sin(p.x * 3 + p.y * 2 + p.z * 2);
    colors.push(yellow.r * ao * variation, yellow.g * ao * variation, yellow.b * ao * variation);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(index); geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
function createToy(id){
  const pearl=id==='pearl';
  const geometry=pearl?makePearl(64):makeCheese(matchMedia('(max-width: 600px)').matches?64:80);
  if(pearl&&!pearlEnvironment)pearlEnvironment=makePearlEnvironment();
  const material=new THREE.MeshPhysicalMaterial(pearl?{
    color:0xfffaf5,vertexColors:true,roughness:.23,metalness:.08,
    clearcoat:1,clearcoatRoughness:.065,ior:1.58,specularIntensity:1.15,
    iridescence:.65,iridescenceIOR:1.36,iridescenceThicknessRange:[300,390],
    sheen:.12,sheenColor:0xffedf2,sheenRoughness:.45,
    transmission:.22,thickness:1.1,attenuationColor:0xfae9df,attenuationDistance:3.2,
    envMap:pearl?pearlEnvironment.texture:null,envMapIntensity:1.35
  }:{color:0xffffff,vertexColors:true,roughness:.28,metalness:0,clearcoat:.30,clearcoatRoughness:.30,envMapIntensity:.65});
  material.fog=false;
  const mesh=new THREE.Mesh(geometry,material);
  geometry.boundingSphere.radius=3.2;mesh.castShadow=true;mesh.receiveShadow=true;
  const rest=geometry.attributes.position.array.slice();
  return {geometry,material,mesh,rest,restNormals:geometry.attributes.normal.array.slice(),physics:new SquishyMaterial(rest)};
}
const toyStates=new Map();
let selectedToy=toyFor('cheese');
try{selectedToy=toyFor(localStorage.getItem('squishy-choice-v1'));}catch{}
let {geometry,material,mesh,rest,restNormals,physics}=createToy(selectedToy.id);
toyStates.set(selectedToy.id,{geometry,material,mesh,rest,restNormals,physics});scene.add(mesh);

// A feathered contact shadow on white. It never tints the page background.
const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 256;
const ctx = shadowCanvas.getContext('2d');
const gradient = ctx.createRadialGradient(128,128,8,128,128,124);
gradient.addColorStop(0,'rgba(83,62,21,.23)'); gradient.addColorStop(.4,'rgba(83,62,21,.13)'); gradient.addColorStop(1,'rgba(83,62,21,0)');
ctx.fillStyle = gradient; ctx.fillRect(0,0,256,256);
const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.3,3.7),new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false }));
shadow.rotation.x = -Math.PI/2; shadow.position.set(.1,-1.035,.05); scene.add(shadow);
const bedroom=createBedroom();scene.add(bedroom);
const fingerPreview=new FingerPreview(scene);
scene.fog=new THREE.Fog(0xffffff,18,45);
tableBody=new TableBody(geometry.attributes.position.array,{kind:selectedToy.id}).rest();tableBody.apply(mesh);

function resize() {
  const { width, height } = stage.getBoundingClientRect();
  renderer.setSize(width,height,false);
  camera.aspect=width/height;
  // Keep the cube fully framed on the narrowest phones.
  camera.fov=2*Math.atan(Math.tan(34*Math.PI/360)*Math.max(1,.88/camera.aspect))*180/Math.PI;
  camera.updateProjectionMatrix(); needsRender=true;
}
new ResizeObserver(resize).observe(stage); resize();
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
const contacts = new Map();
let squeezeUntil = 0, heldKey = false, keyboardPoint = [0,.12,1];
let buttonGesture=null, squeezeIndex=0;
let lastStatus = '', uiClock = 0, lastTime = 0, frameHandle = 0, paused = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function announce(message) { if (lastStatus !== message) { status.textContent = message; lastStatus = message; } }
function setRay(x,y) {
  const r = canvas.getBoundingClientRect();
  ndc.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);
  raycaster.setFromCamera(ndc,camera);
}
function beginContact(event) {
  if (contacts.size >= 4 || event.button > 2 || event.button===1) return;
  setRay(event.clientX,event.clientY);
  mesh.updateMatrixWorld();
  const hit = raycaster.intersectObject(mesh)[0];
  if(isTransitioning()){event.preventDefault();return;}
  if(introPhase!=='ready'){
    event.preventDefault();if(introPhase==='table'&&hit&&event.button!==2)pickUp();return;
  }
  if(interactionMode==='rotate'||orbitPointers.size>0||event.shiftKey||event.button===2||!hit){
    if(contacts.size||orbitPointers.size>=2)return;
    event.preventDefault(); canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);
    orbitPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(orbitPointers.size===2){
      const [a,b]=[...orbitPointers.values()];
      zoomStart={distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),radius:view.radius};
    }
    announce('Turn it over. Find a new soft spot.'); return;
  }
  void unlockSound();
  void sound.touch('press',.55+Math.max(0,event.pressure||.5)*.3);
  event.preventDefault(); canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(event.pointerId);
  const bary = THREE.Triangle.getBarycoord(hit.point,
    new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,hit.face.a),
    new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,hit.face.b),
    new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,hit.face.c), new THREE.Vector3());
  const anchor = new THREE.Vector3(), normal = new THREE.Vector3();
  [hit.face.a,hit.face.b,hit.face.c].forEach((id,i)=>{
    anchor.addScaledVector(new THREE.Vector3().fromArray(rest,id*3),bary.getComponent(i));
    normal.addScaledVector(new THREE.Vector3().fromArray(restNormals,id*3),bary.getComponent(i));
  });
  normal.normalize();
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),hit.point);
  contacts.set(event.pointerId,{ point: anchor.toArray(), normal: normal.toArray(), drag: [0,0,0], radius: event.pointerType==='mouse'?.21:.24,
    depth: .1, pressure: event.pressure, started: performance.now(), start: hit.point.clone(), plane, x: event.clientX,y: event.clientY });
  announce('Let it melt into your fingers.');
}
function moveContact(event) {
  const orbit=orbitPointers.get(event.pointerId);
  if(orbit){
    event.preventDefault();
    const dx=event.clientX-orbit.x,dy=event.clientY-orbit.y;
    orbit.x=event.clientX;orbit.y=event.clientY;
    if(orbitPointers.size===2&&zoomStart){
      const [a,b]=[...orbitPointers.values()];
      setZoom(pinchRadius(zoomStart.radius,zoomStart.distance,Math.hypot(b.x-a.x,b.y-a.y)));
    }else{
      const scale=2*Math.PI/Math.max(320,Math.min(stage.clientWidth,stage.clientHeight)*1.8);
      turnView(dx*scale,dy*scale);
    }
    return;
  }
  const c = contacts.get(event.pointerId); if (!c) return;
  event.preventDefault();
  const moveTime=performance.now();
  sound.drag(Math.hypot(event.clientX-c.x,event.clientY-c.y)/Math.max(.008,(moveTime-(c.moveTime||c.started))/1000));
  c.moveTime=moveTime; c.x=event.clientX; c.y=event.clientY; c.pressure=event.pressure;
  setRay(event.clientX,event.clientY);
  const p = raycaster.ray.intersectPlane(c.plane,new THREE.Vector3());
  if (p) c.drag = p.sub(c.start).clampLength(0,1.2).multiplyScalar(.90).toArray();

}
function endContact(event) {
  if(orbitPointers.delete(event.pointerId)){
    zoomStart=null;
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    return;
  }
  const releasedContact=contacts.get(event.pointerId);
  if (!contacts.delete(event.pointerId)) return;
  if(event.type==='pointerup')void sound.touch('release',Math.min(.95,.55+(performance.now()-releasedContact.started)/2500));
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);

  if (!contacts.size) announce('Letting go, very slowly.');
}
canvas.addEventListener('pointerdown',beginContact);
// A click/touch-end retry covers browsers that do not unlock audio on pointer-down.
canvas.addEventListener('click',()=>{void unlockSound();});
canvas.addEventListener('pointermove',moveContact);
for (const type of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(type,endContact);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',event=>{
  event.preventDefault();
  if(introPhase!=='ready'||isTransitioning()||contacts.size||orbitPointers.size)return;
  const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1);
  setZoom(view.radius*Math.exp(THREE.MathUtils.clamp(pixels,-200,200)*.0015));
},{passive:false});
function squeeze() {
  if(isTransitioning())return;
  if(introPhase!=='ready'){pickUp();return;}
  void unlockSound(); void sound.touch('press',.75);
  // Anchor local presses to the face nearest the current camera angle.
  const viewNormal=camera.position.clone().normalize();
  const axis=[Math.abs(viewNormal.x),Math.abs(viewNormal.y),Math.abs(viewNormal.z)];
  const dominant=axis.indexOf(Math.max(...axis));
  const normal=selectedToy.id==='pearl'?viewNormal:new THREE.Vector3().setComponent(dominant,Math.sign(viewNormal.getComponent(dominant)));
  const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
  right.addScaledVector(normal,-right.dot(normal)).normalize();
  const up=new THREE.Vector3().crossVectors(normal,right).normalize();
  const profile=makeSqueeze(squeezeIndex++,{normal:normal.toArray(),right:right.toArray(),up:up.toArray()});
  if(selectedToy.id==='pearl')for(const contact of profile.contacts){
    const p=new THREE.Vector3(...contact.point);p.y-=.025;
    const scale=1/Math.sqrt((p.x/1.32)**2+(p.y/1.04)**2+(p.z/1.25)**2);
    p.multiplyScalar(scale);contact.point=[p.x,p.y+.025,p.z];
    contact.normal=new THREE.Vector3(p.x/(1.32**2),p.y/(1.04**2),p.z/(1.25**2)).normalize().toArray();
  }
  buttonGesture={profile,started:performance.now()};
  $('squeeze').dataset.squeeze=profile.name;
  announce(profile.name+'.');
}
$('squeeze').addEventListener('click',squeeze);
function reset() {
  if(isTransitioning())return;
  clearGestures();clearHandContacts(); resetView();
  sound.silence();
  for (const id of contacts.keys()) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  contacts.clear(); heldKey=false; squeezeUntil=0;
  physics.reset(); physics.writePositions(geometry.attributes.position.array);
  geometry.attributes.position.needsUpdate=true; geometry.computeVertexNormals();
  needsRender=true; announce(`${selectedToy.name} reset.`);
}
$('reset').addEventListener('click',reset);
canvas.addEventListener('keydown',event=>{
  if(isTransitioning()){event.preventDefault();return;}
  if(introPhase!=='ready'){
    if(event.code==='Space'||event.key==='Enter'){event.preventDefault();pickUp();}
    return;
  }
  if(['+','=','-','_','0'].includes(event.key)){
    event.preventDefault();clearGestures();
    setZoom(event.key==='0'?HOME_RADIUS:view.radius*(event.key==='-'||event.key==='_'?1.18:1/1.18));return;
  }
  if (event.code==='Space'||event.key==='Enter') { event.preventDefault(); if (!event.repeat) { void unlockSound(); void sound.touch('press',.7); heldKey=true; announce('A good, slow squeeze.'); } }
  if (event.key.toLowerCase()==='r') { event.preventDefault(); reset(); }
  if (event.key.startsWith('Arrow')) {
    event.preventDefault();
    if(interactionMode==='rotate'){
      turnView(event.key==='ArrowLeft'?-.24:event.key==='ArrowRight'?.24:0,event.key==='ArrowUp'?.18:event.key==='ArrowDown'?-.18:0);
      return;
    }
    void unlockSound();
    if (event.key==='ArrowLeft') keyboardPoint[0]-=.15;
    if (event.key==='ArrowRight') keyboardPoint[0]+=.15;
    if (event.key==='ArrowUp') keyboardPoint[1]+=.15;
    if (event.key==='ArrowDown') keyboardPoint[1]-=.15;
    keyboardPoint[0]=THREE.MathUtils.clamp(keyboardPoint[0],-.7,.7);
    keyboardPoint[1]=THREE.MathUtils.clamp(keyboardPoint[1],-.7,.7);
    squeezeUntil=performance.now()+700;
  }
});
canvas.addEventListener('keyup',event=>{ if (event.code==='Space'||event.key==='Enter') {event.preventDefault();if(heldKey)void sound.touch('release',.7);heldKey=false;} });
canvas.addEventListener('blur',()=>{heldKey=false;});
function clearGestures(){
  const ids=[...contacts.keys(),...orbitPointers.keys()];
  contacts.clear();orbitPointers.clear();zoomStart=null;heldKey=false;squeezeUntil=0;buttonGesture=null;sound.silence();
  for(const id of ids)if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
}
function setMode(mode){
  clearGestures();clearHandContacts();interactionMode=mode;
  $('mode-squish').setAttribute('aria-pressed',String(mode==='squish'));
  $('mode-rotate').setAttribute('aria-pressed',String(mode==='rotate'));
  $('view-buttons').hidden=mode!=='rotate';
  stage.classList.toggle('rotating',mode==='rotate');
  $('gesture-help').textContent=mode==='rotate'?'Drag to turn; pinch to zoom. Arrow keys rotate, plus and minus zoom, zero resets zoom.':'Press & hold · Drag to stretch · Pinch to squeeze';
  canvas.setAttribute('aria-label',mode==='rotate'?`Rotatable 3D ${selectedToy.label}. Drag to turn, pinch with two fingers to zoom, or use the zoom buttons. Arrow keys rotate; plus and minus zoom; zero resets zoom. Switch to Squish to press it.`:`Interactive 3D ${selectedToy.label}. Press and drag to dent it, or pinch with two fingers. Hold Space to squeeze, use arrow keys to move the press, and R to reset. Drag the white space to turn the view.`);
  announce(mode==='rotate'?'Drag to turn.':'Ready for a little squeeze.');
}
function updateToyUI(){
  const pearl=selectedToy.id==='pearl';
  hemisphere.color.set(pearl?0xf5f6ff:0xfff9e9);
  hemisphere.groundColor.set(pearl?0xc3b8c2:0xd6bd8a);
  hemisphere.intensity=pearl?.45:1;
  key.color.set(pearl?0xffffff:0xfff9ed);key.intensity=pearl?1.25:3;
  fill.intensity=pearl?.45:.7;
  for(const id of Object.keys(toys))$('toy-'+id).setAttribute('aria-pressed',String(id===selectedToy.id));
  document.body.dataset.toy=selectedToy.id;
  $('squeeze').setAttribute('aria-label',`Squeeze the ${selectedToy.name.toLowerCase()}`);
  $('reset').setAttribute('aria-label',`Reset ${selectedToy.name.toLowerCase()} and view`);
  document.querySelector('main').setAttribute('aria-label',selectedToy.label);
  keyboardPoint=[0,.12,selectedToy.id==='pearl'?1.24:1];
  setMode(interactionMode);
  updateIntroUI();
}
function selectToy(id){
  if(id===selectedToy.id||isTransitioning())return;
  clearGestures();
  clearHandContacts();
  const outgoing=mesh,previous=selectedToy.id,outBase=mesh.position.clone();
  tableBody=null;
  selectedToy=toyFor(id);
  if(!toyStates.has(selectedToy.id))toyStates.set(selectedToy.id,createToy(selectedToy.id));
  ({geometry,material,mesh,rest,restNormals,physics}=toyStates.get(selectedToy.id));
  mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);scene.add(mesh);squeezeIndex=0;
  if(introPhase==='table'){tableBody=new TableBody(geometry.attributes.position.array,{kind:selectedToy.id}).rest();tableBody.apply(mesh);}
  const inBase=mesh.position.clone();
  if(!reducedMotion){
    const direction=Object.keys(toys).indexOf(selectedToy.id)>Object.keys(toys).indexOf(previous)?1:-1;
    const distance=camera.position.length();
    const span=distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect/camera.zoom+3.0;
    const axis=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(direction*span);
    toySlide={outgoing,outBase,inBase,axis,elapsed:0};mesh.position.copy(inBase).add(axis);
  }else scene.remove(outgoing);
  updateSettings(false);updateToyUI();needsRender=true;
  try{localStorage.setItem('squishy-choice-v1',selectedToy.id);}catch{}
  announce(`${selectedToy.label} selected.`);
}
function animateToySlide(dt){
  toySlide.elapsed+=dt;
  const pose=slidePose(toySlide.elapsed/SLIDE_SECONDS);
  toySlide.outgoing.position.copy(toySlide.axis).multiplyScalar(pose.outgoing).add(toySlide.outBase);
  mesh.position.copy(toySlide.axis).multiplyScalar(pose.incoming).add(toySlide.inBase);
  if(introPhase==='table'){shadow.position.x=.1+mesh.position.x;shadow.position.z=.05+mesh.position.z;}
  needsRender=true;
  if(pose.progress===1){
    scene.remove(toySlide.outgoing);toySlide.outgoing.position.set(0,0,0);toySlide.outgoing.quaternion.identity();toySlide.outgoing.scale.set(1,1,1);
    mesh.position.copy(toySlide.inBase);toySlide=null;shadow.position.x=.1;shadow.position.z=.05;updateIntroUI();
  }
}
let handSamples=[],handSampleTime=0,handNeedsRelease=false;
const handContacts=new Map(),fingerHits=new Map();
let fingerMarkers=[],fingerProbeTurn=0;
function clearHandContacts(){
  if(handContacts.size&&handMode.active){void sound.touch('release',.45);}
  handContacts.clear();fingerHits.clear();
}
const handMode=new HandMode({video:$('hand-video'),overlay:$('hand-overlay'),
  onHands:hands=>{handSamples=hands;handSampleTime=performance.now();if(!hands.length)clearHandContacts();},
  onStatus:(phase,message)=>{
    $('hand-panel').hidden=phase==='off';$('hand-message').textContent=message;
    $('hands-toggle').setAttribute('aria-pressed',String(phase==='starting'||phase==='active'));
    $('hands-toggle').textContent=phase==='starting'?'Cancel hand mode':phase==='active'?'Turn hand mode off':'Enable hand mode';
    $('hand-panel').dataset.state=phase;
    $('hand-hint').textContent=phase==='error'?message:'Camera video stays on your device. No recording or microphone.';
    if(phase!=='active'){
      handSamples=[];clearHandContacts();
      fingerMarkers=[];needsRender=fingerPreview.clear()||needsRender;
    }
  }
});
$('hands-toggle').addEventListener('click',()=>{
  if(handMode.phase==='starting'||handMode.active)handMode.stop();
  else{clearGestures();setMode('squish');void unlockSound();void handMode.start();}
});
$('stop-hands').addEventListener('click',()=>handMode.stop());
function handLoads(now){
  const empty={contacts:[]};fingerMarkers=[];
  const fresh=handMode.active&&now-handSampleTime<250;
  if(!fresh||isTransitioning()){clearHandContacts();return empty;}
  const rect=canvas.getBoundingClientRect();
  const usable=!contacts.size&&!orbitPointers.size&&introPhase==='ready'&&interactionMode==='squish';
  let waitingForRelease=handNeedsRelease&&handSamples.some(hand=>hand.gripping);
  if(handNeedsRelease&&!waitingForRelease)handNeedsRelease=false;
  const stamp=`${handSampleTime}|${canvas.dataset.view}|${canvas.dataset.zoom}|${selectedToy.id}|${introPhase}`;
  mesh.updateMatrixWorld();
  let rayBudget=2; // Spread ten precise surface tests over frames instead of stalling rendering.
  function probe(key,x,y,freshRequired){
    const cached=fingerHits.get(key);
    if(cached?.stamp===stamp)return cached.attachment;
    if(rayBudget<=0)return freshRequired?null:cached?.attachment;
    rayBudget--;
    setRay(x,y);const hit=raycaster.intersectObject(mesh)[0];
    if(!hit){fingerHits.set(key,{...cached,stamp,attachment:null});return null;}
    const triangle=[hit.face.a,hit.face.b,hit.face.c];
    const bary=THREE.Triangle.getBarycoord(hit.point,
      ...triangle.map(index=>new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,index)),new THREE.Vector3());
    const attachment={triangle,bary:bary.toArray(),hit:hit.point.clone()};
    fingerHits.set(key,{stamp,attachment,lastAttachment:attachment,lastSeen:now});return attachment;
  }
  const ids=new Set();let pressed=0,released=0,tablePick=false;
  const entries=handSamples.flatMap(hand=>(hand.fingers||[]).map(finger=>({hand,finger})));
  const rotate=list=>{const offset=fingerProbeTurn%Math.max(1,list.length);return [...list.slice(offset),...list.slice(0,offset)];};
  const ordered=[...rotate(entries.filter(e=>e.finger.pressing)),...rotate(entries.filter(e=>!e.finger.pressing))];
  fingerProbeTurn+=2;
  const visibleKeys=new Set(entries.map(({hand,finger})=>`${hand.id}:${finger.tip}`));
  for(const key of fingerHits.keys())if(!visibleKeys.has(key))fingerHits.delete(key);
  for(const {hand,finger} of ordered){
    const key=`${hand.id}:${finger.tip}`,x=rect.left+finger.x*rect.width,y=rect.top+finger.y*rect.height;
    let contact=handContacts.get(key);
    if(contact&&(!usable||!finger.pressing||waitingForRelease))contact=null;
    const attachment=contact||probe(key,x,y,finger.pressing&&usable)||
      (usable&&!waitingForRelease?recentGripHit(fingerHits.get(key),now,hand.closed):null);
    if(attachment)fingerMarkers.push({key,handId:hand.id,attachment,pressing:!!contact});
    if(!attachment)continue;
    if(introPhase==='table'&&!waitingForRelease&&finger.pressing){tablePick=true;continue;}
    if(!usable||waitingForRelease||!finger.pressing)continue;
    if(!contact){
      const anchor=new THREE.Vector3(),normal=new THREE.Vector3();
      attachment.triangle.forEach((index,i)=>{
        anchor.addScaledVector(new THREE.Vector3().fromArray(rest,index*3),attachment.bary[i]);
        normal.addScaledVector(new THREE.Vector3().fromArray(restNormals,index*3),attachment.bary[i]);
      });
      contact={...attachment,point:anchor.toArray(),normal:normal.normalize().toArray(),drag:[0,0,0],radius:finger.tip===4?.22:.18,depth:0,handId:hand.id,tip:finger.tip,
        start:attachment.hit.clone(),plane:new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),attachment.hit)};
      handContacts.set(key,contact);pressed++;
    }
    ids.add(key);contact.depth=.10+finger.strength*.32;contact.scrunch=false;
    setRay(x,y);const point=raycaster.ray.intersectPlane(contact.plane,new THREE.Vector3());
    if(point){
      const pinching=hand.pinched&&(finger.tip===4||finger.tip===8);
      contact.drag=point.sub(contact.start).clampLength(0,pinching?1.2:.075).multiplyScalar(pinching?.90:1).toArray();
    }
    const marker=fingerMarkers[fingerMarkers.length-1];marker.attachment=contact;marker.pressing=true;
  }
  for(const key of handContacts.keys())if(!ids.has(key)){handContacts.delete(key);released++;}
  if(pressed)void sound.touch('press',.55);else if(released)void sound.touch('release',.45);
  if(tablePick){fingerMarkers=[];pickUp();return empty;}
  const loads=[...handContacts.values()];
  for(const hand of handSamples){
    if(!hand.closed)continue;
    const group=loads.filter(c=>c.handId===hand.id);
    if(!group.length)continue;
    const center=[0,1,2].map(i=>group.reduce((sum,c)=>sum+c.point[i],0)/group.length);
    for(let i=0;i<loads.length;i++){
      const c=loads[i];
      // A deliberate thumb/index pinch retains its local sticky pull.
      if(c.handId===hand.id&&!(hand.pinched&&(c.tip===4||c.tip===8)))
        loads[i]=scrunchContact(c,center,hand.scrunchStrength);
    }
  }
  return {contacts:loads};
}
function drawFingerPreviews(){
  fingerPreview.begin();
  for(const marker of fingerMarkers)fingerPreview.show(marker.key,marker.handId,marker.attachment,mesh,camera,stage.clientHeight,marker.pressing);
  needsRender=fingerPreview.end()||needsRender;
}
function updateIntroUI(){
  document.body.dataset.scene=introPhase;
  $('pick-up').disabled=isTransitioning();
  $('put-down').hidden=introPhase!=='ready';
  for(const id of Object.keys(toys))$('toy-'+id).disabled=isTransitioning();
  for(const id of ['mode-squish','mode-rotate','squeeze','reset','put-down','view-left','view-right','view-up','view-down','zoom-in','zoom-out','view-home'])$(id).disabled=isTransitioning();
  canvas.setAttribute('aria-busy',String(isTransitioning()));
  document.querySelector('.toolbar').inert=introPhase!=='ready';
  if(introPhase!=='ready'){
    canvas.setAttribute('role','button');
    canvas.setAttribute('aria-label',`${selectedToy.label} on a light oak table. Tap or press Enter to pick up.`);
    $('gesture-help').textContent='Tap the squishy, or choose Pick up.';
  }else canvas.setAttribute('role','img');
}
function pickUp(){
  if(introPhase!=='table'||isTransitioning())return;
  clearGestures();clearHandContacts();void unlockSound();void sound.touch('release',.45);
  closeSettings();liftFrom={position:mesh.position.clone(),quaternion:mesh.quaternion.clone(),scale:mesh.scale.clone()};tableBody=null;introPhase='lifting';liftElapsed=0;updateIntroUI();
  announce('Picking up your squishy.');
  if(reducedMotion)finishPickup();needsRender=true;
}
function finishPickup(){
  introPhase='ready';mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);liftFrom=null;bedroom.visible=false;scene.fog=null;
  shadow.visible=false;turnView();setMode(interactionMode);updateIntroUI();needsRender=true;
  canvas.focus({preventScroll:true});announce('Ready to squish.');
}
function putDown(){
  if(introPhase!=='ready'||isTransitioning())return;
  clearGestures();clearHandContacts();closeSettings();
  handNeedsRelease=handMode.active;
  dropStart={position:camera.position.clone(),zoom:camera.zoom,complete:false};
  tableBody=new TableBody(geometry.attributes.position.array,{kind:selectedToy.id});
  tableBody.position.copy(mesh.position);tableBody.quaternion.copy(mesh.quaternion);
  const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);right.y=0;right.normalize().multiplyScalar(dropIndex++%2?-1:1);
  const momentum=selectedToy.id==='pearl'?2:1;
  tableBody.release({velocity:[right.x*.55*momentum,0,right.z*.55*momentum],spin:[right.z*.95*momentum,.12,-right.x*.95*momentum]});
  introPhase='dropping';liftElapsed=0;
  bedroom.visible=true;bedroom.position.y=-3.4;
  shadow.visible=true;shadow.position.set(.1,-4.435,.05);shadow.material.opacity=0;
  scene.fog=new THREE.Fog(0xffffff,0,.3);updateIntroUI();needsRender=true;
  announce('Dropping your squishy onto the table.');
  if(reducedMotion)finishDrop();
}
function finishDrop(){
  introPhase='table';bedroom.position.y=0;
  if(reducedMotion){tableBody.quaternion.identity();tableBody.rest();tableBody.apply(mesh);void sound.touch('press',.35);}
  shadow.position.set(mesh.position.x+.1,TABLE_Y+.01,mesh.position.z+.05);shadow.material.opacity=1;shadow.scale.set(1,1,1);
  scene.fog=new THREE.Fog(0xffffff,18,45);
  view.theta=homeView.theta;view.phi=homeView.phi;view.radius=HOME_RADIUS;
  turnView();updateIntroUI();needsRender=true;dropStart=null;
  $('pick-up').focus({preventScroll:true});announce('Back on the table.');
}
function animateDrop(dt){
  liftElapsed+=dt;
  const pose=dropPose(liftElapsed/DROP_SECONDS);
  bedroom.position.y=pose.roomY;
  camera.position.copy(dropStart.position).lerp(bedroomCamera,pose.ease);
  camera.zoom=THREE.MathUtils.lerp(dropStart.zoom,1,pose.ease);
  camera.lookAt(bedroomTarget.clone().multiplyScalar(pose.ease));
  camera.updateProjectionMatrix();camera.updateMatrixWorld();
  scene.fog.near=pose.fogNear;scene.fog.far=pose.fogFar;needsRender=true;
  if(pose.progress===1)dropStart.complete=true;
}
$('pick-up').addEventListener('click',pickUp);
$('put-down').addEventListener('click',putDown);
function animatePickup(dt){
  liftElapsed+=dt;
  const pose=pickupPose(liftElapsed/LIFT_SECONDS);
  bedroom.position.y=pose.roomY;
  mesh.position.copy(liftFrom.position).multiplyScalar(1-pose.ease);mesh.position.y+=pose.toyY;
  mesh.quaternion.copy(liftFrom.quaternion).slerp(identityRotation,pose.ease);
  mesh.scale.copy(liftFrom.scale).lerp(unitScale,pose.ease);
  shadow.position.set(mesh.position.x+.1,-1.035+pose.roomY,mesh.position.z+.05);shadow.material.opacity=pose.shadowOpacity;
  const optics=cameraZoom(view.radius);
  const destination=new THREE.Vector3().setFromSphericalCoords(optics.distance,view.phi,view.theta);
  camera.position.copy(bedroomCamera).lerp(destination,pose.ease);
  camera.zoom=THREE.MathUtils.lerp(1,optics.zoom,pose.ease);
  camera.lookAt(bedroomTarget.clone().multiplyScalar(1-pose.ease));
  camera.updateProjectionMatrix();camera.updateMatrixWorld();
  scene.fog.near=pose.fogNear;scene.fog.far=pose.fogFar;
  needsRender=true;
  if(pose.progress===1)finishPickup();
}
for(const id of Object.keys(toys))$('toy-'+id).addEventListener('click',()=>selectToy(id));
updateToyUI();
$('mode-squish').addEventListener('click',()=>setMode('squish'));
$('mode-rotate').addEventListener('click',()=>setMode('rotate'));
for(const [id,dx,dy] of [['view-left',-.45,0],['view-right',.45,0],['view-up',0,.3],['view-down',0,-.3]]){
  $(id).addEventListener('click',()=>{clearGestures();turnView(dx,dy);});
}
for(const [id,factor] of [['zoom-in',1/1.18],['zoom-out',1.18]])$(id).addEventListener('click',()=>{clearGestures();setZoom(view.radius*factor);});
$('view-home').addEventListener('click',()=>{clearGestures();resetView();});
function closeSettings() { $('settings').hidden=true; $('settings-toggle').setAttribute('aria-expanded','false'); }
$('settings-toggle').addEventListener('click',()=>{
  const open=$('settings').hidden; $('settings').hidden=!open; $('settings-toggle').setAttribute('aria-expanded',String(open));
});
$('close-settings').addEventListener('click',()=>{closeSettings();$('settings-toggle').focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSettings();});
document.addEventListener('pointerdown',e=>{if(!$('settings').contains(e.target)&&!$('settings-toggle').contains(e.target))closeSettings();});
function updateSettings(save=true) {
  physics.resistance=Number($('resistance').value)/100;
  physics.recovery=Number($('recovery').value)/100;
  const r=physics.resistance, speed=physics.recovery;
  const resistanceLabel=r<.2?'Melty':r<.5?'Soft':r<.8?'Supple':'Firm';
  const recoveryLabel=speed<.15?'Almost still':speed<.5?'Very slow':speed<.8?'Slow':'Slow rise';
  $('resistance-value').textContent=resistanceLabel; $('recovery-value').textContent=recoveryLabel;
  $('resistance').setAttribute('aria-valuetext',resistanceLabel);
  $('recovery').setAttribute('aria-valuetext',`${recoveryLabel}, about ${Math.round(physics.recoveryTime*3)} seconds for 95 percent recovery`);
  sound.setPreferences($('sound-enabled').checked,Number($('volume').value)/100);
  $('volume-value').textContent = `${$('volume').value}%`;
  $('volume').disabled = !$('sound-enabled').checked || !sound.supported;
  if(save)try{localStorage.setItem('cheese-feel-v1',JSON.stringify({resistance:$('resistance').value,recovery:$('recovery').value,sound:$('sound-enabled').checked,volume:$('volume').value}));}catch{}
}
try {
  const saved=JSON.parse(localStorage.getItem('cheese-feel-v1'));
  if(saved && typeof saved.sound==='boolean')$('sound-enabled').checked=saved.sound;
  for(const name of ['resistance','recovery','volume'])if(saved && Number.isFinite(Number(saved[name])))$(name).value=THREE.MathUtils.clamp(Number(saved[name]),0,100);
}catch{}
for(const id of ['resistance','recovery','volume'])$(id).addEventListener('input',()=>updateSettings());
$('sound-enabled').addEventListener('change',()=>{updateSettings();if($('sound-enabled').checked)void unlockSound();});
updateSettings(false);
function animate(now) {
  if(paused)return;
  const dt=lastTime?Math.min((now-lastTime)/1000,.05):1/60; lastTime=now;
  if(introPhase==='lifting')animatePickup(dt);
  else if(introPhase==='dropping')animateDrop(dt);
  if(toySlide)animateToySlide(dt);
  const active=[...contacts.values()];
  for(const c of active) {
    const held=Math.min((now-c.started)/1000,1.8);
    c.depth=.13+.25*(1-Math.exp(-held*2.4))+Math.max(0,(c.pressure||.5)-.5)*.12;
  }
  const hands=handLoads(now);active.push(...hands.contacts);
  const keyboardAuto=now<squeezeUntil||heldKey;
  if(keyboardAuto)active.push({point:keyboardPoint,normal:[0,0,1],drag:[0,-.10,0],radius:.23,depth:.36});
  if(buttonGesture&&now-buttonGesture.started>=buttonGesture.profile.duration)buttonGesture=null;
  let autoPinch=null,autoSquash=0;
  if(buttonGesture){
    const {profile,started}=buttonGesture;
    const amount=.2+.8*(1-Math.exp(-(now-started)/170));
    for(const c of profile.contacts)active.push({...c,depth:c.depth*amount,drag:c.drag.map(v=>v*amount)});
    if(!reducedMotion){
      autoPinch=profile.pinch?{axis:profile.pinch.axis,amount:profile.pinch.amount*amount*.15}:null;
      autoSquash+=profile.squeeze*amount*.15;
    }
  }
  const auto=keyboardAuto||!!buttonGesture||handContacts.size>0;
  const effectivePinch=autoPinch;
  const soundLoad=active.reduce((sum,c)=>sum+c.depth,0)+autoSquash*.3;
  sound.update(dt,soundLoad,effectivePinch?.amount||0);
  if(active.length||effectivePinch||physics.activity>.00002) {
    physics.step(dt,balanceContacts(active.map(fingerContact)),effectivePinch,autoSquash);
    if(!active.length&&!effectivePinch&&physics.activity<=.00002)physics.reset();
    physics.writePositions(geometry.attributes.position.array);
    geometry.attributes.position.needsUpdate=true; geometry.computeVertexNormals();
    needsRender=true;
  }
  if(tableBody&&!toySlide&&(introPhase==='dropping'||introPhase==='table')&&(tableBody.awake||physics.activity>.00002||introPhase==='dropping')){
    const floor=TABLE_Y+bedroom.position.y;
    const result=tableBody.step(dt,floor);tableBody.apply(mesh);
    const gap=Math.max(0,tableBody.position.y+tableBody.support()-floor);
    shadow.position.set(mesh.position.x+.1,floor+.01,mesh.position.z+.05);
    shadow.material.opacity=1/(1+gap*1.8);
    shadow.scale.setScalar(1+gap*.22+physics.activity*.25);
    if(result.impact)void sound.touch('press',Math.min(.65,.25+result.impact*.03));
    needsRender=true;
    if(dropStart?.complete)finishDrop();
  }
  drawFingerPreviews();
  if(needsRender){
    if(!tableBody)shadow.scale.set(1+physics.activity*.45,1+physics.activity*.45,1);
    renderer.render(scene,camera); needsRender=false;
  }
  if(introPhase==='ready'&&now-uiClock>1000){
    uiClock=now;
    if(!contacts.size&&!auto&&physics.activity>.003)announce('Letting go, very slowly.');
    else if(!contacts.size&&!auto&&physics.activity<=.003)announce('A small pause, just for you.');
  }
  frameHandle=requestAnimationFrame(animate);
}
function pause(){handMode.stop();clearGestures();sound.suspend();paused=true;cancelAnimationFrame(frameHandle);lastTime=0;}
window.addEventListener('blur',()=>{if(handMode.active||handMode.stream)handMode.stop();clearGestures();sound.suspend();});
window.addEventListener('pagehide',()=>handMode.stop());
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)pause();else if(paused){paused=false;lastTime=0;frameHandle=requestAnimationFrame(animate);}
});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('error').hidden=false;$('error').innerHTML='<strong>The graphics connection paused.</strong><p>Reload this page to bring your squishy back.</p>';$('squeeze').disabled=true;});
$('loading').hidden=true;
frameHandle=requestAnimationFrame(animate);
