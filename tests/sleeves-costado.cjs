const {assert,context,run,$,createCanvas}=require('./harness.cjs');

function almost(actual,expected,tol,label){
  assert(Math.abs(actual-expected)<=tol,(label||'value')+' expected '+expected+' ±'+tol+', got '+actual);
}

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8,'Schema VERSION stays 8');
  const built=require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
  assert.match(built,/MGM · v8\.2\.9/);
  assert.match(built,/costado \/ lateral/);
  assert.match(built,/function sleeveCostadoSpec/);
  assert.match(built,/Manga izq\. · costado/);
  assert.equal(built.includes('Cara de la manga'),false,'help no longer says cara de la manga as the default');
  assert.match(built,/Costado visible desde el frente/);
  assert.match(built,/id="poloAletilla"/);

  assert.match(run('ZONES.leftSleeve.label'),/costado/);
  assert.match(run('ZONES.rightSleeve.label'),/costado/);
  assert.match(run('COVERAGE.leftSleeve'),/costado/);

  run("state=blank();state.garment='polo';photoBaseDefaults();populate()");
  const poloLeft=run("newSleeveArt({text:true,side:'left',view:'front'})");
  assert.equal(poloLeft.zone,'leftSleeve');
  assert.equal(poloLeft.rotation,0,'polo sleeve default is horizontal / parallel to cuff');
  assert(poloLeft.x>670,'polo left sleeve sits on the outer/lateral side, not the front face');
  assert(poloLeft.y>300&&poloLeft.y<350,'polo sleeve sits ~3–4 cm above the cuff, not toward the shoulder');
  assert.match(poloLeft.dimensions,/costado \/ lateral/i);
  assert.match(poloLeft.dimensions,/3–4 cm/);
  assert(poloLeft.dimensions.length<=100,'ubicación medida must fit the 100-char field');
  const poloNotes=run('techniqueNotes(selected())').join('\n');
  assert.match(poloNotes,/costado \/ lateral/);
  assert.match(poloNotes,/frente de la manga es una excepción/i);

  const poloRight=run("zonePosition('rightSleeve','front')");
  assert(poloRight.x<140,'polo right sleeve costado is on the outer arm');
  assert.equal(poloRight.y,poloLeft.y);
  const poloBack=run("zonePosition('leftSleeve','back')");
  almost(poloBack.x,800-poloLeft.x,1,'back view mirrors the same costado');

  const poloPhoto=run("photoZone('leftSleeve','front')");
  const poloRect=run("photoRect('polo','front')");
  const poloU=(poloPhoto.x-poloRect.x)/poloRect.w;
  const poloV=(poloPhoto.y-poloRect.y)/poloRect.h;
  assert(poloU>0.89,'photo left sleeve is on the outer silhouette');
  almost(poloV,.40-run('poloUFromCm(3.5)'),.01,'photo Y is ~3.5 cm above the polo cuff');

  run("state=blank();state.garment='playera';photoBaseDefaults();populate()");
  const playera=run("newSleeveArt({text:true,side:'left',view:'front'})");
  assert.equal(playera.rotation,0);
  assert(playera.x>670,'playera sleeve default is costado, not front face');
  assert.match(playera.dimensions,/costado \/ lateral/i);

  run("state=blank();state.garment='hoodie';photoBaseDefaults();populate()");
  const hoodie=run("newSleeveArt({text:true,side:'left',view:'front'})");
  assert.equal(hoodie.rotation,0,'hoodie sleeve is horizontal on the costado');
  assert(hoodie.x>670,'hoodie sleeve sits on the outer arm');

  run("state=blank();state.garment='zipneck';photoBaseDefaults();populate()");
  const zip=run("newSleeveArt({text:true,side:'right',view:'front'})");
  assert.equal(zip.rotation,0);
  assert(zip.x<130,'zipneck right sleeve costado stays outer');

  run("state=blank();state.garment='sleeveless';photoBaseDefaults();populate()");
  const sleeveless=run("zonePosition('leftSleeve','front')");
  assert(sleeveless.x<620,'sleeveless keeps the armhole default, not a fake outer sleeve');
  const torso=run("zonePosition('leftCostado','front')");
  assert.equal(torso.x>=600,true,'torso costado zones stay on the body side panel');
  assert.equal(run("ZONES.leftCostado.label.includes('Costado')"),true);

  run("state=blank();state.garment='polo';photoBaseDefaults();populate()");
  run("addArt();selected().kind='text';selected().text='tgm.com';selected().color='#ffffff'");
  const before=run('selected()');
  assert.equal(before.zone,'chest');
  assert.equal(before.rotation,0);
  run("applySleeveCostadoDefaults(selected(),'leftSleeve','front')");
  const after=run('selected()');
  assert.equal(after.zone,'leftSleeve');
  assert.equal(after.rotation,0);
  assert(after.x>670);
  assert.match(after.dimensions,/costado/i);

  run("state.artworks=[];addArt();selected().zone='leftSleeve';selected().x=650;selected().y=285;selected().rotation=18;selected().dimensions='frente de manga a petición'");
  const kept=run('selected()');
  assert.equal(kept.x,650,'saved sleeve coordinates are not rewritten');
  assert.equal(kept.rotation,18,'saved sleeve rotation is not rewritten');
  assert.equal(kept.dimensions,'frente de manga a petición');

  run("state=blank();state.garment='polo';photoBaseDefaults();state.bodyColor='#242529';state.contrastColor='#b63d42';state.contrast.neck=true");
  const polo=run('ensurePolo()');
  almost(polo.collarWidthCm,9,.01,'cuello standard stays 9 cm');
  almost(polo.cuffWidthCm,2.5,.01,'puño standard stays 2.5 cm');
  assert.equal(polo.aletilla,true,'aletilla stays on');
  assert.equal(run("$('#poloExtras').hidden"),false);
  const rows=run('poloConstructionRows()');
  assert.equal(rows.length,4);
  assert.match(rows[3].join(' '),/Aletilla|caja y X/);

  const c=createCanvas(800,920);context.c=c;
  run("state.artworks=[];newSleeveArt({text:true,side:'left',view:'front'});selected().text='tgm.com';selected().color='#ffffff';selected().width=90");
  await run("renderPhoto(c,'front',{background:true})");
  const pose=run("photoPose(selected())");
  assert(pose.x>520,'rendered polo sleeve text sits on the outer/lateral sleeve');
  assert.equal(pose.rotation,0);

  console.log('sleeves-costado: ok');
})().catch(err=>{console.error(err);process.exit(1)});
