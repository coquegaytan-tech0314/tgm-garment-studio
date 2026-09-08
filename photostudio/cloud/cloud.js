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
      listAll:storageMod.listAll,
      getBytes:storageMod.getBytes
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
async function readCloudBytes(sdk,pathOrUrl){
  const bytes=await sdk.getBytes(storageRefFor(sdk,pathOrUrl));
  return bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
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
    const mime=current.includes('.svg')?'image/svg+xml':current.includes('.jpg')||current.includes('.jpeg')?'image/jpeg':'image/png';
    slot.object[slot.key]=await blobToDataUrl(new Blob([bytes],{type:mime}));
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
async function listCloudPedidos(){
  const sdk=await ensureFirebaseStorage();
  const listed=await sdk.listAll(storageRefFor(sdk,'pedidos'));
  const orders=[];
  for(const prefix of listed.prefixes){
    try{
      const bytes=await readCloudBytes(sdk,pedidoJsonPath(prefix.name));
      const parsed=JSON.parse(new TextDecoder().decode(bytes));
      if(parsed&&typeof parsed==='object')orders.push(parsed);
    }catch{}
  }
  return orders.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
}
async function openCloudPedido(raw){
  await loadOrder(raw);
  $('#cloudDialog')?.close();
}
function renderCloudList(root,list){
  root.replaceChildren();
  if(!list.length){
    const empty=document.createElement('p');
    empty.className='empty';
    empty.textContent='Todavía no hay pedidos en la nube.';
    root.append(empty);
    return;
  }
  for(const order of list){
    const row=document.createElement('div');
    row.className='saved-row';
    const info=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small'),button=document.createElement('button');
    title.textContent=(order.number?'#'+order.number:'Sin folio')+' · '+(order.client||'Sin cliente');
    meta.textContent=(GARMENTS[order.garment]?.label||'Prenda')+' · '+(order.date||'Sin fecha')+' · '+(order.artworks?.length||0)+' aplicaciones · nube';
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
  loading.textContent='Leyendo pedidos de la nube…';
  root.append(loading);
  $('#cloudDialog').showModal();
  try{
    renderCloudList(root,await listCloudPedidos());
    setCloudStatus('Nube: lista de pedidos actualizada.','ok');
  }catch(error){
    const message=cloudErrorMessage(error);
    root.textContent=message;
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
