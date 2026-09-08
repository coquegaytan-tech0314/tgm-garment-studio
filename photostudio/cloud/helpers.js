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
if(typeof globalThis!=='undefined'){
  Object.assign(globalThis,{isCloudArtRef,safeOrderId,safeCloudFileName,pedidoJsonPath,pedidoArtPath,cloudArtSlots,TGM_CLOUD_BUCKET});
}
