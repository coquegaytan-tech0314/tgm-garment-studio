/* Default sleeve estampados sit on the COSTADO / LATERAL (outer arm),
   horizontal and parallel to the cuff — not on the front face of the sleeve. */
const SLEEVE_COSTADO_ABOVE_CUFF_CM=3.5;
const SLEEVE_COSTADO_LABEL={
  leftSleeve:'Manga izq. · costado (al vestir)',
  rightSleeve:'Manga der. · costado (al vestir)'
};
if(typeof ZONES==='object'){
  if(ZONES.leftSleeve)ZONES.leftSleeve.label=SLEEVE_COSTADO_LABEL.leftSleeve;
  if(ZONES.rightSleeve)ZONES.rightSleeve.label=SLEEVE_COSTADO_LABEL.rightSleeve;
}
if(typeof COVERAGE==='object'){
  COVERAGE.leftSleeve='Manga izquierda · costado';
  COVERAGE.rightSleeve='Manga derecha · costado';
}

function isSleeveCostadoZone(zone){return zone==='leftSleeve'||zone==='rightSleeve'}
function garmentHasSleeveCostado(garment=state.garment){return garment!=='sleeveless'}
function sleeveCostadoMeasureNote(garment=state.garment){
  const above=garment==='polo'||garment==='playera'?' · ~3–4 cm arriba del puño':'';
  return 'Costado / lateral · horizontal, paralelo al puño'+above;
}
function sleeveCostadoTechNote(a){
  const side=typeof sleeveSideForZone==='function'?sleeveSideForZone(a.zone):null;
  const name=side&&typeof SLEEVE_NAMES==='object'?SLEEVE_NAMES[side]:ZONES[a.zone].label;
  const view=a.view==='front'?'visible desde el frente':'visible desde la espalda';
  return name+' al vestir · costado / lateral ('+view+'). Horizontal, paralelo al puño'
    +(state.garment==='polo'||state.garment==='playera'?', ~'+SLEEVE_COSTADO_ABOVE_CUFF_CM+' cm arriba del puño':'')
    +'. El frente de la manga es una excepción rara; confirmar con el taller.';
}
function sleeveCostadoPhotoV(garment=state.garment){
  if(garment==='polo'&&typeof poloUFromCm==='function')return .40-poloUFromCm(SLEEVE_COSTADO_ABOVE_CUFF_CM);
  if(garment==='hoodie')return .52;
  if(garment==='zipneck')return .50;
  return .34;
}
function sleeveCostadoSpec(garment=state.garment){
  if(!garmentHasSleeveCostado(garment))return null;
  const polo=garment==='polo',hood=garment==='hoodie',zip=garment==='zipneck';
  const y=polo?318:hood?358:zip?418:308;
  const width=polo?56:hood?58:zip?54:58;
  return {
    left:{x:polo?692:hood?698:zip?688:688,y,width},
    right:{x:polo?108:hood?102:zip?112:112,y,width},
    uOuter:polo?.918:hood?.905:zip?.90:.912,
    v:sleeveCostadoPhotoV(garment)
  };
}
function applySleeveCostadoCanvas(p,zone,view,garment=state.garment){
  const spec=sleeveCostadoSpec(garment);
  if(!spec||!isSleeveCostadoZone(zone))return p;
  const src=zone==='leftSleeve'?spec.left:spec.right;
  p.x=view==='back'?W-src.x:src.x;
  p.y=src.y;
  p.width=src.width;
  return p;
}
function applySleeveCostadoDefaults(a,zone=a.zone,view=a.view){
  a.zone=zone;
  Object.assign(a,zonePosition(zone,view));
  if(garmentHasSleeveCostado()&&isSleeveCostadoZone(zone)){
    a.rotation=0;
    if(!a.dimensions)a.dimensions=sleeveCostadoMeasureNote();
  }
  return a;
}

const zonePositionBeforeCostado=zonePosition;
zonePosition=function(zone,view){
  return applySleeveCostadoCanvas(zonePositionBeforeCostado(zone,view),zone,view);
};
const photoZoneBeforeCostado=photoZone;
photoZone=function(zone,view){
  const old=photoZoneBeforeCostado(zone,view),spec=sleeveCostadoSpec();
  if(!spec||!isSleeveCostadoZone(zone))return old;
  const r=photoRect(state.garment,view),right=(zone==='leftSleeve')===(view==='front');
  return {...old,x:r.x+r.w*(right?spec.uOuter:1-spec.uOuter),y:r.y+r.h*spec.v};
};
const newSleeveArtBeforeCostado=newSleeveArt;
newSleeveArt=function(opts={}){
  const a=newSleeveArtBeforeCostado(opts);
  if(garmentHasSleeveCostado()&&isSleeveCostadoZone(a.zone)){
    a.rotation=0;
    Object.assign(a,zonePosition(a.zone,a.view));
    if(!opts.copy||!opts.copy.dimensions)a.dimensions=sleeveCostadoMeasureNote();
  }
  return a;
};
const techniqueNotesBeforeCostado=techniqueNotes;
techniqueNotes=function(a){
  const notes=techniqueNotesBeforeCostado(a);
  if(!isSleeveCostadoZone(a.zone))return notes;
  const line=sleeveCostadoTechNote(a);
  const idx=notes.findIndex(n=>/visible desde el frente|visible desde la espalda|costado \/ lateral/.test(n));
  if(idx>=0)notes[idx]=line;else notes.push(line);
  return notes;
};
const syncArtBeforeCostado=syncArt;
syncArt=function(){
  syncArtBeforeCostado();
  const a=selected(),grid=$('#zoneGrid');
  if(!a||!grid)return;
  for(const b of [...grid.children]){
    const zone=Object.keys(ZONES).find(z=>ZONES[z].label===b.textContent);
    if(!isSleeveCostadoZone(zone)||b.dataset.sleeveCostado==='1')continue;
    b.dataset.sleeveCostado='1';
    b.addEventListener('click',()=>{
      applySleeveCostadoDefaults(a,zone,a.view);
      syncArt();changed();
    });
  }
};
const syncSleevesBeforeCostado=typeof syncSleeves==='function'?syncSleeves:null;
if(syncSleevesBeforeCostado)syncSleeves=function(){
  syncSleevesBeforeCostado();
  const a=selected(),location=$('#sleeveLogoLocation');
  if(!location||!a||!isSleeveCostadoZone(a.zone))return;
  location.hidden=false;
  location.textContent=ZONES[a.zone].label+' · '+(a.view==='front'?'frente':'espalda')+' · costado / lateral, no el frente de la manga';
};
