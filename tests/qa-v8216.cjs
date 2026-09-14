const {assert,run,$,elements}=require('./harness.cjs');

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8,'Schema VERSION stays 8');
  const built=require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
  assert.match(built,/MGM · v8\.2\.16/);
  assert.equal(built.includes('VERSION=9'),false,'schema stays VERSION 8');
  assert.match(built,/function toggleDespieceMode/);
  assert.match(built,/function syncSleevesChrome/);
  assert.match(built,/'#cloudUpload','#cloudOpen','#projectButton'/);
  assert.match(built,/if\(!state\.artworks\.length\)addArt\(\)/);
  assert.match(built,/PHOTO_ROTATE_DRAG_GAIN=0\.28/);
  assert.equal(run('roundNeckPaintsAcabadoOverlays()'),false);
  assert.equal(run('poloPaintsAcabadoOverlays()'),false);

  run("state=blank();state.garment='playera';photoBaseDefaults();state.photo.source='generated';state.photo.side='front';currentTab='photo';state.artworks=[];selectedArt=null");
  assert.equal(run('state.artworks.length'),0);
  run('enterAcabadoPlaceMode()');
  assert.equal(run('state.artworks.length'),1,'Colocar logo creates a placeholder when Logos is empty');
  assert.equal(run('!!selected()'),true);
  assert.equal(run("state.pro.workspace"),'photo');
  assert.equal(run("state.photo.side"),'front');

  const keptId=run('selected().id');
  run('selectedArt=null;photoRulerOn=false');
  run('togglePlacementRuler()');
  assert.equal(run('photoRulerOn'),true);
  assert.equal(run('selectedArt'),null,'Regla never auto-selects an estampado');
  run(`selectedArt='${keptId}'`);

  run("state.photo.side='orbit';despieceMode=false;syncPhotoUI()");
  assert.equal(run("state.photo.side"),'orbit');
  run('showSleeves()');
  assert.equal(run("state.photo.side"),'front','Editar mangas leaves 360° for a flat sleeve view');
  assert.equal(run('sleeveUI.view'),'front');
  assert.equal(run("state.pro.workspace"),'photo');

  run("state.photo.side='both';showSleeves()");
  assert.equal(run("state.photo.side"),'front','Editar mangas leaves Comparar for a single side');

  run("state.garment='sleeveless';photoBaseDefaults();syncSleeves()");
  assert.equal(run("$('#photoSleeves').textContent"),'Editar sisas');
  assert.equal(run("$('#tab-sleeves').textContent"),'Sisas');
  assert.equal(run("$('#artSleeves').textContent"),'Ir a Sisas');
  assert.match(run("$('#sleevesTitle').textContent"),/Sisas/);
  run("state.garment='playera';photoBaseDefaults();syncSleeves()");
  assert.equal(run("$('#photoSleeves').textContent"),'Editar mangas');

  run("state=blank();state.garment='playera';photoBaseDefaults();state.photo.source='generated';state.photo.side='front';despieceMode=false");
  await $('#photoDespieceView').emit('click');
  assert.equal(run('isDespieceMode()'),true,'Despiece button enters the exploded view');
  await $('#photoDespieceView').emit('click');
  assert.equal(run('isDespieceMode()'),false,'Second Despiece click leaves the view');
  run('toggleDespieceMode()');
  assert.equal(run('isDespieceMode()'),true);
  run('toggleDespieceMode()');
  assert.equal(run('isDespieceMode()'),false);

  run("state=blank();populate()");
  const measureEl=elements.find(el=>el.dataset&&el.dataset.measure);
  assert(measureEl,'Tallas table has measurement inputs');
  const measureKey=measureEl.dataset.measure,measureSize=measureEl.dataset.size;
  measureEl.value='abc';
  await measureEl.emit('input');
  assert.equal(run(`ensureReference().measurements[${JSON.stringify(measureKey)}][${JSON.stringify(measureSize)}]`),'','Invalid talla input is not coerced to 0');
  measureEl.value='';
  await measureEl.emit('input');
  assert.equal(run(`ensureReference().measurements[${JSON.stringify(measureKey)}][${JSON.stringify(measureSize)}]`),'');
  measureEl.value='52.4';
  await measureEl.emit('input');
  assert.equal(run(`ensureReference().measurements[${JSON.stringify(measureKey)}][${JSON.stringify(measureSize)}]`),52.4);

  const hps=run("state=blank();state.garment='playera';photoBaseDefaults();placementFrame('front').neck");
  const collar=run("placementFrame('front').collarTip");
  assert(hps>collar,'HPS origin stays below the collar tip');
  const poloHps=run("state.garment='polo';photoBaseDefaults();placementFrame('front').neck");
  const poloRect=run("photoRect('polo','front')");
  assert(Math.abs(poloHps-(poloRect.y+poloRect.h*.102))<0.6,'Polo HPS stays locked at neckV .102');

  console.log('PASS v8.2.16 UI/UX QA: Colocar logo, Despiece toggle, mangas from 360, tallas');
})().catch(error=>{console.error(error);process.exitCode=1});
