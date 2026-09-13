const {assert,context,run,set,$}=require('./harness.cjs');

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8,'Schema VERSION stays 8');
  const built=require('fs').readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
  assert.match(built,/MGM · v8\.2\./);
  assert.match(built,/function enterDespieceMode/);
  assert.match(built,/id="photoDespieceView"/);
  assert.match(built,/Despiece · detalle por parte/);
  assert.match(built,/id="despiecePartNotes"/);
  assert.match(built,/id="despiecePartPantone"/);
  assert.match(built,/data-part-notes="dobladillo"/);
  assert.match(built,/data-part-pantone="aletilla"/);
  assert.equal(run("$$('[data-photo-view]').map(b=>b.dataset.photoView).join(',')"),'front,back,both,orbit','Despiece is not a persisted photo.side');

  run("state=blank()");
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.costing.parts)')),JSON.parse(run('JSON.stringify(blankCostParts())')));
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.costing.partDetails)')),JSON.parse(run('JSON.stringify(blankPartDetails())')));
  assert.equal(run('Object.keys(state.costing.artworkCents).join(",")'),'');
  assert.equal(run('Object.keys(state.costing.artworkDetails).join(",")'),'');
  assert.equal(run("Object.values(state.costing.parts).every(v=>v==='')"),true,'No invented factory prices');
  assert.equal(run("state.photo.side"),'front');
  assert.equal(run('despiecePartVisible("aletilla")'),false,'Playera does not force aletilla');
  assert.equal(run('despiecePartVisible("mangas")'),true);
  assert.equal(run("visibleCostPartKeys().includes('aletilla')"),false);

  run("state.garment='polo';photoBaseDefaults()");
  assert.equal(run('despiecePartVisible("aletilla")'),true,'Polo shows aletilla');
  assert.equal(run('despiecePartLabel("aletilla")'),'Aletilla');
  run("state.garment='hoodie'");
  assert.equal(run('despiecePartVisible("aletilla")'),false);
  assert.equal(run('despiecePartLabel("cuello")'),'Capucha');
  run("state.garment='sleeveless'");
  assert.equal(run('despiecePartVisible("mangas")'),false,'Sleeveless hides mangas');
  assert.equal(run('despiecePartLabel("punos")'),'Sisa');
  run("state.garment='zipneck'");
  assert.equal(run('despiecePartVisible("aletilla")'),false);
  assert.equal(run('despiecePartLabel("cuello")'),'Cuello con cierre');
  run("state.garment='playera';photoBaseDefaults()");

  run("enterDespieceMode()");
  assert.equal(run('isDespieceMode()'),true);
  assert.equal(run("state.photo.side"),'front','Despiece does not persist as photo.side');
  assert.equal(run("$('#photoStage').dataset.view"),'despiece');
  assert.equal(run("$('#photoDespieceView').attrs['aria-pressed']||$('#photoDespieceView').getAttribute('aria-pressed')"),'true');
  assert.equal(run('photoCanPlaceArt()'),false,'Drag is off while despiece is open');

  run("selectDespiecePart('cuello')");
  assert.equal(run('selectedDespiecePart'),'cuello');
  assert.equal(run("$('#despiecePartName').textContent"),'Cuello');
  await set('despiecePartCost','12,50');
  assert.equal(run('state.costing.parts.cuello'),1250);
  assert.equal(run('partCostSummary().cents'),1250);
  assert.match($('#despieceTotalAmount').textContent,/12\.50/);
  assert.match($('#costPartSummaryAmount').textContent,/12\.50/);
  assert.equal($('#costPart-cuello').value,'12.50');

  run("selectDespiecePart('cuerpo')");
  await set('despiecePartCost','40');
  run("selectDespiecePart('mangas')");
  await set('costPart-mangas','8.25');
  assert.equal(run('state.costing.parts.mangas'),825);
  assert.equal(run('partCostSummary().cents'),1250+4000+825);
  assert.match($('#despieceTotalAmount').textContent,/60\.75/);

  await set('despiecePartCost','-3');
  assert.equal(run('state.costing.parts.mangas'),825,'Invalid edit keeps last valid part cost');
  assert.match($('#despiecePartError').textContent,/último costo válido/);

  run("addArt();selected().kind='text';selected().text='RHINOS';selected().view='front'");
  const artId=run('selected().id');
  run("selectDespiecePart('estampado')");
  assert.equal(run("$('#despieceArtCosts').hidden"),false);
  context.artId=artId;
  await run("ensureCostParts().artworkCents[artId]=550;syncEstampadoFromArtwork();syncDespieceFields()");
  assert.equal(run('state.costing.parts.estampado'),550);
  assert.equal(run('partCostSummary().cents'),1250+4000+825+550);

  const saved=run('clone(state)');
  context.saved=saved;
  const exported=JSON.parse(JSON.stringify(saved));
  assert.equal(exported.version,8);
  assert.equal(exported.costing.parts.cuello,1250);
  assert.equal(exported.costing.parts.aletilla,'');
  assert.equal(exported.photo.side,'front');
  const reopened=await run('validateOrder(saved)');
  assert.equal(reopened.costing.parts.cuello,1250);
  assert.equal(reopened.costing.parts.mangas,825);
  assert.equal(reopened.costing.artworkCents[artId],550);

  context.legacy=JSON.parse(JSON.stringify(saved));
  context.legacy.version=7;
  delete context.legacy.costing.parts;
  delete context.legacy.costing.artworkCents;
  const migrated=await run('validateOrder(legacy)');
  assert.equal(migrated.version,8);
  assert.deepEqual(JSON.parse(JSON.stringify(migrated.costing.parts)),JSON.parse(run('JSON.stringify(blankCostParts())')));
  assert.equal(Object.keys(migrated.costing.artworkCents).length,0);

  context.bad=JSON.parse(JSON.stringify(saved));
  context.bad.costing.parts.cuello=-1;
  await assert.rejects(()=>run('validateOrder(bad)'),/Costo por parte/);
  context.bad=JSON.parse(JSON.stringify(saved));
  context.bad.costing.parts.cuello=1.5;
  await assert.rejects(()=>run('validateOrder(bad)'),/Costo por parte/);

  run("state=blank();state.garment='polo';photoBaseDefaults();enterDespieceMode();selectDespiecePart('aletilla')");
  await set('despiecePartCost','3.00');
  assert.equal(run('state.costing.parts.aletilla'),300);
  assert.equal(run('visibleCostPartKeys().includes("aletilla")'),true);
  const poloRows=run("(()=>{const rows=[];referenceDespiece({section(){},row:(l,v)=>rows.push([l,v])});return rows})()");
  assert(poloRows.some(([label])=>label==='Aletilla'),'Internal ficha lists aletilla on polo');
  assert(poloRows.some(([label,value])=>label==='Aletilla'&&value.includes('3.00')));

  run("state.garment='playera';photoBaseDefaults();syncDespieceFields()");
  assert.equal(run('visibleCostPartKeys().includes("aletilla")'),false);
  assert.equal($('#costPart-aletilla').disabled,true);
  const playeraRows=run("(()=>{const rows=[];referenceDespiece({section(){},row:(l,v)=>rows.push([l,v])});return rows})()");
  assert(!playeraRows.some(([label])=>label==='Aletilla'),'Non-polo ficha omits aletilla');

  run("state.photo.side='orbit';despieceMode=false;syncPhotoUI()");
  assert.equal(run("$('#photoStage').dataset.view"),'orbit');
  run("enterDespieceMode()");
  assert.equal(run("state.photo.side"),'front');
  assert.equal(run('isDespieceMode()'),true);
  run("despieceMode=false;state.photo.side='front';currentTab='photo';state.photo.source='generated'");
  assert.equal(run('photoCanPlaceArt()'),true,'Leaving despiece restores Acabado drag');

  run("toggleDespieceExplode(true)");
  assert.equal(run('despieceExploded'),true);
  run("toggleDespieceExplode(false)");
  assert.equal(run('despieceExploded'),false);
  assert.equal(run("$('#despieceExplode').textContent"),'Unir');

  run("enterDespieceMode();selectDespiecePart('cuello')");
  await $('#despieceHit-cuerpo').emit('click');
  assert.equal(run('selectedDespiecePart'),'cuerpo');
  await $('#despieceHit-aletilla').emit('click');
  assert.equal(run('selectedDespiecePart'),'cuerpo','Hidden aletilla does not steal selection on playera');

  const selling=run('state.pricing.unitCents');
  await set('despiecePartCost','9');
  assert.equal(run('state.pricing.unitCents'),selling,'Part costs never write the selling price');

  run("state=blank();state.garment='playera';photoBaseDefaults();enterDespieceMode()");
  for(const key of ['dobladillo','mangas','punos','estampado']){
    assert.equal(run(`despiecePartVisible('${key}')`),true,`Playera shows ${key}`);
    assert.equal(run(`state.costing.parts.${key}`),'',`Empty ${key} price stays Por definir`);
  }
  run("selectDespiecePart('dobladillo')");
  await set('despiecePartLabel','Dobladillo inferior');
  await set('despiecePartNotes','Doble costura 2.5 cm');
  await set('despiecePartPantone','19-1664 TCX');
  await set('despiecePartHex','#b63d42','change');
  assert.equal(run('state.costing.partDetails.dobladillo.label'),'Dobladillo inferior');
  assert.equal(run('state.costing.partDetails.dobladillo.notes'),'Doble costura 2.5 cm');
  assert.equal(run('state.costing.partDetails.dobladillo.pantone'),'19-1664 TCX');
  assert.equal(run('state.costing.partDetails.dobladillo.color'),'#b63d42');
  assert.equal(run('state.costing.parts.dobladillo'),'','Detail fields do not invent a price');
  assert.equal(run("$('#despiecePartName').textContent"),'Dobladillo inferior');
  assert.equal($('#costPartNotes-dobladillo').value,'Doble costura 2.5 cm');
  assert.equal($('#costPartHex-dobladillo').value,'#B63D42');

  await set('costPartNotes-mangas','Manga raglán, costura plana');
  await set('costPartPantone-mangas','Custom navy');
  await set('costPartHex-mangas','#18283c','change');
  await set('costPartLabel-punos','Puño canalé');
  assert.equal(run('state.costing.partDetails.mangas.notes'),'Manga raglán, costura plana');
  assert.equal(run('state.costing.partDetails.mangas.pantone'),'Custom navy');
  assert.equal(run('state.costing.partDetails.mangas.color'),'#18283c');
  assert.equal(run('state.costing.partDetails.punos.label'),'Puño canalé');

  run("selectDespiecePart('estampado')");
  await set('despiecePartNotes','Plastisol pecho + espalda');
  await set('despiecePartPantone','Process Black');
  assert.equal(run('state.costing.partDetails.estampado.notes'),'Plastisol pecho + espalda');
  run("addArt();selected().kind='text';selected().text='RHINOS';selected().view='front'");
  const printId=run('selected().id');
  context.printId=printId;
  await run("ensureArtworkDetail(printId).notes='1 tinta pecho';ensureArtworkDetail(printId).pantone='186 C';ensureArtworkDetail(printId).color='#c81e3a';syncDespieceFields()");
  assert.equal(run('state.costing.artworkDetails[printId].notes'),'1 tinta pecho');
  assert.equal(run('state.costing.artworkDetails[printId].pantone'),'186 C');
  assert.equal(run('state.costing.artworkDetails[printId].color'),'#c81e3a');

  run("state.garment='hoodie';syncDespieceFields()");
  assert.equal(run('despiecePartVisible("mangas")'),true);
  assert.equal(run('despiecePartVisible("dobladillo")'),true);
  assert.equal(run('despiecePartVisible("punos")'),true);
  assert.equal(run('despiecePartVisible("estampado")'),true);
  run("state.garment='zipneck';syncDespieceFields()");
  assert.equal(run('visibleCostPartKeys().includes("mangas")'),true,'Manga larga has sleeves');
  assert.equal(run('visibleCostPartKeys().includes("aletilla")'),false);
  run("state.garment='polo';photoBaseDefaults();enterDespieceMode();selectDespiecePart('cuello')");
  await set('despiecePartNotes','Cuello tejido 1x1');
  await set('despiecePartPantone','186 C');
  await set('despiecePartHex','#b63d42','change');
  run("selectDespiecePart('aletilla')");
  await set('despiecePartLabel','Aletilla / tapeta');
  await set('despiecePartNotes','3 botones, forro contrastado');
  await set('despiecePartPantone','Custom negro');
  await set('despiecePartHex','#242529','change');
  assert.equal(run('state.costing.partDetails.cuello.notes'),'Cuello tejido 1x1');
  assert.equal(run('state.costing.partDetails.cuello.color'),'#b63d42');
  assert.equal(run('state.costing.partDetails.aletilla.label'),'Aletilla / tapeta');
  assert.equal(run('state.costing.partDetails.aletilla.notes'),'3 botones, forro contrastado');
  const poloDetailRows=run("(()=>{const rows=[];referenceDespiece({section(){},row:(l,v)=>rows.push([l,v])});return rows})()");
  assert(poloDetailRows.some(([label])=>label==='Aletilla / tapeta'),'Custom aletilla name reaches ficha');
  assert(poloDetailRows.some(([label,value])=>label.includes('detalle')&&String(value).includes('3 botones')));
  assert(poloDetailRows.some(([label,value])=>label.includes('Cuello')&&String(value).includes('186 C')));

  const detailed=run('clone(state)');
  context.detailed=detailed;
  const reopenedDetails=await run('validateOrder(detailed)');
  assert.equal(reopenedDetails.version,8);
  assert.equal(reopenedDetails.costing.partDetails.dobladillo.label,'Dobladillo inferior');
  assert.equal(reopenedDetails.costing.partDetails.dobladillo.color,'#b63d42');
  assert.equal(reopenedDetails.costing.partDetails.aletilla.pantone,'Custom negro');
  assert.equal(reopenedDetails.costing.artworkDetails[printId].notes,'1 tinta pecho');
  assert.equal(reopenedDetails.costing.parts.dobladillo,'');

  context.legacyDetails=JSON.parse(JSON.stringify(detailed));
  delete context.legacyDetails.costing.partDetails;
  delete context.legacyDetails.costing.artworkDetails;
  const migratedDetails=await run('validateOrder(legacyDetails)');
  assert.deepEqual(JSON.parse(JSON.stringify(migratedDetails.costing.partDetails)),JSON.parse(run('JSON.stringify(blankPartDetails())')));
  assert.equal(Object.keys(migratedDetails.costing.artworkDetails).length,0);

  context.badColor=JSON.parse(JSON.stringify(detailed));
  context.badColor.costing.partDetails.cuello.color='rojo';
  await assert.rejects(()=>run('validateOrder(badColor)'),/Color de parte/);

  await set('despiecePartHex','not-a-color','change');
  assert.equal(run('state.costing.partDetails.aletilla.color'),'#242529','Invalid hex keeps last valid part color');

  console.log('PASS v8.2.14 despiece / detalle por parte name notes color price');
})().catch(e=>{console.error(e);process.exitCode=1});
