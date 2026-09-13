const {assert,context,run,$,createCanvas}=require('./harness.cjs');

function almost(actual,expected,tol,label){
  assert(Math.abs(actual-expected)<=tol,(label||'value')+' expected '+expected+' ±'+tol+', got '+actual);
}

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8,'Schema VERSION stays 8');
  const built=require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
  assert.match(built,/MGM · v8\.2\./);
  assert.match(built,/function photoSetRotation/);
  assert.match(built,/function photoRotateHandlePoint/);
  assert.match(built,/id="artRotationDeg"/);
  assert.match(built,/Giro: /);
  assert.equal(built.includes('VERSION=9'),false,'schema stays VERSION 8');

  run("state=blank();state.garment='playera';photoBaseDefaults();state.bodyColor='#c4122f';state.photo.source='generated';state.photo.side='front';currentTab='photo'");
  run("addArt();selected().kind='text';selected().text='RHINOS';selected().color='#111111';selected().view='front';selected().width=140;selected().rotation=0");
  const before=run("({id:selected().id,x:selected().x,y:selected().y,width:selected().width,rotation:selected().rotation})");

  almost(run('photoNormalizeRotation(190)'),-170,0,'190° wraps to -170');
  almost(run('photoNormalizeRotation(-190)'),170,0,'-190° wraps to 170');
  assert.equal(run('photoSetRotation(selected(),37)'),37);
  assert.equal(run('selected().rotation'),37);
  run('selected().rotation=0');

  const flat=run('computeArtworkPlacement(selected())');
  run('selected().rotation=90');
  const tilted=run('computeArtworkPlacement(selected())');
  assert.equal(tilted.rotationDeg,90);
  assert(tilted.heightCm-flat.heightCm>1,'AABB height grows when a wide print is tilted 90°');
  almost(tilted.centerCm,flat.centerCm,0.2,'center measure stays center-based while rotated');
  almost(tilted.leftCm,flat.leftCm,0.2,'side measures stay center-based');
  assert.match(run('placementFichaText(selected())'),/Giro: 90°/);
  assert.match(run('placementFichaText(selected())'),/recuadro girado/);
  assert.match(run('placementSpecText(selected())'),/giro 90°/);
  assert.match(run('placementReadoutText(computeArtworkPlacement(selected()))'),/Giro: 90°/);
  run('selected().rotation=0');
  const remembered=run('rememberArtworkPlacement(selected())');
  assert.equal(remembered.rotationDeg,0);

  context.roundtrip=run('clone(state)');
  run('roundtrip.artworks[0].rotation=18;roundtrip.artworks[0].placement=rememberArtworkPlacement(roundtrip.artworks[0])');
  const loaded=await run('validateOrder(roundtrip)');
  assert.equal(loaded.version,8);
  assert.equal(loaded.artworks[0].rotation,18);
  assert.equal(loaded.artworks[0].placement.rotationDeg,18);

  context.legacy=run('clone(state)');
  run('delete legacy.artworks[0].placement.rotationDeg');
  const migrated=await run('validateOrder(legacy)');
  assert.equal(migrated.artworks[0].placement.rotationDeg,undefined,'old placement snapshots omit rotationDeg');

  run("state.photo.side='front';currentTab='photo'");
  assert.equal(run('photoCanRotateArt()'),true);
  assert.equal(run("photoShowsRotateHandle('front')"),true);
  run("state.photo.side='orbit'");
  assert.equal(run('photoCanRotateArt()'),false,'360° does not tilt prints');
  assert.equal(run("photoShowsRotateHandle('front')"),false);
  run("state.photo.side='both'");
  assert.equal(run('photoCanRotateArt()'),true,'Comparar still allows tilt on each sheet');

  run("state.photo.side='front';selected().rotation=0;syncArt()");
  assert.equal(String(run("$('#artRotationDeg').value")),'0');
  await run("$('#artRotationDeg').value='24';$('#artRotationDeg').emit('input')");
  assert.equal(run('selected().rotation'),24);
  assert.equal(run('selected().x'),before.x,'Numeric tilt keeps X');
  assert.equal(run('selected().y'),before.y,'Numeric tilt keeps Y');
  assert.equal(run('selected().width'),before.width,'Numeric tilt keeps width');
  assert.equal(String(run("$('#artRotation').value")),'24');
  await run("$('#artRotation').value='-15';$('#artRotation').emit('input')");
  assert.equal(run('selected().rotation'),-15);
  assert.equal(String(run("$('#artRotationDeg').value")),'-15');

  run('selected().rotation=0;syncArt()');
  const front=run("$('#photoFront')");
  context.pose=run('photoPose(selected())');
  context.geom=await run('artGeometry(pose)');
  const handle=run('photoRotateHandlePoint(selected(),pose,geom)');
  const handleHit=await run(`photoHitArtwork('front',{x:${handle.x},y:${handle.y}})`);
  assert.equal(handleHit.art.id,before.id);
  assert.equal(handleHit.rotate,true,'Handle hit is a rotate hit, not a move');
  assert.equal((await run("photoHitArtwork('front',pose)")).rotate,undefined,'Print center stays a move hit');

  const startClient=run(`(()=>{const h=photoRotateHandlePoint(selected(),pose,geom);return {x:h.x/800*400,y:h.y/920*460}})()`);
  const swingClient=run(`(()=>{return {x:(pose.x+90)/800*400,y:pose.y/920*460}})()`);
  const poseBefore=run("({x:selected().x,y:selected().y,width:selected().width})");
  await front.emit('pointerdown',{pointerId:71,clientX:startClient.x,clientY:startClient.y});
  assert.match(front.className,/rotating/);
  await front.emit('pointermove',{pointerId:71,clientX:swingClient.x,clientY:swingClient.y});
  await front.emit('pointerup',{pointerId:71,clientX:swingClient.x,clientY:swingClient.y});
  assert(Math.abs(run('selected().rotation'))>20,'Handle drag writes a free (non-90-step-only) rotation');
  almost(run('selected().x'),poseBefore.x,0.75,'Rotate handle keeps artwork.x');
  almost(run('selected().y'),poseBefore.y,0.75,'Rotate handle keeps artwork.y');
  assert.equal(run('selected().width'),poseBefore.width);
  const handleDeg=run('selected().rotation');
  assert.equal(String(run("$('#artRotationDeg').value")),String(handleDeg));

  run('selected().rotation=0;syncArt()');
  const centerClient=run(`(()=>{const p=photoPose(selected());return {x:p.x/800*400,y:p.y/920*460}})()`);
  const xBeforeMove=run('selected().x');
  await front.emit('pointerdown',{pointerId:72,clientX:centerClient.x,clientY:centerClient.y});
  await front.emit('pointermove',{pointerId:72,clientX:centerClient.x+30,clientY:centerClient.y+16});
  await front.emit('pointerup',{pointerId:72,clientX:centerClient.x+30,clientY:centerClient.y+16});
  assert.equal(run('selected().rotation'),0,'Move drag still preserves rotation');
  assert(Math.abs(run('selected().x')-xBeforeMove)>1,'Move drag still writes artwork.x');

  run(`Object.assign(selected(),{x:${before.x},y:${before.y},rotation:12})`);
  await front.emit('wheel',{deltaY:40,shiftKey:false});
  assert.equal(run('selected().rotation'),15,'Wheel tilts by 3°');
  await front.emit('wheel',{deltaY:-10,shiftKey:true});
  assert.equal(run('selected().rotation'),14,'Shift+wheel tilts by 1°');
  almost(run('selected().x'),before.x,0.01,'Wheel keeps X');
  almost(run('selected().y'),before.y,0.01,'Wheel keeps Y');

  run('selected().rotation=0');
  await front.emit('pointerdown',{pointerId:81,clientX:80,clientY:120});
  await front.emit('pointerdown',{pointerId:82,clientX:180,clientY:120});
  await front.emit('pointermove',{pointerId:82,clientX:180,clientY:200});
  await front.emit('pointerup',{pointerId:82,clientX:180,clientY:200});
  await front.emit('pointerup',{pointerId:81,clientX:80,clientY:120});
  assert(Math.abs(run('selected().rotation'))>20,'Two-finger gesture tilts the print');
  almost(run('selected().x'),before.x,0.75,'Pinch rotate keeps X');

  const rotBeforeOrbit=run('selected().rotation');
  run("state.photo.side='orbit';syncPhotoUI()");
  await front.emit('wheel',{deltaY:80});
  assert.equal(run('selected().rotation'),rotBeforeOrbit,'Wheel on 360° does not tilt');
  assert.equal(run('photoShowsArtChrome()'),false);

  run("state.photo.side='front';photoRulerOn=true;selected().rotation=-33;rememberArtworkPlacement(selected());syncArt();syncPlacementRulerUI()");
  assert.match(run("$('#photoRulerReadout').textContent"),/Giro: -33°/);
  assert.match(run("$('#artPlacement').textContent"),/giro -33°/);

  const chrome=createCanvas(800,920);context.chrome=chrome;
  await run("renderPhoto(chrome,'front',{edit:photoShowsArtChrome()})");
  assert.equal(chrome.width,800);

  run("state=blank();state.garment='playera';photoBaseDefaults();state.client='CUMBRES - RHINOS';state.number='RHINOS-GIRO';addArt();selected().kind='text';selected().text='RHINOS';selected().color='#111111';selected().width=140;selected().rotation=-27;rememberArtworkPlacement(selected())");
  const pages=await run('referenceCanvases()');
  assert(pages.length>=2,'ficha still builds with a tilted print');
  assert.match(run('placementFichaText(selected())'),/Giro: -27°/);
  assert.match(run('placementFichaText(selected())'),/cm \/ .+ in/);

  console.log('PASS v8.2.9 Acabado free-rotation tilt on Frente/Espalda');
})().catch(error=>{console.error(error);process.exitCode=1});
