const {assert,context,run,$}=require('./harness.cjs');
const fs=require('fs');
const path=require('path');

(async()=>{
  const cloudJs=fs.readFileSync(path.join(__dirname,'../photostudio/cloud/cloud.js'),'utf8');
  const built=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
  assert(!cloudJs.includes('listAll'),'cloud library must not call recursive listAll');
  assert(cloudJs.includes('sdk.list('),'cloud library must paginate with non-recursive list()');
  assert.match(cloudJs,/hydrateCloudPedido\(raw\)/,'opening a pedido must still hydrate art');
  assert.match(built,/MGM · v8\.2\./);
  assert.equal(built.includes('listAll'),false,'built app must not ship listAll');
  assert.match(built,/Leyendo pedidos de la nube/);
  assert.match(built,/CLOUD_PEDIDO_SNAPSHOT/);
  assert.match(built,/CR - POLO BLANCO/);
  assert.match(built,/CUMBRES - RHINOS/);
  assert.equal(run('VERSION'),8,'Schema VERSION stays 8');

  await run('init()');
  const encoder=new TextEncoder();
  const pedidos={
    'folio-cr1':Object.assign(run('blank()'),{id:'folio-cr1',number:'CR - POLO BLANCO',client:'CUMBRES - RHINOS',garment:'polo',neck:'polo',date:'2026-09-01',updatedAt:'2026-09-02T12:00:00.000Z'}),
    'folio-cr2':Object.assign(run('blank()'),{id:'folio-cr2',number:'CR - HOODIE',client:'CUMBRES - RHINOS',garment:'hoodie',neck:'hood',date:'2026-09-01',updatedAt:'2026-09-01T12:00:00.000Z'})
  };
  context.listCalls=[];
  context.byteCalls=[];
  context.urlCalls=[];
  context.pedidos=pedidos;
  context.fetch=async url=>{
    const match=decodeURIComponent(String(url)).match(/pedidos\/([^/?]+)\/pedido\.json/);
    const order=match&&pedidos[match[1]];
    if(!order)throw Error('fetch missing '+url);
    const bytes=encoder.encode(JSON.stringify(order));
    return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  };
  context.sdk={
    storage:{},
    ref:(_,path)=>path,
    list:async(ref,options)=>{
      context.listCalls.push({ref,options});
      return {prefixes:Object.keys(pedidos).map(name=>({name:'pedidos/'+name+'/',fullPath:'pedidos/'+name+'/'})),items:[{name:'stray.json'}]};
    },
    listAll:async()=>{throw Error('listAll must not be used');},
    getBytes:async(ref)=>{
      context.byteCalls.push(ref);
      const id=String(ref).split('/')[1];
      if(id==='folio-cr2')throw Error('simulated timeout');
      const order=pedidos[id];
      if(!order)throw Error('missing '+ref);
      return encoder.encode(JSON.stringify(order));
    },
    getDownloadURL:async(ref)=>{
      context.urlCalls.push(ref);
      const id=String(ref).split('/')[1];
      return 'https://firebasestorage.googleapis.com/v0/b/tgm-garment-studio.firebasestorage.app/o/pedidos%2F'+id+'%2Fpedido.json?alt=media&token=test';
    }
  };
  run('ensureFirebaseStorage=async()=>sdk');
  await run('openCloudLibrary()');

  assert.equal($('#cloudDialog').open,true);
  assert.deepEqual(context.listCalls.map(c=>c.ref),['pedidos']);
  assert.ok(context.listCalls[0].options.maxResults<=100);
  assert.ok(context.byteCalls.every(ref=>String(ref).endsWith('/pedido.json')),'list must download only pedido.json');
  assert.equal(context.byteCalls.length,2);
  assert.equal(context.urlCalls.length,1,'getBytes failure must fall back to downloadURL');

  const root=$('#cloudOrders');
  assert.equal(root.children.some(c=>c.className==='cloud-loading'),false,'dialog must leave the loading state');
  const notice=root.children.find(c=>c.className==='cloud-list-error');
  assert.equal(notice,undefined,'downloadURL fallback should recover the second pedido.json');
  const rows=root.children.filter(c=>c.className==='saved-row');
  assert.equal(rows.length,2,'fullPath prefixes and downloadURL fallback list both CUMBRES–RHINOS folios');
  const titles=rows.map(r=>r.children[0].children[0].textContent).sort();
  assert.deepEqual(titles,['#CR - HOODIE · CUMBRES - RHINOS','#CR - POLO BLANCO · CUMBRES - RHINOS']);
  assert.match($('#cloudStatus').textContent,/2 pedidos listos/);

  const openBtn=rows[0].children.find(c=>c.tagName==='BUTTON');
  assert.equal(openBtn.textContent,'Abrir');
  await run('openCloudPedido(pedidos["folio-cr1"])');
  assert.equal($('#cloudDialog').open,false);
  assert.equal(run('state.number'),'CR - POLO BLANCO');
  assert.equal(run('state.client'),'CUMBRES - RHINOS');

  const beforeHydrate=context.byteCalls.length;
  context.snapLike=Object.assign(run('blank()'),{
    id:'folio-snap',number:'CR - POLO SNAP',client:'CUMBRES - RHINOS',garment:'polo',neck:'polo',
    artworks:[{id:'art-1',view:'front',zone:'chest',x:.5,y:.42,scale:.22,image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',logo:{original:{data:'https://firebasestorage.googleapis.com/v0/b/tgm-garment-studio.firebasestorage.app/o/pedidos%2Ffolio-snap%2Foriginal.png?alt=media',name:'logo.png',type:'png'}}}]
  });
  await run('hydrateCloudPedido(snapLike)');
  assert.equal(context.byteCalls.length,beforeHydrate,'opening must not block on original/attachment cloud refs');

  context.sdk.getBytes=async(ref)=>{context.byteCalls.push(ref);throw Error('Failed to fetch');};
  delete context.sdk.getDownloadURL;
  delete context.fetch;
  await run('openCloudLibrary()');
  const snapRows=$('#cloudOrders').children.filter(c=>c.className==='saved-row');
  assert(snapRows.length>=12,'same-origin snapshot must list CUMBRES–RHINOS when live media reads fail');
  const snapTitles=snapRows.map(r=>r.children[0].children[0].textContent).join(' | ');
  assert.match(snapTitles,/CUMBRES - RHINOS/);
  assert.match(snapTitles,/CR - POLO BLANCO/);

  console.log('PASS cloud library lists pedido.json in parallel without listAll');
})().catch(error=>{console.error(error);process.exitCode=1});
