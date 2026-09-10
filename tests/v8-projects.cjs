const {assert,context,run,$}=require('./harness.cjs');

(async()=>{
  await run('init()');
  assert.equal(run('VERSION'),8,'V8 must report VERSION=8');
  assert($('#projectButton'),'V8 must expose the project workflow button');

  // KROM compatibility: a standalone V6 pedido with no V7/V8 optional fields must still migrate.
  context.krom=run('blank()');
  context.krom.version=6;
  context.krom.client='KROM PIELES';
  context.krom.number='EJEMPLO-KROM-01';
  context.krom.garment='polo';
  context.krom.neck='polo';
  delete context.krom.pricing;
  delete context.krom.costing;
  delete context.krom.project;
  const migrated=await run('validateOrder(krom)');
  assert.equal(migrated.version,8);
  assert.equal(migrated.client,'KROM PIELES');
  assert.equal(migrated.number,'EJEMPLO-KROM-01');
  assert.equal(migrated.garment,'polo');
  assert.equal(migrated.neck,'polo');
  assert.equal(migrated.project,null);
  assert.equal(migrated.pricing.unitCents,'');
  assert.equal(migrated.costing.unitCents.fabric,'');

  // CUMBRES-RHINOS acceptance: one tgm-project can carry and switch among 12 V8 garments.
  context.base=run('blank()');
  context.rhino={schema:'tgm-project',version:1,id:'cumbres-rhinos-test',name:'CUMBRES - RHINOS',updatedAt:'2026-09-09T21:00:00.000Z',orders:[]};
  const variants=['Polo Blanco','Polo Negro','Polo Amarillo','Hoodie Blanco','Hoodie Negro','Hoodie Amarillo','Top Blanco','Top Negro','Top Amarillo','Cierre Corto Blanco','Cierre Corto Negro','Cierre Corto Amarillo'];
  for(let i=0;i<variants.length;i++){
    const order=structuredClone(context.base);
    order.id='rhino-'+i;
    order.version=8;
    order.client='CUMBRES - RHINOS';
    order.number='CR-'+String(i+1).padStart(2,'0');
    order.garment=i<3?'polo':i<6?'hoodie':'playera';
    order.neck=i<3?'polo':i<6?'hood':'round';
    order.project={id:'cumbres-rhinos-test',name:'CUMBRES - RHINOS',variant:variants[i],position:i,backNote:i>=6?'Referencia de desarrollo; confirmar patrón.':'',preview:{signature:'',front:'',back:''}};
    context.rhino.orders.push(order);
  }
  const project=await run('validateProject(rhino)');
  assert.equal(project.orders.length,12);
  assert.equal(project.orders.map(o=>o.project.variant).join('|'),variants.join('|'));
  await run('loadProject(rhino)');
  assert.equal(run('activeProject.orders.length'),12);
  await run('openProjectOrder(0)');
  assert.equal(run('state.project.id'),'cumbres-rhinos-test');
  assert.equal(run('state.project.variant'),'Polo Blanco');
  await run('openProjectOrder(6)');
  assert.equal(run('state.project.variant'),'Top Blanco');
  assert.equal(run('activeProjectIndex'),6);

  // Editing one project garment must be retained when switching to another project garment.
  run("state.pricing.unitCents=12345;state.sizes.M=10;changed()");
  await run('openProjectOrder(7)');
  assert.equal(run('activeProject.orders[6].pricing.unitCents'),12345);
  assert.equal(run('activeProject.orders[6].sizes.M'),10);

  console.log('PASS V8: KROM V6 migration and 12-garment CUMBRES-RHINOS project switching');
})().catch(error=>{console.error(error);process.exitCode=1});
