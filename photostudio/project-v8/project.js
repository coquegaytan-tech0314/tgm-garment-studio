/* V8 project collections. Keeps standalone pedido JSON compatibility (v1-v8). */
const PROJECT_SCHEMA='tgm-project';
const PROJECT_VERSION=1;
const PROJECT_MAX_ORDERS=60;
const PROJECT_MAX_BYTES=220*1024*1024;
const SINGLE_ORDER_MAX_BYTES=60*1024*1024;
let activeProject=null;
let activeProjectIndex=-1;
let projectOrderOpening=false;

function blankProjectMembership(){return null}
function validateProjectPreviewValue(value,label){
  if(value==null||value==='')return '';
  const data=safeString(value,18000000,label);
  if(!/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(data))throw Error(label+' inválida.');
  return data;
}
function validateProjectMembership(raw){
  if(raw==null)return null;
  if(typeof raw!=='object'||Array.isArray(raw))throw Error('Datos de proyecto inválidos.');
  const id=safeString(raw.id??'',100,'id de proyecto');
  const name=safeString(raw.name??'',120,'nombre de proyecto');
  const variant=safeString(raw.variant??'',120,'variante de proyecto');
  const backNote=safeString(raw.backNote??'',700,'nota de espalda');
  if(!id.trim()||!name.trim())throw Error('El pedido de proyecto requiere id y nombre de proyecto.');
  const position=raw.position==null?0:numeric(raw.position,0,PROJECT_MAX_ORDERS-1,'posición de proyecto');
  if(!Number.isInteger(position))throw Error('La posición de proyecto debe ser entera.');
  const previewRaw=raw.preview??{};
  if(typeof previewRaw!=='object'||Array.isArray(previewRaw))throw Error('Vista previa de proyecto inválida.');
  const signature=safeString(previewRaw.signature??'',32,'firma de vista previa');
  if(signature&&!/^[a-f0-9]{8,32}$/i.test(signature))throw Error('Firma de vista previa inválida.');
  return {id,name,variant,position,backNote,preview:{signature,front:validateProjectPreviewValue(previewRaw.front,'Vista previa frontal'),back:validateProjectPreviewValue(previewRaw.back,'Vista previa posterior')}};
}

const blankBeforeProjectV8=blank;
blank=function(){return {...blankBeforeProjectV8(),project:blankProjectMembership()}};
if(state.project===undefined)state.project=null;

const validateOrderBeforeProjectV8=validateOrder;
validateOrder=async function(raw){
  const out=await validateOrderBeforeProjectV8(raw);
  out.project=validateProjectMembership(raw.project);
  return out;
};

async function validateProject(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schema!==PROJECT_SCHEMA||raw.version!==PROJECT_VERSION)throw Error('El archivo no es un proyecto compatible de TGM.');
  const id=safeString(raw.id??'',100,'id de proyecto');
  const name=safeString(raw.name??'',120,'nombre de proyecto');
  if(!id.trim()||!name.trim())throw Error('El proyecto requiere id y nombre.');
  if(!Array.isArray(raw.orders)||!raw.orders.length||raw.orders.length>PROJECT_MAX_ORDERS)throw Error('El proyecto debe contener entre 1 y '+PROJECT_MAX_ORDERS+' prendas.');
  const ids=new Set(),orders=[];
  for(let i=0;i<raw.orders.length;i++){
    const order=await validateOrder(raw.orders[i]);
    if(ids.has(order.id))throw Error('El proyecto contiene pedidos duplicados.');
    ids.add(order.id);
    if(order.project&&order.project.id!==id)throw Error('Una prenda pertenece a otro proyecto.');
    if(!order.project)order.project={id,name,variant:order.number||('Prenda '+(i+1)),position:i,backNote:'',preview:{signature:'',front:'',back:''}};
    order.project.id=id;order.project.name=name;
    orders.push(order);
  }
  orders.sort((a,b)=>(a.project?.position??0)-(b.project?.position??0));
  orders.forEach((order,index)=>order.project.position=index);
  return {schema:PROJECT_SCHEMA,version:PROJECT_VERSION,id,name,orders,updatedAt:typeof raw.updatedAt==='string'&&Number.isFinite(Date.parse(raw.updatedAt))?new Date(raw.updatedAt).toISOString():new Date().toISOString()};
}

