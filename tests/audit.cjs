/* Runs the assembled application, with native Canvas2D and a deliberately minimal DOM.
   Synthetic fixtures only. Browser/device coverage is recorded separately in VALIDATION.md. */
const {assert,context,run,set,$,elements,storage,createCanvas,frames}=require('./harness.cjs');
const tests=[];
const test=async(name,fn)=>{await fn();tests.push(name);console.log('PASS',name)};
const click=id=>$('#'+id).emit('click');
const field=async(id,value,event='input')=>set(id,value,event);
context.downloads=[];
context.FileReader=class{readAsDataURL(file){file.arrayBuffer().then(b=>{this.result='data:'+file.type+';base64,'+Buffer.from(b).toString('base64');this.onload()}).catch(()=>this.onerror())}};
function file(text,name,type){const b=new Blob([text],{type});b.name=name;return b}
async function newState(){run('state=blank();selectedArt=null;dirty=false;populate()')}
(async()=>{
 await run('init()');run('download=(blob,name)=>downloads.push({blob,name})');
 await test('startup and every static button has a handler',async()=>{
  assert.equal(run('VERSION'),6);assert.equal($('#bootStatus').hidden,true);
  const missing=elements.filter(e=>e.tagName==='BUTTON'&&!e.events.click?.length&&e.attrs.type!=='submit');
  assert.deepEqual(missing.map(e=>e.id||e.className),[]);
 });
 await test('garment, color, contrast, fabric, construction, quantities, QC and all tabs',async()=>{
  for(const e of elements.filter(e=>e.dataset.garment)){await e.emit('click');assert.equal(run('state.garment'),e.dataset.garment)}
  for(const e of elements.filter(e=>e.className==='swatch'))await e.emit('click');
  await field('bodyHex','aa8833','change');assert.equal(run('state.bodyColor'),'#aa8833');await field('bodyHex','bad hex','change');assert.equal(run('state.bodyColor'),'#aa8833');
  for(const e of elements.filter(e=>e.dataset.bind)){
   if(e.type==='checkbox'){e.checked=true;await e.emit('change')}
  }
  await field('fabric','Tela sintética de prueba');await field('gsm','180');await field('minutes','');
  for(const size of ['S','M','L','XL','XXL'])await field('qty-'+size,'2');assert.equal(run('total()'),10);
  await field('qty-S','-2');assert.equal(run('state.sizes.S'),0);await field('qty-S','2.9');assert.equal(run('state.sizes.S'),2);
  for(const e of elements.filter(e=>e.id?.startsWith('qc-'))){e.checked=true;await e.emit('change')}
  assert(run('state.qc.every(Boolean)'));
  for(const e of elements.filter(e=>e.dataset.tab)){await e.emit('click');assert.equal(run('currentTab'),e.dataset.tab)}
  await $('.tabs').emit('keydown',{key:'End'});assert.equal(run('currentTab'),'ficha');await $('.tabs').emit('keydown',{key:'Home'});assert.equal(run('currentTab'),'garment');
 });
 await newState();
 await test('sleeve placement stays in its zone after X/Y editing',async()=>{
  run("showSleeves('left')");await field('sleeveMethod','print','change');await click('sleeveText');await field('artText','EJEMPLO');
  await field('artX','50');await field('artY','50');assert.equal(run('selected().zone'),'leftSleeve');
  await field('artView','back','change');assert.equal(run('selected().view'),'back');assert.equal(run('selected().zone'),'leftSleeve');
  await field('artRotation','-40');await field('artScale','20');assert.equal(run('selected().rotation'),-40);
  await field('logoWidthCm','7');await field('logoStitches','12345');context.source=run('selected()');run("newSleeveArt({copy:source,side:'right',view:'front'})");
  assert.equal(run('selected().logo.widthCm'),'');assert.equal(run('selected().logo.stitches'),'');
  await click('duplicateLogo');assert.equal(run('state.artworks.length'),3);await click('removeArt');assert.equal(run('state.artworks.length'),2);
 });
 await test('PNG/JPG/SVG ingestion; light/dark cleanup, restoration and original downloads',async()=>{
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="220" height="120"><rect width="220" height="120" fill="black"/><rect x="60" y="30" width="100" height="60" fill="#cca441"/></svg>';
  context.logoFile=file(svg,'synthetic.svg','image/svg+xml');await run('uploadLogoTo(selected(),logoFile)');const source=run('selected().logo.original.data');
  await field('logoBgTone','dark','change');$('#logoRemoveBg').checked=true;await $('#logoRemoveBg').emit('change');await click('prepareLogo');
  const image=await run('getImage(selected().image)');assert.equal(image.width,100);assert.equal(image.height,60);assert.equal(run('selected().logo.original.data'),source);
  await click('downloadLogo');await click('downloadOriginal');assert.equal(context.downloads.at(-1).name,'synthetic.svg');
  await click('resetLogo');assert.equal((await run('getImage(selected().image)')).width,220);
  const c=createCanvas(140,80);c.getContext('2d').fillRect(30,20,80,40);
  for(const [ext,type]of [['png','image/png'],['jpg','image/jpeg']]){context.logoFile=file(c.toBuffer(type),'synthetic.'+ext,type);await run('uploadLogoTo(selected(),logoFile)');assert(run('selected().logo.original.data').startsWith('data:'+type))}
  context.bad=file('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>','bad.svg','image/svg+xml');await assert.rejects(()=>run('readLogoFile(bad)'));
  context.bad=file('not a PNG','bad.png','image/png');await assert.rejects(()=>run('readLogoFile(bad)'));
  context.bad={name:'large.png',size:6*1024*1024};await assert.rejects(()=>run('readLogoFile(bad)'),/5 MB/);
 });
 await test('all techniques, all six garment views, masks and export dimensions',async()=>{
  run("state.reference.composition='polyester';state.contrast={neck:false,cuff:false,hem:false};selected().logo.sublimationBase='whitePanels'");
  for(const garment of ['playera','polo','hoodie']){
   run(`state.garment='${garment}';photoBaseDefaults()`);
   for(const view of ['front','back']){const c=await run(`exportCanvas('${view}')`);assert.equal(c.width,2000);assert.equal(c.height,2300)}
  }
  for(const method of ['print','embroidery','sublimation']){await field('artMethod',method,'change');const c=await run('exportCanvas("front")');assert.equal(c.width,2000)}
  run("state.reference.composition='cotton'");await assert.rejects(()=>run('exportCanvas("front")'),/100%/);
  run("state.reference.composition='polyester';selected().logo.coverage='body'");assert(run('photoPose(selected()).forcedHeight>0'));
  run("state.garment='polo';photoBaseDefaults();state.polo.piping=true;state.polo.placket=true");
  const sig=run('visualSignature()');run("state.polo.color='#ffcc44'");assert.notEqual(run('visualSignature()'),sig);
 });
 await test('invalid JSON fields and v1–v5 migration',async()=>{
  context.raw=run('clone(state)');const originalTime=context.raw.updatedAt;
  for(const version of [1,2,3,4,5]){context.old={...context.raw,version};delete context.old.polo;const out=await run('validateOrder(old)');assert.equal(out.version,6);assert.equal(out.updatedAt,originalTime);assert.equal(out.polo.piping,false)}
  for(const [path,value]of [['id',''],['version',99],['sizes.M',-2],['sizes.M',1.5],['reference.sampleQty',1.2],['date','2026-02-30'],['polo.color','invalid'],['sleeves.left.bandWidth',500]]){
   context.bad=structuredClone(context.raw);let obj=context.bad;const keys=path.split('.');for(const key of keys.slice(0,-1))obj=obj[key];obj[keys.at(-1)]=value;await assert.rejects(()=>run('validateOrder(bad)'),undefined,path);
  }
 });
 await test('mixed storage versions merge without hiding earlier orders',async()=>{
  storage.clear();storage.set('tgm-estudio-v5.orders',JSON.stringify([{id:'new',updatedAt:'2026-09-02'}]));storage.set('tgm-estudio-v4.orders',JSON.stringify([{id:'old',updatedAt:'2026-09-01'}]));
  assert.equal(run('readLibrary().length'),2);
  storage.set('tgm-estudio-v3.orders','broken');assert.equal(run('readLibrary().length'),2);storage.clear();
 });
 await test('save failure blocks opening and preserves current order',async()=>{
  run("state=blank();state.client='UNSAVED';dirty=true");context.other=run('blank()');
  const write=context.localStorage.setItem;context.localStorage.setItem=()=>{throw Error('quota')};
  await assert.rejects(()=>run('loadOrder(other)'),/No se pudo guardar/);assert.equal(run('state.client'),'UNSAVED');assert.equal(run('loadingOrder'),false);
  context.localStorage.setItem=write;
 });
 await test('autosaved draft is archived before opening another order',async()=>{
  run("state.client='ARCHIVE ME';changed()");const id=run('state.id');await run('saveDraft()');assert.equal(run('dirty'),false);
  await run('loadOrder(other)');assert.equal(JSON.parse(storage.get('tgm-estudio-v5.orders')).find(x=>x.id===id).client,'ARCHIVE ME');
 });
 await test('concurrent edits stop an asynchronous order replacement',async()=>{
  run("state.client='KEEP EDIT';changed()");context.originalValidate=run('validateOrder');let release;
  context.delayed=new Promise(resolve=>release=resolve);run('validateOrder=async raw=>{await delayed;return originalValidate(raw)}');
  const loading=run('loadOrder(other)');run("state.client='NEWER EDIT';changed()");release();await assert.rejects(()=>loading,/cambió/);assert.equal(run('state.client'),'NEWER EDIT');run('validateOrder=originalValidate');
 });
 await test('same-millisecond edits have distinct revisions',async()=>{
  const seen=new Set();for(let i=0;i<30;i++){run('changed()');seen.add(run('state.updatedAt'))}assert.equal(seen.size,30);
 });
 await test('image cache stays bounded during repeated replacements',async()=>{
  for(let i=0;i<40;i++){const c=createCanvas(1,1);c.getContext('2d').fillStyle=`rgb(${i},0,0)`;c.getContext('2d').fillRect(0,0,1,1);context.src=c.toDataURL('image/png');await run('getImage(src)')}
  assert(run('imageCache.size<=32'));
 });
 await test('PNG, sleeve PNG, JSON, PDF, ficha, caption and print handlers',async()=>{
  await newState();run("state.client='PRIVATE';state.notes='PRIVATE NOTES';state.garment='polo';photoBaseDefaults();state.reference.composition='polyester';state.number='EJEMPLO-QA'");
  await click('addArt');await field('artText','TEST');run("state.reference.measurements.chest.M=52;state.reference.construction='PRIVATE CONSTRUCTION';");
  context.reference=file('%PDF-1.4\n%%EOF','fixture.pdf','application/pdf');context.attachment=await run("readReferenceFile(reference,'general','Synthetic header fixture')");run('state.reference.attachments.push(attachment)');
  const snapshot=run('clone(state)');context.round=snapshot;const loaded=await run('validateOrder(round)');assert.equal(loaded.reference.attachments[0].data,snapshot.reference.attachments[0].data);
  await click('exportFront');assert.equal(context.downloads.at(-1).blob.type,'image/png');await click('exportBack');await click('sleevePng');
  await click('downloadJson');const data=JSON.parse(await context.downloads.at(-1).blob.text());assert.equal(data.reference.measurements.chest.M,52);
  const lines=JSON.stringify(run('clientSpecLines()'));assert(!lines.includes('PRIVATE'));assert(!run('caption()').includes('private'));
  await click('copyCaption');assert.equal($('#captionDialog').open,true);await click('selectCaption');
  await click('exportPdf');let pdf=context.downloads.at(-1);assert.equal(pdf.blob.type,'application/pdf');assert((await pdf.blob.text()).startsWith('%PDF-1.4'));
  await click('exportFicha');pdf=context.downloads.at(-1);assert(pdf.name.includes('ficha-interna'));assert((await pdf.blob.text()).includes('/Count '));
  await click('printOrder');assert(context.printed);
 });
 await test('save-and-new waits for successful archive; failed writes leave order intact',async()=>{
  run("state.client='KEEP ON FAILURE';changed()");const write=context.localStorage.setItem;context.localStorage.setItem=()=>{throw Error('quota')};
  await click('saveAndNew');assert.equal(run('state.client'),'KEEP ON FAILURE');context.localStorage.setItem=write;
  await click('saveAndNew');assert.equal(run('state.client'),'');
 });
 console.log(`${tests.length} audit groups passed. Native Canvas2D and event handlers; not a device/browser certification.`);
})().catch(error=>{console.error(error);process.exitCode=1});
