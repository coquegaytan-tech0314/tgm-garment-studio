/* MGM v8.2.17 · notas de Koke 2026-10-02. Optional pedido fields; schema VERSION stays 8.
   Hoodie: puño cardigán (rib) 5.5 cm a costura y pretina 5.5 cm. Polo/playera: modelo de Acabado
   ligeramente comprimido a la proporción de talla estándar. Medidas en Regla, Tallas, ficha y Despiece.
   Acabado photo stays clean: measures live in the Regla layer and panels, never painted on the base. */
const TGM_HOODIE_STANDARDS={cuffRibCm:5.5,waistbandCm:5.5,seamCm:.75};
const HOODIE_STD_NUMBER_FIELDS={cuffRibCm:[2,12],waistbandCm:[2,15],seamCm:[.3,2]};
const V8217_SPEC_LABELS=['Juegos y líneas del cuello','Puño · corte','Líneas de detalle','Puño cardigán (hoodie)','Pretina (hoodie)','Costura (hoodie)'];
/* Generated photo bases read taller than flat standard sizes (polo M 52 × 72 cm, playera M 52 × 70 cm).
   Height is compressed slightly; width, logo scale and every u/v guide stay relative to the rect. */
const PHOTO_STANDARD_PROPORTION={polo:.9,playera:.9};
function v8217FormatCm(n){const x=Math.round(Number(n)*100)/100;return(Number.isInteger(x*10)?x.toFixed(1):String(x))+' cm'}
function hoodieStdDefaults(){return {...TGM_HOODIE_STANDARDS}}
function ensureHoodieStdConstruction(raw){
  const d=hoodieStdDefaults();
  const out=raw&&typeof raw==='object'&&!Array.isArray(raw)?{...d,...raw}:d;
  for(const key of Object.keys(d))if(out[key]==null||!Number.isFinite(Number(out[key])))out[key]=d[key];
  return out;
}
function ensureHoodieStd(){state.hoodieStd=ensureHoodieStdConstruction(state.hoodieStd);return state.hoodieStd}
function validateHoodieStd(raw){
  const d=hoodieStdDefaults();
  const src=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const out={};
  for(const [key,[min,max]] of Object.entries(HOODIE_STD_NUMBER_FIELDS)){
    const value=src[key]??d[key];
    out[key]=numeric(typeof value==='number'?value:Number(value),min,max,'hoodie '+key);
  }
  return out;
}
const blankBeforeV8217=blank;
blank=function(){const out=blankBeforeV8217();out.hoodieStd=hoodieStdDefaults();return out};
const validateOrderBeforeV8217=validateOrder;
validateOrder=async function(raw){
  const out=await validateOrderBeforeV8217(raw);
  out.hoodieStd=validateHoodieStd(raw?.hoodieStd);
  return out;
};
function hoodieStdRows(){
  if(state.garment!=='hoodie')return [];
  const h=ensureHoodieStd();
  return [
    ['Puño cardigán (hoodie)',v8217FormatCm(h.cuffRibCm)+' a costura · rib / cardigán en ambas mangas'],
    ['Pretina (hoodie)',v8217FormatCm(h.waistbandCm)+' a costura · rib / cardigán en el ruedo'],
    ['Costura (hoodie)',v8217FormatCm(h.seamCm)+' (rango 0.5–1.0 cm)']
  ];
}
function hoodieStdSummary(){return hoodieStdRows().map(([label,text])=>label+': '+text).join('\n')}
const specsBeforeV8217=clientSpecLines;
clientSpecLines=function(){
  const rows=specsBeforeV8217();
  if(state.garment!=='hoodie')return rows;
  const conf=rows.findIndex(row=>row[0]==='Confección');
  rows.splice(conf<0?rows.length:conf+1,0,...hoodieStdRows());
  return rows;
};
function hoodieStdAssignField(key,el,commit=false){
  const h=ensureHoodieStd();
  if(!HOODIE_STD_NUMBER_FIELDS[key])return;
  const[min,max]=HOODIE_STD_NUMBER_FIELDS[key];
  const raw=String(el.value).trim();
  let n=Number(raw);
  if(raw===''||raw==='-'||raw==='.'||raw==='-.'||!Number.isFinite(n)){
    if(commit){n=hoodieStdDefaults()[key];h[key]=n;el.value=n}
    return;
  }
  if(!commit&&n<min&&n>=0)return;
  n=clamp(n,min,max);
  h[key]=n;
  if(commit&&String(el.value)!==String(n))el.value=n;
}
/* Standard measures per garment for Tallas, Despiece and Regla. */
function v8217StandardLines(g=state.garment){
  if(g==='polo'&&typeof ensurePolo==='function'){
    const p=ensurePolo();
    return [
      'Cuello '+v8217FormatCm(p.collarLengthCm)+' largo × '+v8217FormatCm(p.collarWidthCm)+' alto'+(p.collarLines&&typeof poloCollarLinesText==='function'?' · '+poloCollarLinesText(p):''),
      'Puño corte '+v8217FormatCm(p.cuffCutLengthCm)+' × '+v8217FormatCm(p.cuffCutHeightCm)+' → '+v8217FormatCm(p.cuffWidthCm)+' terminado · rayas '+(Math.round(p.cuffStripeMm*10)/10).toFixed(1)+' mm',
      'Líneas de detalle '+(Math.round(p.detailLineMm*10)/10).toFixed(1)+' mm · costura '+v8217FormatCm(p.cuffSeamCm)+' (0.5–1.0 cm)'
    ];
  }
  if(g==='hoodie'){
    const h=ensureHoodieStd();
    return ['Puño cardigán '+v8217FormatCm(h.cuffRibCm)+' a costura','Pretina '+v8217FormatCm(h.waistbandCm)+' a costura','Costura '+v8217FormatCm(h.seamCm)+' (0.5–1.0 cm)'];
  }
  return [];
}
function syncHoodieStd(){
  const h=ensureHoodieStd(),hoodie=state.garment==='hoodie';
  const extras=$('#hoodieStdExtras'),ficha=$('#hoodieFichaSpecs'),text=$('#hoodieFichaText');
  if(extras)extras.hidden=!hoodie;
  if(ficha){ficha.hidden=!hoodie;if(text&&hoodie)text.textContent=hoodieStdSummary()}
  for(const el of $$('[data-hoodie-std]')){
    if(document.activeElement===el)continue;
    const value=h[el.dataset.hoodieStd];
    if(value!=null)el.value=value;
  }
  const tallas=$('#constructionTallas'),list=$('#constructionTallasText');
  const lines=v8217StandardLines();
  if(tallas)tallas.hidden=!lines.length;
  if(list&&lines.length)list.textContent=lines.join('\n');
  const title=$('#constructionTallasTitle');
  if(title)title.textContent=state.garment==='hoodie'?'Medidas estándar · hoodie':'Medidas estándar · polo';
  syncDespieceStandard();
}
/* Acabado proportion: slightly compressed polo / playera model. */
const photoRectBeforeV8217=photoRect;
photoRect=function(garment=state.garment,view='front'){
  const r=photoRectBeforeV8217(garment,view),k=PHOTO_STANDARD_PROPORTION[garment];
  if(!k||k===1)return r;
  const h=r.h*k;
  return {...r,y:r.y+(r.h-h)/2,h};
};
/* Regla: construction measures on the ruler layer only (never baked into the Acabado render). */
function v8217RulerMarks(ctx,frame,view){
  if(state.garment!=='polo'&&state.garment!=='hoodie')return;
  const r=photoRect(state.garment,view||'front'),x=u=>r.x+r.w*u,y=v=>r.y+r.h*v;
  const cmPx=1/Math.max(.01,frame.cmPerY||1);
  ctx.save();
  ctx.strokeStyle='#012169';ctx.lineWidth=1.2;
  if(state.garment==='polo'){
    const p=ensurePolo();
    drawPlacementLabel(ctx,'Cuello '+v8217FormatCm(p.collarWidthCm)+' × '+v8217FormatCm(p.collarLengthCm),frame.hpsRight+14,frame.collarTip+4,'left');
    const cuffU=view==='back'?.10:.90,cuffY=y(.465);
    drawPlacementLabel(ctx,'Puño '+v8217FormatCm(p.cuffWidthCm)+' (corte '+v8217FormatCm(p.cuffCutHeightCm)+')',x(cuffU),cuffY,'center');
  }else{
    const h=ensureHoodieStd();
    /* Guide hem (hemV) sits at the rib seam; the photo's ruedo ends lower. Pretina is measured up from the edge. */
    const bandBottom=y(.99),bandTop=bandBottom-h.waistbandCm*cmPx;
    ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(frame.left+6,bandTop);ctx.lineTo(frame.right-6,bandTop);ctx.stroke();
    ctx.beginPath();ctx.moveTo(frame.left+6,bandBottom);ctx.lineTo(frame.right-6,bandBottom);ctx.stroke();
    ctx.setLineDash([]);
    drawPlacementLabel(ctx,'Pretina '+v8217FormatCm(h.waistbandCm),frame.right-70,(bandTop+bandBottom)/2,'center');
    const cuffU=view==='back'?.09:.91,cuffBottom=y(.99),cuffTop=cuffBottom-h.cuffRibCm*cmPx;
    ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(x(cuffU-.07),cuffTop);ctx.lineTo(x(cuffU+.07),cuffTop);ctx.stroke();
    ctx.setLineDash([]);
    drawPlacementLabel(ctx,'Puño '+v8217FormatCm(h.cuffRibCm),x(cuffU),cuffTop-11,'center');
  }
  ctx.restore();
}
const drawPlacementBaselineBeforeV8217=typeof drawPlacementBaseline==='function'?drawPlacementBaseline:null;
if(drawPlacementBaselineBeforeV8217)drawPlacementBaseline=function(ctx,view){
  const frame=drawPlacementBaselineBeforeV8217(ctx,view);
  try{v8217RulerMarks(ctx,frame,view)}catch{}
  return frame;
};
/* Despiece: standard measure for the selected part; hoodie hem reads Pretina. */
const despiecePartLabelBeforeV8217=despiecePartLabel;
despiecePartLabel=function(key,garment=state.garment){
  if(key==='dobladillo'&&garment==='hoodie')return 'Pretina';
  return despiecePartLabelBeforeV8217(key,garment);
};
function despiecePartStandard(key,g=state.garment){
  if(g==='polo'&&typeof ensurePolo==='function'){
    const p=ensurePolo(),lines=v8217StandardLines('polo');
    if(key==='cuello')return lines[0]+' · resto '+poloResolvedCollarColor(p).toUpperCase();
    if(key==='punos')return lines[1];
    if(key==='dobladillo')return 'Costura '+v8217FormatCm(p.cuffSeamCm)+' (0.5–1.0 cm)'+(p.sideVents?' · abertura lateral '+v8217FormatCm(p.ventHeightCm):'');
    if(key==='aletilla')return p.aletilla?('Aletilla de caja · '+p.aletillaButtons+' botones · líneas de detalle '+(Math.round(p.detailLineMm*10)/10).toFixed(1)+' mm'):'';
    return '';
  }
  if(g==='hoodie'){
    const h=ensureHoodieStd();
    if(key==='punos')return 'Puño cardigán (rib) '+v8217FormatCm(h.cuffRibCm)+' a costura';
    if(key==='dobladillo')return 'Pretina (rib) '+v8217FormatCm(h.waistbandCm)+' a costura';
    return '';
  }
  return '';
}
function syncDespieceStandard(){
  const el=$('#despiecePartStd');if(!el)return;
  const text=typeof selectedDespiecePart==='string'?despiecePartStandard(selectedDespiecePart):'';
  el.hidden=!text;
  el.textContent=text?'Estándar MGM: '+text:'';
}
if(typeof syncDespieceEditor==='function'){
  const syncDespieceEditorBeforeV8217=syncDespieceEditor;
  syncDespieceEditor=function(){syncDespieceEditorBeforeV8217();syncDespieceStandard()};
}
if(typeof referenceDespiece==='function'){
  const referenceDespieceBeforeV8217=referenceDespiece;
  referenceDespiece=function(report){
    referenceDespieceBeforeV8217(report);
    for(const key of visibleCostPartKeys()){
      const text=despiecePartStandard(key);
      if(text)report.row(despiecePartDisplayName(key)+' · estándar',text);
    }
  };
}
const syncPoloBeforeV8217=typeof syncPolo==='function'?syncPolo:null;
if(syncPoloBeforeV8217)syncPolo=function(){syncPoloBeforeV8217();syncHoodieStd()};
const populateBeforeV8217=populate;
populate=function(){populateBeforeV8217();syncHoodieStd()};
const changedBeforeV8217=changed;
changed=function(){changedBeforeV8217();syncHoodieStd()};
const uiBeforeV8217=initUI;
initUI=function(){
  uiBeforeV8217();
  for(const el of $$('[data-hoodie-std]')){
    if(el.dataset.hoodieStdBound)continue;
    el.dataset.hoodieStdBound='1';
    el.addEventListener('input',()=>{hoodieStdAssignField(el.dataset.hoodieStd,el,false);changed()});
    el.addEventListener('change',()=>{hoodieStdAssignField(el.dataset.hoodieStd,el,true);changed()});
  }
  syncHoodieStd();
};
