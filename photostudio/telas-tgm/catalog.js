/* TGM Catálogo de Telas — curated seed from Production Manager wording.
   The 156-row CSV was not in this workspace; do not invent extra SKUs.
   PIQUÉ OLMO is 50% algodón / 50% poliéster (Koke). Never lycra. */
const TGM_TELA_CUSTOM_KEY='tgm-estudio-telas-custom';
const TGM_TELA_CATALOG=[
  {id:'fomer',nombre:'FOMER',composicion:'Poliéster 100%',pesoGm2:135,nota:'liso · knitt liso, sin textura piqué',texture:'smooth',composition:'polyester',cue:'fomer'},
  {id:'pique-atlante',nombre:'PIQUÉ ATLANTE',composicion:'Poliéster Multifilamento',pesoGm2:160,nota:'piqué · mismo knitt que Olmo, más ligero · warehouse / active wear',texture:'pique',composition:'polyester',cue:'atlante'},
  {id:'pique-olmo',nombre:'PIQUÉ OLMO',composicion:'50% algodón / 50% poliéster',pesoGm2:216,nota:'piqué clásico · schools · no lycra',texture:'pique',composition:'polycotton',cue:'olmo'},
  {id:'chifon-140',nombre:'CHIFÓN 140',composicion:'Poliéster 100%',pesoGm2:'',nota:'playera / lisos',texture:'smooth',composition:'polyester'},
  {id:'mayki-plus',nombre:'MAYKI PLUS',composicion:'Poliéster Multifilamento',pesoGm2:'',nota:'catálogo MAYKI',texture:'smooth',composition:'polyester'},
  {id:'millenium',nombre:'MILLENIUM',composicion:'Nylon 100%',pesoGm2:70,nota:'hoodie',texture:'smooth',composition:'other'},
  {id:'rib-millenium',nombre:'RIB MILLENIUM',composicion:'Poliéster/Algodón/Elastano',pesoGm2:415,nota:'rib',texture:'fleece',composition:'other'}
];
const TGM_TELA_DEFAULTS={polo:'pique-olmo',playera:'chifon-140',hoodie:'millenium'};
function telaBlank(){return {source:'',id:'',nombre:'',composicion:'',pesoGm2:'',nota:'',texture:''}}
function ensureTela(order=state){if(!order.tela||typeof order.tela!=='object'||Array.isArray(order.tela))order.tela=telaBlank();return order.tela}
function validateTela(raw){
  const out=telaBlank();
  if(raw==null)return out;
  if(typeof raw!=='object'||Array.isArray(raw))throw Error('Tela inválida.');
  out.source=safeString(raw.source??'',20,'origen de tela');
  out.id=safeString(raw.id??'',80,'id de tela');
  out.nombre=safeString(raw.nombre??'',70,'nombre de tela');
  out.composicion=safeString(raw.composicion??'',120,'composición de tela');
  out.nota=safeString(raw.nota??'',160,'nota de tela');
  out.texture=oneOf(raw.texture??'',['','jersey','pique','fleece','smooth'],'textura de tela');
  if(raw.pesoGm2===''||raw.pesoGm2==null)out.pesoGm2='';
  else out.pesoGm2=numeric(Number(raw.pesoGm2),0,2000,'gramaje de tela');
  return out;
}
function loadCustomTelas(){
  try{
    const raw=JSON.parse(localStorage.getItem(TGM_TELA_CUSTOM_KEY)||'[]');
    return Array.isArray(raw)?raw.map(t=>validateTela({...t,source:'custom'})).filter(t=>t.nombre):[];
  }catch{return []}
}
function saveCustomTelas(list){try{localStorage.setItem(TGM_TELA_CUSTOM_KEY,JSON.stringify(list))}catch{}}
function telaCatalogById(id){return TGM_TELA_CATALOG.find(t=>t.id===id)||loadCustomTelas().find(t=>t.id===id)||null}
function telaResolveCue(order=state){
  const id=order.tela?.id||'';
  if(id==='pique-olmo')return{id,kind:'pique',scale:1,amp:1,label:'piqué Olmo'};
  if(id==='pique-atlante')return{id,kind:'pique',scale:1.18,amp:.58,label:'piqué Atlante'};
  if(id==='fomer')return{id,kind:'smooth',scale:1,amp:0,label:'liso Fomer'};
  const texture=order.tela?.texture||order.texture;
  return{id,kind:texture||'',scale:1,amp:texture==='pique'?1:0,label:''};
}
function telaApplyPiqueCue(canvas,cue){
  if(!canvas||cue.kind!=='pique')return canvas;
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,img=ctx.getImageData(0,0,w,h),d=img.data;
  const fx=2.15*cue.scale,fy=2.35*cue.scale,amp=7.5*cue.amp;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*4;if(!d[i+3])continue;
    const n=Math.sin(x*fx)*Math.sin(y*fy)*amp;
    d[i]=Math.max(0,Math.min(255,d[i]+n));
    d[i+1]=Math.max(0,Math.min(255,d[i+1]+n));
    d[i+2]=Math.max(0,Math.min(255,d[i+2]+n));
  }
  ctx.putImageData(img,0,0);
  return canvas;
}
function telaSuggestedIds(garment=state.garment){
  if(garment==='polo')return['pique-olmo','pique-atlante','fomer'];
  if(garment==='playera')return['chifon-140','fomer','mayki-plus'];
  if(garment==='hoodie')return['millenium','rib-millenium'];
  return['chifon-140'];
}
function telaApplyRecord(rec,markDefault=false){
  if(!rec)return;
  const tela=ensureTela();
  tela.source=rec.source||(TGM_TELA_CATALOG.some(t=>t.id===rec.id)?'catalog':'custom');
  tela.id=rec.id||'';
  tela.nombre=rec.nombre||'';
  tela.composicion=rec.composicion||'';
  tela.pesoGm2=rec.pesoGm2===''||rec.pesoGm2==null?'':Number(rec.pesoGm2);
  tela.nota=rec.nota||'';
  tela.texture=rec.texture||'';
  state.fabric=safeString(tela.nombre,70,'tela');
  state.gsm=tela.pesoGm2===''?'':tela.pesoGm2;
  state.stretch=safeString([tela.composicion,tela.nota].filter(Boolean).join(' · '),120,'elasticidad');
  if(tela.texture)state.texture=tela.texture;
  const r=typeof ensureReference==='function'?ensureReference():null;
  if(r){
    r.compositionNotes=tela.composicion;
    r.fabricRef=tela.nombre;
    if(rec.composition&&(r.composition==='unknown'||!markDefault))r.composition=rec.composition;
    if(rec.composition==='polycotton'&&!markDefault)r.polyesterPercent='';
  }
  if(markDefault)tela._defaultFor=state.garment;
  else tela._defaultFor='';
}
function telaShouldAutofill(order=state){
  const tela=order.tela;
  if(!TGM_TELA_DEFAULTS[order.garment])return false;
  if(!order.fabric&&(!tela||!tela.nombre))return true;
  return !!(tela&&tela._defaultFor);
}
function telaApplyGarmentDefault(force=false){
  const id=TGM_TELA_DEFAULTS[state.garment];
  if(!id)return;
  if(!force&&!telaShouldAutofill())return;
  telaApplyRecord({...telaCatalogById(id),source:'catalog'},true);
}
const blankBeforeTelas=blank;
blank=function(){const out=blankBeforeTelas();out.tela=telaBlank();return out};
const validateBeforeTelas=validateOrder;
validateOrder=async function(raw){
  const out=await validateBeforeTelas(raw);
  out.tela=validateTela(raw?.tela);
  return out;
};
function telaFillSelect(){
  const sel=$('#telaCatalog');if(!sel)return;
  const suggested=new Set(telaSuggestedIds());
  const custom=loadCustomTelas();
  const current=ensureTela();
  sel.replaceChildren();
  sel.add(new Option('Sugeridas para esta prenda',''));
  for(const id of telaSuggestedIds()){
    const t=telaCatalogById(id);if(!t)continue;
    sel.add(new Option(t.nombre+' · '+t.composicion+(t.pesoGm2!==''?' · '+t.pesoGm2+' g/m²':''),t.id));
  }
  sel.add(new Option('— Catálogo TGM —','__sep__'));
  for(const t of TGM_TELA_CATALOG){
    if(suggested.has(t.id))continue;
    sel.add(new Option(t.nombre+' · '+t.composicion+(t.pesoGm2!==''?' · '+t.pesoGm2+' g/m²':''),t.id));
  }
  if(custom.length){
    sel.add(new Option('— Desarrollos de planta —','__sep2__'));
    for(const t of custom)sel.add(new Option(t.nombre+' · '+t.composicion,t.id));
  }
  sel.add(new Option('Otra / desarrollo nuevo','__new__'));
  const value=current.id&&[...TGM_TELA_CATALOG,...custom].some(t=>t.id===current.id)?current.id:(current.nombre?'__new__':'');
  sel.value=value;
}
function telaKnittValue(texture){
  if(texture==='pique'||texture==='smooth'||texture==='jersey'||texture==='fleece')return texture;
  return state.texture==='pique'||state.texture==='smooth'||state.texture==='jersey'||state.texture==='fleece'?state.texture:'pique';
}
function telaSyncFields(){
  const t=ensureTela();
  const map={telaNombre:t.nombre,telaComposicion:t.composicion,telaGsm:t.pesoGm2,telaNota:t.nota,telaKnitt:telaKnittValue(t.texture)};
  for(const [id,value] of Object.entries(map)){
    const el=$('#'+id);if(!el||document.activeElement===el)continue;
    el.value=value??'';
  }
  telaFillSelect();
}
function telaReadEditor(){
  const knitt=telaKnittValue($('#telaKnitt')?.value||ensureTela().texture);
  return {
    source:ensureTela().source||'custom',
    id:ensureTela().id||('custom-'+Date.now()),
    nombre:$('#telaNombre')?.value||'',
    composicion:$('#telaComposicion')?.value||'',
    pesoGm2:$('#telaGsm')?.value===''?'':Number($('#telaGsm').value),
    nota:$('#telaNota')?.value||'',
    texture:knitt,
    composition:ensureReference().composition
  };
}
function syncTelas(){
  ensureTela();
  if(!state.tela.nombre&&!state.fabric)telaApplyGarmentDefault(true);
  telaSyncFields();
}
const populateBeforeTelas=populate;
populate=function(){populateBeforeTelas();syncTelas()};
const changedBeforeTelas=changed;
changed=function(){changedBeforeTelas();if($('#telaCatalog'))telaFillSelect()};
const photoBaseBeforeTelas=typeof photoBaseDefaults==='function'?photoBaseDefaults:null;
if(photoBaseBeforeTelas)photoBaseDefaults=function(){
  photoBaseBeforeTelas();
  telaApplyGarmentDefault(false);
};
const uiBeforeTelas=initUI;
initUI=function(){
  uiBeforeTelas();
  const sel=$('#telaCatalog');
  if(sel)sel.addEventListener('change',()=>{
    const v=sel.value;
    if(v==='__sep__'||v==='__sep2__'){telaFillSelect();return}
    if(v==='__new__'){
      const t=ensureTela();
      t.source='custom';t.id='';t._defaultFor='';
      if(!t.texture)t.texture=telaKnittValue('');
      telaSyncFields();return;
    }
    if(!v){telaApplyGarmentDefault(true);changed();return}
    const rec=telaCatalogById(v);
    if(rec){ensureTela()._defaultFor='';telaApplyRecord({...rec,source:TGM_TELA_CATALOG.some(t=>t.id===rec.id)?'catalog':'custom'});changed()}
  });
  for(const id of ['telaNombre','telaComposicion','telaGsm','telaNota','telaKnitt']){
    const el=$('#'+id);if(!el)continue;
    el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{
      const rec=telaReadEditor();
      rec.source=rec.source||'custom';
      ensureTela()._defaultFor='';
      telaApplyRecord(rec);
      changed();
    });
  }
  const save=$('#telaSaveCustom');
  if(save)save.addEventListener('click',()=>{
    const rec=telaReadEditor();
    if(!rec.nombre.trim())return toast('Escribe el nombre de la tela para guardarla.');
    rec.source='custom';
    if(!rec.id||TGM_TELA_CATALOG.some(t=>t.id===rec.id))rec.id='custom-'+Date.now();
    const list=loadCustomTelas().filter(t=>t.id!==rec.id);
    list.push(validateTela(rec));
    saveCustomTelas(list);
    telaApplyRecord({...rec,source:'custom'});
    changed();
    toast('Desarrollo guardado en este dispositivo. Disponible en el catálogo local.');
  });
  $$('[data-garment]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{telaApplyGarmentDefault(false);syncTelas()},0)));
};
const visualBeforeTelaCue=typeof visualSignature==='function'?visualSignature:null;
if(visualBeforeTelaCue)visualSignature=function(){
  const cue=telaResolveCue();
  return visualBeforeTelaCue()+'tela-cue'+cue.id+cue.kind+cue.amp+cue.scale;
};
const tintedBeforeTelaCue=typeof tintedPhoto==='function'?tintedPhoto:null;
if(tintedBeforeTelaCue)tintedPhoto=async function(garment,view){
  const cue=telaResolveCue(),saved=state.texture;
  if(cue.kind==='smooth'||cue.kind==='pique')state.texture=cue.kind;
  try{
    const base=await tintedBeforeTelaCue(garment,view);
    if(garment!=='polo'||cue.kind!=='pique')return base;
    const out=document.createElement('canvas');
    out.width=base.width;out.height=base.height;
    out.getContext('2d').drawImage(base,0,0);
    return telaApplyPiqueCue(out,cue);
  }finally{state.texture=saved}
};
const syncPhotoBeforeTelaCue=typeof syncPhotoUI==='function'?syncPhotoUI:null;
if(syncPhotoBeforeTelaCue)syncPhotoUI=function(){
  syncPhotoBeforeTelaCue();
  const name=$('#photoBaseName'),cue=telaResolveCue();
  if(name&&state.garment==='polo'&&cue.label)name.textContent='Polo · '+cue.label;
};
