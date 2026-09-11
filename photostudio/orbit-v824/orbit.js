/* Acabado 360°: map finished Frente/Espalda sheets onto the parametric mesh.
   Camera orbit matches Boceto 3D. Without WebGL, a touch turntable still works. */
const PHOTO_ORBIT_SOLIDS=new Set(['mannequin','metal','button','cord']);
const PHOTO_ORBIT_VERTEX=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUv;uniform mat4 uMVP;varying vec3 vPosition;varying vec3 vNormal;varying vec2 vUv;void main(){vPosition=aPosition;vNormal=aNormal;vUv=aUv;gl_Position=uMVP*vec4(aPosition,1.0);}`;
const PHOTO_ORBIT_FRAGMENT=`precision highp float;varying vec3 vPosition;varying vec3 vNormal;varying vec2 vUv;uniform sampler2D uFront;uniform sampler2D uBack;uniform vec3 uColor;uniform vec3 uEye;uniform vec3 uLight;uniform float uTextured;void main(){vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec4 frontT=texture2D(uFront,vUv);vec4 backT=texture2D(uBack,vec2(1.0-vUv.x,vUv.y));float face=smoothstep(-0.18,0.18,normalize(vNormal).z);vec4 tex=mix(backT,frontT,face);vec3 base=mix(uColor,tex.rgb,uTextured*clamp(tex.a*1.35,0.0,1.0));vec3 light=normalize(uLight);vec3 view=normalize(uEye-vPosition);float key=max(dot(n,light),0.0);float fill=max(dot(n,normalize(vec3(-1.0,.45,-.7))),0.0);float rim=pow(1.0-max(dot(n,view),0.0),3.0);float ao=.93+.07*clamp(vPosition.y+.7,0.0,1.0);vec3 rgb=(base*(.76+key*.20+fill*.08)+base*rim*.04)*ao;gl_FragColor=vec4(clamp(rgb,0.0,1.0),1.0);}`;
function photoOrbitGeomKey(){return JSON.stringify([state.garment,state.neck,state.cuff,state.hem,state.contrast,state.hood,state.pro.fit,state.pro.length,state.pro.sleeve,state.pro.folds,state.pro.mannequin,state.photoCut||'hombre'])}
function photoOrbitOpaqueBox(source){
  const src=source?source._canvas||source:null;
  if(!src||!src.width)return {u0:.08,u1:.92,v0:.08,v1:.90};
  try{
    const c=document.createElement('canvas');c.width=src.width;c.height=src.height;
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,0,0);
    const {width,height}=c,data=x.getImageData(0,0,width,height).data;
    let minX=width,minY=height,maxX=0,maxY=0;
    for(let y=0;y<height;y+=3)for(let x0=0;x0<width;x0+=3){if(data[(y*width+x0)*4+3]>18){minX=Math.min(minX,x0);maxX=Math.max(maxX,x0);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}
    if(maxX<=minX||maxY<=minY)return {u0:.08,u1:.92,v0:.08,v1:.90};
    const px=Math.max(2,(maxX-minX)*.02),py=Math.max(2,(maxY-minY)*.02);
    return {u0:Math.max(0,(minX-px)/width),u1:Math.min(1,(maxX+px)/width),v0:Math.max(0,(minY-py)/height),v1:Math.min(1,(maxY+py)/height)};
  }catch{return {u0:.08,u1:.92,v0:.08,v1:.90}}
}
function photoOrbitProjectiveUVs(meshes,uvBox){
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const m of meshes){
    if(PHOTO_ORBIT_SOLIDS.has(m.material))continue;
    for(let i=0;i<m.positions.length;i+=3){minX=Math.min(minX,m.positions[i]);maxX=Math.max(maxX,m.positions[i]);minY=Math.min(minY,m.positions[i+1]);maxY=Math.max(maxY,m.positions[i+1])}
  }
  const padX=(maxX-minX)*.02,padY=(maxY-minY)*.02;
  minX-=padX;maxX+=padX;minY-=padY;maxY+=padY;
  const box=uvBox||{u0:.08,u1:.92,v0:.08,v1:.90},spanX=maxX-minX||1,spanY=maxY-minY||1;
  for(const m of meshes){
    if(PHOTO_ORBIT_SOLIDS.has(m.material))continue;
    for(let i=0,u=0;i<m.positions.length;i+=3,u+=2){
      m.uvs[u]=box.u0+(m.positions[i]-minX)/spanX*(box.u1-box.u0);
      m.uvs[u+1]=box.v0+(maxY-m.positions[i+1])/spanY*(box.v1-box.v0);
    }
  }
  return {minY,maxY,minX,maxX};
}
function paintPhotoOrbitSheet(canvas,front,back,yaw,pitch,distance){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
  const facing=Math.cos(yaw),sheet=facing>=0?front:back;if(!sheet)return canvas;
  const squash=Math.max(.16,Math.abs(facing)),zoom=clamp(5.6/Math.max(distance||5.3,3.2),.72,1.35);
  const maxW=w*.78*zoom,maxH=h*.86*zoom,s=Math.min(maxW/sheet.width,maxH/sheet.height)*squash;
  const dw=sheet.width*s,dh=sheet.height*s*(1-Math.sin(Math.abs(pitch||0))*.08);
  const dx=(w-dw)/2+Math.sin(yaw)*w*.012,dy=(h-dh)/2-(pitch||0)*h*.12;
  ctx.save();
  ctx.shadowColor='#23314a28';ctx.shadowBlur=28;ctx.shadowOffsetY=h*.018;
  ctx.drawImage(sheet,dx,dy,dw,dh);
  ctx.restore();
  return canvas;
}
class PhotoOrbitRenderer{
  constructor(canvas){
    this.canvas=canvas;this.yaw=.32;this.pitch=.05;this.distance=5.3;this.pan=[0,0];
    this.spinning=false;this.lastTime=0;this.lost=false;this.meshes=[];this.sheets=[null,null];this.texturesReady=false;
    this.gl=null;
    try{this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true,premultipliedAlpha:false})}catch{}
    if(this.gl){this.buildProgram();this.frontTexture=this.createTexture();this.backTexture=this.createTexture();this.whiteTexture=this.createTexture()}
    this.configureInput();
    this.resizeObserver=new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(canvas);
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.spinning=false});
    canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;if(this.gl){this.buildProgram();this.frontTexture=this.createTexture();this.backTexture=this.createTexture();this.whiteTexture=this.createTexture();this.geometryKey=null;this.meshes=[];this.rebuild();if(this.sheets[0])this.setSheets(this.sheets)}});
    this.resize();
  }
  buildProgram(){
    const g=this.gl;if(!g)return;
    const shader=(type,source)=>{const s=g.createShader(type);g.shaderSource(s,source);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error('No se pudo iniciar el 360° de acabado.');return s};
    const vs=shader(g.VERTEX_SHADER,PHOTO_ORBIT_VERTEX),fs=shader(g.FRAGMENT_SHADER,PHOTO_ORBIT_FRAGMENT),program=g.createProgram();
    g.attachShader(program,vs);g.attachShader(program,fs);g.linkProgram(program);g.deleteShader(vs);g.deleteShader(fs);
    if(!g.getProgramParameter(program,g.LINK_STATUS))throw Error('El 360° de acabado no pudo iniciarse.');
    this.program=program;this.locations={};
    for(const name of['aPosition','aNormal','aUv'])this.locations[name]=g.getAttribLocation(program,name);
    for(const name of['uMVP','uFront','uBack','uColor','uEye','uLight','uTextured'])this.locations[name]=g.getUniformLocation(program,name);
    g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.disable(g.CULL_FACE);
  }
  createTexture(){
    const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);
    g.texImage2D(g.TEXTURE_2D,0,g.RGBA,1,1,0,g.RGBA,g.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
    g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);
    return t;
  }
  readSheetPixels(source){
    const src=source?source._canvas||source:null;if(!src||!src.width)return null;
    const read=ctx=>{
      if(!ctx||!ctx.getImageData)return null;
      const pixels=ctx.getImageData(0,0,src.width,src.height);let opaque=0;
      const d=pixels.data;for(let i=3;i<d.length;i+=32)if(d[i]>20)opaque++;
      return opaque>40?pixels:null;
    };
    try{const direct=src.getContext&&src.getContext('2d',{willReadFrequently:true});const hit=read(direct);if(hit)return {pixels:hit,w:src.width,h:src.height}}catch{}
    try{
      const stage=document.createElement('canvas');stage.width=src.width;stage.height=src.height;
      const x=stage.getContext('2d',{willReadFrequently:true});x.drawImage(src,0,0);
      const hit=read(x);if(hit)return {pixels:hit,w:src.width,h:src.height};
    }catch{}
    return null;
  }
  setTexture(texture,source){
    if(!this.gl||!source)return false;
    const g=this.gl,src=source._canvas||source,pack=this.readSheetPixels(source);
    try{
      g.bindTexture(g.TEXTURE_2D,texture);
      g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);
      g.pixelStorei(g.UNPACK_ALIGNMENT,1);
      if(pack)g.texImage2D(g.TEXTURE_2D,0,g.RGBA,pack.w,pack.h,0,g.RGBA,g.UNSIGNED_BYTE,pack.pixels.data);
      else g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,src);
      g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);
      g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);
      return !!pack;
    }catch{return false}
  }
  setSheets(sheets){
    this.sheets=sheets||[null,null];
    this.uvBox=photoOrbitOpaqueBox(this.sheets[0]);
    this.geometryKey=null;
    this.texturesReady=false;
    if(this.gl&&!this.lost){
      const frontOk=this.setTexture(this.frontTexture,this.sheets[0]);
      const backOk=this.setTexture(this.backTexture,this.sheets[1]);
      this.texturesReady=frontOk||backOk;
      this.rebuild();
    }
    this.render();
  }
  rebuild(){
    if(!this.gl||this.lost)return;
    const key=photoOrbitGeomKey()+'|'+JSON.stringify(this.uvBox||null);
    if(key===this.geometryKey&&this.meshes.length)return;
    this.geometryKey=key;
    const gl=this.gl;for(const m of this.meshes)for(const b of[m.pos,m.normal,m.uv,m.index])if(b)gl.deleteBuffer(b);
    const data=garmentGeometry(state);const box=photoOrbitProjectiveUVs(data,this.uvBox);
    this.centerY=(box.minY+box.maxY)/2;this.frameScale=Math.max(1,(box.maxY-box.minY)/2.35,(box.maxX-box.minX)/2.25);
    this.meshes=data.map(mesh=>{
      const buffer=(values,type,target)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,new type(values),gl.STATIC_DRAW);return b};
      return {...mesh,pos:buffer(mesh.positions,Float32Array,gl.ARRAY_BUFFER),normal:buffer(mesh.normals,Float32Array,gl.ARRAY_BUFFER),uv:buffer(mesh.uvs,Float32Array,gl.ARRAY_BUFFER),index:buffer(mesh.indices,Uint16Array,gl.ELEMENT_ARRAY_BUFFER)};
    });
  }
  resize(){
    const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height){this.render();return}
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));
    if(this.canvas.width!==w)this.canvas.width=w;if(this.canvas.height!==h)this.canvas.height=h;
    this.render();
  }
  camera(width=this.canvas.width,height=this.canvas.height){
    const focus=this.centerY??.15,dist=this.distance*(this.frameScale||1)*Math.max(1,.85/Math.max(width/Math.max(height,1),.4));
    const target=[this.pan[0],focus+this.pan[1],0],eye=[target[0]+Math.sin(this.yaw)*Math.cos(this.pitch)*dist,target[1]+Math.sin(this.pitch)*dist,target[2]+Math.cos(this.yaw)*Math.cos(this.pitch)*dist];
    const projection=perspective4(37*Math.PI/180,Math.max(width,1)/Math.max(height,1),.1,50),view=lookAt4(eye,target);
    return {eye,mvp:multiply4(projection,view)};
  }
  render(){
    this.syncAngle();
    if(!this.gl||this.lost||!this.program||!this.texturesReady){paintPhotoOrbitSheet(this.canvas,this.sheets[0],this.sheets[1],this.yaw,this.pitch,this.distance);return}
    this.rebuild();
    const gl=this.gl,L=this.locations,c=this.camera();
    gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);gl.uniformMatrix4fv(L.uMVP,false,c.mvp);gl.uniform3fv(L.uEye,c.eye);
    gl.uniform3fv(L.uLight,[-2,3,4]);gl.uniform1i(L.uFront,0);gl.uniform1i(L.uBack,1);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.frontTexture);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.backTexture);
    for(const m of this.meshes){
      for(const [attr,b,size]of[['aPosition',m.pos,3],['aNormal',m.normal,3],['aUv',m.uv,2]]){gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(L[attr]);gl.vertexAttribPointer(L[attr],size,gl.FLOAT,false,0,0)}
      const textured=!PHOTO_ORBIT_SOLIDS.has(m.material);
      let color=state.bodyColor;
      if(m.material==='contrast')color=state.contrastColor;
      if(m.material==='cord')color='#dfdfd8';
      if(m.material==='button')color='#e0e1df';
      if(m.material==='metal')color='#959fa5';
      if(m.material==='mannequin')color='#858b92';
      gl.uniform3fv(L.uColor,parseColor(color).map(v=>v/255));
      gl.uniform1f(L.uTextured,textured?1:0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.index);
      gl.drawElements(gl.TRIANGLES,m.indices.length,gl.UNSIGNED_SHORT,0);
    }
  }
  preset(view){
    const values={front:0,back:Math.PI,left:Math.PI/2,right:-Math.PI/2,perspective:.32};
    this.yaw=values[view]??.32;this.pitch=view==='perspective'?.05:0;this.pan=[0,0];this.distance=5.3;this.render();
  }
  syncAngle(){const el=$('#photoOrbitAngle');if(el)el.textContent='Giro '+Math.round(((this.yaw*180/Math.PI)%360+360)%360)+'°'}
  configureInput(){
    const canvas=this.canvas,pointers=new Map();let last=null,pinch=null;
    canvas.addEventListener('pointerdown',e=>{canvas.focus();pointers.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);last=[e.clientX,e.clientY];if(pointers.size===2){const a=[...pointers.values()];pinch=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])}canvas.classList.add('orbiting')});
    canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const a=[...pointers.values()],distance=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);if(pinch&&distance)this.distance=clamp(this.distance*pinch/distance,3.2,10);pinch=distance}else if(last){const dx=e.clientX-last[0],dy=e.clientY-last[1];if(e.shiftKey||e.buttons===2){this.pan[0]-=dx*.003;this.pan[1]+=dy*.003}else{this.yaw-=dx*.008;this.pitch=clamp(this.pitch+dy*.006,-.85,.85)}}last=[e.clientX,e.clientY];this.render()});
    const finish=e=>{pointers.delete(e.pointerId);pinch=null;last=null;canvas.classList.remove('orbiting')};
    canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=clamp(this.distance*Math.exp(e.deltaY*.001),3.2,10);this.render()},{passive:false});
    canvas.addEventListener('keydown',e=>{const action={ArrowLeft:()=>this.yaw-=.12,ArrowRight:()=>this.yaw+=.12,ArrowUp:()=>this.pitch=clamp(this.pitch+.1,-.85,.85),ArrowDown:()=>this.pitch=clamp(this.pitch-.1,-.85,.85),'+':()=>this.distance=Math.max(3.2,this.distance-.3),'=':()=>this.distance=Math.max(3.2,this.distance-.3),'-':()=>this.distance=Math.min(10,this.distance+.3),Home:()=>this.preset('perspective')}[e.key];if(action){e.preventDefault();action();this.render()}});
  }
  toggleSpin(){
    this.spinning=!this.spinning;
    const btn=$('#photoOrbitSpin');if(btn)btn.setAttribute('aria-pressed',this.spinning);
    const tick=time=>{if(!this.spinning)return;if(!document.hidden){this.yaw+=(Math.min(time-(this.lastTime||time),40))*.00028;this.render()}this.lastTime=time;requestAnimationFrame(tick)};
    if(this.spinning){this.lastTime=0;requestAnimationFrame(tick)}
  }
  stopSpin(){if(!this.spinning)return;this.spinning=false;const btn=$('#photoOrbitSpin');if(btn)btn.setAttribute('aria-pressed','false')}
}
let photoOrbit=null,photoOrbitSheets=null,photoOrbitReady=false;
function livePhotoSheets(){
  if(photoOrbitSheets?.[0]&&photoOrbitSheets?.[1])return photoOrbitSheets;
  const front=$('#photoFront'),back=$('#photoBack');
  return front&&back?[front,back]:photoOrbitSheets;
}
async function afterPhotoSheets(canvases){
  photoOrbitSheets=canvases;
  const front=$('#photoFront'),back=$('#photoBack');
  const sheets=front&&back&&front.width?[front,back]:canvases;
  if(photoOrbit)photoOrbit.setSheets(sheets);
}
function syncPhotoOrbitUI(){
  const stage=$('#photoStage'),orbit=$('#photoOrbit');if(!stage||!orbit)return;
  const on=ensurePhoto().side==='orbit';
  orbit.hidden=!on;
  if(on){
    const issues=photoIssues();
    $('#photoOrigin').textContent=ensurePhoto().source==='final'?'Render cargado · gira el acabado terminado':'Acabado 360° · color, tela y logos de la prenda terminada';
    if(!issues.length)$('#photoStatus').textContent='Arrastra para girar el acabado · Frente y Comparar siguen disponibles';
    if(photoOrbit){
      if(!photoOrbit.sheets[0]){const sheets=livePhotoSheets();if(sheets)photoOrbit.setSheets(sheets)}
      photoOrbit.resize();
    }
  }else if(photoOrbit)photoOrbit.stopSpin();
}
function initPhotoOrbit(){
  if(photoOrbitReady||!$('#photoOrbitCanvas'))return;
  photoOrbitReady=true;
  photoOrbit=new PhotoOrbitRenderer($('#photoOrbitCanvas'));
  if(photoOrbitSheets)photoOrbit.setSheets(photoOrbitSheets);
  $('#photoOrbitSpin').addEventListener('click',()=>photoOrbit?.toggleSpin());
  $('#photoOrbitFit').addEventListener('click',()=>photoOrbit?.preset('perspective'));
  syncPhotoOrbitUI();
}
const syncPhotoUIBeforeOrbit=syncPhotoUI;
syncPhotoUI=function(){syncPhotoUIBeforeOrbit();syncPhotoOrbitUI()};
const initPhotoBeforeOrbit=initPhoto;
initPhoto=function(){initPhotoBeforeOrbit();initPhotoOrbit()};
