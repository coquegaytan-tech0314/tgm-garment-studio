/* Firebase Storage sync for shared pedidos. Local IndexedDB/localStorage stays the offline draft. */
const TGM_CLOUD={sdk:null,loading:null};
function setCloudStatus(message,kind){
  const el=$('#cloudStatus');
  if(!el)return;
  el.textContent=message;
  el.dataset.error=kind==='error'?'true':'false';
  el.dataset.ok=kind==='ok'?'true':'false';
}
function cloudErrorMessage(error){
  const text=String(error?.message||error||'');
  if(/TODO_|apiKey|configuración|config/i.test(text))return 'Nube: falta apiKey o storageBucket en firebase-config.';
  if(/Failed to fetch|NetworkError|ERR_INTERNET|offline|Load failed/i.test(text))return 'Nube: sin conexión.';
  if(/unauthorized|permission|storage\/unauthorized/i.test(text))return 'Nube: Storage rechazó el acceso (reglas actuales).';
  if(/CORS|blocked/i.test(text))return 'Nube: el navegador bloqueó Storage.';
  return text.slice(0,180)||'Nube: no se pudo completar.';
}
async function ensureFirebaseStorage(){
  if(TGM_CLOUD.sdk)return TGM_CLOUD.sdk;
  if(TGM_CLOUD.loading)return TGM_CLOUD.loading;
  TGM_CLOUD.loading=(async()=>{
    if(typeof tgmFirebaseConfigUsable!=='function'||!tgmFirebaseConfigUsable())throw Error('Falta apiKey o storageBucket de Firebase.');
    const appMod=await import(TGM_FIREBASE_SDK.app);
    const storageMod=await import(TGM_FIREBASE_SDK.storage);
    const config=tgmFirebaseInitConfig();
    const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(config);
    const storage=storageMod.getStorage(app);
    TGM_CLOUD.sdk={
      app,storage,
      ref:storageMod.ref,
      uploadBytes:storageMod.uploadBytes,
      getDownloadURL:storageMod.getDownloadURL,
      list:storageMod.list,
      getBytes:storageMod.getBytes,
      getDownloadURL:storageMod.getDownloadURL,
      getMetadata:storageMod.getMetadata
    };
    return TGM_CLOUD.sdk;
  })().catch(error=>{TGM_CLOUD.loading=null;throw error});
  return TGM_CLOUD.loading;
}
function storageRefFor(sdk,value){
  if(typeof value==='string'&&(value.startsWith('gs://')||value.startsWith('https://')))return sdk.ref(sdk.storage,value);
  return sdk.ref(sdk.storage,value);
}
async function blobToDataUrl(blob){
  return await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(Error('No se pudo leer el archivo de la nube.'));
    reader.readAsDataURL(blob);
  });
}
async function bytesFromUnknown(data){
  if(!data)throw Error('Archivo de la nube vacío.');
  if(typeof data.arrayBuffer==='function'&&typeof data.size==='number')return new Uint8Array(await data.arrayBuffer());
  if(ArrayBuffer.isView(data))return new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
  try{
    const view=new Uint8Array(data);
    if(view.byteLength||data.byteLength===0)return view;
  }catch{}
  throw Error('Respuesta de Storage ilegible.');
}
async function fetchCloudUrl(url){
  const res=await fetch(url,{mode:'cors',credentials:'omit'});
  if(!res.ok)throw Error('Nube: HTTP '+res.status+' al leer el archivo.');
  return bytesFromUnknown(await res.arrayBuffer());
}
async function readCloudBytes(sdk,pathOrUrl){
  const errors=[];
  const fail=(label,error)=>{errors.push(label+': '+(error&&error.message||error));return null};
  if(typeof pathOrUrl==='string'&&pathOrUrl.startsWith('https://')){
    try{return await fetchCloudUrl(pathOrUrl)}catch(error){fail('https',error)}
  }
  const ref=storageRefFor(sdk,pathOrUrl);
  try{
    const bytes=await withTimeout(sdk.getBytes(ref),4000,'getBytes lento');
    return await bytesFromUnknown(bytes);
  }catch(error){fail('getBytes',error)}
  if(typeof sdk.getDownloadURL==='function'){
    try{return await fetchCloudUrl(await sdk.getDownloadURL(ref))}catch(error){fail('downloadURL',error)}
  }
  try{
    const path=storageObjectPath(typeof pathOrUrl==='string'?pathOrUrl:(ref&&ref.fullPath)||'');
    if(path){
      let token='';
      if(typeof sdk.getMetadata==='function'){
        try{
          const meta=await sdk.getMetadata(ref);
          token=String(meta&&meta.downloadTokens||'').split(',')[0];
        }catch{}
      }
      return await fetchCloudUrl(firebaseMediaUrl(path,token));
    }
  }catch(error){fail('media',error)}
  throw Error(errors.filter(Boolean).pop()||'No se pudo leer el archivo de la nube.');
}
async function hydrateCloudPedido(raw){
  if(!raw||typeof raw!=='object')return raw;
  const slots=cloudArtSlots(raw).filter(slot=>isCloudArtRef(slot.object[slot.key]));
  if(!slots.length)return raw;
  const sdk=await ensureFirebaseStorage();
  const order=clone(raw);
  const hydrated=cloudArtSlots(order);
  for(const slot of hydrated){
    const current=slot.object[slot.key];
    if(!isCloudArtRef(current))continue;
    const bytes=await readCloudBytes(sdk,current);
    const mime=cloudArtMime(current);
    const dataUrl=await blobToDataUrl(new Blob([bytes],{type:mime}));
    if(slot.key==='image'&&mime==='image/jpeg'&&typeof normalizeLogo==='function'){
      slot.object[slot.key]=await normalizeLogo(dataUrl,'jpeg');
    }else if(slot.key==='image'&&mime==='image/svg+xml'&&typeof normalizeLogo==='function'){
      slot.object[slot.key]=await normalizeLogo(dataUrl,'svg');
    }else{
      slot.object[slot.key]=dataUrl;
    }
  }
  return order;
}
async function uploadArtSlot(sdk,orderId,slot){
  const current=slot.object[slot.key];
  if(!current)return;
  if(isCloudArtRef(current))return;
  if(typeof current!=='string'||!current.startsWith('data:'))return;
  const path=pedidoArtPath(orderId,slot.artworkId,slot.fileName);
  const blob=dataBlob(current);
  const uploaded=await sdk.uploadBytes(storageRefFor(sdk,path),blob,{contentType:blob.type||'application/octet-stream',cacheControl:'public,max-age=3600'});
  slot.object[slot.key]=await sdk.getDownloadURL(uploaded.ref);
}
async function uploadCurrentPedido(){
  const sdk=await ensureFirebaseStorage();
  const snapshot=clone(state);
  const orderId=safeOrderId(snapshot.id);
  const slots=cloudArtSlots(snapshot);
  let uploaded=0;
  for(const slot of slots){
    const before=slot.object[slot.key];
    await uploadArtSlot(sdk,orderId,slot);
    if(slot.object[slot.key]!==before)uploaded++;
  }
  const payload=JSON.stringify(snapshot);
  const jsonBlob=new Blob([payload],{type:'application/json'});
  await sdk.uploadBytes(storageRefFor(sdk,pedidoJsonPath(orderId)),jsonBlob,{contentType:'application/json',cacheControl:'no-store'});
  return {orderId,uploaded,arts:slots.length};
}
async function readCloudPedidoJson(sdk,orderId){
  const bytes=await readCloudBytes(sdk,pedidoJsonPath(orderId));
  const parsed=JSON.parse(new TextDecoder().decode(bytes));
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('pedido.json inválido');
  return parsed;
}
async function listCloudPedidos(){
  const sdk=await ensureFirebaseStorage();
  if(typeof sdk.list!=='function')throw Error('Nube: el SDK no puede listar carpetas de pedidos.');
  return listCloudPedidoMetadata(
    ()=>collectPedidoPrefixes(options=>sdk.list(storageRefFor(sdk,'pedidos'),options)),
    id=>readCloudPedidoJson(sdk,id)
  );
}
async function openCloudPedido(raw){
  await loadOrder(raw);
  $('#cloudDialog')?.close();
}
function renderCloudList(root,result){
  const list=result&&Array.isArray(result.orders)?result.orders:[];
  root.replaceChildren();
  const notice=cloudLibraryNotice(result);
  if(notice){
    const warn=document.createElement('p');
    warn.className='cloud-list-error';
    warn.setAttribute('role','status');
    warn.textContent=notice;
    root.append(warn);
  }
  if(!list.length){
    const empty=document.createElement('p');
    empty.className='empty';
    empty.textContent=result&&result.failed?'No se pudo mostrar ningún pedido.':'Todavía no hay pedidos en la nube.';
    root.append(empty);
    return;
  }
  for(const order of list){
    const row=document.createElement('div');
    row.className='saved-row';
    const info=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small'),button=document.createElement('button');
    title.textContent=(order.number?'#'+order.number:'Sin folio')+' · '+(order.client||'Sin cliente');
    meta.textContent=(GARMENTS[order.garment]?.label||'Prenda')+' · '+(order.date||'Sin fecha')+' · '+(order.artworks?.length||0)+' aplicaciones · nube';
    button.type='button';
    button.textContent='Abrir';
    button.addEventListener('click',()=>busy(button,()=>openCloudPedido(order)));
    info.append(title,meta);
    row.append(info,button);
    root.append(row);
  }
}
async function openCloudLibrary(){
  const root=$('#cloudOrders');
  root.replaceChildren();
  const loading=document.createElement('p');
  loading.className='cloud-loading';
  loading.setAttribute('role','status');
  loading.textContent='Leyendo pedidos de la nube…';
  root.append(loading);
  $('#cloudDialog').showModal();
  try{
    const result=await listCloudPedidos();
    renderCloudList(root,result);
    if(result.failed){
      setCloudStatus('Nube: '+result.orders.length+' pedidos · '+result.failed+' con error.','error');
    }else{
      setCloudStatus(result.orders.length?'Nube: '+result.orders.length+' pedidos listos.':'Nube: no hay pedidos.','ok');
    }
  }catch(error){
    const message=cloudErrorMessage(error);
    root.replaceChildren();
    const fail=document.createElement('p');
    fail.className='empty';
    fail.setAttribute('role','status');
    fail.textContent=message;
    root.append(fail);
    setCloudStatus(message,'error');
    throw Error(message);
  }
}
function bindCloud(){
  $('#cloudUpload').addEventListener('click',e=>busy(e.currentTarget,async()=>{
    setCloudStatus('Subiendo pedido a la nube…');
    try{
      const result=await uploadCurrentPedido();
      const message=result.uploaded?'Pedido en la nube · '+result.uploaded+' archivo(s) de arte.':'Pedido en la nube · el arte ya estaba subido.';
      setCloudStatus(message,'ok');
      toast('Pedido subido. Ábrelo en otro navegador con Abrir desde la nube.');
    }catch(error){
      const message=cloudErrorMessage(error);
      setCloudStatus(message,'error');
      throw Error(message);
    }
  }));
  $('#cloudOpen').addEventListener('click',e=>busy(e.currentTarget,openCloudLibrary));
  setCloudStatus(tgmFirebaseConfigUsable()?'Nube lista · el borrador local se conserva.':'Nube: falta apiKey o storageBucket en firebase-config.');
}
const getImageBeforeCloud=getImage;
const cloudImageCache=new Map();
getImage=async function(src){
  if(isCloudArtRef(src)){
    if(!cloudImageCache.has(src))cloudImageCache.set(src,(async()=>{
      const sdk=await ensureFirebaseStorage();
      const bytes=await readCloudBytes(sdk,src);
      return URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
    })());
    src=await cloudImageCache.get(src);
  }
  return getImageBeforeCloud(src);
};
const loadOrderBeforeCloud=loadOrder;
loadOrder=async function(raw){
  const previous=state,revision=state.updatedAt;
  const hydrated=await hydrateCloudPedido(raw);
  if(state!==previous||state.updatedAt!==revision)throw Error('El pedido cambió durante la lectura. Vuelve a abrir el archivo.');
  return loadOrderBeforeCloud(hydrated);
};
const initUIBeforeCloud=initUI;
initUI=function(){initUIBeforeCloud();bindCloud()};
