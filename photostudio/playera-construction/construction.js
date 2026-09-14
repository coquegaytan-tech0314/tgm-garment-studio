/* MGM playera cuello redondo measurement standards. Optional pedido fields; schema VERSION stays 8.
   Specs live in Tallas / Regla / ficha. Photoreal Acabado is not painted with construction overlays. */
const TGM_PLAYERA_SEAM_MIN_CM=.5,TGM_PLAYERA_SEAM_MAX_CM=1,TGM_PLAYERA_SEAM_CM=.75,TGM_PLAYERA_CHEST_BELOW_SISA_IN=1;
const ROUND_NECK_NUMBER_FIELDS={seamCm:[.3,2,false]};
const ROUND_NECK_MEASURE_KEYS=['playera','zipneck','sleeveless','sleevelessMujer'];
const ROUND_NECK_SIZE_M={
  playera:{chestCm:52,lengthCm:70,shoulderCm:46,sleeveCm:20},
  zipneck:{chestCm:52,lengthCm:74,shoulderCm:46,sleeveCm:62},
  sleeveless:{chestCm:46,lengthCm:66,shoulderCm:38,sleeveCm:null},
  sleevelessMujer:{chestCm:42,lengthCm:60,shoulderCm:36,sleeveCm:null}
};
const ROUND_NECK_GUIDE_EXTRAS={
  playera:{armholeV:.36,chestV:.393,chestLeftU:.205,chestRightU:.795,shoulderV:.082,shoulderLeftU:.248,shoulderRightU:.752,sleeveEndLeftU:.045,sleeveEndRightU:.955,sleeveEndV:.30,shoulderCm:46,sleeveCm:20},
  zipneck:{armholeV:.20,chestV:.233,chestLeftU:.20,chestRightU:.80,shoulderV:.078,shoulderLeftU:.236,shoulderRightU:.764,sleeveEndLeftU:.03,sleeveEndRightU:.97,sleeveEndV:.90,shoulderCm:46,sleeveCm:62},
  sleeveless:{armholeV:.28,chestV:.313,chestLeftU:.30,chestRightU:.70,shoulderV:.055,shoulderLeftU:.30,shoulderRightU:.70,shoulderCm:38},
  sleevelessMujer:{armholeV:.27,chestV:.303,chestLeftU:.32,chestRightU:.68,shoulderV:.056,shoulderLeftU:.32,shoulderRightU:.68,shoulderCm:36}
};
const ROUND_NECK_METHODS={
  chest:'A · Ancho de tórax: 1″ (2.54 cm) bajo sisa, de borde a borde (sisa a sisa).',
  length:'C · Largo desde HPS: unión cuello-cuerpo, vertical al faldón. La punta del cuello no cuenta.',
  shoulder:'B · Ancho de espalda / hombros: costura a costura (unión manga–sisa), horizontal.',
  sleeve:'D · Largo de manga: desde la costura del hombro hasta el extremo (incluye zona de costura del puño).'
};
if(typeof MEASUREMENTS==='object'){
  MEASUREMENTS.chest='Ancho de tórax';
  MEASUREMENTS.length='Largo desde HPS';
  MEASUREMENTS.shoulder='Ancho de espalda / hombros';
  MEASUREMENTS.sleeve='Largo de manga';
}
if(typeof PLACEMENT_GUIDES==='object'){
  for(const key of ROUND_NECK_MEASURE_KEYS){
    if(PLACEMENT_GUIDES[key])Object.assign(PLACEMENT_GUIDES[key],ROUND_NECK_GUIDE_EXTRAS[key]);
  }
}
function roundNeckStdDefaults(){return {seamCm:TGM_PLAYERA_SEAM_CM}}
function mergeRoundNeckDefaults(raw){
  return {...roundNeckStdDefaults(),...(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{})};
}
function ensureRoundNeckConstruction(p){
  const d=roundNeckStdDefaults();
  const out=p&&typeof p==='object'&&!Array.isArray(p)?{...d,...p}:d;
  if(out.seamCm==null)out.seamCm=d.seamCm;
  return out;
}
function ensureRoundNeck(){
  state.roundNeck=ensureRoundNeckConstruction(state.roundNeck);
  return state.roundNeck;
}
function roundNeckMeasureFamily(g=state.garment){return g==='playera'||g==='zipneck'||g==='sleeveless'}
function roundNeckGuideKey(g=state.garment){return typeof placementGuideKey==='function'?placementGuideKey(g):g}
function roundNeckSizeM(g=state.garment){return ROUND_NECK_SIZE_M[roundNeckGuideKey(g)]||ROUND_NECK_SIZE_M[g]||ROUND_NECK_SIZE_M.playera}
function roundNeckHasSleeves(g=state.garment){return g!=='sleeveless'}
function roundNeckPaintsAcabadoOverlays(){return false}
function roundNeckFormatCm(n){const x=Math.round(Number(n)*100)/100;return(Number.isInteger(x*10)?x.toFixed(1):String(x))+' cm'}
function roundNeckMethodNote(){
  return 'Hoja de medición: A tórax 1″ bajo sisa · B espalda/hombros costura a costura · C largo desde HPS · D manga desde hombro. Costura promedio 0.5–1.0 cm.';
}
function roundNeckRefLine(){
  const m=roundNeckSizeM(),p=ensureRoundNeck();
  const parts=['Referencia talla M: tórax '+roundNeckFormatCm(m.chestCm),'largo HPS '+roundNeckFormatCm(m.lengthCm),'hombros '+roundNeckFormatCm(m.shoulderCm)];
  if(m.sleeveCm!=null)parts.push('manga '+roundNeckFormatCm(m.sleeveCm));
  parts.push('costura '+roundNeckFormatCm(p.seamCm)+' (rango 0.5–1.0 cm)');
  return parts.join(' · ');
}
function roundNeckConstructionRows(){
  if(!roundNeckMeasureFamily())return [];
  const p=ensureRoundNeck(),m=roundNeckSizeM(),rows=[];
  rows.push(['Ancho de tórax (A)','1″ (2.54 cm) bajo sisa, borde a borde · ref. M '+roundNeckFormatCm(m.chestCm)]);
  rows.push(['Ancho de espalda / hombros (B)','costura a costura (unión manga–sisa), horizontal · ref. M '+roundNeckFormatCm(m.shoulderCm)]);
  rows.push(['Largo desde HPS (C)','unión cuello-cuerpo, vertical al faldón (sin punta de cuello) · ref. M '+roundNeckFormatCm(m.lengthCm)]);
  if(roundNeckHasSleeves()&&m.sleeveCm!=null)rows.push(['Largo de manga (D)','desde la costura del hombro al extremo, con zona de costura del puño · ref. M '+roundNeckFormatCm(m.sleeveCm)]);
  else if(!roundNeckHasSleeves())rows.push(['Largo de manga (D)','Sin manga · la sisa se mide en el borde de la abertura']);
  rows.push(['Costura',roundNeckFormatCm(p.seamCm)+' (rango 0.5–1.0 cm) · faldón, aberturas de manga y uniones. Líneas punteadas = costura.']);
  return rows;
}
function roundNeckFichaSummary(){return roundNeckConstructionRows().map(([label,text])=>label+': '+text).join('\n')}
function validateRoundNeckConstruction(raw,base){
  const d=roundNeckStdDefaults();
  const src=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const out=ensureRoundNeckConstruction({...d,...base});
  const value=src.seamCm??d.seamCm;
  out.seamCm=numeric(typeof value==='number'?value:Number(value),.3,2,'costura');
  return out;
}
function roundNeckAssignField(key,el,commit=false){
  const p=ensureRoundNeck();
  if(!ROUND_NECK_NUMBER_FIELDS[key]){p[key]=el.value;return}
  const[min,max]=ROUND_NECK_NUMBER_FIELDS[key];
  const raw=String(el.value).trim();
  let n=Number(raw);
  if(raw===''||raw==='-'||raw==='.'||raw==='-.'||!Number.isFinite(n)){
    if(commit){n=roundNeckStdDefaults()[key];p[key]=n;el.value=n}
    return;
  }
  if(!commit&&n<min&&n>=0)return;
  n=clamp(n,min,max);
  p[key]=n;
  if(commit&&String(el.value)!==String(n))el.value=n;
}
function applyRoundNeckMeasureLabels(){
  $$('#measurementRows tr').forEach(row=>{
    const input=row.querySelector('[data-measure]');
    if(!input)return;
    const key=input.dataset.measure,th=row.querySelector('th');
    if(th&&MEASUREMENTS[key]){
      th.textContent=MEASUREMENTS[key];
      th.title=ROUND_NECK_METHODS[key]||'';
    }
    if(input)input.setAttribute('aria-label',(MEASUREMENTS[key]||key)+' talla '+input.dataset.size+' en cm');
  });
}
function syncRoundNeck(){
  const p=ensureRoundNeck();
  const show=roundNeckMeasureFamily();
  const extras=$('#roundNeckExtras'),tallas=$('#roundNeckTallas'),ficha=$('#roundNeckFichaSpecs'),text=$('#roundNeckFichaText'),ref=$('#roundNeckTallasRef');
  if(extras)extras.hidden=!show;
  if(tallas)tallas.hidden=!show;
  if(ficha){ficha.hidden=!show;if(text&&show)text.textContent=roundNeckFichaSummary()}
  if(ref&&show)ref.textContent=roundNeckRefLine()+' · Manga larga / sisada comparten A, B y C cuando usan este modelo de cuerpo.';
  for(const el of $$('[data-round-neck]')){
    if(document.activeElement===el)continue;
    const value=p[el.dataset.roundNeck];
    if(value!=null)el.value=value;
  }
}
function roundNeckGuideFrame(view){
  const r=photoRect(state.garment,view||'front'),g=placementGuide();
  const x=(u)=>r.x+r.w*u,y=(v)=>r.y+r.h*v;
  return {
    chestY:y(g.chestV??.39),chestLeft:x(g.chestLeftU??g.leftU),chestRight:x(g.chestRightU??g.rightU),
    shoulderY:y(g.shoulderV??.08),shoulderLeft:x(g.shoulderLeftU??.25),shoulderRight:x(g.shoulderRightU??.75),
    sleeveEndY:y(g.sleeveEndV??.30),sleeveEndLeft:x(g.sleeveEndLeftU??.05),sleeveEndRight:x(g.sleeveEndRightU??.95),
    armholeY:y(g.armholeV??.36),
    shoulderCm:g.shoulderCm,sleeveCm:g.sleeveCm,chestCm:g.chestCm,lengthCm:g.lengthCm
  };
}
function drawRoundNeckDimLine(ctx,x1,y1,x2,y2){
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}
function drawRoundNeckTicks(ctx,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1,nx=-dy/len*5,ny=dx/len*5;
  ctx.beginPath();ctx.moveTo(x1-nx,y1-ny);ctx.lineTo(x1+nx,y1+ny);ctx.moveTo(x2-nx,y2-ny);ctx.lineTo(x2+nx,y2+ny);ctx.stroke();
}
function drawRoundNeckMeasureGuides(ctx,frame,view){
  if(!roundNeckMeasureFamily())return;
  const extra=roundNeckGuideFrame(view),p=ensureRoundNeck(),m=roundNeckSizeM();
  ctx.save();
  ctx.strokeStyle='#012169';
  ctx.lineWidth=1.35;
  ctx.setLineDash([5,4]);
  drawRoundNeckDimLine(ctx,extra.chestLeft,extra.chestY,extra.chestRight,extra.chestY);
  drawRoundNeckDimLine(ctx,extra.shoulderLeft,extra.shoulderY,extra.shoulderRight,extra.shoulderY);
  ctx.setLineDash([]);
  ctx.lineWidth=1.15;
  drawRoundNeckTicks(ctx,extra.chestLeft,extra.chestY,extra.chestRight,extra.chestY);
  drawRoundNeckTicks(ctx,extra.shoulderLeft,extra.shoulderY,extra.shoulderRight,extra.shoulderY);
  drawPlacementLabel(ctx,'A · Ancho de tórax '+formatDual(extra.chestCm??m.chestCm),(extra.chestLeft+extra.chestRight)/2,extra.chestY+14,'center');
  drawPlacementLabel(ctx,'B · Ancho de espalda '+formatDual(extra.shoulderCm??m.shoulderCm),extra.shoulderRight+8,extra.shoulderY,'left');
  drawPlacementLabel(ctx,'C · Largo desde HPS',frame.left+12,(frame.neck+frame.hem)/2+18,'left');
  ctx.strokeStyle='#E8B923';
  ctx.lineWidth=1.6;
  ctx.setLineDash([3,3]);
  drawRoundNeckDimLine(ctx,frame.hpsLeft,frame.neck,extra.shoulderLeft,extra.shoulderY);
  drawRoundNeckDimLine(ctx,frame.hpsRight,frame.neck,extra.shoulderRight,extra.shoulderY);
  ctx.setLineDash([]);
  if(roundNeckHasSleeves()&&extra.sleeveCm){
    ctx.strokeStyle='#012169';
    ctx.lineWidth=1.25;
    ctx.setLineDash([4,3]);
    drawRoundNeckDimLine(ctx,extra.shoulderRight,extra.shoulderY,extra.sleeveEndRight,extra.sleeveEndY);
    drawRoundNeckTicks(ctx,extra.shoulderRight,extra.shoulderY,extra.sleeveEndRight,extra.sleeveEndY);
    ctx.setLineDash([]);
    drawPlacementLabel(ctx,'D · Largo de manga '+formatDual(extra.sleeveCm),(extra.shoulderRight+extra.sleeveEndRight)/2+8,(extra.shoulderY+extra.sleeveEndY)/2,'left');
  }
  const seamPx=p.seamCm/Math.max(.01,frame.cmPerY||(m.lengthCm/Math.max(1,frame.hem-frame.neck)));
  if(seamPx>0){
    const hemSeam=frame.hem-seamPx;
    ctx.strokeStyle='#01216999';
    ctx.lineWidth=1.05;
    ctx.setLineDash([2,3]);
    drawRoundNeckDimLine(ctx,frame.left+8,hemSeam,frame.right-8,hemSeam);
    ctx.setLineDash([]);
    drawPlacementLabel(ctx,'Costura '+roundNeckFormatCm(p.seamCm)+' (0.5–1 cm)',frame.right+8,hemSeam,'left');
  }
  ctx.restore();
}

