/* Acabado placement rulers: garment-relative cm + inches while dragging/selecting. */
const CM_PER_INCH=2.54;
const PLACEMENT_GUIDES={
  playera:{chestCm:52,lengthCm:70,neckV:.155,hemV:.955,leftU:.205,rightU:.795},
  polo:{chestCm:52,lengthCm:72,neckV:.168,hemV:.955,leftU:.20,rightU:.81},
  hoodie:{chestCm:56,lengthCm:70,neckV:.28,hemV:.905,leftU:.22,rightU:.78},
  sleeveless:{chestCm:46,lengthCm:66,neckV:.14,hemV:.94,leftU:.30,rightU:.70},
  sleevelessMujer:{chestCm:42,lengthCm:60,neckV:.13,hemV:.94,leftU:.32,rightU:.68},
  zipneck:{chestCm:52,lengthCm:70,neckV:.16,hemV:.95,leftU:.22,rightU:.78}
};
let photoRulerOn=true;
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
  const left=r.x+r.w*g.leftU,right=r.x+r.w*g.rightU,neck=r.y+r.h*g.neckV,hem=r.y+r.h*g.hemV;
  return {left,right,neck,hem,center:(left+right)/2,cmPerX:g.chestCm/Math.max(1,right-left),cmPerY:g.lengthCm/Math.max(1,hem-neck),chestCm:g.chestCm,lengthCm:g.lengthCm};
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
    'Desde el cuello: '+formatDual(p.neckCm),
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
  return 'cuello '+formatDual(p.neckCm)+' · centro '+placementSideLabel(p.centerCm)+' · bajo '+formatDual(p.hemCm);
}
function placementFichaText(a){
  const p=artworkPlacement(a);
  rememberArtworkPlacement(a);
  return placementLines(p).join('\n')+'\nReferencia talla M sobre la base de acabado; confirmar en muestra física.';
}
function photoShowsPlacementGuides(view){
  if(!photoRulerOn||!photoCanPlaceArt())return false;
  const side=ensurePhoto().side;
  if(side==='orbit'||side==='both')return false;
  const a=selected();
  return !!a&&a.view===view&&side===view&&photoArtworkVisible(a);
}
function photoShowsPlacementReadout(){
  if(!photoRulerOn||!photoCanPlaceArt())return false;
  const side=ensurePhoto().side;
  if(side==='orbit'||side==='both')return false;
  const a=selected();
  return !!a&&photoArtworkVisible(a)&&a.view===side;
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
async function drawPlacementRulers(canvas,view){
  const a=selected();
  if(!a||a.view!==view)return;
  const pose=photoPose(a),geom=await artGeometry(pose),box=placementBox(a,{pose,...geom}),frame=placementFrame(view),p=computeArtworkPlacement(a,{pose,...geom});
  rememberArtworkPlacement(a,{pose,...geom});
  const ctx=canvas.getContext('2d'),scale=canvas.width/W;
  ctx.save();
  ctx.setTransform(scale,0,0,scale,0,0);
  ctx.strokeStyle='#012169cc';
  ctx.lineWidth=1.1;
  ctx.setLineDash([5,4]);
  drawPlacementGuideLine(ctx,frame.center,frame.neck,frame.center,frame.hem);
  drawPlacementGuideLine(ctx,frame.left,frame.neck,frame.right,frame.neck);
  drawPlacementGuideLine(ctx,frame.left,frame.hem,frame.right,frame.hem);
  ctx.setLineDash([]);
  ctx.strokeStyle='#FF2E4D';
  ctx.lineWidth=1.35;
  const midX=Math.min(box.left-18,frame.center-28);
  drawPlacementGuideLine(ctx,midX,frame.neck,midX,box.top);
  drawPlacementGuideLine(ctx,midX-5,frame.neck,midX+5,frame.neck);
  drawPlacementGuideLine(ctx,midX-5,box.top,midX+5,box.top);
  drawPlacementLabel(ctx,'Cuello '+formatDual(p.neckCm),midX-8,(frame.neck+box.top)/2,'right');
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
  if(!photoShowsPlacementReadout()||!a){readout.hidden=true;readout.textContent='';return}
  const p=artworkPlacement(a);
  readout.hidden=false;
  readout.textContent=placementReadoutText(p);
  const host=canvas||$(a.view==='back'?'#photoBack':'#photoFront');
  const stage=$('#photoStage');
  if(!host||!stage)return;
  const rect=host.getBoundingClientRect(),stageRect=stage.getBoundingClientRect(),pose=photoPose(a);
  const left=rect.left-stageRect.left+(pose.x/W)*rect.width+Math.max(36,pose.width*.35);
  const top=rect.top-stageRect.top+(pose.y/H)*rect.height-24;
  readout.style.left=Math.max(8,Math.min(left,stageRect.width-228))+'px';
  readout.style.top=Math.max(8,Math.min(top,stageRect.height-96))+'px';
}
function syncPlacementArtField(){
  const field=$('#artPlacement');
  if(!field)return;
  const a=selected();
  field.textContent=a?('Posición (regla): '+placementSpecText(a)+'. Referencia talla M; confirmar en muestra.'):'Posición de la regla: arrastra el estampado en Acabado para medir en cm y pulgadas.';
}
function syncPlacementRulerUI(){
  const btn=$('#photoRuler');
  if(btn){
    btn.disabled=!photoCanPlaceArt()||ensurePhoto().side==='orbit';
    btn.setAttribute('aria-pressed',photoRulerOn&&!btn.disabled?'true':'false');
    btn.hidden=ensurePhoto().side==='orbit';
  }
  $('#photoStage')?.classList.toggle('ruling',photoShowsPlacementReadout());
  syncPlacementReadout();
  syncPlacementArtField();
}
function bindPlacementRuler(){
  const btn=$('#photoRuler');
  if(!btn||btn.dataset.rulerBound)return;
  btn.dataset.rulerBound='1';
  btn.addEventListener('click',()=>{photoRulerOn=!photoRulerOn;syncPlacementRulerUI();schedulePhoto()});
}
const renderPhotoBeforeRuler=renderPhoto;
renderPhoto=async function(canvas,view,options={}){
  const result=await renderPhotoBeforeRuler(canvas,view,options);
  if(options.edit&&photoShowsPlacementGuides(view))await drawPlacementRulers(canvas,view);
  return result;
};
const photoPutPositionBeforeRuler=photoPutPosition;
photoPutPosition=function(a,x,y){
  photoPutPositionBeforeRuler(a,x,y);
  rememberArtworkPlacement(a);
};
const setupPhotoDragBeforeRuler=setupPhotoDrag;
setupPhotoDrag=function(canvas,view){
  setupPhotoDragBeforeRuler(canvas,view);
  canvas.addEventListener('pointermove',()=>{if((canvas.className||'').includes('dragging'))syncPlacementReadout(canvas)});
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
