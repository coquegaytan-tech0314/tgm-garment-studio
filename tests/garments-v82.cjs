const {assert,context,run,$,createCanvas}=require('./harness.cjs');

function opaqueBox(canvas){
  const {width,height}=canvas,data=canvas.getContext('2d').getImageData(0,0,width,height).data;
  let minX=width,minY=height,maxX=-1,maxY=-1,count=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>20){count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
  return {count,minX,maxX,minY,maxY,width:maxX-minX+1,height:maxY-minY+1};
}

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8,'Schema version stays 8 so tgm-pedido 1–8 still open');
  assert.match(require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8'),/ESTUDIO · v8\.2\.2/);
  assert.equal(run("Object.keys(GARMENTS).join(',')"),'playera,hoodie,polo,sleeveless,zipneck');
  assert.equal(run("GARMENTS.sleeveless.label"),'Top sin mangas');
  assert.equal(run("GARMENTS.zipneck.label"),'Manga larga con cierre');
  assert.equal(run("$$('[data-garment]').map(b=>b.dataset.garment).join(',')"),'playera,hoodie,polo,sleeveless,zipneck');

  for(const [garment,neck] of [['sleeveless','round'],['zipneck','zip']]){
    context.sample=run('blank()');
    context.sample.garment=garment;
    context.sample.neck=neck;
    if(garment==='zipneck')context.sample.cuff='rib';
    const out=await run('validateOrder(sample)');
    assert.equal(out.garment,garment);
    assert.equal(out.neck,neck);
  }
  context.bad=run('blank()');context.bad.garment='sleeveless';context.bad.neck='hood';
  await assert.rejects(()=>run('validateOrder(bad)'),/cuello/);

  const paths={};
  for(const garment of ['playera','hoodie','polo','sleeveless','zipneck']){
    run(`state.garment='${garment}'`);
    paths[garment]=run('garmentPath()');
  }
  assert.equal(paths.playera,paths.polo);
  assert.notEqual(paths.sleeveless,paths.playera);
  assert.notEqual(paths.zipneck,paths.playera);
  assert.notEqual(paths.zipneck,paths.hoodie);
  assert.match(paths.sleeveless,/618/);
  assert.match(paths.zipneck,/750 688/);

  async function drawBox(garment){
    run(`state=blank();state.garment='${garment}';photoBaseDefaults()`);
    const c=createCanvas(800,920);context.c=c;
    await run("drawGarment(c,'front')");
    return opaqueBox(c);
  }
  const playera=await drawBox('playera');
  const sleeveless=await drawBox('sleeveless');
  const zipneck=await drawBox('zipneck');
  const hoodie=await drawBox('hoodie');
  const polo=await drawBox('polo');
  assert(sleeveless.height<playera.height-40,'Sleeveless crop hem must sit higher than a playera');
  assert(sleeveless.width<playera.width-40,'Sleeveless must drop the short sleeves');
  assert(zipneck.width>playera.width+20,'Zipneck long sleeves must be wider than a playera');
  assert(hoodie.width>playera.width+40,'Hoodie long sleeves stay wider than a playera');
  assert(Math.abs(polo.width-playera.width)<20,'Polo keeps the existing short-sleeve outline');

  run("state=blank();state.garment='sleeveless';state.neck='round'");
  const sleevelessMesh=run('garmentGeometry(state)');
  assert.equal(sleevelessMesh.some(m=>m.name.startsWith('Manga')),false);
  assert(sleevelessMesh.some(m=>m.name.startsWith('Sisa')));
  run("state.garment='zipneck';state.neck='zip'");
  const zipMesh=run('garmentGeometry(state)');
  assert(zipMesh.some(m=>m.name.startsWith('Manga')));
  assert(zipMesh.some(m=>m.name==='Cierre'));
  run("state.garment='playera';state.neck='round'");
  assert.equal(run('garmentGeometry(state).some(m=>m.name==="Cierre")'),false);
  run("state.garment='hoodie';state.neck='hood'");
  assert(run('garmentGeometry(state).some(m=>m.name==="Capucha")'));

  run("state=blank();state.garment='zipneck';photoBaseDefaults()");
  run("addArt();selected().zone='leftCostado';Object.assign(selected(),zonePosition('leftCostado','front'))");
  assert.equal(run('selected().zone'),'leftCostado');
  assert.equal(run("sleeveSideForZone('leftCostado')"),'left');
  assert.equal(run('state.fabric'),'Chifón Estrella');
  assert.equal(run('state.gsm'),'');
  const photo=await run("tintedPhoto('zipneck','front')");
  assert.equal(photo.width,run("PHOTO_BASES.zipneck.crop.front[2]"));
  assert.equal(run("PHOTO_BASES.zipneck.label"),'Manga larga con cierre · Chifón');
  function regionMean(canvas,x0,x1,y0,y1){
    const {width,height}=canvas,data=canvas.getContext('2d').getImageData(0,0,width,height).data;
    const X0=Math.floor(x0*width),X1=Math.floor(x1*width),Y0=Math.floor(y0*height),Y1=Math.floor(y1*height);
    let n=0,r=0,g=0,b=0,stain=0;
    for(let y=Y0;y<Y1;y++)for(let x=X0;x<X1;x++){
      const i=(y*width+x)*4;if(data[i+3]<20)continue;
      n++;r+=data[i];g+=data[i+1];b+=data[i+2];
      const cr=data[i]*data[i+3]/255+255*(1-data[i+3]/255),cg=data[i+1]*data[i+3]/255+255*(1-data[i+3]/255),cb=data[i+2]*data[i+3]/255+255*(1-data[i+3]/255);
      if(cr>220&&cg>220&&cb>220)stain++;
    }
    return {n,r:r/n,g:g/n,b:b/n,stain};
  }
  run("state.bodyColor='#1a2744'");
  const navy=await run("tintedPhoto('zipneck','front')");
  const navyBack=await run("tintedPhoto('zipneck','back')");
  const torso=regionMean(navy,.32,.68,.18,.72),left=regionMean(navy,.00,.18,.08,.95),right=regionMean(navy,.82,1,.08,.95);
  assert(left.n>20000&&right.n>20000,'Zipneck photobase must keep both long sleeves');
  assert(Math.abs(left.b-torso.b)<18&&Math.abs(right.b-torso.b)<18,'Sleeves must tint with the torso');
  assert(torso.b>left.r+20&&left.b>left.r+20,'Navy zipneck sleeves must stay blue, not white');
  const navyStain=regionMean(navy,.08,.92,.08,.92).stain+regionMean(navyBack,.08,.92,.08,.92).stain;
  assert(navyStain<400,'Interior white stains must not survive navy tint');
  run("state.bodyColor='#228b22'");
  const green=await run("tintedPhoto('zipneck','front')");
  const greenTorso=regionMean(green,.32,.68,.18,.72),greenSleeve=regionMean(green,.00,.18,.08,.95);
  assert(greenSleeve.g>100&&Math.abs(greenSleeve.g-greenTorso.g)<25,'Saturated green must recolor sleeves with the torso');
  run("state.bodyColor='#f3f3ef'");
  const light=await run("tintedPhoto('zipneck','front')");
  const lightSleeve=regionMean(light,.00,.18,.08,.95);
  assert(lightSleeve.n>20000,'Light body color must keep the long-sleeve silhouette');
  run("state=blank();state.garment='sleeveless';photoBaseDefaults()");
  assert.equal(run('state.fabric'),'Chifón Estrella');
  assert.equal(run('state.photoCut'),'hombre');
  const tank=await run("tintedPhoto('sleeveless','front')");
  assert.equal(tank.width,run("PHOTO_BASES.sleeveless.crop.front[2]"));
  assert.equal(run("PHOTO_BASES.sleeveless.label"),'Top sin mangas · Chifón');
  run("state.photoCut='mujer'");
  const crop=await run("tintedPhoto('sleeveless','front')");
  assert.equal(crop.width,run("PHOTO_BASES.sleevelessMujer.crop.front[2]"));
  assert.notEqual(tank.width,crop.width);
  const playeraPhoto=await run("tintedPhoto('playera','front')");
  assert.equal(playeraPhoto.width,run("PHOTO_BASES.playera.crop.front[2]"));
  assert.notEqual(playeraPhoto.width,photo.width);
  assert.notEqual(playeraPhoto.width,tank.width);
  assert.equal(run("PHOTO_BASES.playera.label"),'Playera · jersey');
  assert.equal(run("PHOTO_BASES.hoodie.label"),'Hoodie · felpa');
  assert.equal(run("PHOTO_BASES.polo.label"),'Polo · piqué');
  assert.equal(run("!!PHOTO_ASSETS.sleeveless && !!PHOTO_ASSETS.sleevelessMujer && !!PHOTO_ASSETS.zipneck"),true);
  assert.equal(run("!!PHOTO_ASSETS.playera && !!PHOTO_ASSETS.hoodie && !!PHOTO_ASSETS.polo"),true);

  run("state=blank();state.garment='playera';photoBaseDefaults()");
  assert.equal(run('state.fabric'),'');
  context.cutOrder=run('blank()');context.cutOrder.garment='sleeveless';context.cutOrder.neck='round';context.cutOrder.photoCut='mujer';
  assert.equal((await run('validateOrder(cutOrder)')).photoCut,'mujer');
  context.legacyCut=run('blank()');context.legacyCut.version=6;context.legacyCut.garment='polo';context.legacyCut.neck='polo';
  delete context.legacyCut.photoCut;
  assert.equal((await run('validateOrder(legacyCut)')).photoCut,'hombre');

  context.legacy=run('blank()');context.legacy.version=6;context.legacy.garment='polo';context.legacy.neck='polo';
  delete context.legacy.pricing;delete context.legacy.costing;delete context.legacy.project;
  const migrated=await run('validateOrder(legacy)');
  assert.equal(migrated.garment,'polo');
  assert.equal(migrated.version,8);

  console.log('PASS v8.2 sleeveless and zipneck silhouettes, validation and legacy polo/hoodie/playera');
})().catch(error=>{console.error(error);process.exitCode=1});
