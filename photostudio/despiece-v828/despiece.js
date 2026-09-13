/* Despiece / costo por parte. Optional costing.parts on tgm-pedido v8. */
const COST_PART_KEYS=['cuello','cuerpo','mangas','punos','dobladillo','etiqueta','aletilla','estampado'];
const COST_PART_LABELS={cuello:'Cuello',cuerpo:'Cuerpo',mangas:'Mangas',punos:'Puños',dobladillo:'Dobladillo',etiqueta:'Etiqueta',aletilla:'Aletilla',estampado:'Estampado'};
let despieceMode=false,despieceExploded=true,selectedDespiecePart='cuerpo',despieceReady=false;
function blankCostParts(){return Object.fromEntries(COST_PART_KEYS.map(key=>[key,'']))}
function ensureCostParts(){
  const c=ensureCosting();
  if(!c.parts||typeof c.parts!=='object'||Array.isArray(c.parts))c.parts=blankCostParts();
  for(const key of COST_PART_KEYS)if(c.parts[key]===undefined)c.parts[key]='';
  if(!c.artworkCents||typeof c.artworkCents!=='object'||Array.isArray(c.artworkCents))c.artworkCents={};
  return c;
}
function despiecePartLabel(key,garment=state.garment){
  if(key==='cuello')return garment==='hoodie'?'Capucha':garment==='zipneck'?'Cuello con cierre':'Cuello';
  if(key==='punos')return garment==='sleeveless'?'Sisa':'Puños';
  return COST_PART_LABELS[key]||key;
}
function despiecePartVisible(key,garment=state.garment){
  if(key==='aletilla')return garment==='polo';
  if(key==='mangas')return garment!=='sleeveless';
  return COST_PART_KEYS.includes(key);
}
function visibleCostPartKeys(garment=state.garment){return COST_PART_KEYS.filter(key=>despiecePartVisible(key,garment))}
function validateCostParts(raw){
  if(raw===undefined)return blankCostParts();
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Despiece de costos inválido.');
  const out=blankCostParts();
  for(const key of COST_PART_KEYS){
    const value=raw[key];
    if(value===undefined||value===''){out[key]='';continue}
    if(!Number.isSafeInteger(value)||value<0||value>PRICE_MAX_CENTS)throw Error('Costo por parte inválido: '+key);
    out[key]=value;
  }
  return out;
}
function validateArtworkCents(raw){
  if(raw===undefined)return {};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Costos de estampado inválidos.');
  const out={};
  for(const [id,value] of Object.entries(raw)){
    const key=safeString(id,80,'aplicación');
    if(value===''||value===undefined)continue;
    if(!Number.isSafeInteger(value)||value<0||value>PRICE_MAX_CENTS)throw Error('Costo de estampado inválido.');
    out[key]=value;
  }
  return out;
}
function partCostSummary(garment=state.garment){
  const parts=ensureCostParts().parts,keys=visibleCostPartKeys(garment);
  const values=keys.map(key=>parts[key]).filter(value=>value!=='');
  return {count:values.length,needed:keys.length,cents:values.reduce((sum,value)=>sum+value,0),complete:values.length===keys.length};
}
function formatPartMoney(cents){return cents===''?'Por definir':formatGarmentMoney(cents)}
function artworkCostLabel(art,index){
  const name=(art.logo&&art.logo.name)||art.text||art.fileName||('Aplicación '+(index+1));
  const zone=ZONES[art.zone]?.label||art.zone||'';
  const side=art.view==='back'?'Espalda':'Frente';
  return (name+' · '+side+(zone?' · '+zone:'')).slice(0,80);
}
function syncEstampadoFromArtwork(){
  const c=ensureCostParts(),ids=(state.artworks||[]).map(art=>art.id).filter(id=>c.artworkCents[id]!==undefined);
  if(!ids.length)return;
  c.parts.estampado=ids.reduce((sum,id)=>sum+(c.artworkCents[id]===''?0:c.artworkCents[id]),0);
}
function setDespiecePartCents(key,cents){
  if(!COST_PART_KEYS.includes(key))return;
  ensureCostParts().parts[key]=cents;
  if(key==='estampado'){/* manual total kept as captured */}
}
function selectDespiecePart(key){
  if(!despiecePartVisible(key))return false;
  selectedDespiecePart=key;
  syncDespieceEditor();
  paintDespieceSelection();
  return true;
}
function isDespieceMode(){return despieceMode}
function enterDespieceMode(){
  const p=ensurePhoto(),fromOrbit=p.side==='orbit';
  despieceMode=true;
  if(fromOrbit)p.side='front';
  if(!despiecePartVisible(selectedDespiecePart))selectedDespiecePart=visibleCostPartKeys()[0]||'cuerpo';
  setWorkspace('photo',false);
  if(fromOrbit)changed();
  else{syncPhotoUI();refreshDespieceSvg()}
}
function exitDespieceMode(){
  if(!despieceMode)return;
  despieceMode=false;
  syncPhotoUI();
}
function toggleDespieceExplode(on= !despieceExploded){
  despieceExploded=!!on;
  const stage=$('#photoStage'),btn=$('#despieceExplode');
  if(stage)stage.dataset.exploded=despieceExploded?'true':'false';
  if(btn){btn.setAttribute('aria-pressed',despieceExploded);btn.textContent=despieceExploded?'Separar':'Unir'}
}

