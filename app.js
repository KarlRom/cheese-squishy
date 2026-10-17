import * as THREE from './vendor/three.module.js';
import { SquishyMaterial } from './physics.js';
import { makeSqueeze } from './squeezes.js';
import { SquishySound } from './sound.js?v=1.3.0';
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
const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
const homeView = {theta: .635, phi: 1.16};
const view = {...homeView, radius: 7.8};
let interactionMode='squish', orbitPointer=null;
function turnView(dx=0,dy=0) {
  view.theta -= dx; view.phi = THREE.MathUtils.clamp(view.phi-dy,.12,Math.PI-.12);
  camera.position.setFromSphericalCoords(view.radius,view.phi,view.theta);
  camera.lookAt(0,0,0); camera.updateMatrixWorld();
  canvas.dataset.view = `${view.theta.toFixed(3)},${view.phi.toFixed(3)}`;
  needsRender=true;
}
function resetView() {view.theta=homeView.theta;view.phi=homeView.phi;turnView();}
turnView();
scene.add(new THREE.HemisphereLight(0xfff9e9, 0xd6bd8a, 1.0));
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
const geometry = makeCheese(matchMedia('(max-width: 600px)').matches ? 64 : 80);
const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: .28, metalness: 0, clearcoat: .30, clearcoatRoughness: .30, envMapIntensity: .65 });
const mesh = new THREE.Mesh(geometry, material);
// A generous static bound covers every valid drag without per-frame bounds scans.
geometry.boundingSphere.radius = 3.2;
mesh.castShadow=true; mesh.receiveShadow=true;
scene.add(mesh);
const rest = geometry.attributes.position.array.slice();
const restNormals = geometry.attributes.normal.array.slice();
const physics = new SquishyMaterial(rest);