function projectPieces(order){return SIZES.reduce((sum,size)=>sum+Number(order.sizes?.[size]||0),0)}
function projectMoney(order){
  const cents=order.pricing?.unitCents;
  if(cents===''||cents==null)return 'Precio por definir';
  return (Number(cents)/100).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(order.pricing?.currency||'MXN');
}
function projectVariantLabel(order,index){return order.project?.variant||order.number||((GARMENTS[order.garment]?.label||'Prenda')+' '+(index+1))}
function syncProjectBanner(){
  const banner=$('#projectBanner');if(!banner)return;
  const membership=state.project;
  banner.hidden=!membership;
  if(!membership)return;
  $('#projectBannerName').textContent=membership.name;
  $('#projectBannerVariant').textContent=membership.variant||state.number||'Prenda del proyecto';
}
function storeCurrentProjectOrder(){
  if(!activeProject||activeProjectIndex<0||state.project?.id!==activeProject.id)return;
  activeProject.orders[activeProjectIndex]=clone(state);
  activeProject.orders[activeProjectIndex].version=VERSION;
  activeProject.updatedAt=new Date().toISOString();
}
function projectFileName(){return ((activeProject?.name||'proyecto-tgm').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'proyecto-tgm')+'_v8.json'}

function renderProjectDialog(){
  const root=$('#projectOrders'),summary=$('#projectSummary'),downloadButton=$('#downloadProject');
  if(!root||!summary||!downloadButton)return;
  root.replaceChildren();
  if(!activeProject){
    summary.textContent='Importa un proyecto JSON para ver todas sus prendas en un solo lugar.';
    downloadButton.disabled=true;
    const empty=document.createElement('p');empty.className='empty';empty.textContent='No hay un proyecto abierto.';root.append(empty);return;
  }
  downloadButton.disabled=false;
  const query=($('#projectSearch')?.value||'').trim().toLowerCase();
  const pieces=activeProject.orders.reduce((sum,order)=>sum+projectPieces(order),0);
  summary.textContent=activeProject.name+' · '+activeProject.orders.length+' prendas'+(pieces?' · '+pieces.toLocaleString('es-MX')+' piezas capturadas':' · cantidades por definir');
  let shown=0;
  activeProject.orders.forEach((order,index)=>{
    const label=projectVariantLabel(order,index),haystack=(label+' '+order.number+' '+(GARMENTS[order.garment]?.label||'')).toLowerCase();
    if(query&&!haystack.includes(query))return;
    shown++;
    const card=document.createElement('article');card.className='project-card';if(index===activeProjectIndex)card.dataset.active='true';
    const preview=order.project?.preview?.front;
    const media=document.createElement('div');media.className='project-thumb';
    if(preview){const img=document.createElement('img');img.src=preview;img.alt='Vista previa de '+label;media.append(img)}else{const fallback=document.createElement('span');fallback.textContent=GARMENTS[order.garment]?.label||'Prenda';media.append(fallback)}
    const body=document.createElement('div');body.className='project-card-body';
    const title=document.createElement('strong');title.textContent=label;
    const meta=document.createElement('small');const qty=projectPieces(order);meta.textContent=(order.number||'Sin folio')+' · '+(qty?qty.toLocaleString('es-MX')+' piezas':'cantidades por definir')+' · '+projectMoney(order);
    if(order.project?.backNote){const note=document.createElement('p');note.className='project-note';note.textContent=order.project.backNote;body.append(title,meta,note)}else body.append(title,meta);
    const open=document.createElement('button');open.textContent=index===activeProjectIndex?'Prenda abierta':'Abrir prenda';open.className=index===activeProjectIndex?'':'primary';open.disabled=index===activeProjectIndex;open.addEventListener('click',()=>busy(open,()=>openProjectOrder(index)));
    card.append(media,body,open);root.append(card);
  });
  if(!shown){const empty=document.createElement('p');empty.className='empty';empty.textContent='No hay variantes que coincidan con el filtro.';root.append(empty)}
}
function showProjectDialog(){renderProjectDialog();$('#projectDialog').showModal();$('#projectSearch')?.focus()}

