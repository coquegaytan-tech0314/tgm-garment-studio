const {assert,context,run,$,createCanvas}=require('./harness.cjs');

function almost(actual,expected,tol,label){
  assert(Math.abs(actual-expected)<=tol,(label||'value')+' expected '+expected+' ±'+tol+', got '+actual);
}

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8,'Schema VERSION stays 8');
  const built=require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
  assert.match(built,/MGM · v8\.2\./);
  assert.match(built,/function photoHitArtwork/);
  assert.match(built,/enterAcabadoPlaceMode/);
  assert.match(built,/cursor:grab/);

  run("state=blank();state.garment='sleeveless';photoBaseDefaults();state.bodyColor='#c4122f';state.photo.source='generated';state.photo.side='front';currentTab='photo'");
  run("addArt();selected().kind='text';selected().text='RHINOS';selected().color='#111111';selected().view='front';selected().width=120;selected().rotation=0");
  assert.equal(run('photoCanPlaceArt()'),true,'Generated Acabado allows placing without the Logos tab');
  assert.equal(run('photoShowsArtChrome()'),true);

  const before=run("({x:selected().x,y:selected().y,width:selected().width,rotation:selected().rotation,id:selected().id})");
  context.pose=run('photoPose(selected())');
  const center=await run("photoHitArtwork('front',photoPose(selected()))");
  assert.equal(center.art.id,before.id,'Hit-test finds the estampado at its photo center');
  assert.equal(await run("photoHitArtwork('front',{x:18,y:18})"),null,'Empty canvas corner is not a hit');

  run('photoPutPosition(selected(),pose.x,pose.y)');
  almost(run('selected().x'),before.x,0.75,'photoPutPosition inverts photoPose X');
  almost(run('selected().y'),before.y,0.75,'photoPutPosition inverts photoPose Y');

  const mapped=run('photoClientPoint({left:0,top:0,width:400,height:460},200,230)');
  almost(mapped.x,400,0.01,'client X maps onto the 800-wide photo space');
  almost(mapped.y,460,0.01,'client Y maps onto the 920-tall photo space');

  run('photoPutPosition(selected(),pose.x+48,pose.y-30)');
  assert.equal(run('selected().width'),before.width,'Width stays put while remapping coordinates');
  assert.equal(run('selected().rotation'),before.rotation,'Rotation stays put while remapping coordinates');
  assert(Math.abs(run('selected().x')-before.x)>2,'Mapped photo X writes back to artwork.x');
  assert(Math.abs(run('selected().y')-before.y)>2,'Mapped photo Y writes back to artwork.y');
  run(`Object.assign(selected(),{x:${before.x},y:${before.y}})`);

  run("selected().rotation=35");
  const rotated=await run("photoHitArtwork('front',photoPose(selected()))");
  assert.equal(rotated.art.id,before.id,'Rotated estampado still hit-tests at its center');
  context.away=run('photoArtworkLocalPoint(selected(),{x:pose.x+180,y:pose.y},photoPose(selected()))');
  assert.equal(run('photoHitsArtworkBox(away,{width:80,height:36},12)'),false,'Far local point misses the box');
  run('selected().rotation=0');

  const front=run("$('#photoFront')");
  const startClient=run(`(()=>{const p=photoPose(selected()),r={left:0,top:0,width:400,height:460};return {x:p.x/800*400,y:p.y/920*460}})()`);
  await front.emit('pointerdown',{pointerId:11,clientX:startClient.x,clientY:startClient.y});
  assert.equal(run('selectedArt'),before.id);
  assert.match(front.className,/dragging/);
  await front.emit('pointermove',{pointerId:11,clientX:startClient.x+36,clientY:startClient.y+22});
  await front.emit('pointerup',{pointerId:11,clientX:startClient.x+36,clientY:startClient.y+22});
  assert.equal(run('selected().width'),before.width);
  assert.equal(run('selected().rotation'),before.rotation);
  assert(Math.abs(run('selected().x')-before.x)>1,'Drag on Acabado Frente writes artwork.x');
  assert(Math.abs(run('selected().y')-before.y)>1,'Drag on Acabado Frente writes artwork.y');
  const afterFront={x:run('selected().x'),y:run('selected().y')};

  await front.emit('pointerdown',{pointerId:12,clientX:8,clientY:8});
  await front.emit('pointermove',{pointerId:12,clientX:80,clientY:80});
  await front.emit('pointerup',{pointerId:12,clientX:80,clientY:80});
  almost(run('selected().x'),afterFront.x,0.01,'Missed drag does not steal the estampado');
  almost(run('selected().y'),afterFront.y,0.01,'Missed drag leaves Y alone');

  run("addArt();selected().kind='text';selected().text='BACK';selected().color='#111111';selected().view='back';selected().zone='back';Object.assign(selected(),zonePosition('back','back'));selected().width=110");
  run("state.photo.side='back';currentTab='photo'");
  const backId=run('selected().id'),backBefore=run('selected().x'),backPose=run('photoPose(selected())');
  assert.equal((await run("photoHitArtwork('back',photoPose(selected()))")).art.id,backId);
  const back=run("$('#photoBack')");
  const backClient=run(`(()=>{const p=photoPose(selected());return {x:p.x/800*400,y:p.y/920*460}})()`);
  await back.emit('pointerdown',{pointerId:21,clientX:backClient.x,clientY:backClient.y});
  await back.emit('pointermove',{pointerId:21,clientX:backClient.x-28,clientY:backClient.y+18});
  await back.emit('pointerup',{pointerId:21,clientX:backClient.x-28,clientY:backClient.y+18});
  assert(Math.abs(run('selected().x')-backBefore)>1,'Drag on Acabado Espalda writes artwork.x');
  assert.equal(run('selected().id'),backId,'Espalda drag keeps Logos selectedArt in sync');

  const xBeforeOrbit=run('selected().x');
  run("state.photo.side='orbit';syncPhotoUI()");
  assert.equal(run('photoShowsArtChrome()'),false,'360° must not bake selection chrome into orbit sheets');
  assert.equal(run("$('#photoStage').dataset.view"),'orbit');
  assert.equal(run("$('#photoOrbit').hidden"),false);
  context.performance={now:()=>Date.now()};
  await run("$('#photoOrbit').emit('pointerdown',{pointerId:31,clientX:120,clientY:140})");
  await run("$('#photoOrbit').emit('pointermove',{pointerId:31,clientX:190,clientY:155})");
  await run("$('#photoOrbit').emit('pointerup',{pointerId:31,clientX:190,clientY:155})");
  almost(run('selected().x'),xBeforeOrbit,0.01,'360° orbit drag does not move artwork');

  run("state.photo.side='front';state.photo.source='final';currentTab='photo'");
  assert.equal(run('photoCanPlaceArt()'),false);
  assert.equal(await run("photoHitArtwork('front',{x:400,y:360})"),null,'Uploaded final JPEG is not draggable');

  run("state.photo.source='generated';state.photo.side='orbit';currentTab='garment'");
  run('enterAcabadoPlaceMode()');
  assert.equal(run("state.pro.workspace"),'photo');
  assert.equal(run("state.photo.side==='orbit'"),false,'Colocar logo leaves 360° and stays on a flat side');
  assert.equal(run('!!selected()'),true);
  assert.equal(run("$('#photoEdit').getAttribute('aria-pressed')"),'true');

  run("state.photo.side='both';syncPhotoUI()");
  assert.equal(run("$('#photoStage').dataset.view"),'both');
  assert.equal(run("$('#photoOrbit').hidden"),true);
  assert.equal(run('photoCanPlaceArt()'),true,'Comparar still allows placing on each sheet');

  const chrome=createCanvas(800,920);context.chrome=chrome;
  run("state.photo.source='generated';state.photo.side='front';currentTab='photo'");
  run("selectedArt=state.artworks.find(a=>a.view==='front').id");
  await run("renderPhoto(chrome,'front',{edit:photoShowsArtChrome()})");
  assert(chrome.width===800);

  console.log('PASS v8.2.7 Acabado click-and-drag estampados on Frente/Espalda');
})().catch(error=>{console.error(error);process.exitCode=1});
