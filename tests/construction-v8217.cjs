const {assert,context,run,createCanvas}=require('./harness.cjs');

function almost(actual,expected,tol,label){
  assert(Math.abs(actual-expected)<=tol,(label||'value')+' expected '+expected+' ±'+tol+', got '+actual);
}

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8,'Schema VERSION stays 8');
  const built=require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
  assert.match(built,/MGM · v8\.2\.18/);
  assert.match(built,/Jacquard estándar \(ejemplo\)/);
  assert.equal(/id="poloCollarLines"[^>]*checked/.test(built),false,'jacquard checkbox is unchecked in the form');
  assert.equal(built.includes('VERSION=9'),false,'schema stays VERSION 8');
  assert.match(built,/id="poloCollarLength"/);
  assert.match(built,/id="poloCollarLinePreset"/);
  assert.match(built,/id="poloCuffCutLength"/);
  assert.match(built,/id="hoodieCuffRib"/);
  assert.match(built,/id="hoodieWaistband"/);
  assert.match(built,/id="constructionTallas"/);
  assert.match(built,/id="despiecePartStd"/);
  assert.equal(run('poloPaintsAcabadoOverlays()'),false,'Acabado stays photoreal: no painted collar / cuff overlays');

  // Polo defaults (Koke 2026-10-02).
  run("state=blank();state.garment='polo';photoBaseDefaults();populate()");
  const p=run('ensurePolo()');
  almost(p.collarWidthCm,9,.01,'collar 9 cm alto');
  almost(p.collarLengthCm,40,.01,'collar 40 cm largo');
  assert.equal(p.collarLines,false,'juegos y líneas off by default');
  assert.equal(p.collarLinePreset,'ninguno');
  assert.equal(run("$('#poloCollarLines').checked"),false);
  assert.equal(run("$('#poloCollarLinePreset').disabled"),false,'preset list stays available on a plain collar');
  almost(p.cuffCutLengthCm,35,.01,'puño corte 35 cm');
  almost(p.cuffCutHeightCm,3.5,.01,'puño corte 3.5 cm');
  almost(p.cuffWidthCm,2.5,.01,'puño 2.5 cm después de costura');
  almost(p.cuffStripeMm,4,.01,'rayas de puño 4 mm');
  almost(p.detailLineMm,4,.01,'líneas de detalle 4 mm');
  almost(p.cuffSeamCm,.75,.01,'costura 0.5–1 cm promedio');
  const rows=run('poloConstructionRows()').map(r=>r.join(': ')).join('\n');
  assert.match(rows,/Cuello \(TGM\): 9\.0 cm alto × 40\.0 cm largo/);
  assert.match(rows,/Juegos y líneas del cuello: Sin juegos ni líneas/);
  run("state.polo.collarLinePreset='jacquard-estandar';applyPoloCollarPreset(state.polo);populate()");
  assert.equal(run('state.polo.collarLines'),true,'example preset adds jacquard');
  almost(run('state.polo.collarLineMm'),9,.01,'example línea 9 mm');
  almost(run('state.polo.collarLineAMm'),6,.01,'example marino 6 mm');
  almost(run('state.polo.collarLineBMm'),6,.01,'example blanco 6 mm');
  assert.equal(run('state.polo.collarLineA').toLowerCase(),'#1f2a44');
  assert.equal(run('state.polo.collarLineB').toLowerCase(),'#f4f3ef');
  assert.equal(run('state.polo.collarColor'),'#b63d42','example rojo is the rest of the collar');
  assert.equal(run('state.polo.collarLineCount'),2);
  const example=run('poloConstructionRows()').map(r=>r.join(': ')).join('\n');
  assert.match(example,/Juegos y líneas del cuello: jacquard desde el canto · línea 9\.0 mm · línea 1 #1F2A44 6\.0 mm · línea 2 #F4F3EF 6\.0 mm · resto #B63D42 · Jacquard estándar \(ejemplo\)/);
  run("state.polo.collarLineCount=3;state.polo.collarLineCMm=5;state.polo.collarLinePreset='personalizado'");
  assert.equal(run('poloCollarLineWidths().length'),3,'1–3 lines stay editable');
  run("state.polo.collarLinePreset='ninguno';applyPoloCollarPreset(state.polo)");
  assert.equal(run('state.polo.collarLines'),false,'Sin juego returns to a plain collar');
  run("state.polo.collarLinePreset='jacquard-estandar';applyPoloCollarPreset(state.polo)");
  assert.match(rows,/Puño · corte: 35\.0 cm largo × 3\.5 cm alto · 2\.5 cm después de costura/);
  assert.match(rows,/Líneas de detalle: 4\.0 mm/);
  assert.match(run("$('#poloFichaText').textContent"),/40\.0 cm largo/);

  // Presets are editable and persist.
  run("state.polo.collarLinePreset='blanco-marino';applyPoloCollarPreset(state.polo)");
  assert.equal(run('state.polo.collarLineCount'),1);
  assert.equal(run('state.polo.collarColor'),'#1f2a44');
  run("state.polo.collarLineMm=6;state.polo.collarLineAMm=7;state.polo.collarLengthCm=42");
  context.saved=run('clone(state)');
  const reopened=await run('validateOrder(saved)');
  almost(reopened.polo.collarLineMm,6,.01,'custom línea preset persists');
  almost(reopened.polo.collarLineAMm,7,.01,'custom band width persists');
  almost(reopened.polo.collarLengthCm,42,.01,'custom collar length persists');
  assert.equal(reopened.polo.collarLinePreset,'blanco-marino');
  context.bad=run('clone(saved)');
  run("bad.polo.collarLinePreset='rayas-locas'");
  await assert.rejects(()=>run('validateOrder(bad)'));
  context.bad2=run('clone(saved)');
  run("bad2.polo.cuffCutHeightCm=40");
  await assert.rejects(()=>run('validateOrder(bad2)'));

  // Legacy polo (v8.2.16 and earlier) gets the new defaults.
  context.legacy=run('blank()');
  run("legacy.garment='polo';legacy.neck='polo';legacy.polo={piping:false,placket:false,color:'#b89442',collarWidthCm:9,cuffWidthCm:2.5};delete legacy.hoodieStd");
  const migrated=context.migrated=await run('validateOrder(legacy)');
  almost(migrated.polo.collarLengthCm,40,.01);
  assert.equal(migrated.polo.collarLines,false,'pedido that never set jacquard loads plain');
  assert.equal(migrated.polo.collarLinePreset,'ninguno');
  almost(migrated.polo.cuffCutLengthCm,35,.01);
  context.savedOn=run('clone(migrated)');
  run("savedOn.polo.collarLines=true;savedOn.polo.collarLinePreset='marino-blanco-rojo'");
  const kept=await run('validateOrder(savedOn)');
  assert.equal(kept.polo.collarLines,true,'an explicit jacquard flag stays on');
  assert.equal(kept.polo.collarLinePreset,'jacquard-estandar','v8.2.17 preset key still opens');
  almost(migrated.hoodieStd.cuffRibCm,5.5,.01,'legacy pedido gets hoodie defaults');

  // Hoodie / sudadera rib cuffs + pretina.
  run("state=blank();state.garment='hoodie';photoBaseDefaults();populate()");
  const h=run('ensureHoodieStd()');
  almost(h.cuffRibCm,5.5,.01,'puño cardigán 5.5 cm a costura');
  almost(h.waistbandCm,5.5,.01,'pretina 5.5 cm');
  assert.equal(run("$('#hoodieStdExtras').hidden"),false);
  assert.equal(run("$('#hoodieFichaSpecs').hidden"),false);
  assert.match(run("$('#hoodieFichaText').textContent"),/Pretina \(hoodie\): 5\.5 cm/);
  assert.equal(run("$('#constructionTallas').hidden"),false,'Tallas shows hoodie standards');
  assert.match(run("$('#constructionTallasText').textContent"),/Puño cardigán 5\.5 cm[\s\S]*Pretina 5\.5 cm/);
  const spec=JSON.stringify(run('clientSpecLines()'));
  assert.match(spec,/Puño cardigán \(hoodie\)/);
  assert.match(spec,/Pretina \(hoodie\)/);
  assert.equal(run("despiecePartLabel('dobladillo','hoodie')"),'Pretina');
  assert.equal(run("despiecePartLabel('dobladillo','playera')"),'Dobladillo');
  assert.match(run("despiecePartStandard('punos','hoodie')"),/5\.5 cm/);
  assert.match(run("despiecePartStandard('dobladillo','hoodie')"),/Pretina \(rib\) 5\.5 cm/);
  run("state.hoodieStd.waistbandCm=6");
  context.hood=run('clone(state)');
  almost((await run('validateOrder(hood)')).hoodieStd.waistbandCm,6,.01,'hoodie pretina is editable');
  context.badHood=run('clone(state)');
  run("badHood.hoodieStd.cuffRibCm=40");
  await assert.rejects(()=>run('validateOrder(badHood)'));
  assert.equal(run('poloConstructionRows().length'),0,'hoodie has no polo rows');
  const pages=await run('referenceCanvases()');
  assert(pages.length>=1,'hoodie ficha still builds');

  run("state=blank();state.garment='playera';photoBaseDefaults();populate()");
  assert.equal(run("$('#hoodieStdExtras').hidden"),true);
  assert.equal(run("$('#constructionTallas').hidden"),true,'playera keeps its own cuello redondo tallas card');
  assert.equal(run('hoodieStdRows().length'),0);

  // Standard proportion: polo / playera compressed vertically, hoodie and chifón unchanged.
  for(const g of ['polo','playera']){
    const r=run(`photoRect('${g}','front')`),raw=run(`photoRectBeforeV8217('${g}','front')`);
    almost(r.w,raw.w,.001,g+' width unchanged');
    almost(r.h/raw.h,run(`PHOTO_STANDARD_PROPORTION.${g}`),.001,g+' height compressed');
    assert(r.h/raw.h<1&&r.h/raw.h>=.85,g+' compression is slight');
    const guide=run(`PLACEMENT_GUIDES.${g}`);
    const ratioPx=((guide.hemV-guide.neckV)*r.h)/((guide.rightU-guide.leftU)*r.w),ratioRaw=((guide.hemV-guide.neckV)*raw.h)/((guide.rightU-guide.leftU)*raw.w);
    const target=guide.lengthCm/guide.chestCm;
    assert(Math.abs(ratioPx-target)<Math.abs(ratioRaw-target),g+' moves closer to standard length/chest proportion');
  }
  for(const g of ['hoodie','zipneck','sleeveless']){
    const r=run(`photoRect('${g}','front')`),raw=run(`photoRectBeforeV8217('${g}','front')`);
    almost(r.h,raw.h,.001,g+' not compressed');
  }

  // Regla never auto-selects an estampado; construction marks live on the ruler layer only.
  run("state=blank();state.garment='hoodie';photoBaseDefaults();state.photo.source='generated';state.photo.side='front';currentTab='art';state.artworks=[];selectedArt=null;photoRulerOn=true");
  const layer=createCanvas(800,920);context.layer=layer;
  run("drawPlacementHintFrame(layer,'front')");
  assert.equal(run('selectedArt'),null,'Regla does not select an estampado');
  const photo=createCanvas(800,920);context.photo=photo;
  await run("renderPhoto(photo,'front',{background:true})");
  context.photo2=createCanvas(800,920);
  run("state.hoodieStd.waistbandCm=8");
  await run("renderPhoto(photo2,'front',{background:true})");
  const a=photo.getContext('2d').getImageData(0,0,800,920).data,b=context.photo2.getContext('2d').getImageData(0,0,800,920).data;
  let diff=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])diff++;
  assert.equal(diff,0,'hoodie measures never paint the Acabado render');

  console.log('PASS v8.2.18 plain polo collar; Jacquard estándar (ejemplo) optional; v8.2.17 cuff, hoodie and proportion unchanged');
})().catch(error=>{console.error(error);process.exitCode=1});
