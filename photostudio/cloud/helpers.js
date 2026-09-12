const TGM_CLOUD_BUCKET = 'tgm-garment-studio.firebasestorage.app';
function isCloudArtRef(value){
  if(typeof value!=='string' || !value)return false;
  if(value.startsWith('data:'))return false;
  if(value.startsWith('gs://'+TGM_CLOUD_BUCKET+'/'))return true;
  if(!value.startsWith('https://'))return false;
  return /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/tgm-garment-studio\.(firebasestorage\.app|appspot\.com)\//.test(value)
    || /https:\/\/storage\.googleapis\.com\/tgm-garment-studio\.(firebasestorage\.app|appspot\.com)\//.test(value)
    || /^https:\/\/tgm-garment-studio\.firebasestorage\.app\//.test(value);
}
function safeOrderId(id){
  const value=String(id||'').trim();
  if(!/^[a-zA-Z0-9._-]{6,80}$/.test(value))throw Error('Identificador de pedido inválido para la nube.');
  return value;
}
function safeCloudFileName(name){
  const base=String(name||'arte').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^[-.]+|[-.]+$/g,'').slice(0,80);
  return base||'arte.png';
}
function pedidoJsonPath(orderId){return 'pedidos/'+safeOrderId(orderId)+'/pedido.json'}
function pedidoArtPath(orderId,artworkId,fileName){
  const artId=String(artworkId||'arte').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(0,80)||'arte';
  return 'pedidos/'+safeOrderId(orderId)+'/art/'+artId+'-'+safeCloudFileName(fileName);
}
function cloudArtMime(pathOrUrl){
  const value=String(pathOrUrl||'').toLowerCase();
  if(value.includes('.svg'))return 'image/svg+xml';
  if(value.includes('.jpg')||value.includes('.jpeg'))return 'image/jpeg';
  return 'image/png';
}
function cloudArtSlots(order){
  const slots=[];
  for(const art of order.artworks||[]){
    if(art.image)slots.push({object:art,key:'image',artworkId:art.id,fileName:art.fileName||art.logo?.name||'aplicacion.png'});
    if(art.logo?.original?.data)slots.push({object:art.logo.original,key:'data',artworkId:art.id,fileName:'original-'+(art.logo.original.name||'original.png')});
  }
  for(const view of ['front','back']){
    const item=order.photo?.final?.[view];
    if(item?.image)slots.push({object:item,key:'image',artworkId:'final-'+view,fileName:'final-'+view+'.png'});
  }
  for(const file of order.reference?.attachments||[]){
    if(['png','jpg','jpeg'].includes(file.extension)&&file.data)slots.push({object:file,key:'data',artworkId:file.id||'ref',fileName:file.name||('referencia.'+file.extension)});
  }
  return slots;
}
const CLOUD_LIST_PAGE_SIZE = 100;
const CLOUD_LIST_TIMEOUT_MS = 15000;
const CLOUD_PEDIDO_TIMEOUT_MS = 20000;
const CLOUD_PEDIDO_CONCURRENCY = 4;
function withTimeout(promise, ms, message){
  return new Promise((resolve, reject)=>{
    const timer = setTimeout(()=>reject(Error(message)), ms);
    Promise.resolve(promise).then(
      value=>{clearTimeout(timer);resolve(value);},
      error=>{clearTimeout(timer);reject(error);}
    );
  });
}
function cloudPedidoIdFromPrefix(prefix){
  if(prefix==null)return null;
  let name=typeof prefix==='string'?prefix:(prefix.fullPath||prefix.name||'');
  name=String(name).replace(/^gs:\/\/[^/]+\//,'').replace(/\/+$/,'').replace(/^\/+/,'');
  const parts=name.split('/').filter(Boolean);
  if(parts[0]==='pedidos')parts.shift();
  const id=parts[0]||'';
  try{return safeOrderId(id)}catch{return null}
}
function cloudPedidoIdsFromPrefixes(prefixes){
  const ids=[],seen=new Set();
  for(const prefix of prefixes || []){
    const id=cloudPedidoIdFromPrefix(prefix);
    if(!id||seen.has(id))continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
async function collectPedidoPrefixes(listPage){
  const prefixes = [];
  let pageToken;
  do {
    const page = await listPage({maxResults: CLOUD_LIST_PAGE_SIZE, pageToken});
    prefixes.push(...(page && page.prefixes || []));
    pageToken = page && page.nextPageToken;
  } while(pageToken);
  return prefixes;
}
async function mapPool(items, limit, worker){
  const list=items||[];
  const out=new Array(list.length);
  let next=0;
  const width=Math.max(1, Math.min(limit||1, list.length||1));
  async function pump(){
    while(next<list.length){
      const i=next++;
      out[i]=await worker(list[i], i);
    }
  }
  await Promise.all(Array.from({length:Math.min(width, Math.max(list.length,1))}, pump));
  return out;
}
function summarizeCloudPedidoReads(settled){
  const orders = [];
  const errors = [];
  let failed = 0;
  for(const item of settled || []){
    if(item && item.status === 'fulfilled' && item.value && typeof item.value === 'object' && !Array.isArray(item.value)){
      orders.push(item.value);
    } else {
      failed++;
      const reason=item && item.reason;
      if(reason)errors.push(String(reason.message||reason));
    }
  }
  orders.sort((a, b)=>(b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return {orders, failed, listed: (settled || []).length, errors};
}
function cloudReadHint(errors){
  const text=(errors||[]).join(' ');
  if(/CORS|blocked|Failed to fetch|Load failed|NetworkError/i.test(text))return ' El navegador bloqueó la descarga (CORS).';
  if(/Tiempo agotado|tardó/i.test(text))return ' La lectura tardó demasiado.';
  if(/unauthorized|permission|storage\/unauthorized/i.test(text))return ' Storage rechazó el acceso.';
  if(/404|not found|object-not-found/i.test(text))return ' No se encontró pedido.json en esas carpetas.';
  return errors && errors[0] ? ' '+errors[0].slice(0,140) : '';
}
function cloudLibraryNotice(summary){
  const orders = summary && summary.orders || [];
  const failed = summary && summary.failed || 0;
  const listed = summary && summary.listed || 0;
  const hint=cloudReadHint(summary && summary.errors);
  if(!listed) return '';
  if(failed && orders.length) return 'Se leyeron '+orders.length+' de '+listed+' pedidos. '+failed+' no se pudieron abrir. Puedes abrir los que sí aparecen.'+hint;
  if(failed) return 'Se encontraron '+listed+' carpetas, pero no se pudo leer ningún pedido.json.'+hint+' Intenta de nuevo.';
  return '';
}
async function listCloudPedidoMetadata(listPrefixes, readPedido, timeouts){
  const listMs = timeouts && timeouts.list || CLOUD_LIST_TIMEOUT_MS;
  const readMs = timeouts && timeouts.pedido || CLOUD_PEDIDO_TIMEOUT_MS;
  const concurrency = timeouts && timeouts.concurrency || CLOUD_PEDIDO_CONCURRENCY;
  const prefixes = await withTimeout(
    listPrefixes(),
    listMs,
    'La lista de pedidos tardó demasiado. Revisa la conexión e intenta de nuevo.'
  );
  const ids = cloudPedidoIdsFromPrefixes(prefixes);
  const settled = await mapPool(ids, concurrency, async id=>{
    try{
      const value=await withTimeout(readPedido(id), readMs, 'Tiempo agotado al leer '+id);
      return {status:'fulfilled', value};
    }catch(reason){
      return {status:'rejected', reason};
    }
  });
  return summarizeCloudPedidoReads(settled);
}
function firebaseMediaUrl(path, token){
  const clean=String(path||'').replace(/^\/+/, '');
  const url='https://firebasestorage.googleapis.com/v0/b/'+TGM_CLOUD_BUCKET+'/o/'+encodeURIComponent(clean)+'?alt=media';
  return token?url+'&token='+encodeURIComponent(token):url;
}
function storageObjectPath(pathOrUrl){
  if(typeof pathOrUrl!=='string'||!pathOrUrl)return '';
  if(pathOrUrl.startsWith('gs://')){
    const rest=pathOrUrl.replace(/^gs:\/\/[^/]+\//,'');
    return rest;
  }
  if(pathOrUrl.startsWith('https://')){
    const encoded=pathOrUrl.match(/\/o\/([^?]+)/);
    if(encoded)try{return decodeURIComponent(encoded[1])}catch{return ''}
    const direct=pathOrUrl.match(/tgm-garment-studio\.firebasestorage\.app\/(.+?)(?:\?|$)/);
    if(direct)return decodeURIComponent(direct[1]);
  }
  return pathOrUrl.replace(/^\/+/, '');
}
if(typeof globalThis!=='undefined'){
  Object.assign(globalThis,{
    isCloudArtRef,safeOrderId,safeCloudFileName,pedidoJsonPath,pedidoArtPath,cloudArtMime,cloudArtSlots,TGM_CLOUD_BUCKET,
    CLOUD_LIST_PAGE_SIZE,CLOUD_LIST_TIMEOUT_MS,CLOUD_PEDIDO_TIMEOUT_MS,CLOUD_PEDIDO_CONCURRENCY,
    withTimeout,cloudPedidoIdFromPrefix,cloudPedidoIdsFromPrefixes,collectPedidoPrefixes,mapPool,
    summarizeCloudPedidoReads,cloudReadHint,cloudLibraryNotice,listCloudPedidoMetadata,firebaseMediaUrl,storageObjectPath
  });
}
