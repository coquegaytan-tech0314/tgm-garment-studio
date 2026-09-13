const {assert,context,run,$,createCanvas}=require('./harness.cjs');

function almost(actual,expected,tol,label){
  assert(Math.abs(actual-expected)<=tol,(label||'value')+' expected '+expected+' ±'+tol+', got '+actual);
}
function sample(canvas,x,y){
  const d=canvas.getContext('2d').getImageData(Math.round(x),Math.round(y),1,1).data;
  return {r:d[0],g:d[1],b:d[2],a:d[3]};
}
function isLight(c){return (c.r+c.g+c.b)/3>170}
function isReddish(c){return c.r>c.g+15&&c.r>c.b+10}
function isDark(c){return (c.r+c.g+c.b)/3<80}

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8,'Schema VERSION stays 8');
  const built=require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
  assert.match(built,/MGM · v8\.2\./);
  assert.equal(built.includes('VERSION=9'),false,'schema stays VERSION 8');
  assert.match(built,/id="poloCollarWidth"/);
  assert.match(built,/id="poloAletilla"/);
  assert.match(built,/Aletilla/);
  assert.match(built,/function poloConstructionRows/);
  assert.match(built,/function drawPoloAletilla/);

  run("state=blank();state.garment='polo';photoBaseDefaults();populate()");
  const fresh=run('ensurePolo()');
  almost(fresh.collarWidthCm,9,.01,'new polo collar is 9 cm');
  almost(fresh.cuffWidthCm,2.5,.01,'new polo cuff is 2.5 cm');
  almost(fresh.cuffStripeMm,4,.01,'new polo cuff stripe is 4 mm');
  almost(fresh.collarStripeMm,4.5,.01,'tip stripe ~4.5 mm');
  almost(fresh.collarStripeInsetMm,4.5,.01,'tip stripe inset ~4.5 mm');
  almost(fresh.cuffSeamCm,.75,.01,'costura default 0.75 cm');
  assert.equal(fresh.aletilla,true);
  assert.equal(fresh.aletillaButtons,3);
  assert.equal(fresh.cuffStripes,true);
  assert.equal(fresh.sideVents,true);
  almost(fresh.ventHeightCm,8,.01,'side vent default 8 cm');
  assert.equal(run("$('#poloExtras').hidden"),false,'polo extras visible on polo');
  assert.equal(run("$('#poloFichaSpecs').hidden"),false);
  assert.match(run("$('#poloFichaText').textContent"),/9\.0 cm/);
  assert.match(run("$('#poloFichaText').textContent"),/2\.5 cm/);
  assert.match(run("$('#poloFichaText').textContent"),/Aletilla/);

  const rows=run('poloConstructionRows()');
  assert.equal(rows.length,5);
  assert.match(rows[0].join(' '),/9\.0 cm/);
  assert.match(rows[0].join(' '),/4\.5 mm/);
  assert.match(rows[1].join(' '),/2\.5 cm/);
  assert.match(rows[1].join(' '),/0\.4 cm/);
  assert.match(rows[1].join(' '),/0\.75 cm/);
  assert.match(rows[3].join(' '),/caja y X/);
  assert.match(rows[4].join(' '),/Abertura lateral/);
  assert.match(rows[4].join(' '),/8\.0 cm/);
  assert.match(rows[4].join(' '),/color de detalle \/ cinta #B63D42/i);
  assert.equal(run('ensurePolo().sideVents'),true);
  assert.match(JSON.stringify(run('clientSpecLines()')),/Cuello \(TGM\)/);

  run("state=blank();state.garment='playera';photoBaseDefaults();populate()");
  assert.equal(run('poloConstructionRows().length'),0,'playera has no polo construction rows');
  assert.equal(run("$('#poloExtras').hidden"),true,'no aletilla UI on playera');
  assert.equal(run("$('#poloFichaSpecs').hidden"),true);

  context.legacy=run('blank()');
  run("legacy.version=7;legacy.garment='polo';legacy.neck='polo';legacy.polo={piping:false,placket:false,color:'#b89442'}");
  context.migrated=await run('validateOrder(legacy)');
  assert.equal(context.migrated.version,8);
  almost(context.migrated.polo.collarWidthCm,9,.01,'legacy polo gets 9 cm collar');
  almost(context.migrated.polo.cuffWidthCm,2.5,.01,'legacy polo gets 2.5 cm cuff');
  assert.equal(context.migrated.polo.aletilla,true);
  assert.equal(context.migrated.polo.piping,false);

  context.custom=run('clone(state)');
  run("custom.garment='polo';custom.neck='polo';custom.polo=Object.assign(ensurePoloConstruction({}),{collarWidthCm:8.5,cuffWidthCm:3,cuffStripeMm:5,cuffSeamCm:0.6,aletillaButtons:4,collarColor:'#b63d42'})");
  const loaded=await run('validateOrder(custom)');
  almost(loaded.polo.collarWidthCm,8.5,.01,'custom collar persists');
  almost(loaded.polo.cuffWidthCm,3,.01,'custom cuff persists');
  assert.equal(loaded.polo.aletillaButtons,4);

  context.bad=run('clone(custom)');
  run("bad.polo.collarWidthCm=40");
  await assert.rejects(()=>run('validateOrder(bad)'),/collarWidthCm|ancho de cuello|Valor inválido/);

  run("state=blank();state.garment='polo';photoBaseDefaults();state.bodyColor='#242529';state.contrastColor='#b63d42';state.contrast.neck=true;state.client='TGM';state.number='POLO-STD'");
  assert.equal(run('poloResolvedAletillaOuter()').toLowerCase(),'#242529');
  assert.equal(run('poloResolvedAletillaInner()').toLowerCase(),'#b63d42');
  const sig=run('visualSignature()');
  run('state.polo.collarStripeMm=6');
  assert.notEqual(run('visualSignature()'),sig,'construction changes the visual signature');
  run('state.polo.collarStripeMm=4.5');

  const poloFront=createCanvas(800,920);context.poloFront=poloFront;
  await run("renderPhoto(poloFront,'front',{background:true})");
  const r=run("photoRect('polo','front')");
  const tip=sample(poloFront,r.x+r.w*.644,r.y+r.h*.162);
  assert(isLight(tip),'collar tip stripe reads light / white');
  const collar=sample(poloFront,r.x+r.w*.38,r.y+r.h*.08);
  assert(isReddish(collar),'collar leaf uses TGM red');
  const hole=sample(poloFront,r.x+r.w*.50,r.y+r.h*.04);
  assert(!isReddish(hole)||hole.r<140,'neck opening is not flooded with collar fill');
  const inner=sample(poloFront,r.x+r.w*.480,r.y+r.h*.20);
  assert(isReddish(inner),'aletilla inner facing is red');
  const flap=sample(poloFront,r.x+r.w*.518,r.y+r.h*.20);
  assert(isDark(flap),'aletilla outer flap follows black body');
  const button=sample(poloFront,r.x+r.w*.482,r.y+r.h*.218);
  assert(isLight(button),'aletilla buttons are white');
  const cuffA=sample(poloFront,r.x+r.w*.015,r.y+r.h*.38);
  const cuffB=sample(poloFront,r.x+r.w*.06,r.y+r.h*.44);
  assert(cuffA.a>20&&cuffB.a>20,'cuffs are painted');
  assert(Math.abs(cuffA.r-cuffB.r)+Math.abs(cuffA.g-cuffB.g)+Math.abs(cuffA.b-cuffB.b)>25,'cuff stripe rhythm changes color across the band');
  const vent=sample(poloFront,r.x+r.w*.21,r.y+r.h*.97);
  assert(isReddish(vent)||vent.r>vent.g,'side vent tape reads contrast / red');

  const playera=createCanvas(800,920);context.playera=playera;
  run("state=blank();state.garment='playera';photoBaseDefaults();state.bodyColor='#242529'");
  await run("renderPhoto(playera,'front',{background:true})");
  const pr=run("photoRect('playera','front')");
  const chest=sample(playera,pr.x+pr.w*.5,pr.y+pr.h*.2);
  assert(!isReddish(chest)||chest.r<120,'playera does not receive aletilla red');

  run("state=blank();state.garment='polo';photoBaseDefaults();state.bodyColor='#242529';state.contrastColor='#b63d42';state.contrast.neck=true;state.client='KOKE';state.number='POLO-FICHA'");
  const pages=await run('referenceCanvases()');
  assert(pages.length>=1,'ficha still builds for a polo');
  assert.match(run('poloFichaSummary()'),/Cuello \(TGM\): 9\.0 cm/);
  assert.match(run('poloFichaSummary()'),/Puño \(después de coser\): 2\.5 cm/);
  assert.match(run('poloFichaSummary()'),/Aletilla: caja en CF/);
  assert.match(run('poloFichaSummary()'),/Abertura lateral: hendidura en ambos ruedos · alto 8\.0 cm · color de detalle \/ cinta #B63D42/);

  run("state.garment='hoodie';photoBaseDefaults();populate()");
  assert.equal(run("$('#poloExtras').hidden"),true,'hoodie hides polo / aletilla controls');
  assert.equal(run('poloConstructionRows().length'),0);

  console.log('PASS v8.2.8 TGM polo construction standards, aletilla and ficha measures');
})().catch(error=>{console.error(error);process.exitCode=1});
