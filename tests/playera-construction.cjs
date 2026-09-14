const {assert,context,run,$,createCanvas}=require('./harness.cjs');

function almost(actual,expected,tol,label){
  assert(Math.abs(actual-expected)<=tol,(label||'value')+' expected '+expected+' ±'+tol+', got '+actual);
}
function sample(canvas,x,y){
  const d=canvas.getContext('2d').getImageData(Math.round(x),Math.round(y),1,1).data;
  return {r:d[0],g:d[1],b:d[2],a:d[3]};
}
function isReddish(c){return c.r>c.g+15&&c.r>c.b+10}

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8,'Schema VERSION stays 8');
  const built=require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
  assert.match(built,/MGM · v8\.2\.15/);
  assert.equal(built.includes('VERSION=9'),false,'schema stays VERSION 8');
  assert.match(built,/id="roundNeckSeam"/);
  assert.match(built,/id="roundNeckSeamTallas"/);
  assert.match(built,/id="roundNeckTallas"/);
  assert.match(built,/id="roundNeckFichaSpecs"/);
  assert.match(built,/Ancho de tórax/);
  assert.match(built,/Ancho de espalda \/ hombros/);
  assert.match(built,/Largo desde HPS/);
  assert.match(built,/Largo de manga/);
  assert.match(built,/Costura 0\.5–1/);
  assert.match(built,/function roundNeckConstructionRows/);
  assert.match(built,/function drawRoundNeckMeasureGuides/);
  assert.match(built,/function roundNeckPaintsAcabadoOverlays/);
  assert.equal(run('roundNeckPaintsAcabadoOverlays()'),false,'Acabado stays photoreal — no construction fills');

  assert.equal(run('MEASUREMENTS.chest'),'Ancho de tórax');
  assert.equal(run('MEASUREMENTS.length'),'Largo desde HPS');
  assert.equal(run('MEASUREMENTS.shoulder'),'Ancho de espalda / hombros');
  assert.equal(run('MEASUREMENTS.sleeve'),'Largo de manga');

  run("state=blank();state.garment='playera';photoBaseDefaults();populate()");
  const fresh=run('ensureRoundNeck()');
  almost(fresh.seamCm,.75,.01,'default costura 0.75 cm');
  assert.equal(run('roundNeckMeasureFamily()'),true);
  assert.equal(run("$('#roundNeckExtras').hidden"),false,'playera shows measure extras');
  assert.equal(run("$('#roundNeckTallas').hidden"),false,'playera shows tallas guide');
  assert.equal(run("$('#roundNeckFichaSpecs').hidden"),false);
  assert.match(run("$('#roundNeckFichaText').textContent"),/Ancho de tórax \(A\)/);
  assert.match(run("$('#roundNeckFichaText').textContent"),/Largo desde HPS \(C\)/);
  assert.match(run("$('#roundNeckFichaText').textContent"),/0\.75 cm/);
  assert.match(run("$('#roundNeckTallasRef').textContent"),/tórax 52\.0 cm/);
  assert.match(run("$('#roundNeckTallasRef').textContent"),/largo HPS 70\.0 cm/);
  assert.match(run("$('#roundNeckTallasRef').textContent"),/hombros 46\.0 cm/);
  assert.match(run("$('#roundNeckTallasRef').textContent"),/manga 20\.0 cm/);

  const rows=run('roundNeckConstructionRows()');
  assert.equal(rows.length,5);
  assert.match(rows[0].join(' '),/1″/);
  assert.match(rows[1].join(' '),/costura a costura/);
  assert.match(rows[2].join(' '),/unión cuello-cuerpo/);
  assert.match(rows[3].join(' '),/hombro/);
  assert.match(rows[4].join(' '),/0\.5–1\.0 cm/);
  assert.match(JSON.stringify(run('clientSpecLines()')),/Ancho de tórax \(A\)/);

  run("$('#roundNeckSeam').value='0.';roundNeckAssignField('seamCm',$('#roundNeckSeam'),false)");
  almost(run('ensureRoundNeck().seamCm'),.75,.01,'typing 0. does not snap costura');
  run("$('#roundNeckSeam').value='0.6';roundNeckAssignField('seamCm',$('#roundNeckSeam'),false)");
  almost(run('ensureRoundNeck().seamCm'),.6,.01,'costura accepts 0.6 cm');
  run("roundNeckAssignField('seamCm',$('#roundNeckSeam'),true)");
  assert.equal(run("$('#roundNeckSeam').value"),'0.6');
  run("state.roundNeck.seamCm=.75;$('#roundNeckSeam').value=0.75");

  const playeraGuide=run('PLACEMENT_GUIDES.playera');
  assert(playeraGuide.chestV>playeraGuide.armholeV,'tórax sits 1″ below sisa');
  almost(playeraGuide.chestV-playeraGuide.armholeV,2.54/playeraGuide.lengthCm*(playeraGuide.hemV-playeraGuide.neckV),0.01,'1″ below armhole uses the length scale');
  assert(playeraGuide.shoulderLeftU<playeraGuide.hpsLeftU,'shoulder costura is outside HPS');
  assert(playeraGuide.sleeveCm>0);

  run("state.photo.side='front';photoRulerOn=true;currentTab='photo';selectedArt=null;syncPhotoUI()");
  assert.equal(run('selected()'),undefined,'Regla still does not auto-select');
  assert.equal(run("photoShowsPlacementBaseline('front')"),true);
  assert.equal(run("photoShowsPlacementGuides('front')"),false);
  const baseline=createCanvas(800,920);context.teeBaseline=baseline;
  run("drawPlacementHintFrame(teeBaseline,'front')");
  const ink=baseline.getContext('2d').getImageData(0,0,800,920).data;
  let painted=0;for(let i=3;i<ink.length;i+=4)if(ink[i]>40)painted++;
  assert(painted>1200,'playera baseline paints HPS plus A/B/C/D / costura');

  run("state=blank();state.garment='polo';photoBaseDefaults();populate()");
  assert.equal(run('roundNeckConstructionRows().length'),0,'polo keeps its own construction rows');
  assert.equal(run("$('#roundNeckExtras').hidden"),true,'no playera measure UI on polo');
  assert.equal(run("$('#roundNeckTallas').hidden"),true);
  assert.equal(run("$('#poloExtras').hidden"),false,'polo extras stay visible');
  assert.match(JSON.stringify(run('clientSpecLines()')),/Cuello \(TGM\)/);

  run("state=blank();state.garment='hoodie';photoBaseDefaults();populate()");
  assert.equal(run('roundNeckMeasureFamily()'),false);
  assert.equal(run('roundNeckConstructionRows().length'),0);
  assert.equal(run("$('#roundNeckTallas').hidden"),true);

  run("state=blank();state.garment='zipneck';photoBaseDefaults();populate()");
  assert.equal(run('roundNeckMeasureFamily()'),true,'manga larga shares the body measure model');
  const zipRows=run('roundNeckConstructionRows()');
  assert.match(zipRows.find(row=>row[0].startsWith('Largo de manga'))[1],/62\.0 cm/);
  assert.equal(run("$('#roundNeckTallas').hidden"),false);

  run("state=blank();state.garment='sleeveless';photoBaseDefaults();populate()");
  const sisada=run('roundNeckConstructionRows()');
  assert.match(sisada.find(row=>row[0].startsWith('Largo de manga'))[1],/Sin manga/);
  assert.match(sisada.find(row=>row[0].startsWith('Largo desde HPS'))[1],/66\.0 cm/);

  context.legacy=run('blank()');
  run("legacy.version=7;legacy.garment='playera';legacy.neck='round';delete legacy.roundNeck");
  context.migrated=await run('validateOrder(legacy)');
  assert.equal(context.migrated.version,8);
  almost(context.migrated.roundNeck.seamCm,.75,.01,'legacy playera gets 0.75 cm costura');

  context.custom=run('clone(state)');
  run("custom.garment='playera';custom.neck='round';custom.roundNeck=Object.assign(ensureRoundNeckConstruction({}),{seamCm:0.9})");
  const loaded=await run('validateOrder(custom)');
  almost(loaded.roundNeck.seamCm,.9,.01,'custom costura persists');

  context.bad=run('clone(custom)');
  run("bad.roundNeck.seamCm=8");
  await assert.rejects(()=>run('validateOrder(bad)'),/costura|Valor inválido/);

  run("state=blank();state.garment='playera';photoBaseDefaults();state.bodyColor='#242529';state.client='KOKE';state.number='PLAYERA-MEDIDAS'");
  const pages=await run('referenceCanvases()');
  assert(pages.length>=1,'ficha still builds for a playera');
  assert.match(run('roundNeckFichaSummary()'),/Ancho de tórax \(A\): 1″/);
  assert.match(run('roundNeckFichaSummary()'),/Largo desde HPS \(C\)/);
  assert.match(run('roundNeckFichaSummary()'),/Costura: 0\.75 cm/);

  const sheet=createCanvas(800,920);context.playeraPhoto=sheet;
  await run("renderPhoto(playeraPhoto,'front',{background:true})");
  const pr=run("photoRect('playera','front')");
  const chest=sample(sheet,pr.x+pr.w*.5,pr.y+pr.h*.42);
  assert(!isReddish(chest)||chest.r<120,'playera Acabado has no crude red measure overlay');

  run("state=blank();state.garment='polo';photoBaseDefaults();state.bodyColor='#242529';state.contrastColor='#b63d42';state.contrast.neck=true");
  const poloFront=createCanvas(800,920);context.poloStay=poloFront;
  await run("renderPhoto(poloStay,'front',{background:true})");
  const r=run("photoRect('polo','front')");
  const hole=sample(poloFront,r.x+r.w*.50,r.y+r.h*.04);
  assert(!isReddish(hole),'polo neck stays photoreal after playera standards');

  run("state=blank();state.garment='playera';photoBaseDefaults();state.photo.source='generated';state.photo.side='front';currentTab='photo';photoRulerOn=false;selectedArt=null;syncPhotoUI()");
  await $('#photoRuler').emit('click');
  assert.equal(run('photoRulerOn'),true);
  assert.equal(run('selected()'),undefined,'toggling Regla still does not auto-select');
  assert.equal(run("photoShowsPlacementGuides('front')"),false);
  assert.equal(run("photoShowsPlacementHint('front')"),true);

  console.log('PASS v8.2.15 playera cuello redondo measurement standards');
})().catch(error=>{console.error(error);process.exitCode=1});
