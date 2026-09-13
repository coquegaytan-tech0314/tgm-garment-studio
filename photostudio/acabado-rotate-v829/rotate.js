/* Acabado free rotation: any-degree tilt via handle, wheel, pinch, and numeric control. */
const PHOTO_ROTATE_HANDLE_GAP=34;
const PHOTO_ROTATE_HANDLE_HIT=40;
function photoCanRotateArt(){
  return photoCanPlaceArt()&&ensurePhoto().side!=='orbit';
}
function photoNormalizeRotation(deg){
  deg=Number(deg)||0;
  while(deg>180)deg-=360;
  while(deg<-180)deg+=360;
  return Math.round(deg);
}
function photoSetRotation(a,deg){
  if(!a)return 0;
  a.rotation=clamp(photoNormalizeRotation(deg),-180,180);
  return a.rotation;
}
function photoShowsRotateHandle(view){
  if(!photoCanRotateArt()||!photoShowsArtChrome())return false;
  const a=selected();
  return !!a&&a.view===view&&photoArtworkVisible(a)&&photoArtworkDraggable(a);
}
function photoRotateHandleLocal(geom){
  return {x:0,y:-((geom?.height||40)/2)-PHOTO_ROTATE_HANDLE_GAP};
}
function photoRotateHandlePoint(art,pose,geom){
  pose=pose||photoPose(art);
  const local=photoRotateHandleLocal(geom);
  const rad=(Number(art.rotation)||0)*Math.PI/180;
  return {x:pose.x+local.x*Math.cos(rad)-local.y*Math.sin(rad),y:pose.y+local.x*Math.sin(rad)+local.y*Math.cos(rad)};
}
function photoRotateBoxTop(art,pose,geom){
  pose=pose||photoPose(art);
  const ly=-((geom?.height||40)/2);
  const rad=(Number(art.rotation)||0)*Math.PI/180;
  return {x:pose.x-ly*Math.sin(rad),y:pose.y+ly*Math.cos(rad)};
}
function photoHitsRotateHandle(art,point,pose,geom,radius=PHOTO_ROTATE_HANDLE_HIT){
  const handle=photoRotateHandlePoint(art,pose,geom);
  return Math.hypot(point.x-handle.x,point.y-handle.y)<=radius;
}
function photoKeepArtworkPose(a,fn){
  const x=a.x,y=a.y,width=a.width;
  fn();
  a.x=x;a.y=y;a.width=width;
}
function photoApplyRotation(a,deg){
  photoKeepArtworkPose(a,()=>photoSetRotation(a,deg));
  return a.rotation;
}
function placementRotatedExtents(width,height,rotation){
  const rad=(Number(rotation)||0)*Math.PI/180;
  const c=Math.cos(rad),s=Math.sin(rad);
  return {width:Math.abs(width*c)+Math.abs(height*s),height:Math.abs(width*s)+Math.abs(height*c)};
}
function drawRotateHandleOn(canvas,a){
  if(!a||!canvas)return;
  const pose=photoPose(a);
  const height=a._placeH>0?a._placeH:estimatePlacementHeight(a,pose);
  const geom={width:pose.width,height};
  const handle=photoRotateHandlePoint(a,pose,geom);
  const top=photoRotateBoxTop(a,pose,geom);
  const ctx=canvas.getContext('2d'),scale=canvas.width/W||1;
  ctx.save();
  ctx.setTransform(scale,0,0,scale,0,0);
  ctx.strokeStyle='#5163e5';
  ctx.lineWidth=1.7;
  ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(top.x,top.y);
  ctx.lineTo(handle.x,handle.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(handle.x,handle.y,11,0,Math.PI*2);
  ctx.fillStyle='#ffffff';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(handle.x,handle.y,5.2,0.35,Math.PI*1.45);
  ctx.stroke();
  const tip=0.35+Math.PI*1.45;
  ctx.beginPath();
  ctx.moveTo(handle.x+Math.cos(tip)*5.2,handle.y+Math.sin(tip)*5.2);
  ctx.lineTo(handle.x+Math.cos(tip)*5.2-4.2,handle.y+Math.sin(tip)*5.2-1.2);
  ctx.lineTo(handle.x+Math.cos(tip)*5.2-1.1,handle.y+Math.sin(tip)*5.2+3.6);
  ctx.closePath();
  ctx.fillStyle='#5163e5';
  ctx.fill();
  ctx.restore();
}
async function drawRotateHandleResolved(canvas,a){
  if(!canvas||!a)return;
  const pose=photoPose(a),geom=await artGeometry(pose);
  a._placeH=geom.height;
  drawRotateHandleOn(canvas,a);
}
function syncRotationFields(a){
  const value=a?photoNormalizeRotation(a.rotation):0;
  const deg=$('#artRotationDeg');
  const slider=$('#artRotation');
  const out=$('#artRotationValue');
  if(deg)deg.value=value;
  if(slider)slider.value=value;
  if(out)out.textContent=value+'°';
  return value;
}
function bindRotationDeg(){
  const deg=$('#artRotationDeg');
  const slider=$('#artRotation');
  if(deg&&!deg.dataset.rotateBound){
    deg.dataset.rotateBound='1';
    deg.addEventListener('input',()=>{
      const a=selected();
      if(!a)return;
      photoApplyRotation(a,deg.value);
      syncRotationFields(a);
      changed();
    });
  }
  if(slider&&!slider.dataset.rotateBound){
    slider.dataset.rotateBound='1';
    slider.addEventListener('input',()=>{
      const a=selected();
      if(!a)return;
      photoApplyRotation(a,slider.value);
      syncRotationFields(a);
    });
  }
}
function placementBoxUnrotated(a,geom){
  const pose=geom?.pose||photoPose(a);
  const width=geom?.width??pose.width;
  const height=geom?.height??estimatePlacementHeight(a,pose);
  if(geom?.height)a._placeH=geom.height;
  return {pose,width,height};
}
placementBox=function(a,geom){
  const raw=placementBoxUnrotated(a,geom);
  const ext=placementRotatedExtents(raw.width,raw.height,a.rotation);
  return {
    pose:raw.pose,
    width:ext.width,
    height:ext.height,
    contentWidth:raw.width,
    contentHeight:raw.height,
    left:raw.pose.x-ext.width/2,
    right:raw.pose.x+ext.width/2,
    top:raw.pose.y-ext.height/2,
    bottom:raw.pose.y+ext.height/2
  };
};
const computeArtworkPlacementBeforeRotate=computeArtworkPlacement;
computeArtworkPlacement=function(a,geom){
  const p=computeArtworkPlacementBeforeRotate(a,geom);
  p.rotationDeg=Math.round(Number(a.rotation)||0);
  return p;
};
const placementSnapshotBeforeRotate=placementSnapshot;
placementSnapshot=function(a,geom){
  const snap=placementSnapshotBeforeRotate(a,geom);
  snap.rotationDeg=Math.round(Number(a.rotation)||0);
  return snap;
};
const validateArtworkPlacementBeforeRotate=validateArtworkPlacement;
validateArtworkPlacement=function(raw){
  const out=validateArtworkPlacementBeforeRotate(raw);
  if(out&&raw.rotationDeg!=null)out.rotationDeg=numeric(raw.rotationDeg,-180,180,'ubicación rotationDeg');
  return out;
};
const placementLinesBeforeRotate=placementLines;
placementLines=function(p){
  const lines=placementLinesBeforeRotate(p);
  lines.push('Giro: '+Math.round(Number(p?.rotationDeg)||0)+'°');
  lines.push('Cuello y dobladillo usan el recuadro girado; centro y costados, el centro del estampado.');
  return lines;
};
const placementReadoutTextBeforeRotate=placementReadoutText;
placementReadoutText=function(p){
  const base=placementReadoutTextBeforeRotate(p).split('\n').slice(0,3);
  base.push('Giro: '+Math.round(Number(p?.rotationDeg)||0)+'°');
  return base.join('\n');
};
const placementSpecTextBeforeRotate=placementSpecText;
placementSpecText=function(a){
  return placementSpecTextBeforeRotate(a)+' · giro '+Math.round(Number(a.rotation)||0)+'°';
};
const photoHitArtworkBeforeRotate=photoHitArtwork;
photoHitArtwork=async function(view,point){
  const a=selected();
  if(a&&a.view===view&&photoCanRotateArt()&&photoArtworkDraggable(a)){
    const pose=photoPose(a),geom=await artGeometry(pose);
    if(photoHitsRotateHandle(a,point,pose,geom)){
      return {art:a,pose,geom,local:photoArtworkLocalPoint(a,point,pose),rotate:true};
    }
  }
  return photoHitArtworkBeforeRotate(view,point);
};
const renderPhotoBeforeRotate=renderPhoto;
renderPhoto=async function(canvas,view,opts={}){
  const result=await renderPhotoBeforeRotate(canvas,view,opts);
  if(opts.edit&&photoShowsRotateHandle(view))await drawRotateHandleResolved(canvas,selected());
  return result;
};
const paintRulerLayerBeforeRotate=paintRulerLayer;
paintRulerLayer=async function(view){
  await paintRulerLayerBeforeRotate(view);
  if(!photoShowsRotateHandle(view))return;
  const canvas=$(view==='back'?'#photoBack':'#photoFront');
  const layer=canvas&&ensureRulerLayer(canvas);
  if(!layer)return;
  await drawRotateHandleResolved(layer,selected());
};
setupPhotoDrag=function(canvas,view){
  let drag=null,activePointer=null,hoverTick=0,pinch=null;
  const pointers=new Map();
  const liveMove=()=>{
    if(!(canvas.className||'').includes('dragging'))return;
    if(!photoDragLive){photoDragLive=true;if(typeof photoTicket==='number')photoTicket++}
    syncPlacementReadout(canvas);
    void paintRulerLayer(view);
  };
  const stopLive=()=>{
    if(!photoDragLive)return;
    photoDragLive=false;
    clearTimeout(photoLiveTimer);photoLiveTimer=0;
    changed();
  };
  canvas.addEventListener('pointerdown',async e=>{
    if(!photoCanPlaceArt())return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2&&photoCanRotateArt()){
      const a=selected();
      if(a&&a.view===view&&photoArtworkDraggable(a)){
        const pts=[...pointers.values()];
        pinch={id:a.id,startAng:Math.atan2(pts[1].y-pts[0].y,pts[1].x-pts[0].x),startRot:Number(a.rotation)||0};
        drag=null;
        canvas.classList.add('dragging','rotating','over-art');
        e.preventDefault?.();
        return;
      }
    }
    const hit=await photoHitArtwork(view,photoPointer(canvas,e));
    if(!hit)return;
    e.preventDefault?.();
    selectedArt=hit.art.id;
    const point=photoPointer(canvas,e);
    const pose=hit.pose||photoPose(hit.art);
    if(hit.rotate&&photoCanRotateArt()){
      drag={mode:'rotate',id:hit.art.id,startAng:Math.atan2(point.y-pose.y,point.x-pose.x),startRot:(Number(hit.art.rotation)||0)*Math.PI/180};
    }else{
      drag={mode:'move',id:hit.art.id,dx:hit.local.dx,dy:hit.local.dy};
    }
    activePointer=e.pointerId;
    canvas.focus();
    canvas.setPointerCapture?.(e.pointerId);
    canvas.classList.add('dragging','over-art');
    canvas.classList.toggle('rotating',drag.mode==='rotate');
    updateArtList();syncArt();schedulePhoto();
  });
  canvas.addEventListener('pointermove',async e=>{
    if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&pointers.size>=2){
      const a=state.artworks.find(item=>item.id===pinch.id);
      if(a){
        const pts=[...pointers.values()];
        const ang=Math.atan2(pts[1].y-pts[0].y,pts[1].x-pts[0].x);
        photoApplyRotation(a,pinch.startRot+(ang-pinch.startAng)*180/Math.PI);
        syncArt();changed();
        liveMove();
      }
      return;
    }
    if(drag&&activePointer===e.pointerId){
      const a=state.artworks.find(item=>item.id===drag.id);
      if(!a)return;
      const point=photoPointer(canvas,e);
      const width=a.width;
      if(drag.mode==='rotate'){
        const pose=photoPose(a);
        photoApplyRotation(a,(Math.atan2(point.y-pose.y,point.x-pose.x)-drag.startAng+drag.startRot)*180/Math.PI);
      }else{
        const rotation=a.rotation;
        photoPutPosition(a,point.x-drag.dx,point.y-drag.dy);
        a.width=width;a.rotation=rotation;
      }
      syncArt();changed();
      liveMove();
      return;
    }
    if(drag||e.buttons)return;
    if(!photoCanPlaceArt()){canvas.classList.remove('over-art','over-rotate');return}
    const tick=++hoverTick,hit=await photoHitArtwork(view,photoPointer(canvas,e));
    if(tick!==hoverTick)return;
    canvas.classList.toggle('over-art',!!hit);
    canvas.classList.toggle('over-rotate',!!hit?.rotate);
  });
  const end=e=>{
    if(e&&e.pointerId!=null)pointers.delete(e.pointerId);
    if(pointers.size<2)pinch=null;
    if(!e||activePointer==null||e.pointerId===activePointer){
      activePointer=null;drag=null;
      canvas.classList.remove('dragging','rotating');
    }
    stopLive();
  };
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);
  canvas.addEventListener('wheel',e=>{
    if(!photoCanRotateArt())return;
    const a=selected();
    if(!a||!photoArtworkDraggable(a)||a.view!==view)return;
    e.preventDefault();
    const step=e.shiftKey?1:3;
    photoApplyRotation(a,(Number(a.rotation)||0)+(e.deltaY>0?step:-step));
    syncArt();changed();
  },{passive:false});
  canvas.addEventListener('keydown',e=>{
    const a=selected();
    if(!photoCanPlaceArt()||!a||!photoArtworkDraggable(a)||a.view!==view)return;
    const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(d){
      e.preventDefault();
      const amount=e.shiftKey?10:2,width=a.width,rotation=a.rotation;
      a.x=clamp(a.x+d[0]*amount,0,W);a.y=clamp(a.y+d[1]*amount,0,H);
      a.width=width;a.rotation=rotation;
      syncArt();changed();
      return;
    }
    if(!photoCanRotateArt())return;
    const turn={ '[':-3, ']':3, '{':-1, '}':1 }[e.key];
    if(turn==null)return;
    e.preventDefault();
    photoApplyRotation(a,(Number(a.rotation)||0)+turn);
    syncArt();changed();
  });
};
const syncArtBeforeRotate=syncArt;
syncArt=function(){
  syncArtBeforeRotate();
  syncRotationFields(selected());
};
const syncPlacementArtFieldBeforeRotate=syncPlacementArtField;
syncPlacementArtField=function(){
  syncPlacementArtFieldBeforeRotate();
  const field=$('#artPlacement');
  if(!field||selected())return;
  field.textContent='Posición de la regla: arrastra o gira el estampado en Acabado. Cuello/dobladillo = recuadro girado; centro = centro del estampado.';
};
const syncPhotoUIBeforeRotate=syncPhotoUI;
syncPhotoUI=function(){
  syncPhotoUIBeforeRotate();
  const p=ensurePhoto();
  if(p.source==='generated'&&p.side!=='orbit'&&!photoIssues().length&&state.artworks.some(photoArtworkVisible)){
    $('#photoStatus').textContent='Arrastra o gira el estampado · Frente y Espalda';
  }
};
const initPhotoBeforeRotate=initPhoto;
initPhoto=function(){
  initPhotoBeforeRotate();
  bindRotationDeg();
};
