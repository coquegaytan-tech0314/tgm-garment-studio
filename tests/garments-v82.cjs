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
  const built=require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
  assert.match(built,/MGM · v8\.2\./);
  assert.match(built,/class="brand-logo"/);
  assert.match(built,/#FF2E4D/);
  assert.match(built,/SCHEMA='tgm-pedido'/);
  assert.match(run('KEY'),/^tgm-estudio-/);
  assert.equal(run("Object.keys(GARMENTS).join(',')"),'playera,hoodie,polo,sleeveless,zipneck');
  assert.equal(run("GARMENTS.sleeveless.label"),'Top sin mangas');
  assert.equal(run("GARMENTS.zipneck.label"),'Manga larga con cierre');
  assert.equal(run("$$('[data-garment]').map(b=>b.dataset.garment).join(',')"),'playera,hoodie,polo,sleeveless,zipneck');
  assert.equal(run("POLO_FABRIC_SKUS.map(s=>s.value).join(',')"),'Piqué Olmo,Piqué Atlante,Piqué Fomer');
  assert.match(run("POLO_FABRIC_SKUS[0].label"),/Poliéster\/Algodón/);
  assert.equal(run('POLO_FABRIC_SKUS[0].label.includes("lycra")'),false);
  assert.equal(run('POLO_FABRIC_SKUS[0].label.includes("50/50")'),false,'catalog is not a hardcoded 50/50');
  run("state.garment='polo';configureNeck()");
  assert.match(run("$('#fabric').placeholder"),/Olmo/);
  assert.match(run("$('#fabricSuggest').children.map(o=>o.value).join(',')"),/Piqué Olmo/);
  run("state.fabric='Piqué Fomer';applyPoloFabricSku()");
  assert.equal(run('state.texture'),'smooth','Fomer is liso');
  run("state.fabric='Piqué Atlante';applyPoloFabricSku()");
  assert.equal(run('state.texture'),'pique','Atlante keeps Olmo piqué texture');
  run("state.stretch='';state.fabric='Piqué Olmo';applyPoloFabricSku()");
  assert.equal(run('state.stretch'),'50% algodón / 50% poliéster','Olmo 50/50 is an editable operator note');
  run("state.stretch='mezcla ya capturada';state.fabric='Piqué Olmo';applyPoloFabricSku()");
  assert.equal(run('state.stretch'),'mezcla ya capturada','operator note is not overwritten');

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

  function silhouetteReadability(canvas){
    const {width,height}=canvas,data=canvas.getContext('2d').getImageData(0,0,width,height).data;
    const garment=new Uint8Array(width*height);
    let count=0,form=0,stain=0,edgeN=0,edgeL=0,inN=0,inL=0,r=0,g=0,b=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=y*width+x,n=i*4;
      if(data[n+3]<20)continue;
      garment[i]=1;count++;
      const a=data[n+3]/255,cr=data[n]*a+255*(1-a),cg=data[n+1]*a+255*(1-a),cb=data[n+2]*a+255*(1-a);
      const comp=(cr*.2126+cg*.7152+cb*.0722)/255;
      if(comp<0.90)form++;
      if(cr>220&&cg>220&&cb>220)stain++;
      r+=data[n];g+=data[n+1];b+=data[n+2];
    }
    const rad=6;
    for(let y=rad;y<height-rad;y++)for(let x=rad;x<width-rad;x++){
      const i=y*width+x;if(!garment[i])continue;
      let border=0;
      for(let dy=-rad;dy<=rad&&!border;dy++)for(let dx=-rad;dx<=rad;dx++)if(!garment[(y+dy)*width+x+dx])border=1;
      const n=i*4,L=(data[n]*.2126+data[n+1]*.7152+data[n+2]*.0722)/255;
      if(border){edgeN++;edgeL+=L}else{inN++;inL+=L}
    }
    return {count,form,formRatio:form/count,stain,edge:edgeL/Math.max(edgeN,1),interior:inL/Math.max(inN,1),r:r/count,g:g/count,b:b/count};
  }
  async function sisadaTint(cut,color){
    run("state=blank();state.garment='sleeveless';photoBaseDefaults()");
    run(`state.photoCut='${cut}';state.bodyColor='${color}'`);
    return silhouetteReadability(await run("tintedPhoto('sleeveless','front')"));
  }
  const whiteHombre=await sisadaTint('hombre','#F4F3EF');
  const whiteMujer=await sisadaTint('mujer','#F4F3EF');
  const navyHombre=await sisadaTint('hombre','#1a2744');
  const navyMujer=await sisadaTint('mujer','#1a2744');
  assert(whiteHombre.formRatio>0.18,'White hombre sisada must keep visible folds/outline on white');
  assert(whiteMujer.formRatio>0.16,'White mujer sisada must keep a readable crop silhouette');
  assert(whiteHombre.edge<whiteHombre.interior-0.03,'Hombre armhole/hem edges must read darker than the fill');
  assert(whiteMujer.edge<whiteMujer.interior-0.025,'Mujer armhole/hem edges must read darker than the fill');
  assert(navyHombre.b>navyHombre.r+18&&navyMujer.b>navyMujer.r+18,'Navy sisada must stay blue, not washed out');
  assert(navyHombre.stain<400&&navyMujer.stain<400,'Navy sisada must not introduce white stains');
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

  assert.equal(run("$$('[data-photo-view]').map(b=>b.dataset.photoView).join(',')"),'front,back,both,orbit');
  context.orbitOrder=run('blank()');context.orbitOrder.photo.side='orbit';
  assert.equal((await run('validateOrder(orbitOrder)')).photo.side,'orbit');
  context.flatOrder=run('blank()');context.flatOrder.photo.side='both';
  assert.equal((await run('validateOrder(flatOrder)')).photo.side,'both');
  run("state=blank();state.photo.side='orbit';syncPhotoUI()");
  assert.equal(run("state.photo.side"),'orbit');
  assert.equal(run("$('#photoStage').dataset.view"),'orbit');
  assert.equal(run("$('#photoOrbit').hidden"),false);
  run("state.photo.side='both';syncPhotoUI()");
  assert.equal(run("$('#photoStage').dataset.view"),'both');
  assert.equal(run("$('#photoOrbit').hidden"),true);

  function colorHits(canvas,r0,g0,b0,tol=48){
    const {width,height}=canvas,data=canvas.getContext('2d').getImageData(0,0,width,height).data;
    let n=0;
    for(let i=0;i<data.length;i+=4){
      if(data[i+3]<40)continue;
      if(Math.abs(data[i]-r0)<tol&&Math.abs(data[i+1]-g0)<tol&&Math.abs(data[i+2]-b0)<tol)n++;
    }
    return n;
  }
  async function orbitSheets(garment){
    run(`state=blank();state.garment='${garment}';photoBaseDefaults();state.bodyColor='#1a4f9c';state.photo.side='orbit'`);
    run("addArt();selected().kind='text';selected().text='TGM';selected().color='#e10600';selected().view='front';selected().width=140");
    run("addArt();selected().kind='text';selected().text='BACK';selected().color='#12a35a';selected().view='back';selected().width=140");
    const front=createCanvas(1000,1150),back=createCanvas(1000,1150);context.front=front;context.back=back;
    await run("renderPhoto(front,'front')");await run("renderPhoto(back,'back')");
    return {front,back};
  }
  function orbitPaint(sheets,yaw){
    const dest=createCanvas(800,800);context.dest=dest;context.front=sheets.front;context.back=sheets.back;context.yaw=yaw;
    run('paintPhotoOrbitSheet(dest,front,back,yaw,0.05,5.3)');
    return {box:opaqueBox(dest),red:colorHits(dest,225,6,0),green:colorHits(dest,18,163,90)};
  }
  for(const garment of ['playera','hoodie','polo','sleeveless','zipneck']){
    const sheets=await orbitSheets(garment);
    const frontView=orbitPaint(sheets,0.15);
    const backView=orbitPaint(sheets,Math.PI);
    const sideView=orbitPaint(sheets,Math.PI/2);
    assert(frontView.box.count>8000,garment+' 360° front yaw must paint the finished sheet');
    assert(backView.box.count>8000,garment+' 360° back yaw must paint the reverse sheet');
    assert(sideView.box.count>5000,garment+' 360° side yaw must keep a garment volume, not a card-flip sliver');
    assert(frontView.red>80,garment+' front logo must stay readable while facing the camera');
    assert(backView.green>40,garment+' back mark must stay readable at 180°');
    assert(sideView.red>10&&sideView.green>10,garment+' front↔back transition must show both finished sheets');
    const mapped=run('photoOrbitProjectiveUVs(garmentGeometry(state))');
    assert(mapped.maxY>mapped.minY&&mapped.maxX>mapped.minX,garment+' mesh bounds stay available');
    const box=run('photoOrbitOpaqueBox(front)');
    assert(box.u1-box.u0>0.25&&box.v1-box.v0>0.25,garment+' finished sheet must expose an opaque orbit crop box');
  }
  run("state=blank();state.garment='sleeveless';photoBaseDefaults();state.photoCut='mujer';state.photo.side='orbit'");
  const mujerMesh=run('photoOrbitProjectiveUVs(garmentGeometry(state))');
  assert(mujerMesh.maxX>mujerMesh.minX,'Sleeveless mujer cut still has orbit bounds');
  run("state.photo.side='both';syncPhotoUI()");
  assert.equal(run("$('#photoStage').dataset.view"),'both');
  assert.equal(run("$('#photoOrbit').hidden"),true);

  console.log('PASS v8.2 sleeveless and zipneck silhouettes, validation and legacy polo/hoodie/playera');
  console.log('PASS v8.2.6 Acabado 360° photoreal turntable for every prenda type');
  console.log('PASS v8.2 chrome version on built studio');
})().catch(error=>{console.error(error);process.exitCode=1});
