const {assert,context,run,set,$,storage}=require('./harness.cjs');
(async()=>{
 await run('init()');
 assert.equal(run('state.pricing.unitCents'),'');assert.equal(run('state.pricing.showClient'),false);
 assert.equal($('#garmentPriceTotal').textContent,'Precio por definir');
 await set('garmentUnitPrice','12,34');await set('qty-M','3');
 assert.equal(run('state.pricing.unitCents'),1234);assert.equal(run('garmentPriceTotal()'),3702);assert.equal($('#garmentPriceTotal').textContent,'37.02 MXN');
 for(const bad of ['-1','12.345','1,234.56','1e3','Infinity','1000000','texto']){await set('garmentUnitPrice',bad);assert.equal(run('state.pricing.unitCents'),1234);assert.match($('#priceInputError').textContent,/último precio válido/)}
 await set('garmentUnitPrice','0');assert.equal(run('garmentPriceTotal()'),0);assert.equal($('#garmentPriceTotal').textContent,'0.00 MXN');
 await set('garmentUnitPrice','');assert.equal(run('garmentPriceTotal()'),'');
 await set('garmentUnitPrice','.05');assert.equal(run('garmentPriceTotal()'),15);
 await set('qty-M','');assert.equal($('#garmentPriceTotal').textContent,'Cantidad por definir');
 await set('garmentUnitPrice','999999.99');for(const size of ['S','M','L','XL','XXL'])await set('qty-'+size,'999999');
 assert.equal(run('garmentPriceTotal()'),499999495000005);assert(Number.isSafeInteger(run('garmentPriceTotal()')));
 console.log('PASS price entry, cents, zero/unknown, invalid values, quantity changes and maximum total');

 run("state=blank();state.number='EJEMPLO-PRECIO';populate()");
 const signature=run('visualSignature()');await set('garmentUnitPrice','125.50');await set('qty-S','2');await set('priceCurrency','USD','change');await set('priceConditions','EJEMPLO: incluye aplicaciones; impuestos por confirmar.');
 assert.equal(run('visualSignature()'),signature);assert.equal(run('state.pricing.unitCents'),12550);
 assert(!run('clientSpecLines()').some(([label])=>label==='Precio por prenda'));
 $('#priceShowClient').checked=true;await $('#priceShowClient').emit('change');
 assert.equal(run('clientSpecLines()').find(([label])=>label==='Importe de prendas')[1],'251.00 USD · 2 piezas');
 run('updateNativePrint()');assert($('#nativePrintSpecs').children.some(row=>row.children[0].textContent==='Precio por prenda'));
 const saved=run('clone(state)');await run('saveOrder(true)');context.other=run('blank()');await run('loadOrder(other)');context.saved=saved;await run('loadOrder(saved)');
 assert.equal($('#garmentUnitPrice').value,'125.50');assert.equal($('#priceCurrency').value,'USD');assert.equal($('#priceShowClient').checked,true);assert.equal(run('garmentPriceTotal()'),25100);
 context.downloads=[];run('download=(blob,name)=>downloads.push({blob,name})');await $('#downloadJson').emit('click');
 const exported=JSON.parse(await context.downloads.at(-1).blob.text());assert.deepEqual(exported.pricing,JSON.parse(JSON.stringify(saved.pricing)));
 $('#priceShowClient').checked=false;await $('#priceShowClient').emit('change');run('updateNativePrint()');
 assert(!$('#nativePrintSpecs').children.some(row=>row.children[0].textContent==='Precio por prenda'));
 const internal=[];context.report={section(){},row:(label,value)=>internal.push([label,value])};run('referencePricing(report)');assert(internal.some(([label,value])=>label==='Precio por prenda'&&value==='125.50 USD'));
 assert(!run('caption()').includes('125.50'));
 console.log('PASS save/open/JSON round-trip, currency, private/default pricing, client PDF/print opt-in and internal ficha');

 for(const version of [1,2,3,4,5,6]){context.old={...JSON.parse(JSON.stringify(saved)),version};delete context.old.pricing;const migrated=await run('validateOrder(old)');assert.equal(migrated.version,7);assert.equal(migrated.pricing.unitCents,'');assert.equal(migrated.pricing.showClient,false)}
 for(const value of [-1,1.5,100000000,null,'12550',Infinity]){context.bad=JSON.parse(JSON.stringify(saved));context.bad.pricing.unitCents=value;await assert.rejects(()=>run('validateOrder(bad)'),/Precio/)}
 for(const [key,value] of [['currency','EURO'],['showClient','yes'],['conditions','x'.repeat(1001)]]){context.bad=JSON.parse(JSON.stringify(saved));context.bad.pricing[key]=value;await assert.rejects(()=>run('validateOrder(bad)'))}
 console.log('PASS v1–v6 migration and malformed pricing imports');

 // Exercise the existing cloud serializer with an in-memory SDK; no network or customer data.
 context.cloudWrites=[];context.sdk={storage:{},ref:(_,path)=>path,uploadBytes:async(ref,blob)=>{context.cloudWrites.push({ref,blob});return {ref}},getDownloadURL:async ref=>ref};
 run('ensureFirebaseStorage=async()=>sdk');await run('uploadCurrentPedido()');
 const cloud=JSON.parse(await context.cloudWrites.at(-1).blob.text());assert.equal(cloud.pricing.unitCents,12550);assert.equal(cloud.pricing.currency,'USD');assert.equal(cloud.pricing.showClient,false);
 context.cloud=cloud;await run('loadOrder(cloud)');assert.equal(run('garmentPriceTotal()'),25100);
 console.log('PASS shared-pedido serializer and reopened cloud payload preserve price');

 await set('costFabric','21.40');await set('costSewing','18.25');await set('costNotes','COST-PRIVATE-SENTINEL');
 assert.equal(run('costSummary().cents'),3965);assert.equal(run('costSummary().complete'),false);assert(!$('#costDifference').textContent.includes('Diferencia'));
 for(const id of ['costTrims','costDecoration','costPackaging','costOther'])await set(id,'0');
 assert.equal(run('costSummary().complete'),true);assert.match($('#costDifference').textContent,/85.85 USD/);
 await set('costFabric','1000000');assert.equal(run('state.costing.unitCents.fabric'),2140);
 const before=run('visualSignature()');await set('costNotes','COST-PRIVATE-SENTINEL');assert.equal(run('visualSignature()'),before);
 assert.equal(run('state.pricing.unitCents'),12550);
 context.costSaved=run('clone(state)');await run('saveOrder(true)');await run('loadOrder(other)');await run('loadOrder(costSaved)');assert.equal($('#costFabric').value,'21.40');assert.equal($('#costNotes').value,'COST-PRIVATE-SENTINEL');
 await $('#downloadJson').emit('click');const costJson=JSON.parse(await context.downloads.at(-1).blob.text());assert.equal(costJson.costing.unitCents.sewing,1825);
 await run('uploadCurrentPedido()');const costCloud=JSON.parse(await context.cloudWrites.at(-1).blob.text());assert.equal(costCloud.costing.notes,'COST-PRIVATE-SENTINEL');
 // Collect the actual full ficha's text while it renders, to catch accidental inclusion of internal cost notes.
 const fichaText=[];context.collectFicha=(label,value)=>fichaText.push(String(label)+' '+String(value));
 run('const rowBeforeCostTest=ReferenceReport.prototype.row;ReferenceReport.prototype.row=function(label,value){collectFicha(label,value);return rowBeforeCostTest.call(this,label,value)}');
 await run('referenceCanvases()');assert(!fichaText.join('\n').includes('COST-PRIVATE-SENTINEL'));assert(!fichaText.join('\n').includes('39.65'));
 $('#priceShowClient').checked=true;await $('#priceShowClient').emit('change');
 assert(!JSON.stringify(run('clientSpecLines()')).includes('COST-PRIVATE-SENTINEL'));assert(!run('caption()').includes('COST-PRIVATE-SENTINEL'));
 context.old=JSON.parse(JSON.stringify(costJson));context.old.version=6;delete context.old.costing;delete context.old.pricing;assert.equal((await run('validateOrder(old)')).costing.unitCents.fabric,'');
 for(const value of [-1,0.5,null,'5',100000000]){context.bad=JSON.parse(JSON.stringify(costJson));context.bad.costing.unitCents.fabric=value;await assert.rejects(()=>run('validateOrder(bad)'),/Costo/)}
 console.log('PASS optional manufacturing costs, partial totals, unchanged selling price, round-trips and exclusion from ficha/client exports');
})().catch(e=>{console.error(e);process.exitCode=1});
