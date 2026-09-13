const {assert,context,run}=require('./harness.cjs');

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8);
  const built=require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
  assert.match(built,/MGM · v8\.2\.10/);
  assert.match(built,/PIQUÉ OLMO/);
  assert.match(built,/Poliéster\/Algodón/);
  assert.equal(built.includes('50% lycra')||built.includes('50% cotton / 50% lycra'),false);
  assert.match(built,/MAYKI PLUS/);
  assert.match(built,/MILLENIUM/);
  assert.match(built,/id="telaCatalog"/);
  assert.match(built,/id="poloSideVents"/);

  run("state=blank();state.garment='polo';photoBaseDefaults();populate()");
  assert.equal(run('state.fabric'),'PIQUÉ OLMO');
  assert.equal(run('state.gsm'),216);
  assert.equal(run('state.texture'),'pique');
  assert.match(run('ensureTela().composicion'),/Poliéster\/Algodón/);
  assert.equal(run('ensureTela().composicion.includes("50")'),false,'Olmo has no invented fiber %');
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
  assert.equal(olmo.composicion,'Poliéster/Algodón');
  assert.equal(run("TGM_TELA_CATALOG.find(t=>t.id==='mayki-plus').nombre"),'MAYKI PLUS');
  assert.equal(run("TGM_TELA_CATALOG.find(t=>t.id==='millenium').nombre"),'MILLENIUM');

  console.log('telas-tgm: ok');
})().catch(err=>{console.error(err);process.exit(1)});
