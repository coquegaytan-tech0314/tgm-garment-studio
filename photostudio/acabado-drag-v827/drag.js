/* Acabado Frente/Espalda: pick and drag estampados on the generated photobase. */
photoCanPlaceArt=function(){return ensurePhoto().source==='generated'}
photoShowsArtChrome=function(){return photoCanPlaceArt()}
function enterAcabadoPlaceMode(){
  setWorkspace('photo',false);
  const p=ensurePhoto();
  if(p.source==='final'){
    toast('Los renders cargados no se pueden reposicionar. Usa la base generada para arrastrar estampados.');
    schedulePhoto();
    return;
  }
  if(p.side==='orbit')p.side=selected()?.view==='back'?'back':'front';
  if(!state.artworks.length){
    tab('art');
    toast('Agrega un logo en Logos y arrástralo sobre el acabado.');
    schedulePhoto();
    return;
  }
  if(!selected())selectedArt=state.artworks.find(a=>a.view===(p.side==='back'?'back':'front'))?.id||state.artworks[0].id;
  const a=selected();
  if(a&&p.side!=='both'&&a.view!==p.side)p.side=a.view;
  updateArtList();syncArt();
  const canvas=a?.view==='back'?$('#photoBack'):$('#photoFront');
  canvas?.focus();
  schedulePhoto();
  toast('Arrastra el estampado sobre la prenda.');
}
const syncPhotoUIBeforePlace=syncPhotoUI;
syncPhotoUI=function(){
  syncPhotoUIBeforePlace();
  const p=ensurePhoto(),editBtn=$('#photoEdit');
  if(editBtn){
    editBtn.disabled=p.source==='final';
    editBtn.setAttribute('aria-pressed',photoCanPlaceArt()?'true':'false');
  }
  if(p.source==='generated'&&p.side!=='orbit'&&!photoIssues().length){
    $('#photoStatus').textContent=state.artworks.some(photoArtworkVisible)
      ?'Arrastra un estampado para moverlo · Frente y Espalda'
      :'Colores y diseños editables · frente y espalda';
  }
  $('#photoStage')?.classList.toggle('placing',photoCanPlaceArt());
};
setupPhotoDrag=function(canvas,view){
  let drag=null,activePointer=null,hoverTick=0;
  canvas.addEventListener('pointerdown',async e=>{
    if(!photoCanPlaceArt())return;
    const hit=await photoHitArtwork(view,photoPointer(canvas,e));
    if(!hit)return;
    e.preventDefault?.();
    selectedArt=hit.art.id;
    drag={id:hit.art.id,dx:hit.local.dx,dy:hit.local.dy};
    activePointer=e.pointerId;
    canvas.focus();
    canvas.setPointerCapture?.(e.pointerId);
    canvas.classList.add('dragging','over-art');
    updateArtList();syncArt();schedulePhoto();
  });
  canvas.addEventListener('pointermove',async e=>{
    if(drag&&activePointer===e.pointerId){
      const a=state.artworks.find(item=>item.id===drag.id);
      if(!a)return;
      const point=photoPointer(canvas,e);
      const width=a.width,rotation=a.rotation;
      photoPutPosition(a,point.x-drag.dx,point.y-drag.dy);
      a.width=width;a.rotation=rotation;
      syncArt();changed();
      return;
    }
    if(drag||e.buttons)return;
    if(!photoCanPlaceArt()){canvas.classList.remove('over-art');return}
    const tick=++hoverTick,hit=await photoHitArtwork(view,photoPointer(canvas,e));
    if(tick!==hoverTick)return;
    canvas.classList.toggle('over-art',!!hit);
  });
  const end=()=>{activePointer=null;drag=null;canvas.classList.remove('dragging')};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);
  canvas.addEventListener('keydown',e=>{
    const a=selected();
    if(!photoCanPlaceArt()||!a||!photoArtworkDraggable(a)||a.view!==view)return;
    const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(!d)return;
    e.preventDefault();
    const amount=e.shiftKey?10:2,width=a.width,rotation=a.rotation;
    a.x=clamp(a.x+d[0]*amount,0,W);a.y=clamp(a.y+d[1]*amount,0,H);
    a.width=width;a.rotation=rotation;
    syncArt();changed();
  });
};
