const {assert,context,run,$}=require('./harness.cjs');
const fs=require('fs');
const path=require('path');

(async()=>{
  const cloudJs=fs.readFileSync(path.join(__dirname,'../photostudio/cloud/cloud.js'),'utf8');
  const built=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
  assert(!cloudJs.includes('listAll'),'cloud library must not call recursive listAll');
  assert(cloudJs.includes('sdk.list('),'cloud library must paginate with non-recursive list()');
  assert.match(cloudJs,/hydrateCloudPedido\(raw\)/,'opening a pedido must still hydrate art');
  assert.match(built,/ESTUDIO · v8\.2\.4/);
  assert.equal(built.includes('listAll'),false,'built app must not ship listAll');
  assert.match(built,/Leyendo pedidos de la nube/);
  assert.equal(run('VERSION'),8,'Schema VERSION stays 8');

  await run('init()');
  const encoder=new TextEncoder();
  const pedidos={
    'folio-cr1':Object.assign(run('blank()'),{id:'folio-cr1',number:'CR - POLO BLANCO',client:'CUMBRES - RHINOS',garment:'polo',neck:'polo',date:'2026-09-01',updatedAt:'2026-09-02T12:00:00.000Z'}),
    'folio-cr2':Object.assign(run('blank()'),{id:'folio-cr2',number:'CR - HOODIE',client:'CUMBRES - RHINOS',garment:'hoodie',neck:'hood',date:'2026-09-01',updatedAt:'2026-09-01T12:00:00.000Z'})
  };
  context.listCalls=[];
  context.byteCalls=[];
  context.pedidos=pedidos;
  context.sdk={
    storage:{},
    ref:(_,path)=>path,
    list:async(ref,options)=>{
      context.listCalls.push({ref,options});
      return {prefixes:Object.keys(pedidos).map(name=>({name})),items:[{name:'stray.json'}]};
    },
    listAll:async()=>{throw Error('listAll must not be used');},
    getBytes:async(ref)=>{
      context.byteCalls.push(ref);
      const id=String(ref).split('/')[1];
      if(id==='folio-cr2')throw Error('simulated timeout');
      const order=pedidos[id];
      if(!order)throw Error('missing '+ref);
      return encoder.encode(JSON.stringify(order));
    }
  };
  run('ensureFirebaseStorage=async()=>sdk');
  await run('openCloudLibrary()');

  assert.equal($('#cloudDialog').open,true);
  assert.deepEqual(context.listCalls.map(c=>c.ref),['pedidos']);
  assert.ok(context.listCalls[0].options.maxResults<=100);
  assert.ok(context.byteCalls.every(ref=>String(ref).endsWith('/pedido.json')),'list must download only pedido.json');
  assert.equal(context.byteCalls.length,2);

  const root=$('#cloudOrders');
  assert.equal(root.children.some(c=>c.className==='cloud-loading'),false,'dialog must leave the loading state');
  const notice=root.children.find(c=>c.className==='cloud-list-error');
  assert.match(notice.textContent,/Se leyeron 1 de 2 pedidos/);
  const rows=root.children.filter(c=>c.className==='saved-row');
  assert.equal(rows.length,1,'failed pedido.json stays out of the visible rows');
  const title=rows[0].children[0].children[0];
  assert.equal(title.textContent,'#CR - POLO BLANCO · CUMBRES - RHINOS');
  assert.match($('#cloudStatus').textContent,/1 pedidos · 1 con error/);

  const openBtn=rows[0].children.find(c=>c.tagName==='BUTTON');
  assert.equal(openBtn.textContent,'Abrir');
  await run('openCloudPedido(pedidos["folio-cr1"])');
  assert.equal($('#cloudDialog').open,false);
  assert.equal(run('state.number'),'CR - POLO BLANCO');
  assert.equal(run('state.client'),'CUMBRES - RHINOS');

  console.log('PASS cloud library lists pedido.json in parallel without listAll');
})().catch(error=>{console.error(error);process.exitCode=1});
