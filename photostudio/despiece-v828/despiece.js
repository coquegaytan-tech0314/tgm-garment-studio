/* Despiece / detalle por parte. Optional costing.parts + partDetails on tgm-pedido v8. */
const COST_PART_KEYS=['cuello','cuerpo','mangas','punos','dobladillo','etiqueta','aletilla','estampado'];
const COST_PART_LABELS={cuello:'Cuello',cuerpo:'Cuerpo',mangas:'Mangas',punos:'Puños',dobladillo:'Dobladillo',etiqueta:'Etiqueta',aletilla:'Aletilla',estampado:'Estampado'};
const UNSET_PART_SWATCH='#f4f3ef';
let despieceMode=false,despieceExploded=true,selectedDespiecePart='cuerpo',despieceReady=false;
function blankCostParts(){return Object.fromEntries(COST_PART_KEYS.map(key=>[key,'']))}
function blankPartDetail(){return {label:'',notes:'',color:'',pantone:''}}
function blankPartDetails(){return Object.fromEntries(COST_PART_KEYS.map(key=>[key,blankPartDetail()]))}
function blankArtworkDetail(){return {notes:'',color:'',pantone:''}}
function ensureCostParts(){
  const c=ensureCosting();
  if(!c.parts||typeof c.parts!=='object'||Array.isArray(c.parts))c.parts=blankCostParts();
  for(const key of COST_PART_KEYS)if(c.parts[key]===undefined)c.parts[key]='';
  if(!c.artworkCents||typeof c.artworkCents!=='object'||Array.isArray(c.artworkCents))c.artworkCents={};
  if(!c.partDetails||typeof c.partDetails!=='object'||Array.isArray(c.partDetails))c.partDetails=blankPartDetails();
  for(const key of COST_PART_KEYS){
    const raw=c.partDetails[key];
    if(!raw||typeof raw!=='object'||Array.isArray(raw))c.partDetails[key]=blankPartDetail();
    else c.partDetails[key]={label:raw.label??'',notes:raw.notes??'',color:raw.color??'',pantone:raw.pantone??''};
  }
  if(!c.artworkDetails||typeof c.artworkDetails!=='object'||Array.isArray(c.artworkDetails))c.artworkDetails={};
  return c;
}
function ensurePartDetail(key){
  const details=ensureCostParts().partDetails;
  if(!details[key]||typeof details[key]!=='object')details[key]=blankPartDetail();
  return details[key];
}
function ensureArtworkDetail(id){
  const bag=ensureCostParts().artworkDetails;
  if(!bag[id]||typeof bag[id]!=='object'||Array.isArray(bag[id]))bag[id]=blankArtworkDetail();
  const raw=bag[id];
  bag[id]={notes:raw.notes??'',color:raw.color??'',pantone:raw.pantone??''};
  return bag[id];
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
function despiecePartDisplayName(key,garment=state.garment){
  const custom=String(ensurePartDetail(key).label||'').trim();
  return custom||despiecePartLabel(key,garment);
}
function parseOptionalPartHex(value){
  const text=String(value||'').trim();
  if(!text)return '';
  const hex=text.startsWith('#')?text:'#'+text;
  if(!validHex(hex))throw Error('Usa un color hexadecimal de seis dígitos o déjalo vacío.');
  return hex.toLowerCase();
}
function formatPartColor(detail){
  if(!detail)return '';
  const hex=detail.color?String(detail.color).toUpperCase():'';
  const pantone=String(detail.pantone||'').trim();
  return [hex,pantone].filter(Boolean).join(' · ');
}
function formatPartMeta(detail){
  if(!detail)return '';
  return [String(detail.notes||'').trim(),formatPartColor(detail)].filter(Boolean).join(' · ');
}
function validatePartDetailItem(raw,key){
  if(raw==null||raw==='')return blankPartDetail();
  if(typeof raw!=='object'||Array.isArray(raw))throw Error('Detalle de parte inválido: '+key);
  const color=raw.color===undefined||raw.color===''?'':safeString(raw.color,7,'color de '+key);
  if(color&&!validHex(color))throw Error('Color de parte inválido: '+key);
  return {
    label:safeString(raw.label??'',80,'nombre de '+key),
    notes:safeString(raw.notes??'',400,'detalle de '+key),
    color:color?color.toLowerCase():'',
    pantone:safeString(raw.pantone??'',40,'pantone de '+key)
  };
}
function validatePartDetails(raw){
  if(raw===undefined)return blankPartDetails();
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Detalle de despiece inválido.');
  const out=blankPartDetails();
  for(const key of COST_PART_KEYS)out[key]=validatePartDetailItem(raw[key],key);
  return out;
}
function validateArtworkDetails(raw){
  if(raw===undefined)return {};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Detalle de estampado inválido.');
  const out={};
  for(const [id,value] of Object.entries(raw)){
    const key=safeString(id,80,'aplicación');
    if(value==null||value==='')continue;
    out[key]=validatePartDetailItem({label:'',...value},'estampado');
    delete out[key].label;
  }
  return out;
}
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
  const custom=ensurePartDetail(key).color;
  if(custom&&validHex(custom))return custom;
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
function svgNode(tag,attrs){
  const ns='http://www.w3.org/2000/svg';
  const node=typeof document.createElementNS==='function'?document.createElementNS(ns,tag):document.createElement(tag);
  for(const [key,value] of Object.entries(attrs||{})){
    if(key==='text')node.textContent=value;
    else node.setAttribute(key,value);
  }
  return node;
}
function refreshDespieceSvg(){
  const svg=$('#despieceSvg');if(!svg)return;
  while(svg.firstChild)svg.removeChild(svg.firstChild);
  svg.setAttribute('data-despiece-shape',state.garment);
  const garment=state.garment,shapes=despieceShapes(garment);
  svg.append(svgNode('ellipse',{class:'despiece-floor',cx:'400',cy:'842',rx:'186',ry:'22'}));
  for(const key of COST_PART_KEYS){
    const paths=shapes[key]||[];
    if(!paths.length||!despiecePartVisible(key,garment))continue;
    const [tx,ty]=despieceTagAnchor(key,garment);
    const group=svgNode('g',{'class':'despiece-part','data-part':key,tabindex:'0',role:'button','aria-pressed':String(selectedDespiecePart===key)});
    for(const d of paths)group.append(svgNode('path',{d,fill:despieceFill(key)}));
    if(key==='cuerpo'||key==='mangas'||key==='dobladillo')group.append(svgNode('path',{'class':'despiece-stitch',d:paths[0]||'',fill:'none'}));
    const tag=svgNode('g',{'class':'despiece-tag',transform:'translate('+tx+' '+ty+')'});
    tag.append(svgNode('rect',{'class':'despiece-tag-bg',x:'0',y:'0',width:'118',height:'36',rx:'8'}));
    tag.append(svgNode('text',{'class':'despiece-tag-name',x:'10',y:'15',text:despiecePartDisplayName(key,garment)}));
    tag.append(svgNode('text',{'class':'despiece-tag-cost',id:'despieceTag-'+key,x:'10',y:'29',text:formatPartMoney(ensureCostParts().parts[key])}));
    group.append(tag);
    svg.append(group);
  }
  ensureDespieceHitButtons();
  for(const key of COST_PART_KEYS){
    const chip=findDespieceNode('#despieceHit-'+key);
    if(chip)chip.textContent=despiecePartDisplayName(key);
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
    node.setAttribute('aria-pressed',String(key===selectedDespiecePart));
    const hide=!despiecePartVisible(key);
    if((node.tagName||'').toLowerCase()==='button'){
      node.hidden=hide;
      if(node.style)node.style.display=hide?'none':'';
    }else{
      node.removeAttribute('hidden');
      node.setAttribute('visibility',hide?'hidden':'visible');
      if(node.style)node.style.display='';
    }
  }
}
function ensureDespieceHitButtons(){
  const host=findDespieceNode('#despieceHits');if(!host||host._despieceHits)return;
  host._despieceHits=true;
  for(const key of COST_PART_KEYS){
    const b=document.createElement('button');
    b.id='despieceHit-'+key;b.type='button';b.setAttribute('data-part',key);b.textContent=despiecePartDisplayName(key);
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
function syncColorPair(colorEl,hexEl,stored){
  const hex=stored&&validHex(stored)?stored.toLowerCase():'';
  if(colorEl&&document.activeElement!==colorEl)colorEl.value=hex||UNSET_PART_SWATCH;
  if(hexEl&&document.activeElement!==hexEl)hexEl.value=hex?hex.toUpperCase():'';
}
function syncDespieceEditor(){
  const key=despiecePartVisible(selectedDespiecePart)?selectedDespiecePart:(visibleCostPartKeys()[0]||'cuerpo');
  selectedDespiecePart=key;
  const parts=ensureCostParts().parts,detail=ensurePartDetail(key);
  const name=$('#despiecePartName'),input=$('#despiecePartCost'),err=$('#despiecePartError');
  const label=$('#despiecePartLabel'),notes=$('#despiecePartNotes'),pantone=$('#despiecePartPantone');
  if(name)name.textContent=despiecePartDisplayName(key);
  if(label&&document.activeElement!==label){label.value=detail.label;label.placeholder=despiecePartLabel(key)}
  if(notes&&document.activeElement!==notes)notes.value=detail.notes;
  if(pantone&&document.activeElement!==pantone)pantone.value=detail.pantone;
  syncColorPair($('#despiecePartColor'),$('#despiecePartHex'),detail.color);
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
  const title=document.createElement('p');title.className='help';title.textContent='Por aplicación · precio, detalle y color. La suma escribe el precio de estampado.';box.append(title);
  (state.artworks||[]).filter(photoArtworkVisible).forEach((art,index)=>{
    const detail=ensureArtworkDetail(art.id);
    const field=document.createElement('div');field.className='field despiece-art-card';
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
    const notes=document.createElement('textarea');notes.id='despieceArtNotes-'+art.id;notes.maxLength=400;notes.rows=2;notes.placeholder='Detalle / notas · por definir';notes.value=detail.notes;
    notes.addEventListener('input',()=>{ensureArtworkDetail(art.id).notes=notes.value.slice(0,400);changed()});
    const colorRow=document.createElement('div');colorRow.className='despiece-color-row';
    const colorWrap=document.createElement('div');colorWrap.className='field';
    const colorLab=document.createElement('label');colorLab.setAttribute('for','despieceArtColor-'+art.id);colorLab.textContent='Color';
    const color=document.createElement('input');color.id='despieceArtColor-'+art.id;color.type='color';color.value=detail.color&&validHex(detail.color)?detail.color:UNSET_PART_SWATCH;
    color.addEventListener('input',()=>{ensureArtworkDetail(art.id).color=color.value.toLowerCase();const hex=$('#despieceArtHex-'+art.id);if(hex)hex.value=color.value.toUpperCase();changed()});
    colorWrap.append(colorLab,color);
    const hexWrap=document.createElement('div');hexWrap.className='field';
    const hexLab=document.createElement('label');hexLab.setAttribute('for','despieceArtHex-'+art.id);hexLab.textContent='Hex';
    const hex=document.createElement('input');hex.id='despieceArtHex-'+art.id;hex.type='text';hex.maxLength=7;hex.placeholder='Por definir';hex.spellcheck=false;hex.value=detail.color&&validHex(detail.color)?detail.color.toUpperCase():'';
    hex.addEventListener('change',()=>{
      try{ensureArtworkDetail(art.id).color=parseOptionalPartHex(hex.value);hex.value=ensureArtworkDetail(art.id).color?ensureArtworkDetail(art.id).color.toUpperCase():'';color.value=ensureArtworkDetail(art.id).color||UNSET_PART_SWATCH;$('#despiecePartError').textContent='';changed()}
      catch(error){hex.value=ensureArtworkDetail(art.id).color?ensureArtworkDetail(art.id).color.toUpperCase():'';$('#despiecePartError').textContent=error.message}
    });
    hexWrap.append(hexLab,hex);
    const pantoneWrap=document.createElement('div');pantoneWrap.className='field';
    const pantoneLab=document.createElement('label');pantoneLab.setAttribute('for','despieceArtPantone-'+art.id);pantoneLab.textContent='Pantone / custom';
    const pantone=document.createElement('input');pantone.id='despieceArtPantone-'+art.id;pantone.type='text';pantone.maxLength=40;pantone.placeholder='Ej. 19-1664 TCX';pantone.value=detail.pantone;
    pantone.addEventListener('input',()=>{ensureArtworkDetail(art.id).pantone=pantone.value.slice(0,40);changed()});
    pantoneWrap.append(pantoneLab,pantone);
    colorRow.append(colorWrap,hexWrap,pantoneWrap);
    field.append(label,input,notes,colorRow);box.append(field);
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
function setDespieceFieldDisabled(el,disabled){
  if(!el)return;
  el.disabled=disabled;
  if(el.placeholder!==undefined){
    if(el.dataset.costPart)el.placeholder=disabled?'N/A en esta prenda':'Por definir';
    else if(el.dataset.partLabel)el.placeholder=disabled?'N/A':despiecePartLabel(el.dataset.partLabel);
  }
}
function fillPartDetailInputs(key,visible){
  const detail=visible?ensurePartDetail(key):blankPartDetail();
  const label=$('#costPartLabel-'+key),notes=$('#costPartNotes-'+key),hex=$('#costPartHex-'+key),color=$('#costPartColor-'+key),pantone=$('#costPartPantone-'+key);
  if(label&&document.activeElement!==label)label.value=visible?detail.label:'';
  if(notes&&document.activeElement!==notes)notes.value=visible?detail.notes:'';
  if(pantone&&document.activeElement!==pantone)pantone.value=visible?detail.pantone:'';
  syncColorPair(color,hex,visible?detail.color:'');
  [label,notes,hex,color,pantone].forEach(el=>setDespieceFieldDisabled(el,!visible));
}
function syncDespieceFields(){
  ensureCostParts();
  $$('[data-part-field]').forEach(wrap=>{
    const key=wrap.dataset.partField,visible=despiecePartVisible(key);
    wrap.hidden=!visible;
    const title=wrap.querySelector('[data-part-title]')||$$('[data-part-title]').find?.(el=>el.dataset.partTitle===key);
    if(title)title.textContent=despiecePartLabel(key);
  });
  $$('[data-part-title]').forEach(el=>{el.textContent=despiecePartLabel(el.dataset.partTitle)});
  $$('[data-cost-part]').forEach(input=>{
    const key=input.dataset.costPart,visible=despiecePartVisible(key);
    if(document.activeElement!==input)input.value=visible?priceInputValue(ensureCostParts().parts[key]):'';
    setDespieceFieldDisabled(input,!visible);
    fillPartDetailInputs(key,visible);
  });
  const aletilla=$('#costPart-aletilla');
  if(aletilla)aletilla.title=state.garment==='polo'?'Precio de la aletilla / tapeta':'No aplica fuera de polo';
  syncDespieceEditor();
}
function appendFichaMeta(host,detail){
  const meta=formatPartMeta(detail);
  if(!meta)return;
  const line=document.createElement('small');
  line.className='despiece-ficha-meta';
  line.textContent=meta;
  host.append(line);
}
function syncFichaDespiece(){
  const box=$('#fichaDespieceRows');if(!box)return;
  box.replaceChildren();
  const parts=ensureCostParts().parts,summary=partCostSummary();
  for(const key of visibleCostPartKeys()){
    const row=document.createElement('div');
    const name=document.createElement('span');
    name.textContent=despiecePartDisplayName(key);
    appendFichaMeta(name,ensurePartDetail(key));
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
  report.section('DESPIECE · DETALLE POR PARTE');
  for(const key of visibleCostPartKeys()){
    report.row(despiecePartDisplayName(key),formatPartMoney(parts[key]));
    const meta=formatPartMeta(ensurePartDetail(key));
    if(meta)report.row(despiecePartDisplayName(key)+' · detalle',meta);
  }
  if((state.artworks||[]).length){
    const cents=ensureCostParts().artworkCents,details=ensureCostParts().artworkDetails||{};
    (state.artworks||[]).filter(photoArtworkVisible).forEach((art,index)=>{
      report.row('Estampado · '+artworkCostLabel(art,index),formatPartMoney(cents[art.id]??''));
      const meta=formatPartMeta(details[art.id]);
      if(meta)report.row('Estampado · '+artworkCostLabel(art,index)+' · detalle',meta);
    });
  }
  report.row(summary.complete?'Total por partes':'Suma parcial de partes',summary.count?formatPartMoney(summary.cents):'Por definir');
  report.row('Alcance','Uso interno. No modifica el precio de venta ni el PDF del cliente. Precios vacíos = por definir.');
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
    $('#photoOrigin').textContent='Despiece · detalle por parte · uso interno';
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
  const writeSelectedDetail=(field,value)=>{
    const detail=ensurePartDetail(selectedDespiecePart);
    detail[field]=value;
    if(field==='label'){
      const name=$('#despiecePartName');
      if(name)name.textContent=despiecePartDisplayName(selectedDespiecePart);
    }
    if(despieceMode)refreshDespieceSvg();
    syncDespieceFields();
    changed();
  };
  $('#despiecePartLabel')?.addEventListener('input',e=>writeSelectedDetail('label',e.target.value.slice(0,80)));
  $('#despiecePartNotes')?.addEventListener('input',e=>writeSelectedDetail('notes',e.target.value.slice(0,400)));
  $('#despiecePartPantone')?.addEventListener('input',e=>writeSelectedDetail('pantone',e.target.value.slice(0,40)));
  $('#despiecePartColor')?.addEventListener('input',e=>{
    writeSelectedDetail('color',String(e.target.value||'').toLowerCase());
    const hex=$('#despiecePartHex');if(hex)hex.value=ensurePartDetail(selectedDespiecePart).color.toUpperCase();
  });
  $('#despiecePartHex')?.addEventListener('change',e=>{
    try{
      writeSelectedDetail('color',parseOptionalPartHex(e.target.value));
      $('#despiecePartError').textContent='';
    }catch(error){
      e.target.value=ensurePartDetail(selectedDespiecePart).color?ensurePartDetail(selectedDespiecePart).color.toUpperCase():'';
      $('#despiecePartError').textContent=error.message;
    }
  });
  $$('[data-cost-part]').forEach(input=>{
    input.addEventListener('input',()=>{
      if(!despiecePartVisible(input.dataset.costPart))return;
      try{setDespiecePartCents(input.dataset.costPart,parseGarmentPrice(input.value));selectDespiecePart(input.dataset.costPart);$('#costInputError').textContent='';syncDespieceFields();changed()}
      catch(error){input.value=priceInputValue(ensureCostParts().parts[input.dataset.costPart]);$('#costInputError').textContent=error.message+' Se conservó el último costo válido.'}
    });
    input.addEventListener('change',()=>{input.value=despiecePartVisible(input.dataset.costPart)?priceInputValue(ensureCostParts().parts[input.dataset.costPart]):''});
    input.addEventListener('focus',()=>{if(despiecePartVisible(input.dataset.costPart))selectDespiecePart(input.dataset.costPart)});
  });
  const bindPartMeta=(sel,field,limit,event='input')=>{
    $$(sel).forEach(input=>{
      const keyOf=()=>input.dataset.partLabel||input.dataset.partNotes||input.dataset.partPantone||input.dataset.partHex||input.dataset.partColor;
      input.addEventListener('focus',()=>{const key=keyOf();if(despiecePartVisible(key))selectDespiecePart(key)});
      input.addEventListener(event,()=>{
        const key=keyOf();
        if(!despiecePartVisible(key))return;
        try{
          const detail=ensurePartDetail(key);
          if(field==='color')detail.color=event==='change'?parseOptionalPartHex(input.value):String(input.value||'').toLowerCase();
          else detail[field]=String(input.value||'').slice(0,limit);
          selectDespiecePart(key);
          $('#costInputError').textContent='';
          if(despieceMode)refreshDespieceSvg();
          syncDespieceFields();changed();
        }catch(error){
          if(field==='color')input.value=ensurePartDetail(key).color?ensurePartDetail(key).color.toUpperCase():'';
          $('#costInputError').textContent=error.message;
        }
      });
    });
  };
  bindPartMeta('[data-part-label]','label',80);
  bindPartMeta('[data-part-notes]','notes',400);
  bindPartMeta('[data-part-pantone]','pantone',40);
  bindPartMeta('[data-part-color]','color',7);
  bindPartMeta('[data-part-hex]','color',7,'change');
  ensureDespieceHitButtons();
  refreshDespieceSvg();
  syncDespieceFields();
}

const blankBeforeDespiece=blank;
blank=function(){const out=blankBeforeDespiece();out.costing.parts=blankCostParts();out.costing.artworkCents={};out.costing.partDetails=blankPartDetails();out.costing.artworkDetails={};return out};
const validateBeforeDespiece=validateOrder;
validateOrder=async function(raw){
  const out=await validateBeforeDespiece(raw);
  out.costing.parts=validateCostParts(raw.costing?.parts);
  out.costing.artworkCents=validateArtworkCents(raw.costing?.artworkCents);
  out.costing.partDetails=validatePartDetails(raw.costing?.partDetails);
  out.costing.artworkDetails=validateArtworkDetails(raw.costing?.artworkDetails);
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