const blankBeforeRoundNeck=blank;
blank=function(){const out=blankBeforeRoundNeck();out.roundNeck=mergeRoundNeckDefaults(out.roundNeck);return out};
const validateOrderBeforeRoundNeck=validateOrder;
validateOrder=async function(raw){
  const out=await validateOrderBeforeRoundNeck(raw);
  out.roundNeck=validateRoundNeckConstruction(raw?.roundNeck,out.roundNeck);
  return out;
};
const specsBeforeRoundNeck=clientSpecLines;
clientSpecLines=function(){
  const rows=specsBeforeRoundNeck();
  if(!roundNeckMeasureFamily())return rows;
  const conf=rows.findIndex(row=>row[0]==='Confección');
  rows.splice(conf<0?rows.length:conf+1,0,...roundNeckConstructionRows());
  return rows;
};
const placementFrameBeforeRoundNeck=typeof placementFrame==='function'?placementFrame:null;
if(placementFrameBeforeRoundNeck)placementFrame=function(view){
  const frame=placementFrameBeforeRoundNeck(view);
  if(!roundNeckMeasureFamily())return frame;
  const extra=roundNeckGuideFrame(view);
  return {...frame,...extra};
};
const drawPlacementBaselineBeforeRoundNeck=typeof drawPlacementBaseline==='function'?drawPlacementBaseline:null;
if(drawPlacementBaselineBeforeRoundNeck)drawPlacementBaseline=function(ctx,view){
  const frame=drawPlacementBaselineBeforeRoundNeck(ctx,view);
  drawRoundNeckMeasureGuides(ctx,frame,view);
  return frame;
};
const placementFichaTextBeforeRoundNeck=typeof placementFichaText==='function'?placementFichaText:null;
if(placementFichaTextBeforeRoundNeck)placementFichaText=function(a){
  const base=placementFichaTextBeforeRoundNeck(a);
  if(!roundNeckMeasureFamily())return base;
  return base+'\n'+roundNeckMethodNote();
};
const syncPoloBeforeRoundNeck=typeof syncPolo==='function'?syncPolo:null;
if(syncPoloBeforeRoundNeck)syncPolo=function(){syncPoloBeforeRoundNeck();syncRoundNeck()};
const populateBeforeRoundNeck=populate;
populate=function(){populateBeforeRoundNeck();applyRoundNeckMeasureLabels();syncRoundNeck()};
const changedBeforeRoundNeck=changed;
changed=function(){changedBeforeRoundNeck();syncRoundNeck()};
const uiBeforeRoundNeck=initUI;
initUI=function(){
  uiBeforeRoundNeck();
  applyRoundNeckMeasureLabels();
  for(const el of $$('[data-round-neck]')){
    if(el.dataset.roundNeckBound)continue;
    el.dataset.roundNeckBound='1';
    el.addEventListener(el.type==='checkbox'?'change':'input',()=>{roundNeckAssignField(el.dataset.roundNeck,el,false);changed()});
    if(el.type!=='checkbox')el.addEventListener('change',()=>{roundNeckAssignField(el.dataset.roundNeck,el,true);changed()});
  }
  syncRoundNeck();
};
