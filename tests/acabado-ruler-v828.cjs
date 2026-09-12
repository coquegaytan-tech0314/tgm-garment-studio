const {assert,context,run,$,createCanvas}=require('./harness.cjs');

function almost(actual,expected,tol,label){
  assert(Math.abs(actual-expected)<=tol,(label||'value')+' expected '+expected+' ±'+tol+', got '+actual);
}

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8,'Schema VERSION stays 8');
  const built=require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
  assert.match(built,/MGM · v8\.2\.8/);
  assert.match(built,/function computeArtworkPlacement/);
  assert.match(built,/Posición \(regla\)/);
  assert.match(built,/id="photoRuler"/);
  assert.match(built,/id="photoRulerReadout"/);

  almost(run('inchesFromCm(2.54)'),1,1e-9,'2.54 cm is 1 inch');
  almost(run('cmFromInches(1)'),2.54,1e-9,'1 inch is 2.54 cm');
  assert.equal(run('formatDual(2.54)'),'2.5 cm / 1.0 in');
  assert.equal(run('roundPlacement(8.26)'),8.3);

  run("state=blank();state.garment='playera';photoBaseDefaults();state.bodyColor='#c4122f';state.photo.source='generated';state.photo.side='front';currentTab='photo'");
  run("addArt();selected().kind='text';selected().text='RHINOS';selected().color='#111111';selected().view='front';selected().width=120;selected().rotation=0");
  const remembered=run('rememberArtworkPlacement(selected())');
  assert.equal(typeof remembered.neckCm,'number');
  const first=run('computeArtworkPlacement(selected())');
  assert(first.neckCm>0,'Chest print sits below the neckline');
  assert(first.hemCm>0,'Chest print sits above the hem');
  assert(first.widthCm>0&&first.heightCm>0);
  assert.match(run(`formatDual(${first.neckCm})`),/cm \/ .+ in/);
  assert.match(run('placementFichaText(selected())'),/Desde el cuello/);
  assert.match(run('placementFichaText(selected())'),/ in/);
  assert.match(run('placementSpecText(selected())'),/cuello .+ cm \/ .+ in/);
  assert.match(JSON.stringify(run('clientSpecLines()')),/cuello .+ cm \/ .+ in/);

  const beforeY=run('selected().y'),beforeNeck=run('selected().placement.neckCm');
  run('selected().y=selected().y+36;rememberArtworkPlacement(selected())');
  assert(run('selected().placement.neckCm')>beforeNeck,'Moving down increases neck distance');
  run(`selected().y=${beforeY};rememberArtworkPlacement(selected())`);

  const snapshot=run('clone(state)');
  context.roundtrip=snapshot;
  const loaded=await run('validateOrder(roundtrip)');
  assert.equal(loaded.version,8);
  assert.equal(typeof loaded.artworks[0].placement.neckCm,'number');
  almost(loaded.artworks[0].placement.neckCm,snapshot.artworks[0].placement.neckCm,0.05,'placement survives validateOrder');
  assert.equal(loaded.artworks[0].x,snapshot.artworks[0].x,'existing art x is unchanged');
  assert.equal(loaded.artworks[0].dimensions,snapshot.artworks[0].dimensions);

  context.legacy=run('clone(state)');
  run('delete legacy.artworks[0].placement');
  context.migrated=await run('validateOrder(legacy)');
  assert.equal(context.migrated.artworks[0].placement,undefined,'old orders omit placement');
  assert.match(run('placementFichaText(migrated.artworks[0])'),/cm \/ .+ in/,'ficha still computes live measures');

  context.bad=run('clone(state)');
  run("bad.artworks[0].placement={neckCm:8,hemCm:20,centerCm:0,leftCm:20,rightCm:20,widthCm:12,heightCm:6}");
  await run('validateOrder(bad)');
  run("bad.artworks[0].placement.neckCm=400");
  await assert.rejects(()=>run('validateOrder(bad)'),/ubicación/);

  run("state.photo.side='front';photoRulerOn=true;currentTab='photo'");
  assert.equal(run("photoShowsPlacementGuides('front')"),true);
  assert.equal(run('photoShowsPlacementReadout()'),true);
  run("state.photo.side='both';syncPhotoUI()");
  assert.equal(run("photoShowsPlacementGuides('front')"),false,'Comparar hides canvas rulers');
  assert.equal(run('photoShowsPlacementReadout()'),false,'Comparar hides the live chip');
  run("state.photo.side='orbit';syncPhotoUI()");
  assert.equal(run("photoShowsPlacementGuides('front')"),false,'360 hides rulers');
  assert.equal(run("$('#photoRuler').hidden"),true);
  run("state.photo.side='front';photoRulerOn=false;syncPhotoUI()");
  assert.equal(run("photoShowsPlacementGuides('front')"),false);
  run('photoRulerOn=true;syncPhotoUI()');
  assert.equal(run("$('#photoRuler').getAttribute('aria-pressed')"),'true');

  const front=run("$('#photoFront')");
  const startClient=run(`(()=>{const p=photoPose(selected());return {x:p.x/800*400,y:p.y/920*460}})()`);
  const neckBeforeDrag=run('selected().placement.neckCm');
  await front.emit('pointerdown',{pointerId:41,clientX:startClient.x,clientY:startClient.y});
  await front.emit('pointermove',{pointerId:41,clientX:startClient.x+20,clientY:startClient.y+40});
  assert.match(run("$('#photoRulerReadout').textContent"),/Desde el cuello/);
  await front.emit('pointerup',{pointerId:41,clientX:startClient.x+20,clientY:startClient.y+40});
  assert(Math.abs(run('selected().placement.neckCm')-neckBeforeDrag)>0.05,'Drag refreshes persisted placement');
  assert.match(run("$('#artPlacement').textContent"),/cm \/ .+ in/);

  const chrome=createCanvas(800,920);context.chrome=chrome;
  run("state.photo.source='generated';state.photo.side='front';currentTab='photo';photoRulerOn=true");
  await run("renderPhoto(chrome,'front',{edit:photoShowsArtChrome()})");
  assert.equal(chrome.width,800);

  console.log('PASS v8.2.8 Acabado dual-unit placement rulers and ficha measures');
})().catch(error=>{console.error(error);process.exitCode=1});
