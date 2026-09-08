/* Reliability fixes and explicit reference options; no customer data or network calls. */
const STORAGE_KEYS=[KEY,'tgm-estudio-v4','tgm-estudio-v3','tgm-estudio-v2','tgm-estudio-v1'];
let loadingOrder=false;
let lastExportUrl=null;
download=function(blob,filename){
  if(lastExportUrl)URL.revokeObjectURL(lastExportUrl);
  lastExportUrl=URL.createObjectURL(blob);
  const link=$('#lastExportLink');link.href=lastExportUrl;link.download=filename;link.textContent='Descargar '+filename;$('#exportFallback').hidden=false;
  // The persistent native link remains available if a browser suppresses auto-download.
  const a=document.createElement('a');a.href=lastExportUrl;a.download=filename;document.body.append(a);a.click();a.remove();
};
function mergeOrders(groups){
  const merged=new Map();
  for(const group of groups)if(Array.isArray(group))for(const item of group){
    if(!item||typeof item!=='object'||typeof item.id!=='string'||!item.id)continue;
    const old=merged.get(item.id);
    if(!old||(Date.parse(item.updatedAt)||0)>=(Date.parse(old.updatedAt)||0))merged.set(item.id,item);
  }
  return [...merged.values()].sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0));
}
readLibrary=function(){
  const groups=[];
  for(const key of STORAGE_KEYS){try{groups.push(JSON.parse(localStorage.getItem(key+'.orders')||'[]'))}catch{}}
  return mergeOrders(groups);
};
legacyDraft=function(){
  const drafts=[];
  for(const key of STORAGE_KEYS){try{const value=JSON.parse(localStorage.getItem(key+'.draft')||'null');if(value?.schema===SCHEMA)drafts.push(value)}catch{}}
  return drafts.sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0))[0]||null;
};
allSavedOrders=async function(){let db=[];try{db=await dbAll()}catch{}return mergeOrders([readLibrary(),db])};
// Rejected opens must be retryable. Close stale connections when another version opens.
referenceDb=function(){
  if(referenceDbPromise)return referenceDbPromise;
  const opening=new Promise((resolve,reject)=>{
    if(!window.indexedDB)return reject(Error('Almacenamiento amplio no disponible.'));
    const request=indexedDB.open('tgm-pedidos-local',1);let settled=false;
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('records'))request.result.createObjectStore('records',{keyPath:'key'})};
    request.onsuccess=()=>{if(settled){request.result.close();return}settled=true;const db=request.result;db.onversionchange=()=>{db.close();referenceDbPromise=null};db.onclose=()=>{referenceDbPromise=null};resolve(db)};
    request.onerror=()=>{settled=true;reject(request.error||Error('No se pudo abrir el almacenamiento.'))};
    request.onblocked=()=>{settled=true;reject(Error('Cierra otra pestaña de este estudio y vuelve a guardar.'))};
  });
  referenceDbPromise=opening;
  opening.catch(()=>{if(referenceDbPromise===opening)referenceDbPromise=null});
  return opening;
};
function hasOrderContent(){
  const baseline=blank();
  return Object.keys(baseline).some(key=>!['id','updatedAt','schema','version'].includes(key)&&JSON.stringify(state[key])!==JSON.stringify(baseline[key]));
}
loadOrder=async function(raw){
  if(loadingOrder)throw Error('Espera a que termine de abrir el pedido anterior.');
  loadingOrder=true;
  const previous=state,revision=state.updatedAt;
  try{
    const next=await validateOrder(raw);
    if(state!==previous||state.updatedAt!==revision)throw Error('El pedido cambió durante la lectura. Vuelve a abrir el archivo.');
    clearTimeout(saveTimer);
    // Autosaving a draft does not mean it has been archived in the order list.
    if((dirty||hasOrderContent())&&!(await saveOrder(true)))throw Error('No se pudo guardar el pedido actual. Descarga su JSON antes de abrir otro.');
    if(state!==previous||state.updatedAt!==revision)throw Error('El pedido cambió durante el guardado. Vuelve a abrir el archivo.');
    state=next;selectedArt=state.artworks[0]?.id||null;dirty=true;
    imageCache.clear();prepDrafts.clear();photoTintCache.clear();populate();
    await saveDraft();$('#ordersDialog').close();toast('Pedido cargado. Revisa la ficha y guarda tu copia.');
  }finally{loadingOrder=false}
};
const getImageBeforeAudit=getImage;
getImage=async function(src){
  const result=await getImageBeforeAudit(src);
  if(src&&imageCache.has(src)){const entry=imageCache.get(src);imageCache.delete(src);imageCache.set(src,entry)}
  while(imageCache.size>32)imageCache.delete(imageCache.keys().next().value);
  return result;
};
// One preview render in flight. Fast input changes replace the pending frame.
let photoRendering=false,photoPending=false;
schedulePhoto=function(){
  syncPhotoUI();photoPending=true;++photoTicket;
  cancelAnimationFrame(photoFrame);
  if(photoRendering)return;
  photoFrame=requestAnimationFrame(async()=>{
    photoRendering=true;
    try{
      while(photoPending){
        photoPending=false;const ticket=photoTicket,canvases=[];
        for(const view of ['front','back']){
          const c=document.createElement('canvas');c.width=1000;c.height=1150;
          await renderPhoto(c,view,{edit:currentTab==='art'});canvases.push(c);
          if(ticket!==photoTicket)break;
        }
        if(ticket!==photoTicket)continue;
        for(const [i,id]of ['#photoFront','#photoBack'].entries()){
          const target=$(id),x=target.getContext('2d');x.clearRect(0,0,target.width,target.height);x.drawImage(canvases[i],0,0,target.width,target.height);
        }
        updateSleevePreview(canvases);if($('#photoDetailDialog').open)await refreshPhotoDetail();
      }
    }catch(e){$('#photoStatus').textContent='No se pudo preparar la referencia.';toast(e.message)}
    finally{photoRendering=false;if(photoPending)schedulePhoto()}
  });
};
const defaultsLogoBeforeAudit=logoDefaults;
logoDefaults=function(){return {...defaultsLogoBeforeAudit(),sublimationBase:'garment'}};
const validateLogoBeforeAudit=validateLogo;
validateLogo=async function(raw,a){const out=await validateLogoBeforeAudit(raw,a);out.sublimationBase=oneOf(raw?.sublimationBase??'garment',['garment','whitePanels'],'sustrato sublimado');return out};
function panelSublimation(a){return a.method==='sublimation'&&ensureLogo(a).sublimationBase==='whitePanels'}
const notesBeforeAudit=techniqueNotes;
techniqueNotes=function(a){
  let notes=notesBeforeAudit(a);
  if(panelSublimation(a)){
    notes=notes.filter(t=>!t.startsWith('Sobre colores oscuros'));
    notes.push('Propuesta: paneles blancos de poliéster; fondo y gráficos en el mismo arte. La vista representa el color terminado, no un transfer claro sobre tela negra. Validar patrón, tono, sangrado y costuras con el taller.');
  }
  return notes;
};
const workshopBeforeAudit=workshopRows;
workshopRows=function(a){const rows=workshopBeforeAudit(a);if(a.method==='sublimation')rows.unshift(['Sustrato propuesto',panelSublimation(a)?'Panel blanco; fondo y gráficos impresos juntos. Por validar en muestra.':'Tela del color elegido. Confirmar contraste.']);return rows};
const poloDefaults=()=>({piping:false,placket:false,color:'#b89442'});
const blankBeforeAudit=blank;
blank=function(){return {...blankBeforeAudit(),polo:poloDefaults()}};
function ensurePolo(){return state.polo??=poloDefaults()}
const validateBeforeAudit=validateOrder;
validateOrder=async function(raw){
  const out=await validateBeforeAudit(raw),p=raw.polo??poloDefaults();
  out.polo={piping:boolean(p.piping,'vivo'),placket:boolean(p.placket,'tapeta'),color:safeString(p.color,7,'acento')};
  if(!validHex(out.polo.color))throw Error('Color de acento inválido.');
  if(!out.id.trim())throw Error('El pedido requiere un identificador.');
  return out;
};
const signatureBeforeAudit=visualSignature;
visualSignature=function(){
  const base=signatureBeforeAudit(),p=ensurePolo(),panels=state.artworks.filter(panelSublimation).map(a=>a.id);
  if(!panels.length&&(state.garment!=='polo'||(!p.piping&&!p.placket)))return base;
  const value=base+JSON.stringify([panels,state.garment==='polo'?p:null]);let a=2166136261,b=5381;
  for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b,33)^value.charCodeAt(i)}return(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
};
function drawPoloAccents(ctx,r,view){
  if(state.garment!=='polo')return;const p=ensurePolo();ctx.save();ctx.translate(r.x,r.y);ctx.scale(r.w,r.h);
  if(p.piping){ctx.strokeStyle=p.color;ctx.lineWidth=.0022;ctx.globalAlpha=.78;ctx.beginPath();if(view==='front'){ctx.moveTo(.337,.074);ctx.bezierCurveTo(.336,.119,.350,.154,.364,.163);ctx.bezierCurveTo(.393,.163,.420,.145,.442,.132);ctx.moveTo(.665,.075);ctx.bezierCurveTo(.662,.116,.649,.155,.636,.165);ctx.bezierCurveTo(.610,.165,.578,.144,.556,.132)}else{ctx.moveTo(.346,.063);ctx.bezierCurveTo(.403,.047,.594,.047,.657,.065)}ctx.stroke()}
  if(p.placket&&view==='front'){ctx.globalAlpha=.78;ctx.fillStyle=p.color;polygon(ctx,[[.507,.140],[.536,.129],[.502,.160]])}
  ctx.restore();
}
function syncPolo(){const p=ensurePolo();$('#poloExtras').hidden=state.garment!=='polo';for(const el of $$('[data-polo]')){if(document.activeElement===el)continue;if(el.type==='checkbox')el.checked=p[el.dataset.polo];else el.value=p[el.dataset.polo]}}
const populateBeforeAudit=populate;populate=function(){populateBeforeAudit();syncPolo()};
const specsBeforeAudit=clientSpecLines;
function summaryRowLayout(ctx,rows,width,font){
  return rows.map(([label,text])=>{
    ctx.font='600 '+font+'px Arial';const labelLines=wrapText(ctx,label,200);
    ctx.font=font+'px Arial';return {labelLines,lines:wrapText(ctx,text,width-220)};
  });
}
clientSpecLines=function(){
  const rows=specsBeforeAudit(),r=ensureReference(),p=ensurePolo();
  if(!total()){const sizes=rows.find(row=>row[0]==='Tallas');if(sizes)sizes[1]='Cantidades por definir; corrida de producción sin confirmar.'}
  rows.splice(2,0,['Composición solicitada',COMPOSITIONS[r.composition]]);
  if(state.garment==='polo'&&(p.piping||p.placket))rows.splice(4,0,['Acentos del polo',[p.piping?'vivo fino en cuello':'',p.placket?'interior de tapeta':''].filter(Boolean).join(' · ')+' · '+p.color.toUpperCase()+' (aproximado)']);
  return rows;
};
// Low-frequency shading prevents the photographic weave from shredding logo edges.
function applicationLuminance(src){
  if(src.applicationLum)return src.applicationLum;
  const {w,h,lum}=src,integral=new Float32Array((w+1)*(h+1)),out=new Float32Array(w*h);
  for(let y=0;y<h;y++){let sum=0;for(let x=0;x<w;x++){sum+=lum[y*w+x];integral[(y+1)*(w+1)+x+1]=integral[y*(w+1)+x+1]+sum}}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const x0=Math.max(0,x-3),x1=Math.min(w,x+4),y0=Math.max(0,y-3),y1=Math.min(h,y+4);out[y*w+x]=(integral[y1*(w+1)+x1]-integral[y0*(w+1)+x1]-integral[y1*(w+1)+x0]+integral[y0*(w+1)+x0])/((x1-x0)*(y1-y0))}
  return src.applicationLum=out;
}
const workspaceBeforeAudit=setWorkspace;
setWorkspace=function(mode,save=true){
  if(!studio&&['3d','split'].includes(mode)){toast('3D no disponible en este navegador. Usa Acabado o 2D.');mode='photo'}
  return workspaceBeforeAudit(mode,save);
};
// Keep empty handoff fields identifiable without spending a row on every blank.
const reportRowBeforeAudit=ReferenceReport.prototype.row;
const OPTIONAL_REPORT_LABELS=new Set(['Tintas / hilos','Cantidad de colores','Hilo / estabilizador','Archivo de máquina','Puntadas informadas','Formato de máquina','Dimensiones de ponchado','Cambios / paradas / recortes','Hilo / bobina','Secuencia del ponchado','Detalles de puntada','Transferencia / prueba','Lámina de impresión','Sangrado / costura','Acomodo y transferencia','Tinta / acabado','Malla y registro','Pantallas / esténciles','Secuencia de colores','Rasero, secado y curado']);
ReferenceReport.prototype.row=function(label,value){
  const empty=value===''||value==null||(['Dimensiones de ponchado','Cambios / paradas / recortes','Hilo / bobina'].includes(label)&&String(value).includes('Por definir')&&!/\d/.test(String(value)));
  if(OPTIONAL_REPORT_LABELS.has(label)&&empty){(this.pendingFields??=[]).push(label);return}
  if(label==='Notas de aplicación'&&this.pendingFields?.length){reportRowBeforeAudit.call(this,'Taller · por definir',this.pendingFields.join(', '));this.pendingFields=[]}
  return reportRowBeforeAudit.call(this,label,value);
};
const proofToneCache=new Map();
async function proofDark(data){
  if(!data)return false;if(proofToneCache.has(data))return proofToneCache.get(data);
  const img=await getImage(data),c=document.createElement('canvas');c.width=40;c.height=40;const x=c.getContext('2d');x.drawImage(img,0,0,40,40);const d=x.getImageData(0,0,40,40).data;let n=0,sum=0;
  for(let i=0;i<d.length;i+=4)if(d[i+3]>24){n++;sum+=d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722}
  const dark=n>0&&sum/n>135;proofToneCache.set(data,dark);while(proofToneCache.size>32)proofToneCache.delete(proofToneCache.keys().next().value);return dark;
}
ReferenceReport.prototype.logoProof=async function(a){
  this.space(327);const x=this.x,y=this.y;
  for(const [i,data]of [proofSource(a),a.image].entries()){
    const left=68+i*562,dark=await proofDark(data);
    for(let yy=0;yy<254;yy+=16)for(let xx=0;xx<542;xx+=16){x.fillStyle=(Math.floor(xx/16)+Math.floor(yy/16))%2?(dark?'#343a43':'#e9edf3'):(dark?'#454c58':'#f8f9fc');x.fillRect(left+xx,y+yy,Math.min(16,542-xx),Math.min(16,254-yy))}
    if(data){const img=await getImage(data),s=Math.min(490/img.naturalWidth,218/img.naturalHeight);x.drawImage(img,left+(542-img.naturalWidth*s)/2,y+(254-img.naturalHeight*s)/2,img.naturalWidth*s,img.naturalHeight*s)}
    else{x.fillStyle='#263044';x.font='24px Arial';x.fillText(a.kind==='text'?a.text||'Texto pendiente':'Archivo pendiente',left+25,y+122,480)}
    x.fillStyle='#596375';x.font='21px Arial';x.fillText(i?'VERSIÓN APLICADA':'ORIGINAL / CONTENIDO',left,y+291);
  }
  this.y+=324;
};
const uiBeforeAudit=initUI;
initUI=function(){
  uiBeforeAudit();
  for(const el of $$('[data-polo]'))el.addEventListener(el.type==='checkbox'?'change':'input',()=>{ensurePolo()[el.dataset.polo]=el.type==='checkbox'?el.checked:el.value;changed()});
  for(const el of $$('[data-measure]'))el.addEventListener('change',()=>{el.value=ensureReference().measurements[el.dataset.measure][el.dataset.size]});
};
// Prevent an operator typing into a temporary blank order during async recovery.
const initBeforeAudit=init;
init=async function(){
  const controls=['#newOrder','#openOrders','#downloadJson','#saveOrder'];
  for(const id of controls)$(id).disabled=true;
  for(const el of $$('.tab-panel'))el.inert=true;
  for(const el of $$('[data-bind]'))el.disabled=true;
  try{await initBeforeAudit()}
  finally{
    for(const id of controls)$(id).disabled=false;
    for(const el of $$('.tab-panel'))el.inert=false;
    for(const el of $$('[data-bind]'))el.disabled=false;
    $('#bootStatus').hidden=true;
  }
};
