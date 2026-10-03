const {assert,context,run,createCanvas}=require('./harness.cjs');

function almost(actual,expected,tol,label){
  assert(Math.abs(actual-expected)<=tol,(label||'value')+' expected '+expected+' ±'+tol+', got '+actual);
}

const CALIBRATED={
  playera:{front:{neckV:.022,hpsLeftU:.340,hpsRightU:.664},back:{neckV:.026,hpsLeftU:.334,hpsRightU:.660},prevNeck:.055,prevLeft:.36,prevRight:.64},
  polo:{front:{neckV:.057,hpsLeftU:.346,hpsRightU:.652},back:{neckV:.058,hpsLeftU:.346,hpsRightU:.650},prevNeck:.102,prevLeft:.36,prevRight:.64},
  hoodie:{front:{neckV:.141,hpsLeftU:.246,hpsRightU:.754},back:{neckV:.134,hpsLeftU:.256,hpsRightU:.742},prevNeck:.188,prevLeft:.30,prevRight:.70},
  zipneck:{front:{neckV:.022,hpsLeftU:.346,hpsRightU:.652},back:{neckV:.025,hpsLeftU:.346,hpsRightU:.652},prevNeck:.052,prevLeft:.34,prevRight:.66}
};

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8,'Schema VERSION stays 8');
  const built=require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
  assert.match(built,/MGM · v8\.2\.19/);
  assert.match(built,/Largo '/);
  assert.match(built,/Ancho '/);
  assert.match(built,/Cintura/);
  assert.match(built,/placementGuideForView/);
  assert.equal(built.includes('VERSION=9'),false);

  for(const [garment,spec] of Object.entries(CALIBRATED)){
    for(const view of ['front','back']){
      const got=run(`placementGuideForView('${garment}','${view}')`);
      const want=spec[view];
      almost(got.neckV,want.neckV,1e-9,garment+' '+view+' neckV');
      almost(got.hpsLeftU,want.hpsLeftU,1e-9,garment+' '+view+' hpsLeftU');
      almost(got.hpsRightU,want.hpsRightU,1e-9,garment+' '+view+' hpsRightU');
      assert(got.neckV>got.collarTipV,garment+' '+view+' HPS stays below the collar or hood tip');
      assert(got.neckV<spec.prevNeck-0.02,garment+' '+view+' HPS is higher than the old body-box line');
      run(`state=blank();state.garment='${garment}';photoBaseDefaults()`);
      const frame=run(`placementFrame('${view}')`);
      const rect=run(`photoRect('${garment}','${view}')`);
      almost(frame.neck,rect.y+rect.h*want.neckV,0.6,garment+' '+view+' frame HPS');
      almost(frame.hpsLeft,rect.x+rect.w*want.hpsLeftU,0.6,garment+' '+view+' left marker');
      almost(frame.hpsRight,rect.x+rect.w*want.hpsRightU,0.6,garment+' '+view+' right marker');
      assert.equal(frame.neck,frame.hps,garment+' '+view+' body-box top is the HPS');
      const onShoulder=await run(`(async()=>{
        const src=await preparePhoto('${garment}','${view}'),g=placementGuideForView('${garment}','${view}');
        const w=src.w,h=src.h,neck=src.masks.neck;
        function hit(u,v){
          const x=Math.round(u*(w-1)),y=Math.round(v*(h-1));
          let cloth=0,collar=0,seen=0;
          for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
            const xx=x+dx,yy=y+dy;
            if(xx<0||yy<0||xx>=w||yy>=h)continue;
            seen++;
            const n=(yy*w+xx)*4;
            if(src.pixels.data[n+3]>20)cloth++;
            if(neck[n+3]>40)collar++;
          }
          return {cloth,collar,seen};
        }
        const left=hit(g.hpsLeftU,g.neckV),right=hit(g.hpsRightU,g.neckV);
        return left.cloth>8&&right.cloth>8&&left.collar<left.seen*0.55&&right.collar<right.seen*0.55;
      })()`);
      assert.equal(onShoulder,true,garment+' '+view+' HPS mark lands on the shoulder, not inside the collar or hood');
    }
    if(garment==='polo'||garment==='hoodie'||garment==='playera'){
      assert(spec.front.hpsLeftU<spec.prevLeft-0.01,garment+' left HPS moved outward');
      assert(spec.front.hpsRightU>spec.prevRight+0.01,garment+' right HPS moved outward');
    }
  }

  run("state=blank();state.garment='polo';photoBaseDefaults();state.photo.side='front';currentTab='photo';photoRulerOn=true;selectedArt=null;syncPhotoUI()");
  assert.equal(run('selected()'),undefined,'Regla still does not auto-select');
  assert.equal(run("photoShowsPlacementBaseline('front')"),true);
  const layer=createCanvas(800,920);context.layer=layer;
  run("drawPlacementHintFrame(layer,'front')");
  const frame=run("placementFrame('front')");
  const px=layer.getContext('2d').getImageData(Math.round(frame.hpsLeft),Math.round(frame.neck),1,1).data;
  assert(px[0]>180&&px[1]>140&&px[2]<80,'yellow HPS mark is drawn at the polo shoulder point');
  const ink=layer.getContext('2d').getImageData(0,0,800,920).data;
  let painted=0;for(let i=3;i<ink.length;i+=4)if(ink[i]>40)painted++;
  assert(painted>800,'polo Regla still paints the frame');
  const photo=createCanvas(800,920);context.photo=photo;
  await run("renderPhoto(photo,'front',{background:true})");
  const clean=photo.getContext('2d').getImageData(Math.round(frame.hpsLeft),Math.round(frame.neck),1,1).data;
  const gold=clean[0]>180&&clean[1]>140&&clean[2]<80&&clean[0]>clean[2]+60;
  assert.equal(gold,false,'Acabado photo does not paint the HPS mark');

  run("state.garment='hoodie';photoBaseDefaults()");
  assert.equal(run('ensureHoodieStd().cuffRibCm'),5.5,'hoodie puño stays 5.5 cm');
  assert.equal(run('ensureHoodieStd().waistbandCm'),5.5,'hoodie pretina stays 5.5 cm');
  assert.equal(run("PHOTO_STANDARD_PROPORTION.polo"),0.9,'polo proportion stays 0.90');
  assert.equal(run("PHOTO_STANDARD_PROPORTION.playera"),0.9,'playera proportion stays 0.90');
  assert.equal(run('ensurePolo().collarLines'),false,'plain collar stays the default');

  console.log('PASS v8.2.19 HPS on the shoulder join; Largo from HPS; Ancho and Cintura');
})().catch(error=>{console.error(error);process.exitCode=1});