function despieceFill(key){
  const body=state.bodyColor,contrast=state.contrastColor;
  if(key==='cuello')return state.contrast.neck?contrast:shade(body,state.garment==='hoodie'?-18:-8);
  if(key==='punos')return state.contrast.cuff?contrast:shade(body,-14);
  if(key==='dobladillo')return state.contrast.hem?contrast:shade(body,-10);
  if(key==='aletilla')return shade(state.contrast.neck?contrast:body,12);
  if(key==='etiqueta')return '#d8d3c6';
  if(key==='estampado')return shade('#f4f0ea',0,.92);
  return body;
}
function despieceShapes(garment=state.garment){
  const hoodie=garment==='hoodie',polo=garment==='polo',crop=garment==='sleeveless',zip=garment==='zipneck';
  const body=crop
    ?['M304 168 Q268 176 238 196 L216 228 Q168 304 202 400 L220 640 Q400 668 580 640 L598 400 Q632 304 584 228 L562 196 Q532 176 496 168 Q400 198 304 168 Z']
    :hoodie
      ?['M300 210 Q268 228 248 248 L168 308 Q150 328 140 372 L92 690 Q400 742 708 690 L660 372 Q650 328 632 308 L552 248 Q532 228 500 210 Z']
      :zip
        ?['M298 188 Q266 198 236 214 L160 286 Q140 308 128 352 L78 690 Q400 736 722 690 L672 352 Q660 308 640 286 L564 214 Q534 198 502 188 Q400 216 298 188 Z']
        :['M292 198 Q262 206 236 220 L118 286 Q108 322 148 368 L226 332 L232 698 Q400 728 568 698 L574 332 L652 368 Q692 322 682 286 L564 220 Q538 206 508 198 Q400 226 292 198 Z'];
  const sleeves=crop?[]:hoodie||zip
    ?['M236 214 L128 292 L62 668 L168 686 L214 390 L248 248 Z','M564 214 L672 292 L738 668 L632 686 L586 390 L552 248 Z']
    :['M236 220 L96 278 L142 392 L248 338 Z','M564 220 L704 278 L658 392 L552 338 Z'];
  const cuffs=crop
    ?['M216 228 Q168 304 202 400 L226 392 Q198 314 238 196 Z','M584 228 Q632 304 598 400 L574 392 Q602 314 562 196 Z']
    :hoodie||zip
      ?['M62 668 Q92 710 168 686 L148 648 Z','M738 668 Q708 710 632 686 L652 648 Z']
      :['M90 274 L48 332 L118 402 L154 348 Z','M710 274 L752 332 L682 402 L646 348 Z'];
  const neck=hoodie
    ?['M268 86 Q400 18 532 86 L548 214 Q400 258 252 214 Z']
    :zip
      ?['M304 148 Q400 108 496 148 L484 214 Q400 238 316 214 Z','M388 176 L412 176 L414 338 L386 338 Z']
      :polo
        ?['M306 148 Q400 132 494 148 L476 204 Q400 244 324 204 Z','M381 186 L419 186 L420 322 L380 322 Z']
        :['M300 150 Q400 108 500 150 Q490 232 400 236 Q310 232 300 150 Z'];
  const hem=crop
    ?['M220 628 Q400 656 580 628 L580 662 Q400 688 220 662 Z']
    :hoodie||zip
      ?['M118 686 Q400 742 682 686 L682 724 Q400 778 118 724 Z']
      :['M232 688 Q400 718 568 688 L568 728 Q400 756 232 728 Z'];
  const label=['M422 196 H466 V220 H422 Z'];
  const placket=polo?['M384 214 L416 214 L418 358 L382 358 Z']:[];
  const print=['M332 348 H468 V452 H332 Z'];
  return {cuerpo:body,mangas:sleeves,punos:cuffs,cuello:neck,dobladillo:hem,etiqueta:label,aletilla:placket,estampado:print};
}
function despieceTagAnchor(key,garment=state.garment){
  const hoodie=garment==='hoodie',crop=garment==='sleeveless',zip=garment==='zipneck';
  return {
    cuello:hoodie?[318,58]:zip?[318,96]:[318,108],
    cuerpo:[318,470],
    mangas:crop?[120,240]:[96,300],
    punos:crop?[96,300]:[64,360],
    dobladillo:[318,748],
    etiqueta:[478,168],
    aletilla:[430,268],
    estampado:[488,372]
  }[key]||[400,400];
}
function despieceSvgMarkup(){
  const garment=state.garment,shapes=despieceShapes(garment);
  let svg='<ellipse class="despiece-floor" cx="400" cy="842" rx="186" ry="22"/>';
  for(const key of COST_PART_KEYS){
    const paths=shapes[key]||[];
    if(!paths.length||!despiecePartVisible(key,garment))continue;
    const [tx,ty]=despieceTagAnchor(key,garment);
    const fill=despieceFill(key);
    svg+='<g class="despiece-part" id="despieceHit-'+key+'" data-part="'+key+'" tabindex="0" role="button" aria-pressed="'+(selectedDespiecePart===key)+'">';
    for(const d of paths)svg+='<path d="'+d+'" fill="'+fill+'"/>';
    if(key==='cuerpo'||key==='mangas'||key==='dobladillo')svg+='<path class="despiece-stitch" d="'+(paths[0]||'')+'"/>';
    svg+='<g class="despiece-tag" transform="translate('+tx+' '+ty+')"><rect class="despiece-tag-bg" x="0" y="0" width="118" height="36" rx="8"/><text class="despiece-tag-name" x="10" y="15">'+despiecePartLabel(key,garment)+'</text><text class="despiece-tag-cost" id="despieceTag-'+key+'" x="10" y="29">'+formatPartMoney(ensureCostParts().parts[key])+'</text></g>';
    svg+='</g>';
  }
  return svg;
}
function refreshDespieceSvg(){
  const svg=$('#despieceSvg');if(!svg)return;
  svg.innerHTML=despieceSvgMarkup();
  svg.setAttribute('data-despiece-shape',state.garment);
  ensureDespieceHitButtons();
  for(const key of COST_PART_KEYS){
    const chip=findDespieceNode('#despieceHit-'+key);
    if(chip)chip.textContent=despiecePartLabel(key);
  }
  bindDespieceHits();
  paintDespieceSelection();
}
function despiecePartNodes(){return document.querySelectorAll('[data-part]')}
function bindDespieceHits(){
  for(const node of despiecePartNodes()){
    if(node._despieceBound)continue;
    node._despieceBound=true;
    const pick=()=>selectDespiecePart(node.getAttribute('data-part')||node.dataset.part);
    node.addEventListener('click',e=>{e.preventDefault?.();pick()});
    node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault?.();pick()}});
  }
}
function paintDespieceSelection(){
  for(const node of despiecePartNodes()){
    const key=node.getAttribute('data-part')||node.dataset.part;
    node.setAttribute('aria-pressed',key===selectedDespiecePart);
    const hide=!despiecePartVisible(key);
    node.hidden=hide;
    if(node.style)node.style.display=hide?'none':'';
  }
}
function ensureDespieceHitButtons(){
  const host=findDespieceNode('#despieceHits');if(!host||host._despieceHits)return;
  host._despieceHits=true;
  for(const key of COST_PART_KEYS){
    const b=document.createElement('button');
    b.id='despieceHit-'+key;b.type='button';b.setAttribute('data-part',key);b.textContent=despiecePartLabel(key);
    b.addEventListener('click',()=>selectDespiecePart(key));
    host.append(b);
  }
}
function findDespieceNode(sel){return document.querySelectorAll(sel)[0]||null}
function refreshDespieceTags(){
  const parts=ensureCostParts().parts;
  for(const key of COST_PART_KEYS){
    const el=findDespieceNode('#despieceTag-'+key);
    if(el)el.textContent=formatPartMoney(parts[key]);
  }
}
function syncDespieceEditor(){
  const key=despiecePartVisible(selectedDespiecePart)?selectedDespiecePart:(visibleCostPartKeys()[0]||'cuerpo');
  selectedDespiecePart=key;
  const parts=ensureCostParts().parts;
  const name=$('#despiecePartName'),input=$('#despiecePartCost'),err=$('#despiecePartError');
  if(name)name.textContent=despiecePartLabel(key);
  if(input&&document.activeElement!==input)input.value=priceInputValue(parts[key]);
  if(err)err.textContent='';
  syncDespieceArtCosts();
  syncDespieceTotals();
}
function syncDespieceArtCosts(){
  const box=$('#despieceArtCosts');if(!box)return;
  const show=selectedDespiecePart==='estampado'&&(state.artworks||[]).some(photoArtworkVisible);
  box.hidden=!show;
  if(!show){box.replaceChildren();return}
  const cents=ensureCostParts().artworkCents;
  box.replaceChildren();
  const title=document.createElement('p');title.className='help';title.textContent='Por aplicación · la suma escribe el costo de estampado.';box.append(title);
  (state.artworks||[]).filter(photoArtworkVisible).forEach((art,index)=>{
    const field=document.createElement('div');field.className='field';
    const label=document.createElement('label');label.setAttribute('for','despieceArt-'+art.id);label.textContent=artworkCostLabel(art,index);
    const input=document.createElement('input');input.id='despieceArt-'+art.id;input.dataset.artCost=art.id;input.type='text';input.inputMode='decimal';input.maxLength=12;input.placeholder='Por definir';input.value=priceInputValue(cents[art.id]??'');
    input.addEventListener('input',()=>{
      try{
        ensureCostParts().artworkCents[art.id]=parseGarmentPrice(input.value);
        $('#despiecePartError').textContent='';
        syncEstampadoFromArtwork();
        syncDespieceFields();changed();
      }catch(error){
        input.value=priceInputValue(ensureCostParts().artworkCents[art.id]??'');
        $('#despiecePartError').textContent=error.message+' Se conservó el último costo válido.';
      }
    });
    input.addEventListener('change',()=>{input.value=priceInputValue(ensureCostParts().artworkCents[art.id]??'')});
    field.append(label,input);box.append(field);
  });
}
function syncDespieceTotals(){
  const summary=partCostSummary(),amount=summary.count?formatPartMoney(summary.cents):'Por definir';
  const label=summary.complete?'Costo por partes · captura completa':summary.count?'Suma capturada · '+summary.count+' de '+summary.needed+' partes':'Partes por capturar';
  if($('#despieceTotalAmount'))$('#despieceTotalAmount').textContent=amount;
  if($('#despieceTotalLabel'))$('#despieceTotalLabel').textContent=label;
  if($('#despieceTotalHint'))$('#despieceTotalHint').textContent=summary.complete?'Suma de las partes visibles. No modifica el precio de venta.':'Deja vacío lo pendiente; captura 0 cuando no aplique.';
  if($('#costPartSummaryAmount'))$('#costPartSummaryAmount').textContent=amount;
  if($('#costPartSummaryLabel'))$('#costPartSummaryLabel').textContent=label;
  refreshDespieceTags();
  syncFichaDespiece();
}
function syncDespieceFields(){
  ensureCostParts();
  $$('[data-cost-part]').forEach(input=>{
    const key=input.dataset.costPart,visible=despiecePartVisible(key);
    const wrap=input.closest('[data-part-field]')||input.parentElement;
    if(wrap)wrap.hidden=!visible;
    if(document.activeElement!==input)input.value=visible?priceInputValue(ensureCostParts().parts[key]):'';
    input.disabled=!visible;
    input.placeholder=visible?'Por definir':'N/A en esta prenda';
    const lab=wrap&&wrap.querySelector('label');
    if(lab)lab.textContent=despiecePartLabel(key);
  });
  const aletilla=$('#costPart-aletilla');
  if(aletilla)aletilla.title=state.garment==='polo'?'Costo de la aletilla / tapeta':'No aplica fuera de polo';
  syncDespieceEditor();
}
function syncFichaDespiece(){
  const box=$('#fichaDespieceRows');if(!box)return;
  box.replaceChildren();
  const parts=ensureCostParts().parts,summary=partCostSummary();
  for(const key of visibleCostPartKeys()){
    const row=document.createElement('div');
    const name=document.createElement('span');name.textContent=despiecePartLabel(key);
    const value=document.createElement('strong');value.textContent=formatPartMoney(parts[key]);
    row.append(name,value);box.append(row);
  }
  const total=document.createElement('div');
  const name=document.createElement('span');name.textContent=summary.complete?'Total despiece':'Suma parcial';
  const value=document.createElement('strong');value.textContent=summary.count?formatPartMoney(summary.cents):'Por definir';
  total.append(name,value);box.append(total);
}
function referenceDespiece(report){
  const summary=partCostSummary(),parts=ensureCostParts().parts;
  report.section('DESPIECE · COSTO POR PARTE');
  for(const key of visibleCostPartKeys())report.row(despiecePartLabel(key),formatPartMoney(parts[key]));
  if((state.artworks||[]).length){
    const cents=ensureCostParts().artworkCents;
    (state.artworks||[]).filter(photoArtworkVisible).forEach((art,index)=>report.row('Estampado · '+artworkCostLabel(art,index),formatPartMoney(cents[art.id]??'')));
  }
  report.row(summary.complete?'Total por partes':'Suma parcial de partes',summary.count?formatPartMoney(summary.cents):'Por definir');
  report.row('Alcance','Uso interno. No modifica el precio de venta ni el PDF del cliente.');
}
function syncDespieceChrome(){
  const stage=$('#photoStage'),pane=$('#photoDespiece'),btn=$('#photoDespieceView');
  if(btn)btn.setAttribute('aria-pressed',despieceMode);
  if(pane)pane.hidden=!despieceMode;
  if(!stage)return;
  stage.classList.toggle('despiece-on',despieceMode);
  stage.dataset.exploded=despieceExploded?'true':'false';
  stage.dataset.despieceShape=state.garment;
  if(despieceMode){
    stage.dataset.view='despiece';
    $('#photoOrigin').textContent='Despiece · costo por parte · uso interno';
    if(!photoIssues().length)$('#photoStatus').textContent=despieceExploded?'Prenda separada · toca cuello, cuerpo, mangas…':'Prenda unida · toca una parte o Separar';
    toggleDespieceExplode(despieceExploded);
    refreshDespieceSvg();
  }
}

