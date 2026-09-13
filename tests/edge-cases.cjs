const {assert,context,run,set,$,createCanvas,frames}=require('./harness.cjs');
context.FileReader=class{readAsDataURL(f){f.arrayBuffer().then(b=>{this.result='data:'+f.type+';base64,'+Buffer.from(b).toString('base64');this.onload()})}};
(async()=>{
 await run('init()');
 context.exportBlob=new Blob(['{"example":true}'],{type:'application/json'});run("download(exportBlob,'EJEMPLO.json')");assert.equal($('#exportFallback').hidden,false);assert.equal($('#lastExportLink').download,'EJEMPLO.json');assert($('#lastExportLink').href.startsWith('blob:'));
 console.log('PASS exports retain a native download link for blocked auto-downloads');
 const table=createCanvas(1654,2339).getContext('2d');context.table=table;
 const rows=run("summaryRowLayout(table,[['Composición solicitada','100% poliéster'],['Acentos del polo','Vivo dorado en cuello e interior de tapeta']],1482,25)");
 assert(rows[0].labelLines.length>1);table.font='600 25px Arial';
 for(const row of rows)for(const line of row.labelLines)assert(table.measureText(line).width<=200,'Label overlaps the 220px value column');
 assert.equal(rows[0].labelLines.join(' '),'Composición solicitada');
 console.log('PASS long PDF labels wrap within their column without losing text');
 run('state=blank()');assert.equal(run('hasOrderContent()'),false);
 for(const edit of ["state.care='Lavado por definir'","state.packaging='Bolsa individual'","state.minutes=15","state.contrast.neck=true","state.polo.piping=true"]){
   run('state=blank();'+edit+';dirty=false');assert.equal(run('hasOrderContent()'),true,'Autosaved details must be archived before replacing a draft');
 }
 run('state=blank()');
 console.log('PASS care-only and construction-only drafts are protected after autosave');
 // Verify that the photo render queue never overlaps, even while inputs change.
 let release,active=0,peak=0,calls=0;
 const gate=new Promise(resolve=>release=resolve);context.fakeRender=async c=>{active++;peak=Math.max(peak,active);if(++calls===1)await gate;active--;return c};
 run('var oldRender=renderPhoto;renderPhoto=fakeRender;schedulePhoto()');const rendering=frames[0]();run('schedulePhoto();schedulePhoto();schedulePhoto()');release();await rendering;assert.equal(peak,1);assert.equal(calls,3);run('renderPhoto=oldRender');
 console.log('PASS rapid preview changes coalesce with one render in flight');
 // Current browser's unavailable WebGL must leave a usable photo workspace.
 run("studio=null;setWorkspace('3d')");assert.equal(run('state.pro.workspace'),'photo');run("setWorkspace('split')");assert.equal(run('state.pro.workspace'),'photo');
 console.log('PASS unavailable WebGL falls back to the photo workspace');
 // Use actual pixel values to check left/right sleeves for each template and face.
 run("state.sleeves.left.panel=true;state.sleeves.left.color='#d03322';state.bodyColor='#224488'");
 for(const garment of ['playera','polo','hoodie'])for(const view of ['front','back']){
  run(`state.garment='${garment}';photoBaseDefaults()`);const c=await run(`tintedPhoto('${garment}','${view}')`);const x=c.getContext('2d'),v=garment==='hoodie'?.49:garment==='polo'?.32:.26;
  const sample=u=>x.getImageData(Math.round(u*c.width),Math.round(v*c.height),1,1).data;
  const own=sample(view==='front'?.875:.125),other=sample(view==='front'?.125:.875);assert(own[0]>own[2]*1.5);assert(other[2]>other[0]);
 }
 console.log('PASS sleeve colors stay on the wearer’s correct side in all six views');
 run("state=blank();state.garment='polo';photoBaseDefaults();state.bodyColor='#121212';state.polo.aletilla=false;state.polo.cuffStripes=false;state.reference.composition='polyester';addArt();selected().text='TEST';selected().width=180;selected().method='sublimation';selected().color='#d0a33f'");
 const inspect=async()=>{const c=createCanvas(800,920);context.c=c;await run("renderPhoto(c,'front')");const data=c.getContext('2d').getImageData(270,280,260,100).data;let max=0;for(let i=0;i<data.length;i+=4)max=Math.max(max,data[i]);return max};
 const overDark=await inspect();run("selected().logo.sublimationBase='whitePanels'");const onPanel=await inspect();assert(onPanel>overDark+40);
 console.log('PASS proposed white-panel rendering differs from transfer over dark cloth');
 const c=createCanvas(240,240);c.getContext('2d').fillStyle='#a0bbcc';c.getContext('2d').fillRect(0,0,240,240);context.f=new Blob([c.toBuffer('image/png')],{type:'image/png'});context.f.name='render.png';context.final=await run('readFinalRender(f)');run("state.photo.final.front={...final,signature:visualSignature()};state.photo.source='final'");assert.equal(run("photoIssues(['front']).length"),0);run("state.bodyColor='#333333'");await assert.rejects(()=>run('exportCanvas("front")'),/anterior/);
 console.log('PASS final image ingestion and stale-render export protection');
 run("state=blank();state.photo.source='generated';");for(let i=0;i<12;i++)run('addArt()');run('addArt()');assert.equal(run('state.artworks.length'),12);assert($('#addLogo').disabled);
 context.bad=run('clone(state)');context.bad.artworks.push(context.bad.artworks[0]);await assert.rejects(()=>run('validateOrder(bad)'),/diseños/);
 context.bad=run('clone(state)');context.bad.reference.attachments=Array(9).fill({});await assert.rejects(()=>run('validateOrder(bad)'),/8 referencias/);
 console.log('PASS application and attachment limits prevent overfilled orders');
 // Retry a failed IDB open without reloading the app.
 await assert.rejects(()=>run('referenceDb()'));let opens=0;const db={close(){this.closed=true}};
 const api={open(){opens++;const req={result:db};Promise.resolve().then(()=>req.onsuccess());return req}};context.window.indexedDB=api;context.indexedDB=api;
 assert.equal(await run('referenceDb()'),db);db.onversionchange();assert(db.closed);await run('referenceDb()');assert.equal(opens,2);
 console.log('PASS storage opens retry and stale version connections close');
})().catch(e=>{console.error(e);process.exitCode=1});
