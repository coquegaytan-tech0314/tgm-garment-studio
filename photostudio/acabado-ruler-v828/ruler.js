/* Acabado placement rulers: garment-relative cm + inches while dragging/selecting.
   Vertical origin is HPS (high point shoulder / unión cuello-cuerpo), not the collar tip. */
const CM_PER_INCH=2.54;
const HPS_ORIGIN_NOTE='HPS · unión cuello-cuerpo (el cuello no cuenta)';
const HPS_CANVAS_LABEL='HPS · sin cuello';
const PLACEMENT_GUIDES={
  /* neckV = HPS (collar–body seam at the shoulders). collarTipV is the standing/rib tip, excluded. */
  playera:{chestCm:52,lengthCm:70,neckV:.055,collarTipV:.012,hemV:.955,leftU:.205,rightU:.795,hpsLeftU:.36,hpsRightU:.64},
  polo:{chestCm:52,lengthCm:72,neckV:.102,collarTipV:.018,hemV:.955,leftU:.20,rightU:.81,hpsLeftU:.36,hpsRightU:.64},
  hoodie:{chestCm:56,lengthCm:70,neckV:.200,collarTipV:.012,hemV:.905,leftU:.22,rightU:.78,hpsLeftU:.30,hpsRightU:.70},
  sleeveless:{chestCm:46,lengthCm:66,neckV:.020,collarTipV:.010,hemV:.94,leftU:.30,rightU:.70,hpsLeftU:.27,hpsRightU:.73},
  sleevelessMujer:{chestCm:42,lengthCm:60,neckV:.022,collarTipV:.011,hemV:.94,leftU:.32,rightU:.68,hpsLeftU:.24,hpsRightU:.76},
  zipneck:{chestCm:52,lengthCm:70,neckV:.032,collarTipV:.011,hemV:.95,leftU:.22,rightU:.78,hpsLeftU:.36,hpsRightU:.64}
};
let photoRulerOn=true,photoDragLive=false,photoRulerPaint=0,photoLiveTimer=0;
function inchesFromCm(cm){return Number(cm)/CM_PER_INCH}
function cmFromInches(inches){return Number(inches)*CM_PER_INCH}
function roundPlacement(value){return Math.round(Number(value)*10)/10}
function formatCm(cm){return roundPlacement(cm).toFixed(1)+' cm'}
function formatIn(cm){return roundPlacement(inchesFromCm(cm)).toFixed(1)+' in'}
function formatDual(cm){return formatCm(cm)+' / '+formatIn(cm)}
function placementGuideKey(){return typeof photoAssetKey==='function'?photoAssetKey():state.garment}
function placementGuide(){return PLACEMENT_GUIDES[placementGuideKey()]||PLACEMENT_GUIDES[state.garment]||PLACEMENT_GUIDES.playera}
function placementFrame(view){
  const r=photoRect(state.garment,view||'front'),g=placementGuide();
  const left=r.x+r.w*g.leftU,right=r.x+r.w*g.rightU;
  const hps=r.y+r.h*g.neckV,collarTip=r.y+r.h*(g.collarTipV??Math.max(0,g.neckV-.04)),hem=r.y+r.h*g.hemV;
  const hpsLeft=r.x+r.w*(g.hpsLeftU??.36),hpsRight=r.x+r.w*(g.hpsRightU??.64);
  return {left,right,neck:hps,hps,collarTip,hem,hpsLeft,hpsRight,center:(left+right)/2,cmPerX:g.chestCm/Math.max(1,right-left),cmPerY:g.lengthCm/Math.max(1,hem-hps),chestCm:g.chestCm,lengthCm:g.lengthCm};
}
function estimatePlacementHeight(a,pose){
  if(a._placeH>0)return a._placeH;
  if(a.kind!=='text')return pose.width*.62;
  try{
    const c=document.createElement('canvas').getContext('2d');
    c.font='700 100px '+fontFamily(a);
    const height=pose.width*100/Math.max(c.measureText(a.text||' ').width,100)*1.1;
    return height*Math.min(1,680/height);
  }catch{return pose.width*.32}
}
function placementBox(a,geom){
  const pose=geom?.pose||photoPose(a);
  const width=geom?.width??pose.width;
  const height=geom?.height??estimatePlacementHeight(a,pose);
  if(geom?.height)a._placeH=geom.height;
  return {pose,width,height,left:pose.x-width/2,right:pose.x+width/2,top:pose.y-height/2,bottom:pose.y+height/2};
}
function computeArtworkPlacement(a,geom){
  const box=placementBox(a,geom),frame=placementFrame(a.view);
  const neckCm=(box.top-frame.neck)*frame.cmPerY;
  const hemCm=(frame.hem-box.bottom)*frame.cmPerY;
  const centerCm=(box.pose.x-frame.center)*frame.cmPerX;
  const leftCm=(box.pose.x-frame.left)*frame.cmPerX;
  const rightCm=(frame.right-box.pose.x)*frame.cmPerX;
  return {
    neckCm,hemCm,centerCm,leftCm,rightCm,
    widthCm:box.width*frame.cmPerX,heightCm:box.height*frame.cmPerY,
    view:a.view,zone:a.zone
  };
}
function placementSnapshot(a,geom){
  const p=computeArtworkPlacement(a,geom);
  return {neckCm:roundPlacement(p.neckCm),hemCm:roundPlacement(p.hemCm),centerCm:roundPlacement(p.centerCm),leftCm:roundPlacement(p.leftCm),rightCm:roundPlacement(p.rightCm),widthCm:roundPlacement(p.widthCm),heightCm:roundPlacement(p.heightCm)};
}
function rememberArtworkPlacement(a,geom){
  if(!a)return null;
  a.placement=placementSnapshot(a,geom);
  return a.placement;
}
function artworkPlacement(a,geom){
  if(!a)return null;
  return computeArtworkPlacement(a,geom);
}
function validateArtworkPlacement(raw){
  if(raw==null)return undefined;
  if(typeof raw!=='object'||Array.isArray(raw))throw Error('Ubicación de aplicación inválida.');
  const out={};
  for(const [key,min,max] of [['neckCm',-80,220],['hemCm',-80,220],['centerCm',-80,220],['leftCm',-80,220],['rightCm',-80,220],['widthCm',0.1,150],['heightCm',0.1,150]]){
    out[key]=numeric(raw[key],min,max,'ubicación '+key);
  }
  return out;
}
function placementSideLabel(centerCm){
  if(Math.abs(centerCm)<0.15)return 'centrado';
  return formatDual(Math.abs(centerCm))+(centerCm>0?' a la derecha':' a la izquierda')+' al ver el acabado';
}
function placementLines(p){
  if(!p)return [];
  return [
    'Desde HPS (unión cuello-cuerpo, sin cuello): '+formatDual(p.neckCm),
    'Desde el centro: '+placementSideLabel(p.centerCm),
    'Desde el dobladillo: '+formatDual(p.hemCm),
    'Costado izq.: '+formatDual(p.leftCm)+' · der.: '+formatDual(p.rightCm),
    'Tamaño visual: '+formatDual(p.widthCm)+' × '+formatDual(p.heightCm)
  ];
}
function placementReadoutText(p){
  return placementLines(p).slice(0,3).join('\n');
}
function placementSpecText(a){
  const p=artworkPlacement(a);
  return 'HPS (sin cuello) '+formatDual(p.neckCm)+' · centro '+placementSideLabel(p.centerCm)+' · bajo '+formatDual(p.hemCm);
}
function placementFichaText(a){
  const p=artworkPlacement(a);
  rememberArtworkPlacement(a);
  return placementLines(p).join('\n')+'\nEl largo del cuerpo nace en HPS (unión cuello-cuerpo); la punta del cuello no cuenta.\nReferencia talla M sobre la base de acabado; confirmar en muestra física.';
}
const RULER_EMPTY_TIP='Selecciona un estampado para ver la regla.';
const RULER_ACTIVE_CHIP='Regla activa';
function photoPlacementView(){
  const side=ensurePhoto().side;
  return side==='front'||side==='back'?side:'';
}
function placementSelectionFitsView(view){
  const a=selected();
  return !!(a&&view&&a.view===view&&photoArtworkVisible(a));
}
function photoShowsPlacementGuides(view){
  if(!photoRulerOn||!photoCanPlaceArt())return false;
  const side=photoPlacementView();
  return !!side&&side===view&&placementSelectionFitsView(view);
}
function photoShowsPlacementReadout(){
  return photoShowsPlacementGuides(photoPlacementView());
}
function photoShowsPlacementBaseline(view){
  if(!photoRulerOn||!photoCanPlaceArt())return false;
  const side=photoPlacementView();
  return !!side&&(!view||view===side);
}
function photoShowsPlacementHint(view){
  return photoShowsPlacementBaseline(view)&&!photoShowsPlacementGuides(view||photoPlacementView());
}
function togglePlacementRuler(){
  photoRulerOn=!photoRulerOn;
  if(photoRulerOn&&photoPlacementView()&&!photoShowsPlacementReadout())toast(RULER_EMPTY_TIP);
  syncPlacementRulerUI();
  void paintAllRulerLayers();
  schedulePhoto();
}
function drawPlacementLabel(ctx,text,x,y,align='left'){
  ctx.save();
  ctx.font='700 12px Arial';
  ctx.textAlign=align;
  ctx.textBaseline='middle';
  ctx.lineJoin='round';
  ctx.lineWidth=3.6;
  ctx.strokeStyle='#ffffffee';
  ctx.strokeText(text,x,y);
  ctx.fillStyle='#012169';
  ctx.fillText(text,x,y);
  ctx.restore();
}
function drawPlacementGuideLine(ctx,x1,y1,x2,y2){
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.stroke();
}
function ensureRulerLayer(canvas){
  const host=canvas.parentElement;if(!host)return null;
  let layer=host.querySelector('.photo-ruler-layer');
  if(!layer){
    layer=document.createElement('canvas');
    layer.className='photo-ruler-layer';
    layer.setAttribute('aria-hidden','true');
    host.append(layer);
  }
  if(layer.width!==canvas.width)layer.width=canvas.width;
  if(layer.height!==canvas.height)layer.height=canvas.height;
  return layer;
}
function clearRulerLayer(canvas){
  const layer=canvas.parentElement?.querySelector('.photo-ruler-layer');
  if(!layer)return;
  layer.getContext('2d').clearRect(0,0,layer.width,layer.height);
}
function drawPlacementBaseline(ctx,view){
  const frame=placementFrame(view);
  ctx.strokeStyle='#012169';
  ctx.lineWidth=1.7;
  ctx.setLineDash([7,4]);
  drawPlacementGuideLine(ctx,frame.center,frame.neck,frame.center,frame.hem);
  drawPlacementGuideLine(ctx,frame.left,frame.neck,frame.right,frame.neck);
  drawPlacementGuideLine(ctx,frame.left,frame.hem,frame.right,frame.hem);
  drawPlacementGuideLine(ctx,frame.left,frame.neck,frame.left,frame.hem);
  drawPlacementGuideLine(ctx,frame.right,frame.neck,frame.right,frame.hem);
  ctx.setLineDash([]);
  ctx.lineWidth=1.4;
  drawPlacementGuideLine(ctx,frame.left-6,frame.neck,frame.left+6,frame.neck);
  drawPlacementGuideLine(ctx,frame.right-6,frame.neck,frame.right+6,frame.neck);
  drawPlacementGuideLine(ctx,frame.left-6,frame.hem,frame.left+6,frame.hem);
  drawPlacementGuideLine(ctx,frame.right-6,frame.hem,frame.right+6,frame.hem);
  drawPlacementGuideLine(ctx,frame.center-6,frame.neck,frame.center+6,frame.neck);
  drawPlacementGuideLine(ctx,frame.center-6,frame.hem,frame.center+6,frame.hem);
  drawPlacementHpsMarks(ctx,frame);
  drawPlacementLabel(ctx,HPS_CANVAS_LABEL,frame.center,frame.neck-15,'center');
  drawPlacementLabel(ctx,'Dobladillo',frame.center,frame.hem+13,'center');
  drawPlacementLabel(ctx,'Centro',frame.center+10,(frame.neck+frame.hem)/2,'left');
  drawPlacementLabel(ctx,'Izq.',frame.left-8,(frame.neck+frame.hem)/2,'right');
  drawPlacementLabel(ctx,'Der.',frame.right+8,(frame.neck+frame.hem)/2,'left');
  drawPlacementLabel(ctx,formatDual(frame.chestCm),(frame.left+frame.right)/2,frame.neck+16,'center');
  drawPlacementLabel(ctx,formatDual(frame.lengthCm)+' cuerpo',frame.left+12,(frame.neck+frame.hem)/2,'left');
  return frame;
}
function drawPlacementHpsMarks(ctx,frame){
  ctx.save();
  ctx.strokeStyle='#E8B923';
  ctx.lineWidth=2.2;
  for(const x of [frame.hpsLeft,frame.hpsRight]){
    ctx.beginPath();
    ctx.arc(x,frame.neck,7.5,0,Math.PI*2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x,frame.neck,2.2,0,Math.PI*2);
    ctx.fillStyle='#E8B923';
    ctx.fill();
  }
  ctx.restore();
}
function drawPlacementHintFrame(canvas,view){
  const ctx=canvas.getContext('2d'),scale=canvas.width/W||1;
  ctx.save();
  ctx.setTransform(scale,0,0,scale,0,0);
  drawPlacementBaseline(ctx,view);
  ctx.restore();
}
async function drawPlacementRulers(canvas,view,geom){
  const a=selected();
  if(!a||a.view!==view)return;
  if(!geom){const pose=photoPose(a);geom={pose,...await artGeometry(pose)}}
  const box=placementBox(a,geom),frame=placementFrame(view),p=computeArtworkPlacement(a,geom);
  rememberArtworkPlacement(a,geom);
  const ctx=canvas.getContext('2d'),scale=canvas.width/W||1;
  ctx.save();
  ctx.setTransform(scale,0,0,scale,0,0);
  drawPlacementBaseline(ctx,view);
  ctx.strokeStyle='#FF2E4D';
  ctx.lineWidth=1.35;
  const midX=Math.min(box.left-18,frame.center-28);
  drawPlacementGuideLine(ctx,midX,frame.neck,midX,box.top);
  drawPlacementGuideLine(ctx,midX-5,frame.neck,midX+5,frame.neck);
  drawPlacementGuideLine(ctx,midX-5,box.top,midX+5,box.top);
  drawPlacementLabel(ctx,'HPS '+formatDual(p.neckCm),midX-8,(frame.neck+box.top)/2,'right');
  const hemX=Math.max(box.right+18,frame.center+28);
  drawPlacementGuideLine(ctx,hemX,box.bottom,hemX,frame.hem);
  drawPlacementGuideLine(ctx,hemX-5,box.bottom,hemX+5,box.bottom);
  drawPlacementGuideLine(ctx,hemX-5,frame.hem,hemX+5,frame.hem);
  drawPlacementLabel(ctx,'Bajo '+formatDual(p.hemCm),hemX+8,(box.bottom+frame.hem)/2,'left');
  const guideY=Math.max(frame.neck+14,box.top-20);
  drawPlacementGuideLine(ctx,frame.center,guideY,box.pose.x,guideY);
  drawPlacementGuideLine(ctx,frame.center,guideY-5,frame.center,guideY+5);
  drawPlacementGuideLine(ctx,box.pose.x,guideY-5,box.pose.x,guideY+5);
  const centerShort=Math.abs(p.centerCm)<0.15?'Centrado':formatDual(Math.abs(p.centerCm))+(p.centerCm>0?' der.':' izq.');
  drawPlacementLabel(ctx,centerShort,(frame.center+box.pose.x)/2,guideY-11,'center');
  ctx.restore();
}
function syncPlacementReadout(canvas){
  const readout=$('#photoRulerReadout');
  if(!readout)return;
  const a=selected();
  if(photoShowsPlacementReadout()&&a){
    const p=artworkPlacement(a);
    readout.hidden=false;
    readout.classList.remove('tip');
    readout.textContent=placementReadoutText(p);
    const host=canvas||$(a.view==='back'?'#photoBack':'#photoFront');
    const stage=$('#photoStage');
    if(!host||!stage)return;
    const rect=host.getBoundingClientRect(),stageRect=stage.getBoundingClientRect(),box=placementBox(a);
    const left=rect.left-stageRect.left+(box.right/W)*rect.width+10;
    const top=rect.top-stageRect.top+(box.top/H)*rect.height;
    readout.style.left=Math.max(8,Math.min(left,stageRect.width-228))+'px';
    readout.style.top=Math.max(8,Math.min(top,stageRect.height-96))+'px';
    return;
  }
  if(photoShowsPlacementHint(photoPlacementView())){
    readout.hidden=false;
    readout.classList.add('tip');
    readout.textContent=RULER_ACTIVE_CHIP;
    readout.style.left='12px';
    readout.style.top='12px';
    return;
  }
  readout.hidden=true;
  readout.classList.remove('tip');
  readout.textContent='';
}
function syncPlacementArtField(){
  const field=$('#artPlacement');
  if(!field)return;
  const a=selected();
  field.textContent=a?('Posición (regla): '+placementSpecText(a)+'. Vertical desde HPS (unión cuello-cuerpo, sin cuello). Referencia talla M; confirmar en muestra.'):'Posición de la regla: arrastra o gira el estampado en Acabado. HPS/dobladillo = recuadro girado (el cuello no cuenta); centro = centro del estampado.';
}
function syncPlacementRulerUI(){
  const btn=$('#photoRuler');
  if(btn){
    btn.disabled=!photoCanPlaceArt()||ensurePhoto().side==='orbit';
    btn.setAttribute('aria-pressed',photoRulerOn?'true':'false');
    btn.hidden=ensurePhoto().side==='orbit';
  }
  const hint=photoShowsPlacementHint(photoPlacementView());
  $('#photoStage')?.classList.toggle('ruling',photoShowsPlacementReadout());
  $('#photoStage')?.classList.toggle('ruling-hint',hint);
  if(hint){
    const status=$('#photoStatus');
    if(status)status.textContent=RULER_EMPTY_TIP;
  }
  syncPlacementReadout();
  syncPlacementArtField();
}
function bindPlacementRuler(){
  const btn=$('#photoRuler');
  if(!btn||btn.dataset.rulerBound)return;
  btn.dataset.rulerBound='1';
  btn.addEventListener('click',togglePlacementRuler);
}
async function paintRulerLayer(view){
  const canvas=$(view==='back'?'#photoBack':'#photoFront');
  if(!canvas)return;
  const layer=ensureRulerLayer(canvas);
  if(!layer)return;
  const ticket=++photoRulerPaint;
  const ctx=layer.getContext('2d');
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,layer.width,layer.height);
  if(photoShowsPlacementGuides(view)){
    const a=selected();if(!a)return;
    const pose=photoPose(a),geom=await artGeometry(pose);
    if(ticket!==photoRulerPaint)return;
    await drawPlacementRulers(layer,view,{pose,...geom});
    return;
  }
  if(photoShowsPlacementBaseline(view)&&!photoShowsPlacementGuides(view))drawPlacementHintFrame(layer,view);
}
async function paintAllRulerLayers(){
  const ticket=++photoRulerPaint;
  await paintRulerLayer('front');
  if(ticket!==photoRulerPaint)return;
  await paintRulerLayer('back');
}
const afterPhotoSheetsBeforeRuler=typeof afterPhotoSheets==='function'?afterPhotoSheets:null;
afterPhotoSheets=async function(canvases){
  if(afterPhotoSheetsBeforeRuler)await afterPhotoSheetsBeforeRuler(canvases);
  await paintAllRulerLayers();
};
const photoPutPositionBeforeRuler=photoPutPosition;
photoPutPosition=function(a,x,y){
  photoPutPositionBeforeRuler(a,x,y);
  rememberArtworkPlacement(a);
};
const setupPhotoDragBeforeRuler=setupPhotoDrag;
setupPhotoDrag=function(canvas,view){
  setupPhotoDragBeforeRuler(canvas,view);
  canvas.addEventListener('pointermove',()=>{
    if(!(canvas.className||'').includes('dragging'))return;
    if(!photoDragLive){photoDragLive=true;if(typeof photoTicket==='number')photoTicket++}
    syncPlacementReadout(canvas);
    void paintRulerLayer(view);
  });
  const stopLive=()=>{
    if(!photoDragLive)return;
    photoDragLive=false;
    clearTimeout(photoLiveTimer);photoLiveTimer=0;
    changed();
  };
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,stopLive);
};
const syncPhotoUIBeforeRuler=syncPhotoUI;
syncPhotoUI=function(){
  syncPhotoUIBeforeRuler();
  syncPlacementRulerUI();
};
const syncArtBeforeRuler=syncArt;
syncArt=function(){
  syncArtBeforeRuler();
  const a=selected();
  if(a)rememberArtworkPlacement(a);
  syncPlacementArtField();
};
const changedBeforeRuler=changed;
changed=function(){
  const a=selected();
  if(a)rememberArtworkPlacement(a);
  if(photoDragLive){
    dirty=true;
    state.updatedAt=new Date().toISOString();
    if(!photoLiveTimer)photoLiveTimer=setTimeout(()=>{photoLiveTimer=0;if(photoDragLive)schedulePhoto()},70);
    return;
  }
  changedBeforeRuler();
};
const clientSpecLinesBeforeRuler=clientSpecLines;
clientSpecLines=function(){
  const lines=clientSpecLinesBeforeRuler();
  for(const line of lines){
    if(String(line[0]).startsWith('Diseño ')){
      const index=Number(String(line[0]).replace('Diseño ',''))-1;
      const a=state.artworks[index];
      if(a)line[1]+=' · '+placementSpecText(a);
    }
  }
  return lines;
};
const validateOrderBeforeRuler=validateOrder;
validateOrder=async function(raw){
  const out=await validateOrderBeforeRuler(raw);
  if(!raw||!Array.isArray(raw.artworks))return out;
  for(let i=0;i<out.artworks.length;i++){
    const src=raw.artworks[i];
    if(src&&src.placement!=null)out.artworks[i].placement=validateArtworkPlacement(src.placement);
  }
  return out;
};
const initPhotoBeforeRuler=initPhoto;
initPhoto=function(){
  initPhotoBeforeRuler();
  bindPlacementRuler();
  syncPlacementRulerUI();
};