function initDespiece(){
  if(despieceReady||!$('#photoDespieceView'))return;
  despieceReady=true;
  ensureCostParts();
  $$('[data-photo-view]').forEach(b=>b.addEventListener('click',()=>{despieceMode=false},true));
  $('#photoDespieceView').addEventListener('click',()=>enterDespieceMode());
  $('#despieceExplode')?.addEventListener('click',()=>toggleDespieceExplode());
  $('#openDespiece')?.addEventListener('click',()=>{enterDespieceMode();const costs=$('#internalCosts');if(costs)costs.open=true});
  $('#despiecePartCost')?.addEventListener('input',e=>{
    try{setDespiecePartCents(selectedDespiecePart,parseGarmentPrice(e.target.value));$('#despiecePartError').textContent='';syncDespieceFields();changed()}
    catch(error){e.target.value=priceInputValue(ensureCostParts().parts[selectedDespiecePart]);$('#despiecePartError').textContent=error.message+' Se conservó el último costo válido.'}
  });
  $('#despiecePartCost')?.addEventListener('change',()=>{$('#despiecePartCost').value=priceInputValue(ensureCostParts().parts[selectedDespiecePart])});
  $$('[data-cost-part]').forEach(input=>{
    input.addEventListener('input',()=>{
      if(!despiecePartVisible(input.dataset.costPart))return;
      try{setDespiecePartCents(input.dataset.costPart,parseGarmentPrice(input.value));selectDespiecePart(input.dataset.costPart);$('#costInputError').textContent='';syncDespieceFields();changed()}
      catch(error){input.value=priceInputValue(ensureCostParts().parts[input.dataset.costPart]);$('#costInputError').textContent=error.message+' Se conservó el último costo válido.'}
    });
    input.addEventListener('change',()=>{input.value=despiecePartVisible(input.dataset.costPart)?priceInputValue(ensureCostParts().parts[input.dataset.costPart]):''});
    input.addEventListener('focus',()=>{if(despiecePartVisible(input.dataset.costPart))selectDespiecePart(input.dataset.costPart)});
  });
  ensureDespieceHitButtons();
  refreshDespieceSvg();
  syncDespieceFields();
}

