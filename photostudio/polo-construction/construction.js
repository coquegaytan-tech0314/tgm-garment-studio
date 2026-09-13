/* TGM / MGM polo construction standards. Optional pedido fields; schema VERSION stays 8. */
const TGM_POLO_NEGRO='#242529',TGM_POLO_BLANCO='#f4f3ef',TGM_POLO_ROJO='#b63d42';
const TGM_POLO_STANDARDS={collarWidthCm:9,collarStripeMm:4.5,collarStripeInsetMm:4.5,cuffWidthCm:2.5,cuffStripeMm:4,cuffSeamMinCm:.5,cuffSeamMaxCm:1,cuffSeamCm:.75,aletillaButtons:3};
const POLO_NUMBER_FIELDS={collarWidthCm:[4,16,false],collarStripeMm:[2,12,false],collarStripeInsetMm:[2,12,false],cuffWidthCm:[1,6,false],cuffStripeMm:[2,12,false],cuffSeamCm:[.3,2,false],aletillaButtons:[2,5,true]};
const POLO_HEX_FIELDS=['color','collarColor','collarStripeColor','cuffStripeA','cuffStripeB','cuffStripeC','aletillaOuter','aletillaInner','aletillaButtonColor'];
const POLO_PHOTO_SCALE={lengthCm:72,chestCm:52,spanV:.91};
function poloStdDefaults(){
  return {
    collarWidthCm:TGM_POLO_STANDARDS.collarWidthCm,
    collarStripeMm:TGM_POLO_STANDARDS.collarStripeMm,
    collarStripeInsetMm:TGM_POLO_STANDARDS.collarStripeInsetMm,
    collarColor:TGM_POLO_ROJO,
    collarStripeColor:TGM_POLO_BLANCO,
    cuffWidthCm:TGM_POLO_STANDARDS.cuffWidthCm,
    cuffStripeMm:TGM_POLO_STANDARDS.cuffStripeMm,
    cuffSeamCm:TGM_POLO_STANDARDS.cuffSeamCm,
    cuffStripes:true,
    cuffStripeA:TGM_POLO_NEGRO,
    cuffStripeB:TGM_POLO_BLANCO,
    cuffStripeC:TGM_POLO_ROJO,
    aletilla:true,
    aletillaOuterFollowsBody:true,
    aletillaInnerFollowsCollar:true,
    aletillaOuter:TGM_POLO_NEGRO,
    aletillaInner:TGM_POLO_ROJO,
    aletillaButtons:TGM_POLO_STANDARDS.aletillaButtons,
    aletillaButtonColor:TGM_POLO_BLANCO
  };
}
function mergePoloDefaults(raw){
  const base=typeof poloDefaults==='function'?poloDefaults():{piping:false,placket:false,color:'#b89442'};
  return {...base,...poloStdDefaults(),...(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{})};
}
function ensurePoloConstruction(p){
  const d=mergePoloDefaults();
  const out=p&&typeof p==='object'&&!Array.isArray(p)?{...d,...p}:d;
  for(const key of Object.keys(d))if(out[key]==null)out[key]=d[key];
  return out;
}
const ensurePoloBeforeStd=ensurePolo;
ensurePolo=function(){state.polo=ensurePoloConstruction(state.polo);return state.polo};
const blankBeforePoloStd=blank;
blank=function(){const out=blankBeforePoloStd();out.polo=mergePoloDefaults(out.polo);return out};
function poloOptionalHex(value,fallback,label){
  if(value==null||value==='')return fallback;
  const hex=safeString(value,7,label);
  if(!validHex(hex))throw Error('Color inválido: '+label);
  return hex;
}
function validatePoloConstruction(raw,base){
  const d=mergePoloDefaults();
  const src=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const out=ensurePoloConstruction({...d,...base});
  out.piping=boolean(base?.piping??src.piping??false,'vivo');
  out.placket=boolean(base?.placket??src.placket??false,'tapeta');
  out.color=poloOptionalHex(base?.color??src.color,d.color,'acento');
  for(const [key,[min,max,integer]] of Object.entries(POLO_NUMBER_FIELDS)){
    const value=src[key]??d[key];
    out[key]=numeric(typeof value==='number'?value:Number(value),min,max,key);
    if(integer&&!Number.isInteger(out[key]))throw Error(key+': usa un número entero.');
  }
  out.cuffStripes=boolean(src.cuffStripes??d.cuffStripes,'rayas de puño');
  out.aletilla=boolean(src.aletilla??d.aletilla,'aletilla');
  out.aletillaOuterFollowsBody=boolean(src.aletillaOuterFollowsBody??d.aletillaOuterFollowsBody,'aletilla exterior');
  out.aletillaInnerFollowsCollar=boolean(src.aletillaInnerFollowsCollar??d.aletillaInnerFollowsCollar,'aletilla interior');
  for(const key of POLO_HEX_FIELDS){
    if(key==='color')continue;
    out[key]=poloOptionalHex(src[key],d[key],key);
  }
  return out;
}
const validateOrderBeforePoloStd=validateOrder;
validateOrder=async function(raw){
  const out=await validateOrderBeforePoloStd(raw);
  out.polo=validatePoloConstruction(raw?.polo,out.polo);
  return out;
};
function poloFormatCm(n){return(Math.round(Number(n)*10)/10).toFixed(1)+' cm'}
function poloFormatMm(n){return(Math.round(Number(n)*10)/10).toFixed(1)+' mm'}
function poloFormatMmAndCm(mm){return poloFormatMm(mm)+' ('+poloFormatCm(Number(mm)/10)+')'}
function poloResolvedCollarColor(p=ensurePolo()){return validHex(p.collarColor)?p.collarColor:(state.contrast.neck?state.contrastColor:state.bodyColor)}
function poloResolvedStripeColor(p=ensurePolo()){return validHex(p.collarStripeColor)?p.collarStripeColor:TGM_POLO_BLANCO}
function poloResolvedAletillaOuter(p=ensurePolo()){return p.aletillaOuterFollowsBody?state.bodyColor:(validHex(p.aletillaOuter)?p.aletillaOuter:state.bodyColor)}
function poloResolvedAletillaInner(p=ensurePolo()){return p.aletillaInnerFollowsCollar?poloResolvedCollarColor(p):(validHex(p.aletillaInner)?p.aletillaInner:TGM_POLO_ROJO)}
function poloStripeColors(p=ensurePolo()){return[p.cuffStripeA,p.cuffStripeB,p.cuffStripeC].map(c=>validHex(c)?c:TGM_POLO_NEGRO)}
function poloVisualState(p=ensurePolo()){
  return [p.collarWidthCm,p.collarStripeMm,p.collarStripeInsetMm,poloResolvedCollarColor(p),poloResolvedStripeColor(p),p.cuffWidthCm,p.cuffStripeMm,p.cuffSeamCm,p.cuffStripes,poloStripeColors(p),p.aletilla,poloResolvedAletillaOuter(p),poloResolvedAletillaInner(p),p.aletillaButtons,p.aletillaButtonColor];
}
function poloConstructionRows(){
  if(state.garment!=='polo')return [];
  const p=ensurePolo();
  return [
    ['Cuello (TGM)',poloFormatCm(p.collarWidthCm)+' · raya de punta '+poloFormatMmAndCm(p.collarStripeMm)+' · a '+poloFormatMmAndCm(p.collarStripeInsetMm)+' del canto · '+poloResolvedCollarColor(p).toUpperCase()],
    ['Puño (después de coser)',poloFormatCm(p.cuffWidthCm)+' · rayas '+poloFormatMmAndCm(p.cuffStripeMm)+' · costura '+poloFormatCm(p.cuffSeamCm)+' (rango 0.5–1.0 cm)'],
    ['Rayas del puño',p.cuffStripes?poloStripeColors(p).map(c=>c.toUpperCase()).join(' · '):'Sin rayas de color'],
    ['Aletilla',p.aletilla?('caja en CF · exterior '+poloResolvedAletillaOuter(p).toUpperCase()+' · interior '+poloResolvedAletillaInner(p).toUpperCase()+' · '+p.aletillaButtons+' botones '+p.aletillaButtonColor.toUpperCase()+' · ojal vertical · refuerzo caja y X'):'Sin aletilla simulada']
  ];
}
function poloFichaSummary(){return poloConstructionRows().map(([label,text])=>label+': '+text).join('\n')}
function poloAssignField(key,el){
  const p=ensurePolo();
  if(el.type==='checkbox')p[key]=el.checked;
  else if(POLO_NUMBER_FIELDS[key]){
    const[min,max,integer]=POLO_NUMBER_FIELDS[key];
    let n=Number(el.value);
    if(!Number.isFinite(n))n=poloStdDefaults()[key];
    n=clamp(n,min,max);
    if(integer)n=Math.round(n);
    p[key]=n;if(String(el.value)!==String(n))el.value=n;
  }else p[key]=el.value;
}
function poloUFromCm(cm){return Number(cm)*POLO_PHOTO_SCALE.spanV/POLO_PHOTO_SCALE.lengthCm}
function poloUFromMm(mm){return poloUFromCm(Number(mm)/10)}
function poloPath(ctx,pts){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath()}
function poloFillPath(ctx,pts,color,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;poloPath(ctx,pts);ctx.fill();ctx.restore()}
function poloCollarLeaves(view){
  if(view!=='front')return[[[.352,.012],[.648,.012],[.678,.102],[.50,.148],[.322,.102]]];
  const left=[[.372,.018],[.348,.072],[.332,.128],[.356,.172],[.392,.158],[.438,.138],[.418,.072],[.402,.028]];
  return[left,poloFlipX(left)];
}
function drawPoloCollar(ctx,view,p){
  const collar=poloResolvedCollarColor(p),stripe=poloResolvedStripeColor(p);
  ctx.save();
  for(const leaf of poloCollarLeaves(view))poloFillPath(ctx,leaf,collar,.9);
  ctx.restore();
  if(view!=='front'){
    ctx.save();ctx.strokeStyle=shade(stripe,0,.7);ctx.lineWidth=poloUFromMm(p.collarStripeMm);ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(.40,.02);ctx.bezierCurveTo(.47,.008,.53,.008,.60,.02);ctx.stroke();ctx.restore();
    return;
  }
  const inset=poloUFromMm(p.collarStripeInsetMm),width=poloUFromMm(p.collarStripeMm);
  const tips=[{at:[.356,.170],out:[-.42,.90]},{at:[.644,.170],out:[.42,.90]}];
  ctx.save();
  for(const tip of tips){
    const[ox,oy]=tip.out,len=Math.hypot(ox,oy)||1,dx=ox/len,dy=oy/len,ax=-dy,ay=dx,half=.016+poloUFromCm(Math.min(p.collarWidthCm,12))*.0008;
    const d0=inset,d1=inset+width;
    const c0=[tip.at[0]-dx*d0,tip.at[1]-dy*d0],c1=[tip.at[0]-dx*d1,tip.at[1]-dy*d1];
    poloFillPath(ctx,[[c0[0]+ax*half,c0[1]+ay*half],[c0[0]-ax*half,c0[1]-ay*half],[c1[0]-ax*half,c1[1]-ay*half],[c1[0]+ax*half,c1[1]+ay*half]],stripe,.98);
  }
  ctx.restore();
}
function drawStripedBand(ctx,openingA,openingB,seamA,seamB,stripeU,colors){
  const pts=[openingA,openingB,seamB,seamA];
  ctx.save();poloPath(ctx,pts);ctx.clip();
  const dx=openingB[0]-openingA[0],dy=openingB[1]-openingA[1],len=Math.hypot(dx,dy)||1;
  let nx=-(seamA[1]-openingA[1]),ny=seamA[0]-openingA[0];
  const inward=[(seamA[0]+seamB[0])/2-(openingA[0]+openingB[0])/2,(seamA[1]+seamB[1])/2-(openingA[1]+openingB[1])/2];
  if(nx*inward[0]+ny*inward[1]<0){nx=-nx;ny=-ny}
  const nlen=Math.hypot(nx,ny)||1;nx/=nlen;ny/=nlen;
  const depth=Math.hypot(seamA[0]-openingA[0],seamA[1]-openingA[1])+Math.hypot(seamB[0]-openingB[0],seamB[1]-openingB[1]);
  let u=-stripeU,i=0;
  ctx.globalAlpha=.86;
  while(u<len+stripeU){
    ctx.fillStyle=colors[i%colors.length];
    const x0=openingA[0]+dx/len*u,y0=openingA[1]+dy/len*u;
    const x1=openingA[0]+dx/len*(u+stripeU),y1=openingA[1]+dy/len*(u+stripeU);
    ctx.beginPath();
    ctx.moveTo(x0-nx*.02,y0-ny*.02);ctx.lineTo(x1-nx*.02,y1-ny*.02);
    ctx.lineTo(x1+nx*depth,y1+ny*depth);ctx.lineTo(x0+nx*depth,y0+ny*depth);
    ctx.fill();
    u+=stripeU;i++;
  }
  ctx.restore();
}
function poloFlipX(pts){return pts.map(([x,y])=>[1-x,y])}
function poloCuffQuads(view){
  const depth=poloUFromCm(ensurePolo().cuffWidthCm);
  const leftOpen=[[.020,.358],[.012,.378],[.006,.400],[.018,.422],[.055,.440],[.108,.454]];
  const leftIn=[.82,-.08];
  const ln=Math.hypot(leftIn[0],leftIn[1]);
  const leftSeam=leftOpen.map(([x,y])=>[x+leftIn[0]/ln*depth,y+leftIn[1]/ln*depth]);
  const left={open:leftOpen,seam:leftSeam,clip:[[.018,.350],[.012,.376],[.008,.398],[.026,.420],[.068,.438],[.116,.450],[.148,.438],[.140,.358],[.078,.346]]};
  const right={open:poloFlipX(leftOpen),seam:poloFlipX(leftSeam),clip:poloFlipX(left.clip)};
  return view==='back'?{l:right,r:left}:{l:left,r:right};
}
function drawPoloCuffs(ctx,view,p){
  if(!p.cuffStripes)return;
  const colors=poloStripeColors(p),stripeU=Math.max(.0032,poloUFromMm(p.cuffStripeMm));
  const quads=poloCuffQuads(view);
  for(const side of ['l','r']){
    const q=quads[side];
    ctx.save();poloPath(ctx,q.clip);ctx.clip();
    for(let i=0;i<q.open.length-1;i++)drawStripedBand(ctx,q.open[i],q.open[i+1],q.seam[i],q.seam[i+1],stripeU,colors);
    ctx.strokeStyle=shade('#1a1a1a',0,.28);ctx.lineWidth=.0018;
    ctx.beginPath();ctx.moveTo(q.seam[0][0],q.seam[0][1]);ctx.lineTo(q.seam.at(-1)[0],q.seam.at(-1)[1]);ctx.stroke();
    ctx.restore();
  }
}
function drawPoloAletilla(ctx,view,p){
  if(!p.aletilla||view!=='front')return;
  const outer=poloResolvedAletillaOuter(p),inner=poloResolvedAletillaInner(p),buttons=p.aletillaButtons;
  const top=.146,bot=.292,innerLeft=.468,outerRight=.532,split=.498;
  poloFillPath(ctx,[[innerLeft,top],[split+.006,top],[split+.006,bot],[innerLeft,bot]],inner,1);
  poloFillPath(ctx,[[split-.004,top],[outerRight,top],[outerRight,bot],[split-.004,bot]],outer,1);
  ctx.save();ctx.strokeStyle=shade('#111111',0,.45);ctx.lineWidth=.0015;
  poloPath(ctx,[[innerLeft,top],[outerRight,top],[outerRight,bot],[innerLeft,bot]]);ctx.stroke();
  ctx.beginPath();ctx.moveTo(split,top);ctx.lineTo(split,bot);ctx.stroke();
  ctx.restore();
  const holeX=split+.014,btnX=innerLeft+.014;
  for(let i=0;i<buttons;i++){
    const y=top+.032+i*((bot-top-.07)/Math.max(1,buttons-1));
    ctx.save();
    ctx.fillStyle=shade(outer,-50);ctx.fillRect(holeX-.0036,y-.012,.0072,.024);
    ctx.fillStyle='#f3efe4';ctx.fillRect(holeX-.002,y-.01,.004,.02);
    ctx.restore();
    ctx.save();
    ctx.fillStyle=p.aletillaButtonColor;ctx.beginPath();ctx.arc(btnX,y,.0076,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#6b6d72';ctx.lineWidth=.0012;ctx.stroke();
    ctx.fillStyle='#6b6d72';ctx.fillRect(btnX-.0017,y-.0012,.0034,.0024);
    ctx.restore();
  }
  const boxTop=bot-.022,boxLeft=innerLeft+.001,boxRight=outerRight-.001,boxBot=bot-.002;
  ctx.save();ctx.strokeStyle='#1a1a1a';ctx.lineWidth=.0022;
  ctx.strokeRect(boxLeft,boxTop,boxRight-boxLeft,boxBot-boxTop);
  ctx.beginPath();ctx.moveTo(boxLeft,boxTop);ctx.lineTo(boxRight,boxBot);ctx.moveTo(boxRight,boxTop);ctx.lineTo(boxLeft,boxBot);ctx.stroke();
  ctx.restore();
}
const drawPoloAccentsBeforeStd=drawPoloAccents;
drawPoloAccents=function(ctx,r,view){
  if(state.garment!=='polo')return;
  const p=ensurePolo();
  drawPoloAccentsBeforeStd(ctx,r,view);
  ctx.save();ctx.translate(r.x,r.y);ctx.scale(r.w,r.h);
  drawPoloCollar(ctx,view,p);
  drawPoloCuffs(ctx,view,p);
  drawPoloAletilla(ctx,view,p);
  ctx.restore();
};
const visualSignatureBeforePoloStd=visualSignature;
visualSignature=function(){
  const base=visualSignatureBeforePoloStd();
  if(state.garment!=='polo')return base;
  const value=base+'polo-std'+JSON.stringify(poloVisualState());
  let a=2166136261,b=5381;
  for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b,33)^value.charCodeAt(i)}
  return(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
};
const specsBeforePoloStd=clientSpecLines;
clientSpecLines=function(){
  const rows=specsBeforePoloStd();
  if(state.garment!=='polo')return rows;
  const conf=rows.findIndex(row=>row[0]==='Confección');
  rows.splice(conf<0?rows.length:conf+1,0,...poloConstructionRows());
  return rows;
};
const syncPoloBeforeStd=syncPolo;
syncPolo=function(){
  const p=ensurePolo();
  syncPoloBeforeStd();
  const extras=$('#poloExtras');
  if(extras)extras.hidden=state.garment!=='polo';
  const ficha=$('#poloFichaSpecs'),text=$('#poloFichaText');
  if(ficha){ficha.hidden=state.garment!=='polo';if(text&&state.garment==='polo')text.textContent=poloFichaSummary()}
  const outer=$('#poloAletillaOuter'),inner=$('#poloAletillaInner');
  if(outer)outer.disabled=!!p.aletillaOuterFollowsBody;
  if(inner)inner.disabled=!!p.aletillaInnerFollowsCollar;
  for(const el of $$('[data-polo]')){
    if(document.activeElement===el)continue;
    const key=el.dataset.polo,value=p[key];
    if(el.type==='checkbox')el.checked=!!value;
    else if(value!=null)el.value=value;
  }
};
const uiBeforePoloStd=initUI;
initUI=function(){
  uiBeforePoloStd();
  for(const el of $$('[data-polo]')){
    if(el.dataset.poloStdBound)continue;
    el.dataset.poloStdBound='1';
    el.addEventListener(el.type==='checkbox'?'change':'input',()=>{poloAssignField(el.dataset.polo,el);changed()});
  }
};
