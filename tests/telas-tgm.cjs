const {assert,context,run,createCanvas}=require('./harness.cjs');
function sample(canvas,x,y){
  const d=canvas.getContext('2d').getImageData(Math.round(x),Math.round(y),1,1).data;
  return {r:d[0],g:d[1],b:d[2],a:d[3]};
}

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8);
  const built=require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
  assert.match(built,/MGM · v8\.2\.10/);
  assert.match(built,/PIQUÉ OLMO/);
  assert.match(built,/50% algodón \/ 50% poliéster/);
  assert.equal(built.includes('50% lycra')||built.includes('50% cotton / 50% lycra'),false);
  assert.match(built,/nunca lycra|no lycra/);
  assert.match(built,/MAYKI PLUS/);
  assert.match(built,/MILLENIUM/);
  assert.match(built,/id="telaCatalog"/);
  assert.match(built,/id="telaKnitt"/);
  assert.match(built,/Opciones editables, no una lista cerrada/);
  assert.match(built,/id="poloSideVents"/);

  run("state=blank();state.garment='polo';photoBaseDefaults();populate()");
  assert.equal(run('state.fabric'),'PIQUÉ OLMO');
  assert.equal(run('state.gsm'),216);
  assert.equal(run('state.texture'),'pique');
  assert.equal(run('ensureTela().composicion'),'50% algodón / 50% poliéster');
  assert.equal(run('ensureTela().composicion.toLowerCase().includes("lycra")'),false,'Olmo is cotton/polyester, not lycra');
  assert.match(run('ensureReference().compositionNotes'),/50% algodón \/ 50% poliéster/);
  assert.match(run('state.stretch'),/50% algodón \/ 50% poliéster/);
  assert.equal(run('ensureReference().composition'),'polycotton');

  run("state=blank();state.garment='playera';photoBaseDefaults();populate()");
  assert.equal(run('state.fabric'),'CHIFÓN 140');
  assert.equal(run('state.gsm'),'');

  run("state=blank();state.garment='hoodie';photoBaseDefaults();populate()");
  assert.equal(run('state.fabric'),'MILLENIUM');
  assert.equal(run('state.gsm'),70);
  assert.match(run('ensureTela().composicion'),/Nylon 100%/);

  run("state=blank();state.garment='sleeveless';photoBaseDefaults();populate()");
  assert.equal(run('state.fabric'),'Chifón Estrella','sleeveless keeps the existing Chifón photobase label');

  run("state=blank();state.garment='polo';photoBaseDefaults();populate()");
  run("telaApplyRecord({id:'fomer',nombre:'FOMER',composicion:'Poliéster 100%',pesoGm2:135,nota:'liso',texture:'smooth',composition:'polyester'})");
  assert.equal(run('state.fabric'),'FOMER');
  run("state.tela._defaultFor=''");
  run("state.garment='hoodie';photoBaseDefaults()");
  assert.equal(run('state.fabric'),'FOMER','manual tela survives a garment change');

  context.custom=run('clone(state)');
  run("custom.tela={source:'custom',id:'dev-1',nombre:'PIQUÉ NUEVO',composicion:'Poliéster 100%',pesoGm2:150,nota:'desarrollo',texture:'pique'}");
  const loaded=await run('validateOrder(custom)');
  assert.equal(loaded.tela.nombre,'PIQUÉ NUEVO');
  assert.equal(loaded.version,8);

  const olmo=run("TGM_TELA_CATALOG.find(t=>t.id==='pique-olmo')");
  assert.equal(olmo.composicion,'50% algodón / 50% poliéster');
  assert.equal(run("TGM_TELA_CATALOG.find(t=>t.id==='pique-atlante').composicion"),'Poliéster Multifilamento');
  assert.equal(run("TGM_TELA_CATALOG.find(t=>t.id==='fomer').composicion"),'Poliéster 100%');
  assert.equal(run("TGM_TELA_CATALOG.find(t=>t.id==='mayki-plus').nombre"),'MAYKI PLUS');
  assert.equal(run("TGM_TELA_CATALOG.find(t=>t.id==='millenium').nombre"),'MILLENIUM');
  assert.equal(run("telaSuggestedIds('polo').join(',')"),'pique-olmo,pique-atlante,fomer');
  assert.match(run("TGM_TELA_CATALOG.find(t=>t.id==='pique-olmo').nota"),/schools/);
  assert.match(run("TGM_TELA_CATALOG.find(t=>t.id==='pique-atlante').nota"),/warehouse/);
  assert.match(run("TGM_TELA_CATALOG.find(t=>t.id==='fomer').nota"),/liso/);
  assert.equal(run("telaResolveCue({tela:{id:'pique-olmo'}}).kind"),'pique');
  assert.equal(run("telaResolveCue({tela:{id:'pique-atlante'}}).kind"),'pique');
  assert.equal(run("telaResolveCue({tela:{id:'fomer'}}).kind"),'smooth');
  assert(run("telaResolveCue({tela:{id:'pique-atlante'}}).amp")<run("telaResolveCue({tela:{id:'pique-olmo'}}).amp"),'Atlante piqué cue is lighter than Olmo');

  run("state=blank();state.garment='polo';photoBaseDefaults();populate();state.bodyColor='#242529'");
  const olmoSig=run('visualSignature()');
  const olmoCanvas=createCanvas(800,920);context.olmoCanvas=olmoCanvas;
  await run("renderPhoto(olmoCanvas,'front',{background:true})");
  run("telaApplyRecord(TGM_TELA_CATALOG.find(t=>t.id==='pique-atlante'))");
  assert.equal(run('state.texture'),'pique');
  assert.notEqual(run('visualSignature()'),olmoSig,'Atlante changes the Acabado signature');
  run("telaApplyRecord(TGM_TELA_CATALOG.find(t=>t.id==='fomer'))");
  assert.equal(run('state.fabric'),'FOMER');
  assert.equal(run('state.texture'),'smooth');
  const fomerCanvas=createCanvas(800,920);context.fomerCanvas=fomerCanvas;
  await run("renderPhoto(fomerCanvas,'front',{background:true})");
  const r=run("photoRect('polo','front')");
  const olmoPx=sample(olmoCanvas,r.x+r.w*.42,r.y+r.h*.42);
  const fomerPx=sample(fomerCanvas,r.x+r.w*.42,r.y+r.h*.42);
  assert(Math.abs(olmoPx.r-fomerPx.r)+Math.abs(olmoPx.g-fomerPx.g)+Math.abs(olmoPx.b-fomerPx.b)>0,'Olmo piqué and Fomer liso differ on the body');
  assert.equal(run('poloConstructionRows().length'),5,'polo construction rows stay after tela picks');
  assert.equal(run("$('#poloExtras').hidden"),false);
  assert.equal(run("$('#telaNombre').disabled"),false,'tela name stays editable');
  assert.equal(run("$('#telaComposicion').disabled"),false);
  assert.equal(run("$('#telaKnitt').disabled"),false);

  run("state=blank();state.garment='polo';photoBaseDefaults();populate()");
  run("$('#telaComposicion').value='50% algodón / 50% poliéster · pedido';$('#telaComposicion').emit('input')");
  assert.match(run('ensureTela().composicion'),/pedido/,'editing a preset updates the pedido row');
  assert.equal(run('ensureTela().composicion.toLowerCase().includes("lycra")'),false);

  run("$('#telaNombre').value='PIQUÉ ESCUELA NUEVA'");
  run("$('#telaComposicion').value='60% poliéster / 40% algodón'");
  run("$('#telaKnitt').value='pique'");
  run("$('#telaNota').value='desarrollo planta'");
  await run("$('#telaSaveCustom').click()");
  assert.equal(run("loadCustomTelas().some(t=>t.nombre==='PIQUÉ ESCUELA NUEVA')"),true);
  assert.equal(run('ensureTela().source'),'custom');
  assert.equal(run('state.texture'),'pique');
  assert.equal(run("telaSuggestedIds('polo').join(',')"),'pique-olmo,pique-atlante,fomer','polo presets stay the three Koke options');

  console.log('telas-tgm: ok');
})().catch(err=>{console.error(err);process.exit(1)});