const blankBeforeDespiece=blank;
blank=function(){const out=blankBeforeDespiece();out.costing.parts=blankCostParts();out.costing.artworkCents={};return out};
const validateBeforeDespiece=validateOrder;
validateOrder=async function(raw){
  const out=await validateBeforeDespiece(raw);
  out.costing.parts=validateCostParts(raw.costing?.parts);
  out.costing.artworkCents=validateArtworkCents(raw.costing?.artworkCents);
  return out;
};
const syncPricingUIBeforeDespiece=syncPricingUI;
syncPricingUI=function(){syncPricingUIBeforeDespiece();syncDespieceFields()};
const referencePricingBeforeDespiece=referencePricing;
referencePricing=function(report){referencePricingBeforeDespiece(report);referenceDespiece(report)};
const syncPhotoUIBeforeDespiece=syncPhotoUI;
syncPhotoUI=function(){syncPhotoUIBeforeDespiece();syncDespieceChrome()};
const photoCanPlaceArtBeforeDespiece=photoCanPlaceArt;
photoCanPlaceArt=function(){return !despieceMode&&photoCanPlaceArtBeforeDespiece()};
if(typeof enterAcabadoPlaceMode==='function'){
  const enterPlaceBeforeDespiece=enterAcabadoPlaceMode;
  enterAcabadoPlaceMode=function(){despieceMode=false;return enterPlaceBeforeDespiece()};
}
const populateBeforeDespiece=populate;
populate=function(){
  populateBeforeDespiece();
  if(!despiecePartVisible(selectedDespiecePart))selectedDespiecePart=visibleCostPartKeys()[0]||'cuerpo';
  if(despieceMode)refreshDespieceSvg();
  syncDespieceFields();
};
const initPhotoBeforeDespiece=initPhoto;
initPhoto=function(){initPhotoBeforeDespiece();initDespiece()};