async function loadProject(raw){
  const project=await validateProject(raw);
  activeProject=project;activeProjectIndex=-1;
  $('#ordersDialog')?.close();
  renderProjectDialog();
  if(!$('#projectDialog').open)$('#projectDialog').showModal();
  toast('Proyecto '+project.name+' cargado: '+project.orders.length+' prendas.');
  return project;
}
async function openProjectOrder(index){
  if(!activeProject||!Number.isInteger(index)||index<0||index>=activeProject.orders.length)throw Error('Prenda de proyecto inválida.');
  storeCurrentProjectOrder();
  projectOrderOpening=true;
  try{
    await loadOrder(activeProject.orders[index]);
    activeProjectIndex=index;
    storeCurrentProjectOrder();
    syncProjectBanner();renderProjectDialog();
    $('#projectDialog').close();
    toast('Prenda abierta: '+projectVariantLabel(state,index)+'.');
  }finally{projectOrderOpening=false}
}
async function importTgmJsonFile(file,{projectOnly=false}={}){
  if(!file)return;
  if(file.size>PROJECT_MAX_BYTES)throw Error('El JSON excede 220 MB. Divide el proyecto o reduce adjuntos.');
  const raw=JSON.parse(await file.text());
  if(raw?.schema===PROJECT_SCHEMA)return loadProject(raw);
  if(projectOnly)throw Error('Selecciona un archivo de proyecto TGM (tgm-project).');
  if(file.size>SINGLE_ORDER_MAX_BYTES)throw Error('El pedido individual excede 60 MB.');
  activeProject=null;activeProjectIndex=-1;
  await loadOrder(raw);
  syncProjectBanner();
  return state;
}
async function downloadActiveProject(){
  if(!activeProject)throw Error('Primero importa o abre un proyecto.');
  storeCurrentProjectOrder();
  const payload=clone(activeProject);payload.updatedAt=new Date().toISOString();
  download(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),projectFileName());
  toast('Proyecto completo descargado.');
}

const saveOrderBeforeProjectV8=saveOrder;
saveOrder=function(silent=false){const result=saveOrderBeforeProjectV8(silent);if(result)storeCurrentProjectOrder();return result};
const resetOrderBeforeProjectV8=resetOrder;
resetOrder=function(){activeProject=null;activeProjectIndex=-1;const result=resetOrderBeforeProjectV8();syncProjectBanner();return result};
const loadOrderBeforeProjectV8=loadOrder;
loadOrder=async function(raw){
  if(!projectOrderOpening){activeProject=null;activeProjectIndex=-1}
  const result=await loadOrderBeforeProjectV8(raw);syncProjectBanner();return result;
};
const populateBeforeProjectV8=populate;
populate=function(){populateBeforeProjectV8();syncProjectBanner()};

const initUIBeforeProjectV8=initUI;
initUI=function(){
  initUIBeforeProjectV8();
  $('#projectButton').addEventListener('click',showProjectDialog);
  $('#projectBannerOpen').addEventListener('click',showProjectDialog);
  $('#downloadProject').addEventListener('click',e=>busy(e.currentTarget,downloadActiveProject));
  $('#projectSearch').addEventListener('input',renderProjectDialog);
  $('#projectImport').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{await importTgmJsonFile(file,{projectOnly:true})}catch(error){toast(error instanceof SyntaxError?'El archivo no contiene JSON válido.':error.message)}});
  $('#importJson').addEventListener('change',async e=>{
    e.stopImmediatePropagation();const file=e.target.files[0];e.target.value='';if(!file)return;
    try{await importTgmJsonFile(file)}catch(error){toast(error instanceof SyntaxError?'El archivo no contiene JSON válido.':error.message)}
  },true);
  syncProjectBanner();
};