// A feathered contact shadow on white. It never tints the page background.
const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 256;
const ctx = shadowCanvas.getContext('2d');
const gradient = ctx.createRadialGradient(128,128,8,128,128,124);
gradient.addColorStop(0,'rgba(83,62,21,.23)'); gradient.addColorStop(.4,'rgba(83,62,21,.13)'); gradient.addColorStop(1,'rgba(83,62,21,0)');
ctx.fillStyle = gradient; ctx.fillRect(0,0,256,256);
const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.3,3.7),new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false }));
shadow.rotation.x = -Math.PI/2; shadow.position.set(.1,-1.055,.05); scene.add(shadow);

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
let pinch = null, pinchStart = null, squeezeUntil = 0, heldKey = false, keyboardPoint = [0,.12,1];
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
  if (contacts.size >= 4 || orbitPointer || event.button > 2 || event.button===1) return;
  setRay(event.clientX,event.clientY);
  const hit = raycaster.intersectObject(mesh)[0];
  if(interactionMode==='rotate'||event.shiftKey||event.button===2||!hit){
    if(contacts.size)return;
    event.preventDefault(); canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);
    orbitPointer={id:event.pointerId,x:event.clientX,y:event.clientY};
    announce('Turn it over. Find a new soft spot.'); return;
  }
  void unlockSound();
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
  contacts.set(event.pointerId,{ point: anchor.toArray(), normal: normal.toArray(), drag: [0,0,0], radius: event.pointerType==='mouse'?.50:.59,
    depth: .1, pressure: event.pressure, started: performance.now(), start: hit.point.clone(), plane, x: event.clientX,y: event.clientY });
  updatePinch(true); announce('Let it melt into your fingers.');
}
function moveContact(event) {
  if(orbitPointer?.id===event.pointerId){
    event.preventDefault();
    const scale=2*Math.PI/Math.max(320,Math.min(stage.clientWidth,stage.clientHeight)*1.8);
    turnView((event.clientX-orbitPointer.x)*scale,(event.clientY-orbitPointer.y)*scale);
    orbitPointer.x=event.clientX;orbitPointer.y=event.clientY;return;
  }
  const c = contacts.get(event.pointerId); if (!c) return;
  event.preventDefault();
  const moveTime=performance.now();
  sound.drag(Math.hypot(event.clientX-c.x,event.clientY-c.y)/Math.max(.008,(moveTime-(c.moveTime||c.started))/1000));
  c.moveTime=moveTime; c.x=event.clientX; c.y=event.clientY; c.pressure=event.pressure;
  setRay(event.clientX,event.clientY);
  const p = raycaster.ray.intersectPlane(c.plane,new THREE.Vector3());
  if (p) c.drag = p.sub(c.start).clampLength(0,.72).multiplyScalar(.72).toArray();
  updatePinch(false);
}
function updatePinch(start) {
  if (contacts.size < 2) { pinch = null; pinchStart = null; return; }
  const [a,b] = [...contacts.values()];
  const dx=b.x-a.x, dy=b.y-a.y, distance=Math.hypot(dx,dy);
  if (start || !pinchStart) pinchStart=Math.max(distance,40);
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
  const axis = right.multiplyScalar(dx).addScaledVector(up,-dy).normalize().toArray();
  pinch={axis,amount:THREE.MathUtils.clamp(1-distance/pinchStart,0,.65)};
}
function endContact(event) {
  if(orbitPointer?.id===event.pointerId){
    orbitPointer=null;
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    return;
  }
  if (!contacts.delete(event.pointerId)) return;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  updatePinch(true);
  if (!contacts.size) announce('Letting go, very slowly.');
}
canvas.addEventListener('pointerdown',beginContact);
// A click/touch-end retry covers browsers that do not unlock audio on pointer-down.
canvas.addEventListener('click',()=>{void unlockSound();});
canvas.addEventListener('pointermove',moveContact);
for (const type of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(type,endContact);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function squeeze() {
  void unlockSound();
  // Anchor local presses to the face nearest the current camera angle.
  const viewNormal=camera.position.clone().normalize();
  const axis=[Math.abs(viewNormal.x),Math.abs(viewNormal.y),Math.abs(viewNormal.z)];
  const dominant=axis.indexOf(Math.max(...axis));
  const normal=new THREE.Vector3().setComponent(dominant,Math.sign(viewNormal.getComponent(dominant)));
  const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
  right.addScaledVector(normal,-right.dot(normal)).normalize();
  const up=new THREE.Vector3().crossVectors(normal,right).normalize();
  const profile=makeSqueeze(squeezeIndex++,{normal:normal.toArray(),right:right.toArray(),up:up.toArray()});
  buttonGesture={profile,started:performance.now()};
  $('squeeze').dataset.squeeze=profile.name;
  announce(profile.name+'.');
}
$('squeeze').addEventListener('click',squeeze);
function reset() {
  clearGestures(); resetView();
  sound.silence();
  for (const id of contacts.keys()) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  contacts.clear(); pinch=null; pinchStart=null; heldKey=false; squeezeUntil=0;
  physics.reset(); physics.writePositions(geometry.attributes.position.array);
  geometry.attributes.position.needsUpdate=true; geometry.computeVertexNormals();
  needsRender=true; announce('Fresh cheese. Fresh start.');
}
$('reset').addEventListener('click',reset);
canvas.addEventListener('keydown',event=>{
  if (event.code==='Space'||event.key==='Enter') { event.preventDefault(); if (!event.repeat) { void unlockSound(); heldKey=true; announce('A good, slow squeeze.'); } }
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
canvas.addEventListener('keyup',event=>{ if (event.code==='Space'||event.key==='Enter') {event.preventDefault();heldKey=false;} });
canvas.addEventListener('blur',()=>{heldKey=false;});
function clearGestures(){
  const ids=[...contacts.keys()];if(orbitPointer)ids.push(orbitPointer.id);
  contacts.clear();orbitPointer=null;pinch=null;pinchStart=null;heldKey=false;squeezeUntil=0;buttonGesture=null;sound.silence();
  for(const id of ids)if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
}
function setMode(mode){
  clearGestures();interactionMode=mode;
  $('mode-squish').setAttribute('aria-pressed',String(mode==='squish'));
  $('mode-rotate').setAttribute('aria-pressed',String(mode==='rotate'));
  $('view-buttons').hidden=mode!=='rotate';
  stage.classList.toggle('rotating',mode==='rotate');
  $('gesture-help').textContent=mode==='rotate'?'Drag to turn · Use arrows to explore every side':'Press & hold · Drag to stretch · Pinch to squeeze';
  canvas.setAttribute('aria-label',mode==='rotate'?'Rotatable 3D cheese cube. Drag or use arrow keys to turn it. Switch to Squish to press the visible faces.':'Interactive 3D cheese cube. Press and drag to dent it, or pinch with two fingers. Hold Space to squeeze, use arrow keys to move the press, and R to reset. Drag the white space to turn the view.');
  announce(mode==='rotate'?'Drag to turn the cheese.':'Ready for a little squeeze.');
}
$('mode-squish').addEventListener('click',()=>setMode('squish'));
$('mode-rotate').addEventListener('click',()=>setMode('rotate'));
for(const [id,dx,dy] of [['view-left',-.45,0],['view-right',.45,0],['view-up',0,.3],['view-down',0,-.3]]){
  $(id).addEventListener('click',()=>{clearGestures();turnView(dx,dy);});
}
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
  const active=[...contacts.values()];
  for(const c of active) {
    const held=Math.min((now-c.started)/1000,1.8);
    c.depth=.24+.39*(1-Math.exp(-held*2)) + Math.max(0,(c.pressure||.5)-.5)*.25;
  }
  const keyboardAuto=now<squeezeUntil||heldKey;
  if(keyboardAuto)active.push({point:keyboardPoint,normal:[0,0,1],drag:[0,-.10,0],radius:.62,depth:.38});
  if(buttonGesture&&now-buttonGesture.started>=buttonGesture.profile.duration)buttonGesture=null;
  let autoPinch=null,autoSquash=keyboardAuto&&!reducedMotion?.72:0;
  if(buttonGesture){
    const {profile,started}=buttonGesture;
    const amount=.2+.8*(1-Math.exp(-(now-started)/170));
    for(const c of profile.contacts)active.push({...c,depth:c.depth*amount,drag:c.drag.map(v=>v*amount)});
    if(!reducedMotion){
      autoPinch=profile.pinch?{axis:profile.pinch.axis,amount:profile.pinch.amount*amount}:null;
      autoSquash+=profile.squeeze*amount;
    }
  }
  const auto=keyboardAuto||!!buttonGesture;
  const effectivePinch=pinch||autoPinch;
  const soundLoad=active.reduce((sum,c)=>sum+c.depth,0)+autoSquash*.3;
  sound.update(dt,soundLoad,effectivePinch?.amount||0);
  if(active.length||effectivePinch||physics.activity>.00002) {
    physics.step(dt,active,effectivePinch,autoSquash);
    if(!active.length&&!effectivePinch&&physics.activity<=.00002)physics.reset();
    physics.writePositions(geometry.attributes.position.array);
    geometry.attributes.position.needsUpdate=true; geometry.computeVertexNormals();
    needsRender=true;
  }
  if(needsRender){
    shadow.scale.set(1+physics.activity*.45,1+physics.activity*.45,1);
    renderer.render(scene,camera); needsRender=false;
  }
  if(now-uiClock>1000){
    uiClock=now;
    if(!contacts.size&&!auto&&physics.activity>.003)announce('Letting go, very slowly.');
    else if(!contacts.size&&!auto&&physics.activity<=.003)announce('A small pause, just for you.');
  }
  frameHandle=requestAnimationFrame(animate);
}
function pause(){clearGestures();sound.suspend();paused=true;cancelAnimationFrame(frameHandle);lastTime=0;}
window.addEventListener('blur',()=>{clearGestures();sound.suspend();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)pause();else{paused=false;lastTime=0;frameHandle=requestAnimationFrame(animate);}
});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('error').hidden=false;$('error').innerHTML='<strong>The graphics connection paused.</strong><p>Reload this page to bring your cheese back.</p>';$('squeeze').disabled=true;});
$('loading').hidden=true;
frameHandle=requestAnimationFrame(animate);
