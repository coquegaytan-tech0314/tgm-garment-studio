/* Acabado 360°: inspect the finished Frente/Espalda sheets on a touch turntable.
   Photoreal fabric/logos stay on the 2D sheets. Mapping those photos onto the
   Boceto 3D parametric mesh warps logos and Chifón detail, so this view does
   not use that plastic mesh. Frente / Espalda / Comparar stay flat. */
function photoOrbitDepth(){
  return state.garment==='hoodie'?0.38:state.garment==='sleeveless'?0.26:state.garment==='zipneck'?0.32:0.30;
}
function photoOrbitOpaqueBox(source){
  const src=source?source._canvas||source:null;
  if(!src||!src.width)return {u0:.08,u1:.92,v0:.08,v1:.90};
  if(src._orbitBox&&src._orbitBox.w===src.width&&src._orbitBox.h===src.height)return src._orbitBox;
  const fallback={u0:.08,u1:.92,v0:.08,v1:.90,w:src.width,h:src.height};
  try{
    let data,width=src.width,height=src.height;
    try{data=src.getContext('2d',{willReadFrequently:true}).getImageData(0,0,width,height).data}catch{
      const c=document.createElement('canvas');c.width=width;c.height=height;
      const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,0,0);
      data=x.getImageData(0,0,width,height).data;
    }
    let minX=width,minY=height,maxX=0,maxY=0;
    for(let y=0;y<height;y+=4)for(let x0=0;x0<width;x0+=4){if(data[(y*width+x0)*4+3]>18){minX=Math.min(minX,x0);maxX=Math.max(maxX,x0);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}
    if(maxX<=minX||maxY<=minY){src._orbitBox=fallback;return fallback}
    const px=Math.max(2,(maxX-minX)*.02),py=Math.max(2,(maxY-minY)*.02);
    src._orbitBox={u0:Math.max(0,(minX-px)/width),u1:Math.min(1,(maxX+px)/width),v0:Math.max(0,(minY-py)/height),v1:Math.min(1,(maxY+py)/height),w:width,h:height};
    return src._orbitBox;
  }catch{return fallback}
}
function photoOrbitProjectiveUVs(meshes,uvBox){
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const m of meshes||[]){
    for(let i=0;i<(m.positions||[]).length;i+=3){minX=Math.min(minX,m.positions[i]);maxX=Math.max(maxX,m.positions[i]);minY=Math.min(minY,m.positions[i+1]);maxY=Math.max(maxY,m.positions[i+1])}
  }
  if(!Number.isFinite(minX))return {minX:0,maxX:1,minY:0,maxY:1};
  const padX=(maxX-minX)*.02,padY=(maxY-minY)*.02;
  minX-=padX;maxX+=padX;minY-=padY;maxY+=padY;
  const box=uvBox||{u0:.08,u1:.92,v0:.08,v1:.90},spanX=maxX-minX||1,spanY=maxY-minY||1;
  for(const m of meshes||[]){
    if(!m.uvs||!m.positions)continue;
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
  const sheet=front||back;if(!sheet)return canvas;
  const zoom=clamp(5.6/Math.max(distance||5.3,3.2),.72,1.35);
  const box=photoOrbitOpaqueBox(front||back);
  const srcW=Math.max(1,(box.u1-box.u0)*sheet.width),srcH=Math.max(1,(box.v1-box.v0)*sheet.height);
  const maxW=w*.82*zoom,maxH=h*.88*zoom,base=Math.min(maxW/srcW,maxH/srcH);
  const pitchAbs=Math.abs(pitch||0);
  const dw=srcW*base,dh=srcH*base*(1-Math.sin(pitchAbs)*.1);
  const rx=dw/2,rz=rx*photoOrbitDepth();
  const cx=w/2+Math.sin(yaw)*w*.01,dy=(h-dh)/2-(pitch||0)*h*.11;
  ctx.save();
  ctx.shadowColor='#1c283c33';ctx.shadowBlur=Math.max(16,h*.03);ctx.shadowOffsetY=h*.02;
  ctx.fillStyle='#0000';
  ctx.beginPath();ctx.ellipse(cx,dy+dh*.96,Math.max(24,rx*.55+rz*.2),Math.max(8,dh*.035),0,0,Math.PI*2);ctx.fill();
  ctx.restore();
  ctx.save();
  const vanish=Math.sin(pitch||0)*.07;
  ctx.setTransform(1,0,vanish*.15,1-pitchAbs*.05,0,(pitch||0)*h*.015);
  const slices=80;
  for(const [src,phase] of [[front,0],[back,Math.PI]]){
    if(!src)continue;
    const crop=photoOrbitOpaqueBox(src);
    const sx0=crop.u0*src.width,sw=Math.max(1,(crop.u1-crop.u0)*src.width);
    const sy0=crop.v0*src.height,sh=Math.max(1,(crop.v1-crop.v0)*src.height);
    for(let i=0;i<slices;i++){
      const u0=i/slices,u1=(i+1)/slices,mid=(u0+u1)/2;
      const view=(mid-.5)*Math.PI+phase-yaw;
      const facing=Math.cos(view);
      if(facing<=.025)continue;
      const x=cx+Math.sin(view)*rx;
      const sliceW=Math.max(.7,Math.abs(Math.cos(view))*rx*Math.PI/slices);
      const srcX=sx0+sw*u0,srcSlice=Math.max(1,sw/slices);
      ctx.globalAlpha=Math.min(1,.35+facing*.75);
      ctx.drawImage(src,srcX,sy0,srcSlice,sh,x-sliceW/2,dy,sliceW+.85,dh);
    }
  }
  ctx.globalAlpha=1;
  ctx.globalCompositeOperation='source-atop';
  const light=ctx.createLinearGradient(cx-rx,0,cx+rx,0);
  const left=Math.max(0,Math.sin(yaw)),right=Math.max(0,-Math.sin(yaw));
  light.addColorStop(0,'rgba(28,38,52,'+(0.16+left*.1)+')');
  light.addColorStop(.5,'rgba(255,255,255,0)');
  light.addColorStop(1,'rgba(28,38,52,'+(0.16+right*.1)+')');
  ctx.fillStyle=light;ctx.fillRect(cx-rx-10,dy-8,rx*2+20,dh+16);
  const rim=ctx.createLinearGradient(0,dy,0,dy+dh);
  rim.addColorStop(0,'rgba(255,255,255,.08)');
  rim.addColorStop(.55,'rgba(255,255,255,0)');
  rim.addColorStop(1,'rgba(20,28,40,.10)');
  ctx.fillStyle=rim;ctx.fillRect(cx-rx-10,dy-8,rx*2+20,dh+16);
  ctx.restore();
  return canvas;
}
class PhotoOrbitRenderer{
  constructor(stage,flat){
    this.stage=stage;this.canvas=flat;this.yaw=.32;this.pitch=.05;this.distance=5.3;this.pan=[0,0];
    this.spinning=false;this.coasting=false;this.velocity=0;this.lastTime=0;this.sheets=[null,null];
    this.configureInput();
    this.resizeObserver=new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(stage);
    this.resize();
  }
  setSheets(sheets){
    this.sheets=sheets||[null,null];
    this.render();
  }
  resize(){
    const rect=this.stage.getBoundingClientRect();if(!rect.width||!rect.height){this.render();return}
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));
    if(this.canvas.width!==w)this.canvas.width=w;if(this.canvas.height!==h)this.canvas.height=h;
    this.render();
  }
  syncMode(){if(this.stage)this.stage.dataset.mode='flat'}
  render(){
    this.syncAngle();this.syncMode();
    paintPhotoOrbitSheet(this.canvas,this.sheets[0],this.sheets[1],this.yaw,this.pitch,this.distance);
  }
  preset(view){
    const values={front:0,back:Math.PI,left:Math.PI/2,right:-Math.PI/2,perspective:.32};
    this.yaw=values[view]??.32;this.pitch=view==='perspective'?.05:0;this.pan=[0,0];this.distance=5.3;this.velocity=0;this.coasting=false;this.render();
  }
  syncAngle(){const el=$('#photoOrbitAngle');if(el)el.textContent='Giro '+Math.round(((this.yaw*180/Math.PI)%360+360)%360)+'°'}
  configureInput(){
    const surface=this.stage,pointers=new Map();let last=null,pinch=null,lastMove=0;
    surface.addEventListener('pointerdown',e=>{this.canvas.focus();this.coasting=false;this.velocity=0;pointers.set(e.pointerId,[e.clientX,e.clientY]);surface.setPointerCapture(e.pointerId);last=[e.clientX,e.clientY];lastMove=performance.now();if(pointers.size===2){const a=[...pointers.values()];pinch=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])}surface.classList.add('orbiting')});
    surface.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const a=[...pointers.values()],distance=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);if(pinch&&distance)this.distance=clamp(this.distance*pinch/distance,3.2,10);pinch=distance;this.velocity=0}else if(last){const now=performance.now(),dx=e.clientX-last[0],dy=e.clientY-last[1],dt=Math.max(8,now-lastMove);if(e.shiftKey||e.buttons===2){this.pan[0]-=dx*.003;this.pan[1]+=dy*.003;this.velocity=0}else{this.yaw-=dx*.007;this.pitch=clamp(this.pitch+dy*.0055,-.85,.85);this.velocity=-dx*.007*(16/dt)}lastMove=now}last=[e.clientX,e.clientY];this.render()});
    const finish=e=>{
      pointers.delete(e.pointerId);pinch=null;last=null;surface.classList.remove('orbiting');
      if(!pointers.size&&!this.spinning&&Math.abs(this.velocity)>.004)this.startCoast();
    };
    surface.addEventListener('pointerup',finish);surface.addEventListener('pointercancel',finish);surface.addEventListener('lostpointercapture',finish);
    surface.addEventListener('contextmenu',e=>e.preventDefault());
    surface.addEventListener('wheel',e=>{e.preventDefault();this.distance=clamp(this.distance*Math.exp(e.deltaY*.001),3.2,10);this.render()},{passive:false});
    this.canvas.addEventListener('keydown',e=>{const action={ArrowLeft:()=>this.yaw-=.1,ArrowRight:()=>this.yaw+=.1,ArrowUp:()=>this.pitch=clamp(this.pitch+.1,-.85,.85),ArrowDown:()=>this.pitch=clamp(this.pitch-.1,-.85,.85),'+':()=>this.distance=Math.max(3.2,this.distance-.3),'=':()=>this.distance=Math.max(3.2,this.distance-.3),'-':()=>this.distance=Math.min(10,this.distance+.3),Home:()=>this.preset('perspective')}[e.key];if(action){e.preventDefault();this.coasting=false;this.velocity=0;action();this.render()}});
  }
  startCoast(){
    if(this.coasting||this.spinning)return;
    this.coasting=true;
    const tick=time=>{
      if(!this.coasting||this.spinning)return;
      if(!document.hidden){
        const dt=Math.min(time-(this.lastTime||time),40);
        this.yaw+=this.velocity*(dt/16);
        this.velocity*=Math.pow(.92,dt/16);
        this.render();
        if(Math.abs(this.velocity)<.0012){this.coasting=false;this.velocity=0;return}
      }
      this.lastTime=time;requestAnimationFrame(tick);
    };
    this.lastTime=0;requestAnimationFrame(tick);
  }
  toggleSpin(){
    this.spinning=!this.spinning;this.coasting=false;this.velocity=0;
    const btn=$('#photoOrbitSpin');if(btn)btn.setAttribute('aria-pressed',this.spinning);
    const tick=time=>{if(!this.spinning)return;if(!document.hidden){this.yaw+=(Math.min(time-(this.lastTime||time),40))*.00032;this.render()}this.lastTime=time;requestAnimationFrame(tick)};
    if(this.spinning){this.lastTime=0;requestAnimationFrame(tick)}
  }
  stopSpin(){if(!this.spinning)return;this.spinning=false;this.coasting=false;this.velocity=0;const btn=$('#photoOrbitSpin');if(btn)btn.setAttribute('aria-pressed','false')}
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
    $('#photoOrigin').textContent=ensurePhoto().source==='final'?'Render cargado · gira el acabado terminado':'Acabado 360° · tela, color y logos de la prenda terminada';
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
  photoOrbit=new PhotoOrbitRenderer($('#photoOrbit'),$('#photoOrbitCanvas'));
  if(photoOrbitSheets)photoOrbit.setSheets(photoOrbitSheets);
  $('#photoOrbitSpin').addEventListener('click',()=>photoOrbit?.toggleSpin());
  $('#photoOrbitFit').addEventListener('click',()=>photoOrbit?.preset('perspective'));
  syncPhotoOrbitUI();
}
const syncPhotoUIBeforeOrbit=syncPhotoUI;
syncPhotoUI=function(){syncPhotoUIBeforeOrbit();syncPhotoOrbitUI()};
const initPhotoBeforeOrbit=initPhoto;
initPhoto=function(){initPhotoBeforeOrbit();initPhotoOrbit()};
