/* Manually entered selling price. Integer cents avoid floating-point totals. */
const PRICE_MAX_CENTS=99999999;
const PRICE_LABELS=['Precio por prenda','Importe de prendas','Condiciones del precio'];
const COST_KEYS=['fabric','trims','sewing','decoration','packaging','other'];
function blankPricing(){return {unitCents:'',currency:'MXN',showClient:false,conditions:''}}
function blankCosting(){return {unitCents:Object.fromEntries(COST_KEYS.map(key=>[key,''])),notes:''}}
function ensurePricing(){return state.pricing??(state.pricing=blankPricing())}
function ensureCosting(){return state.costing??(state.costing=blankCosting())}
function parseGarmentPrice(value){
  const text=String(value).trim();
  if(text===''||text==='.'||text===',')return '';
  if(!/^(?:\d{1,6}(?:[.,]\d{0,2})?|[.,]\d{1,2})$/.test(text))throw Error('Usa un precio de 0 a 999999.99, hasta dos decimales y sin separadores de miles.');
  const [whole,fraction='']=text.replace(',','.').split('.');
  return Number(whole||0)*100+Number(fraction.padEnd(2,'0'));
}
function priceInputValue(cents){return cents===''?'':(cents/100).toFixed(2)}
function formatGarmentMoney(cents,currency=ensurePricing().currency){
  return (cents/100).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+currency;
}
function garmentPriceTotal(){const p=ensurePricing();return p.unitCents===''||total()===0?'':p.unitCents*total()}
function garmentPriceRows(){
  const p=ensurePricing(),amount=garmentPriceTotal();
  const rows=[['Precio por prenda',p.unitCents===''?'Por definir':formatGarmentMoney(p.unitCents)],['Importe de prendas',amount===''?(p.unitCents===''?'Precio por definir':'Cantidad por definir'):formatGarmentMoney(amount)+' · '+total().toLocaleString('es-MX')+' piezas']];
  if(p.conditions)rows.push(['Condiciones del precio',p.conditions]);
  return rows;
}
function syncPriceSummary(){
  const p=ensurePricing(),amount=garmentPriceTotal();
  $('#garmentPriceTotal').textContent=amount===''?(p.unitCents===''?'Precio por definir':'Cantidad por definir'):formatGarmentMoney(amount);
  $('#priceCalculation').textContent=p.unitCents!==''&&total()>0?total().toLocaleString('es-MX')+' piezas × '+formatGarmentMoney(p.unitCents)+' por pieza':'Captura precio y cantidades para calcular el importe.';
  syncCostSummary();
}
function costSummary(){const values=COST_KEYS.map(key=>ensureCosting().unitCents[key]).filter(value=>value!=='');return {count:values.length,cents:values.reduce((sum,value)=>sum+value,0),complete:values.length===COST_KEYS.length}}
function syncCostSummary(){
  const summary=costSummary(),p=ensurePricing();
  $('#costSummaryLabel').textContent=summary.complete?'Costo por pieza · captura completa':summary.count?'Suma capturada · '+summary.count+' de '+COST_KEYS.length+' conceptos':'Costos por capturar';
  $('#costSummaryAmount').textContent=summary.count?formatGarmentMoney(summary.cents):'Por definir';
  $('#costDifference').textContent=summary.complete&&p.unitCents!==''?'Diferencia precio − costo: '+formatGarmentMoney(p.unitCents-summary.cents)+' por pieza.':summary.count?'Completa los conceptos pendientes para comparar el costo con el precio.':'';
}
function syncPricingUI(){
  const p=ensurePricing();$('#garmentUnitPrice').value=priceInputValue(p.unitCents);$('#priceCurrency').value=p.currency;$('#priceConditions').value=p.conditions;$('#priceShowClient').checked=p.showClient;$('#priceInputError').textContent='';syncPriceSummary();
  $$('[data-cost]').forEach(input=>input.value=priceInputValue(ensureCosting().unitCents[input.dataset.cost]));$('#costNotes').value=ensureCosting().notes;$('#costInputError').textContent='';
}
function validatePricing(raw){
  if(raw===undefined)return blankPricing();
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Precio de prenda inválido.');
  if(raw.unitCents!==''&&(!Number.isSafeInteger(raw.unitCents)||raw.unitCents<0||raw.unitCents>PRICE_MAX_CENTS))throw Error('Precio de prenda inválido: revisa los centavos.');
  return {unitCents:raw.unitCents,currency:oneOf(raw.currency,['MXN','USD'],'moneda'),showClient:boolean(raw.showClient,'precio en PDF'),conditions:safeString(raw.conditions,1000,'condiciones del precio')};
}
function validateCosting(raw){
  if(raw===undefined)return blankCosting();
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!raw.unitCents||typeof raw.unitCents!=='object'||Array.isArray(raw.unitCents))throw Error('Costos internos inválidos.');
  const out=blankCosting();
  for(const key of COST_KEYS){const value=raw.unitCents[key];if(value!==''&&(!Number.isSafeInteger(value)||value<0||value>PRICE_MAX_CENTS))throw Error('Costo interno inválido: '+key);out.unitCents[key]=value}
  out.notes=safeString(raw.notes,1500,'notas de costos');return out;
}
const blankBeforePricing=blank;
blank=function(){return {...blankBeforePricing(),pricing:blankPricing(),costing:blankCosting()}};
state.pricing=blankPricing();
state.costing=blankCosting();
const validateBeforePricing=validateOrder;
validateOrder=async function(raw){const out=await validateBeforePricing(raw);out.pricing=validatePricing(raw.pricing);out.costing=validateCosting(raw.costing);return out};
const summaryBeforePricing=updateSummary;
updateSummary=function(){summaryBeforePricing();syncPriceSummary()};
const populateBeforePricing=populate;
populate=function(){populateBeforePricing();syncPricingUI()};
const clientSpecsBeforePricing=clientSpecLines;
clientSpecLines=function(){const rows=clientSpecsBeforePricing(),p=ensurePricing();if(p.showClient)rows.push(...garmentPriceRows());return rows};
function referencePricing(report){
  report.section('PRECIO DE PRENDA TERMINADA');
  for(const [label,value]of garmentPriceRows())report.row(label,value);
  report.row('Moneda',ensurePricing().currency);
  report.row('Precio en PDF cliente',ensurePricing().showClient?'Incluido por el operador':'No incluido');
  report.row('Cálculo','Precio por pieza × cantidades S–XXL. No se agregan cargos ni impuestos; revisar el alcance del precio.');
}
const initUIBeforePricing=initUI;
initUI=function(){
  initUIBeforePricing();
  $('#garmentUnitPrice').addEventListener('input',e=>{
    try{const cents=parseGarmentPrice(e.target.value);ensurePricing().unitCents=cents;$('#priceInputError').textContent='';changed()}
    catch(error){e.target.value=priceInputValue(ensurePricing().unitCents);$('#priceInputError').textContent=error.message+' Se conservó el último precio válido.'}
  });
  $('#garmentUnitPrice').addEventListener('change',()=>{$('#garmentUnitPrice').value=priceInputValue(ensurePricing().unitCents)});
  $('#priceCurrency').addEventListener('change',e=>{ensurePricing().currency=e.target.value;changed()});
  $('#priceConditions').addEventListener('input',e=>{ensurePricing().conditions=e.target.value.slice(0,1000);changed()});
  $('#priceShowClient').addEventListener('change',e=>{ensurePricing().showClient=e.target.checked;changed()});
  $$('[data-cost]').forEach(input=>{
    input.addEventListener('input',()=>{try{ensureCosting().unitCents[input.dataset.cost]=parseGarmentPrice(input.value);$('#costInputError').textContent='';changed()}catch(error){input.value=priceInputValue(ensureCosting().unitCents[input.dataset.cost]);$('#costInputError').textContent=error.message+' Se conservó el último costo válido.'}});
    input.addEventListener('change',()=>{input.value=priceInputValue(ensureCosting().unitCents[input.dataset.cost])});
  });
  $('#costNotes').addEventListener('input',e=>{ensureCosting().notes=e.target.value.slice(0,1500);changed()});
};
