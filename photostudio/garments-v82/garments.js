/* v8.2 sleeveless + zipneck silhouettes. Extends GARMENTS and the existing 2D/3D/photo pipelines. */
Object.assign(GARMENTS,{
  sleeveless:{label:'Top sin mangas',plural:'tops sin mangas',necks:[['round','Redondo'],['v','En V']]},
  zipneck:{label:'Manga larga con cierre',plural:'mangas largas con cierre',necks:[['zip','Cuello con cierre']]}
});
Object.assign(ZONES,{
  leftCostado:{label:'Costado izq. (al vestir)',x:630,y:430,width:58},
  rightCostado:{label:'Costado der. (al vestir)',x:170,y:430,width:58}
});
if(typeof PHOTO_BASES==='object')Object.assign(PHOTO_BASES,{
  sleeveless:{label:'Top sin mangas · Chifón',neck:'round',cuff:'simple',hem:'double',texture:'jersey',crop:{front:[250,110,424,789],back:[863,110,413,789]}},
  sleevelessMujer:{label:'Top sin mangas mujer · Chifón',neck:'round',cuff:'simple',hem:'double',texture:'jersey',crop:{front:[172,147,529,710],back:[847,147,521,711]}},
  zipneck:{label:'Manga larga con cierre · Chifón',neck:'zip',cuff:'rib',hem:'double',texture:'jersey',crop:{front:[142,132,576,716],back:[819,132,572,717]}}
});
const CHIFON_FABRIC='Chifón Estrella';
function photoAssetKey(garment=state.garment){return garment==='sleeveless'&&(state.photoCut||'hombre')==='mujer'?'sleevelessMujer':garment}
function photoBaseInfo(garment=state.garment){return PHOTO_BASES[photoAssetKey(garment)]||PHOTO_BASES[garment]}
const blankBeforeChifon=blank;
blank=function(){return {...blankBeforeChifon(),photoCut:'hombre'}};
const validateOrderBeforeChifon=validateOrder;
validateOrder=async function(raw){
  const out=await validateOrderBeforeChifon(raw);
  out.photoCut=oneOf(raw.photoCut??'hombre',['hombre','mujer'],'corte de sisada');
  return out;
};
const visualSignatureBeforeChifon=visualSignature;
visualSignature=function(){
  if(state.garment!=='sleeveless')return visualSignatureBeforeChifon();
  const prev=state.garment;
  state.garment=prev+'/'+(state.photoCut||'hombre');
  try{return visualSignatureBeforeChifon()}finally{state.garment=prev}
};
const photoRectBeforeChifon=photoRect;
photoRect=function(garment=state.garment,view='front'){
  if(garment!=='sleeveless'&&garment!=='zipneck')return photoRectBeforeChifon(garment,view);
  const[,,w,h]=photoBaseInfo(garment).crop[view],scale=Math.min(674/w,768/h);
  return {x:(W-w*scale)/2,y:(H-h*scale)/2-8,w:w*scale,h:h*scale};
};
function hasLongSleeves(g=state.garment){return g==='hoodie'||g==='zipneck'}
function hasSetInSleeves(g=state.garment){return g!=='sleeveless'}
const GARMENT_PATHS={
  playera:'M297 155 Q261 161 231 173 L92 250 Q97 295 142 351 L226 310 L232 754 Q401 778 570 754 L576 310 L658 351 Q702 295 708 250 L569 173 Q536 161 503 155 Q400 184 297 155 Z',
  hoodie:'M299 155 Q262 168 239 186 L157 246 Q140 264 131 312 L62 728 Q73 749 129 760 L170 608 L206 414 L218 775 Q402 798 582 775 L593 414 L633 608 L674 760 Q728 749 739 728 L670 312 Q659 265 643 246 L561 186 Q538 168 502 155 Z',
  polo:'M297 155 Q261 161 231 173 L92 250 Q97 295 142 351 L226 310 L232 754 Q401 778 570 754 L576 310 L658 351 Q702 295 708 250 L569 173 Q536 161 503 155 Q400 184 297 155 Z',
  sleeveless:'M304 160 Q268 166 236 184 L214 214 Q162 292 198 392 L214 618 Q400 644 586 618 L602 392 Q638 292 586 214 L564 184 Q532 166 496 160 Q400 190 304 160 Z',
  zipneck:'M298 154 Q260 161 228 176 L152 250 Q132 270 120 322 L50 688 Q62 714 122 726 L166 572 L202 398 L220 750 Q400 774 580 750 L598 398 L634 572 L678 726 Q738 714 750 688 L680 322 Q668 270 648 250 L572 176 Q540 161 502 154 Q400 184 298 154 Z'
};
const garmentPathBeforeV82=garmentPath;
garmentPath=function(){return GARMENT_PATHS[state.garment]||garmentPathBeforeV82()};

const fillBaseBeforeV82=fillBase;
fillBase=function(ctx){
  if(state.garment!=='sleeveless'&&state.garment!=='zipneck')return fillBaseBeforeV82(ctx);
  const shape=new Path2D(garmentPath()),realistic=state.renderMode==='realistic',crop=state.garment==='sleeveless';
  ctx.save();ctx.shadowColor='#1b28483b';ctx.shadowBlur=realistic?25:12;ctx.shadowOffsetY=realistic?17:7;ctx.fillStyle=state.bodyColor;ctx.fill(shape);ctx.restore();
  ctx.save();ctx.clip(shape);ctx.fillStyle=gradient(ctx,180,0,627,0,[[0,shade(state.bodyColor,-33)],[.12,shade(state.bodyColor,-7)],[.36,shade(state.bodyColor,realistic?19:5)],[.65,shade(state.bodyColor,2)],[.86,shade(state.bodyColor,-15)],[1,shade(state.bodyColor,-40)]]);ctx.fillRect(0,70,W,750);
  if(realistic){const light=ctx.createRadialGradient(351,293,30,362,416,420);light.addColorStop(0,'#ffffff19');light.addColorStop(.6,'#ffffff00');light.addColorStop(1,'#08112416');ctx.fillStyle=light;ctx.fillRect(0,0,W,H);
    const folds=crop
      ?[['M250 250 Q292 330 268 470',16,11],['M550 248 Q508 340 532 478',-28,16],['M268 430 Q286 520 272 590',-18,10],['M532 440 Q548 540 528 600',22,10],['M300 600 Q400 574 500 600',-16,8],['M360 214 Q400 236 440 214',-12,7]]
      :[['M244 240 Q291 313 260 494',16,12],['M557 241 Q508 346 539 514',-30,19],['M263 358 Q294 443 263 586',-23,11],['M277 493 Q261 610 266 732',18,11],['M550 514 Q574 656 541 744',-31,14],['M292 732 Q337 698 423 727',-19,8],['M322 751 Q402 710 529 742',16,8],['M160 360 Q204 450 148 600',18,12],['M640 358 Q596 452 652 598',-22,13],['M246 184 Q192 226 181 292',20,10],['M544 187 Q606 222 620 303',-20,13]];
    ctx.filter='blur(7px)';for(const [p,d,w]of folds)line(ctx,p,shade(state.bodyColor,d,.5),w);ctx.filter='none'}
  drawTexture(ctx,shape);ctx.restore();
  line(ctx,garmentPath(),shade(state.bodyColor,-36,.34),1.8);
  if(crop){line(ctx,'M236 186 Q188 286 210 392 M564 186 Q612 286 590 392',shade(state.bodyColor,-32,.36),2);line(ctx,'M240 188 Q194 288 214 390 M560 188 Q606 288 586 390',shade(state.bodyColor,48,.32),1.2,[2,3])}
  else{line(ctx,'M236 188 Q186 270 202 398 M564 188 Q614 270 598 398',shade(state.bodyColor,-32,.36),2);line(ctx,'M240 190 Q192 274 206 398 M560 190 Q608 274 594 398',shade(state.bodyColor,48,.32),1.2,[2,3])}
};

function drawRoundOrVNeck(ctx,view,n){
  if(view==='front'&&state.neck==='v'){pathFill(ctx,'M299 156 Q400 175 501 156 L400 281 Z',shade(n,-40));rib(ctx,'M297 152 L400 265 L503 152 L513 159 L400 286 L287 159 Z',n);line(ctx,'M302 163 L400 272 L499 163',shade(n,60,.35),1,[2,2]);return}
  pathFill(ctx,view==='front'?'M297 154 Q400 115 503 154 Q494 238 400 241 Q306 238 297 154 Z':'M297 154 Q400 135 503 154 Q493 196 400 199 Q307 196 297 154 Z',shade(n,-49));
  const ring=view==='front'?'M291 154 Q299 245 400 248 Q501 245 509 154 L489 150 Q486 224 400 226 Q314 224 311 150 Z':'M292 153 Q307 202 400 205 Q493 202 508 153 L490 150 Q478 182 400 185 Q322 182 310 150 Z';
  rib(ctx,ring,n);line(ctx,view==='front'?'M304 164 Q319 236 400 237 Q481 236 496 164':'M305 161 Q327 195 400 195 Q473 195 496 161',shade(n,60,.34),1.2,[2,2]);
  if(view==='front'){pathFill(ctx,'M374 158 Q400 161 426 158 L426 181 L374 181 Z','#cbd0cc');ctx.fillStyle='#7c8282';ctx.fillRect(385,167,30,2);ctx.fillRect(390,172,20,1)}
}
function drawZipCollar(ctx,view,n,b){
  pathFill(ctx,view==='front'?'M300 150 Q400 118 500 150 L486 214 Q400 236 314 214 Z':'M300 150 Q400 136 500 150 L488 196 Q400 214 312 196 Z',shade(n,-42));
  rib(ctx,view==='front'?'M296 150 Q400 122 504 150 L494 200 Q400 222 306 200 Z':'M296 150 Q400 140 504 150 L492 188 Q400 206 308 188 Z',n);
  if(view!=='front'){line(ctx,'M248 210 Q400 232 552 210',shade(b,-29,.3),1.6);return}
  pathFill(ctx,'M388 176 L412 176 L414 338 L386 338 Z',gradient(ctx,386,0,414,0,[[0,shade(n,-30)],[.2,n],[1,shade(n,8)]]));
  line(ctx,'M400 178 L400 336',shade('#6d7278',-10,.9),2.2);
  line(ctx,'M396 178 L396 336 M404 178 L404 336',shade(n,50,.35),1,[1.5,2]);
  for(let y=196;y<330;y+=11){ctx.fillStyle=shade('#c5c8cc',8);ctx.fillRect(397,y,6,5);ctx.fillStyle='#7a8086';ctx.fillRect(399,y+1,2,3)}
  ctx.save();ctx.shadowColor='#0005';ctx.shadowBlur=4;ctx.shadowOffsetY=2;pathFill(ctx,'M392 328 L408 328 L412 352 L388 352 Z',shade('#8d939a',6));ctx.restore();
  line(ctx,'M388 176 L386 338 M412 176 L414 338',shade(n,-40,.4),1.2);
}
function drawSleevelessDetails(ctx,view){
  const b=state.bodyColor,n=state.contrast.neck?state.contrastColor:b,c=state.contrast.cuff?state.contrastColor:b,h=state.contrast.hem?state.contrastColor:b;
  const left='M214 214 Q162 292 198 392 L226 388 Q196 300 236 186 Z',right='M586 214 Q638 292 602 392 L574 388 Q604 300 564 186 Z';
  if(state.cuff==='rib'||state.contrast.cuff){rib(ctx,left,c,state.cuff==='rib');rib(ctx,right,c,state.cuff==='rib')}
  else{line(ctx,'M220 210 Q174 290 206 388 M580 210 Q626 290 594 388',shade(b,-38,.4),1.6);line(ctx,'M226 208 Q180 288 210 384 M574 208 Q620 288 590 384',shade(b,40,.3),1.2,[2,2])}
  if(state.hem==='rib')rib(ctx,'M216 600 Q400 628 584 600 L584 636 Q400 662 216 636 Z',h);
  else if(state.contrast.hem)rib(ctx,'M216 610 Q400 636 584 610 L584 636 Q400 662 216 636 Z',h,false);
  else{line(ctx,'M222 622 Q400 646 578 622',shade(b,-40,.4),1.2);line(ctx,'M222 628 Q400 652 578 628',shade(b,48,.3),1.2,[3,2])}
  drawRoundOrVNeck(ctx,view,n);
}
function drawZipneckDetails(ctx,view){
  const b=state.bodyColor,n=state.contrast.neck?state.contrastColor:b,c=state.contrast.cuff?state.contrastColor:b,h=state.contrast.hem?state.contrastColor:b;
  if(state.cuff==='rib'||state.contrast.cuff){rib(ctx,'M52 678 Q84 710 130 716 L122 748 Q82 746 48 712 Z',c,state.cuff==='rib');rib(ctx,'M670 716 Q716 710 748 678 L752 712 Q718 746 678 748 Z',c,state.cuff==='rib')}
  else{line(ctx,'M54 686 Q86 716 128 722 M672 722 Q714 716 746 686',shade(b,-38,.4),1.6);line(ctx,'M58 678 Q90 708 130 714 M670 714 Q710 708 742 678',shade(b,40,.3),1.2,[2,2])}
  if(state.hem==='rib')rib(ctx,'M220 726 Q400 750 580 726 L580 764 Q400 788 220 764 Z',h);
  else if(state.contrast.hem)rib(ctx,'M220 736 Q400 760 580 736 L580 764 Q400 788 220 764 Z',h,false);
  else{line(ctx,'M226 744 Q400 768 574 744',shade(b,-40,.4),1.2);line(ctx,'M226 751 Q400 775 574 751',shade(b,48,.3),1.2,[3,2])}
  drawZipCollar(ctx,view,n,b);
}
const drawDetailsBeforeV82=drawDetails;
drawDetails=function(ctx,view){
  if(state.garment==='sleeveless')return drawSleevelessDetails(ctx,view);
  if(state.garment==='zipneck')return drawZipneckDetails(ctx,view);
  return drawDetailsBeforeV82(ctx,view);
};

const zonePositionBeforeV82=zonePosition;
zonePosition=function(zone,view){
  const p=zonePositionBeforeV82(zone,view);
  if(state.garment==='zipneck'&&(zone==='leftSleeve'||zone==='rightSleeve')){p.x=p.x<400?148:652;p.y=400;p.width=62}
  if((zone==='leftCostado'||zone==='rightCostado')){
    const left=zone==='rightCostado';
    p.x=view==='back'?(left?630:170):(left?170:630);
    p.y=hasLongSleeves()?455:360;p.width=58;
  }
  if(state.garment==='sleeveless'&&(zone==='leftSleeve'||zone==='rightSleeve')){p.x=p.x<400?208:592;p.y=300;p.width=48}
  return p;
};
const inferZoneBeforeV82=inferZone;
inferZone=function(a){
  if(hasLongSleeves()&&(a.x<230||a.x>570)&&a.y>360&&a.y<560)return a.x<400?(a.view==='front'?'rightCostado':'leftCostado'):(a.view==='front'?'leftCostado':'rightCostado');
  return inferZoneBeforeV82(a);
};
const syncArtBeforeV82=syncArt;
syncArt=function(){
  syncArtBeforeV82();
  const a=selected(),grid=$('#zoneGrid');
  if(!a||!grid)return;
  const side=hasSetInSleeves()?(hasLongSleeves()?['leftSleeve','rightSleeve','leftCostado','rightCostado']:['leftSleeve','rightSleeve']):[];
  const zones=a.view==='front'?['chest',...side,'hem']:['back',...side,'hem'];
  if(grid.children.length===zones.length&&zones.every((zone,i)=>grid.children[i]?.textContent===ZONES[zone].label))return;
  grid.replaceChildren();
  zones.forEach(zone=>{const b=document.createElement('button');b.textContent=ZONES[zone].label;b.setAttribute('aria-pressed',a.zone===zone);b.addEventListener('click',()=>{a.zone=zone;Object.assign(a,zonePosition(zone,a.view));syncArt();changed()});grid.append(b)});
};

const configureNeckBeforeV82=configureNeck;
configureNeck=function(){
  configureNeckBeforeV82();
  const cuffField=$('#cuffField'),cuffLabel=cuffField&&cuffField.querySelector('label');
  if(cuffLabel)cuffLabel.textContent=state.garment==='sleeveless'?'Sisa':'Puño';
  if(cuffField)cuffField.dataset.sleeveless=state.garment==='sleeveless';
  const cuffContrast=[...$$('.checkline')].find(el=>/^(Puño|Sisa)$/.test((el.textContent||'').trim()));
  if(cuffContrast){const input=cuffContrast.querySelector('input');if(input){cuffContrast.replaceChildren();cuffContrast.append(input,document.createTextNode(state.garment==='sleeveless'?'Sisa':'Puño'))}}
  const cutField=$('#photoCutField');
  if(cutField){
    cutField.hidden=state.garment!=='sleeveless';
    $$('[data-photo-cut]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.photoCut===(state.photoCut||'hombre')));
  }
  const fabric=$('#fabric');
  if(fabric)fabric.placeholder=state.garment==='sleeveless'||state.garment==='zipneck'?'Chifón / Chifón Estrella':'Ej. jersey de algodón';
};

const clientSpecLinesBeforeV82=clientSpecLines;
clientSpecLines=function(){
  const lines=clientSpecLinesBeforeV82();
  const conf=lines.find(row=>row[0]==='Confección');
  if(conf&&state.garment==='sleeveless')conf[1]=conf[1].replace('puño ','sisa ');
  if(conf&&state.garment==='zipneck'&&!conf[1].includes('cierre'))conf[1]+=' · cierre corto al frente';
  return lines;
};

const photoBaseDefaultsBeforeV82=typeof photoBaseDefaults==='function'?photoBaseDefaults:null;
if(photoBaseDefaultsBeforeV82)photoBaseDefaults=function(){
  const b=PHOTO_BASES[state.garment];if(!b)return;
  photoBaseDefaultsBeforeV82();
  if(state.garment==='sleeveless'||state.garment==='zipneck'){
    state.fabric=CHIFON_FABRIC;
    state.texture=photoBaseInfo().texture||'jersey';
    if(state.garment==='sleeveless'){state.pro.sleeve=80;state.hood.drawstring=false;state.hood.pocket=false}
    if(state.garment==='zipneck'){state.pro.sleeve=110;state.hood.drawstring=false;state.hood.pocket=false;state.photoCut='hombre'}
  }else if(state.fabric===CHIFON_FABRIC)state.fabric='';
};

function generateDrawnPhotoBase(garment,view){
  const crop=PHOTO_BASES[garment].crop[view],c=document.createElement('canvas');
  c.width=crop[2];c.height=crop[3];
  const ctx=c.getContext('2d',{willReadFrequently:true});
  const snap={garment:state.garment,bodyColor:state.bodyColor,contrastColor:state.contrastColor,contrast:{...state.contrast},neck:state.neck,cuff:state.cuff,hem:state.hem,renderMode:state.renderMode,hood:{...state.hood}};
  try{
    state.garment=garment;state.bodyColor='#b4b8bf';state.contrastColor='#8a9098';state.contrast={neck:false,cuff:false,hem:false};state.renderMode='realistic';
    state.neck=PHOTO_BASES[garment].neck;state.cuff=PHOTO_BASES[garment].cuff;state.hem=PHOTO_BASES[garment].hem;
    ctx.setTransform(c.width/W,0,0,c.height/H,0,0);fillBase(ctx);drawDetails(ctx,view);
  }finally{
    state.garment=snap.garment;state.bodyColor=snap.bodyColor;state.contrastColor=snap.contrastColor;state.contrast=snap.contrast;state.neck=snap.neck;state.cuff=snap.cuff;state.hem=snap.hem;state.renderMode=snap.renderMode;state.hood=snap.hood;
  }
  return c;
}
const photoTrimMaskBeforeV82=typeof photoTrimMask==='function'?photoTrimMask:null;
if(photoTrimMaskBeforeV82)photoTrimMask=function(garment,view,width,height,part){
  if(garment!=='sleeveless'&&garment!=='zipneck')return photoTrimMaskBeforeV82(garment,view,width,height,part);
  const c=document.createElement('canvas');c.width=width;c.height=height;const t=c.getContext('2d');t.scale(width,height);t.fillStyle='white';const front=view==='front';
  if(garment==='sleeveless'){
    if(part==='neck'){t.beginPath();if(front){t.moveTo(.34,.02);t.bezierCurveTo(.39,.07,.61,.07,.66,.02);t.lineTo(.68,.06);t.bezierCurveTo(.69,.18,.31,.18,.32,.06)}else{t.moveTo(.34,0);t.quadraticCurveTo(.5,.05,.66,0);t.lineTo(.68,.04);t.quadraticCurveTo(.5,.09,.32,.04)}t.closePath();t.fill()}
    if(part==='cuff'){polygon(t,[[.12,.18],[.28,.16],[.26,.46],[.16,.46]]);polygon(t,[[.88,.18],[.72,.16],[.74,.46],[.84,.46]])}
    if(part==='hem'){t.beginPath();t.moveTo(.22,.82);t.quadraticCurveTo(.5,.86,.78,.82);t.lineTo(.78,.9);t.lineTo(.22,.9);t.closePath();t.fill()}
  }else{
    if(part==='neck'){if(front){polygon(t,[[.36,-.02],[.64,-.02],[.66,.08],[.63,.24],[.54,.27],[.52,.4],[.48,.4],[.46,.27],[.37,.24],[.34,.08]])}else{t.beginPath();t.moveTo(.36,0);t.lineTo(.64,0);t.lineTo(.67,.12);t.quadraticCurveTo(.5,.18,.33,.12);t.closePath();t.fill()}}
    if(part==='cuff'){polygon(t,[[.01,.86],[.16,.87],[.15,.98],[.03,1]]);polygon(t,[[.84,.87],[.99,.86],[.97,1],[.85,.98]])}
    if(part==='hem'){t.beginPath();t.moveTo(.2,.93);t.quadraticCurveTo(.5,.97,.8,.93);t.lineTo(.8,1);t.lineTo(.2,1);t.closePath();t.fill()}
  }
  return c;
};
const PHOTO_TINT_REF=.66;
function hardenZipneckPhoto(pixels,lum,w,h){
  const d=pixels.data,r=2,garment=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++)garment[i]=d[i*4+3]>10?1:0;
  for(let y=r;y<h-r;y++)for(let x=r;x<w-r;x++){
    let ok=1;
    for(let dy=-r;dy<=r&&ok;dy++)for(let dx=-r;dx<=r;dx++)if(!garment[(y+dy)*w+x+dx])ok=0;
    if(ok)d[(y*w+x)*4+3]=255;
  }
  const samples=[];
  for(let i=0;i<w*h;i++){
    const n=i*4;
    lum[i]=(d[n]*.2126+d[n+1]*.7152+d[n+2]*.0722)/255;
    if(d[n+3]>20)samples.push(lum[i]);
  }
  if(samples.length<100)return;
  samples.sort((a,b)=>a-b);
  const med=samples[samples.length>>1],scale=PHOTO_TINT_REF/Math.max(med,1e-4);
  const needsScale=med<0.58||med>0.70;
  for(let i=0;i<w*h;i++){
    const n=i*4;if(!d[n+3])continue;
    let L=needsScale?lum[i]*scale:lum[i];
    if(L>0.80)L=0.80+(L-0.80)*0.35;
    const f=L/Math.max(lum[i],1e-4);
    d[n]=Math.min(255,d[n]*f);d[n+1]=Math.min(255,d[n+1]*f);d[n+2]=Math.min(255,d[n+2]*f);
    lum[i]=L;
  }
}
const preparePhotoBeforeV82=typeof preparePhoto==='function'?preparePhoto:null;
if(preparePhotoBeforeV82)preparePhoto=async function(garment,view){
  const assetKey=photoAssetKey(garment),asset=typeof PHOTO_ASSETS==='object'&&PHOTO_ASSETS[assetKey];
  if(asset){
    const key=assetKey+':'+view;if(photoPrepared.has(key))return photoPrepared.get(key);
    const promise=(async()=>{
      const img=await getImage(asset),crop=photoBaseInfo(garment).crop[view],w=crop[2],h=crop[3],c=document.createElement('canvas');
      c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,...crop,0,0,w,h);
      const pixels=x.getImageData(0,0,w,h),lum=new Float32Array(w*h);
      for(let i=0;i<lum.length;i++){const n=i*4;lum[i]=(pixels.data[n]*.2126+pixels.data[n+1]*.7152+pixels.data[n+2]*.0722)/255}
      if(garment==='zipneck')hardenZipneckPhoto(pixels,lum,w,h);
      x.putImageData(pixels,0,0);
      const masks={};for(const part of['neck','cuff','hem'])masks[part]=photoTrimMask(garment,view,w,h,part).getContext('2d').getImageData(0,0,w,h).data;
      return{c,w,h,pixels,lum,masks};
    })();
    photoPrepared.set(key,promise);try{return await promise}catch(e){photoPrepared.delete(key);throw e}
  }
  if(garment!=='sleeveless'&&garment!=='zipneck')return preparePhotoBeforeV82(garment,view);
  const key=garment+':'+view;if(photoPrepared.has(key))return photoPrepared.get(key);
  const promise=(async()=>{
    const src=generateDrawnPhotoBase(garment,view),w=src.width,h=src.height,pixels=src.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h),lum=new Float32Array(w*h);
    for(let i=0;i<lum.length;i++){const n=i*4;lum[i]=(pixels.data[n]*.2126+pixels.data[n+1]*.7152+pixels.data[n+2]*.0722)/255}
    const masks={};for(const part of['neck','cuff','hem'])masks[part]=photoTrimMask(garment,view,w,h,part).getContext('2d').getImageData(0,0,w,h).data;
    return{c:src,w,h,pixels,lum,masks};
  })();
  photoPrepared.set(key,promise);try{return await promise}catch(e){photoPrepared.delete(key);throw e}
};
const sleevelessTintCache=new Map();
const tintedPhotoBeforeChifon=typeof tintedPhoto==='function'?tintedPhoto:null;
if(tintedPhotoBeforeChifon)tintedPhoto=async function(garment,view){
  if(garment!=='sleeveless')return tintedPhotoBeforeChifon(garment,view);
  const p=ensurePhoto(),cut=state.photoCut||'hombre';
  const key=JSON.stringify([cut,garment,view,state.bodyColor,state.contrastColor,state.contrast,state.texture,p.exposure,p.relief,p.thread]);
  if(sleevelessTintCache.has(key))return sleevelessTintCache.get(key);
  for(const cached of[...photoTintCache.keys()]){try{if(JSON.parse(cached)[0]==='sleeveless')photoTintCache.delete(cached)}catch{}}
  const canvas=await tintedPhotoBeforeChifon(garment,view);
  sleevelessTintCache.set(key,canvas);while(sleevelessTintCache.size>8)sleevelessTintCache.delete(sleevelessTintCache.keys().next().value);
  return canvas;
};

if(typeof SLEEVE_SEAMS==='object'){
  SLEEVE_SEAMS.zipneck=[[.18,.138],[.28,.176],[.40,.198],[.55,.214],[.78,.188],[.93,.168],[1,.154]];
  SLEEVE_SEAMS.sleeveless=[[.16,.22],[.28,.20],[.42,.24]];
}
const sleeveRegionBeforeV82=typeof sleeveRegion==='function'?sleeveRegion:null;
if(sleeveRegionBeforeV82)sleeveRegion=function(u,v,garment=state.garment,view='front'){
  if(garment==='sleeveless'){
    if(u<0||v<0||u>1||v>1)return null;
    const screenRight=u>.5,outer=screenRight?1-u:u;
    if(v<.16||v>.46||outer>.28||outer<.12)return null;
    return{side:screenRight===(view==='front')?'left':'right',hem:.46,depth:.46-v};
  }
  if(garment==='zipneck'){
    if(u<0||v<0||u>1||v>1)return null;
    const points=SLEEVE_SEAMS.zipneck;if(v<points[0][0]||v>points.at(-1)[0])return null;
    let edge=points.at(-1)[1];for(let i=1;i<points.length;i++)if(v<=points[i][0]){const [v0,u0]=points[i-1],[v1,u1]=points[i];edge=u0+(u1-u0)*(v-v0)/(v1-v0);break}
    const screenRight=u>.5,outer=screenRight?1-u:u;if(outer>edge)return null;
    return{side:screenRight===(view==='front')?'left':'right',hem:.99,depth:.99-v};
  }
  return sleeveRegionBeforeV82(u,v,garment,view);
};
const sleeveSideForZoneBeforeV82=typeof sleeveSideForZone==='function'?sleeveSideForZone:null;
if(sleeveSideForZoneBeforeV82)sleeveSideForZone=function(zone){return zone==='leftCostado'?'left':zone==='rightCostado'?'right':sleeveSideForZoneBeforeV82(zone)};
const photoZoneBeforeV82=typeof photoZone==='function'?photoZone:null;
if(photoZoneBeforeV82)photoZone=function(zone,view){
  const old=photoZoneBeforeV82(zone,view),r=photoRect(state.garment,view);
  if(state.garment==='zipneck'&&(zone==='leftSleeve'||zone==='rightSleeve')){const right=(zone==='leftSleeve')===(view==='front');return{...old,x:r.x+r.w*(right?.88:.12),y:r.y+r.h*.46}}
  if(zone==='leftCostado'||zone==='rightCostado'){const right=(zone==='leftCostado')===(view==='front');return{...old,x:r.x+r.w*(right?.93:.07),y:r.y+r.h*(hasLongSleeves()?.56:.38),scale:r.w*.42/340}}
  if(state.garment==='sleeveless'&&(zone==='leftSleeve'||zone==='rightSleeve')){const right=(zone==='leftSleeve')===(view==='front');return{...old,x:r.x+r.w*(right?.82:.18),y:r.y+r.h*.30}}
  if(state.garment==='sleeveless'&&zone==='hem')return{...old,x:r.x+r.w*(view==='front'?.65:.35),y:r.y+r.h*.84};
  return old;
};
const sleeveColorAtBeforeV82=typeof sleeveColorAt==='function'?sleeveColorAt:null;
if(sleeveColorAtBeforeV82)sleeveColorAt=function(u,v,palette,cuffAlpha){
  if(palette.garment==='sleeveless'&&!hasSetInSleeves(palette.garment))return sleeveColorAtBeforeV82(u,v,palette,cuffAlpha);
  return sleeveColorAtBeforeV82(u,v,{...palette,garment:palette.garment==='zipneck'?'hoodie':palette.garment},cuffAlpha);
};

const garmentGeometryBeforeV82=garmentGeometry;
garmentGeometry=function(order){
  if(order.garment!=='sleeveless'&&order.garment!=='zipneck')return garmentGeometryBeforeV82(order);
  const p={...PRO_DEFAULTS,...order.pro},fit=PRO_FITS[p.fit],sleeveless=order.garment==='sleeveless',zip=order.garment==='zipneck';
  const length=(sleeveless?.82:1)*p.length/100,fold=p.folds/100,mesh=[],bottom=-1.03*length,upper=.87,neckY=1.28,bodyWidth=.67*fit;
  const angle=(u,back)=>u*Math.PI+(back?Math.PI:0);
  const bodyAt=(theta,y)=>{const v=clamp((y-bottom)/(upper-bottom),0,1),radius=bodyWidth*(.945+.025*Math.cos(v*Math.PI*2)+.027*v)*(sleeveless&&v>.72?.96:1),depth=.305*fit*(.97+.03*Math.cos(v*Math.PI));let x=radius*Math.cos(theta),z=depth*Math.sin(theta);const sin=Math.sin(theta),amp=fold*.028*Math.pow(Math.abs(sin),1.5);const wave=amp*(Math.sin(theta*13+y*4)*.7+Math.sin(theta*23-y*3)*.32+Math.sin(y*14+theta*4)*.35);z+=Math.sign(sin)*wave*(.25+.75*Math.pow(1-v,.6));return [x,y+.22*Math.pow(Math.abs(Math.cos(theta)),2)*Math.pow(v,4),z]};
  const sheetUV=(point,back)=>[(400+(back?-1:1)*point[0]/bodyWidth*168)/800,(155+(neckY-point[1])/(neckY-bottom)*599)/920];
  for(const back of[false,true]){
    const mat=back?'back':'front';mesh.push(surfaceMesh('Cuerpo '+mat,mat,64,58,(u,v)=>{const point=bodyAt(angle(u,back),lerp(bottom,upper,v));return {p:point,uv:sheetUV(point,back)}}));
    mesh.push(surfaceMesh('Hombros '+mat,mat,64,24,(u,v)=>{const theta=angle(u,back),outer=bodyAt(theta,upper),neckRadiusX=zip?.24:.263,neckRadiusZ=.188,front=Math.max(0,Math.sin(theta));const lower=order.neck==='v'?.255*(1-Math.abs(Math.cos(theta)))*(front>0?1:0):zip?0:.112*Math.pow(front,1.5);const inner=[neckRadiusX*Math.cos(theta),neckY-lower+(zip?.05:0),.065+neckRadiusZ*Math.sin(theta)];let point=outer.map((a,i)=>lerp(a,inner[i],i===1?v:v*v));point[2]+=Math.sin(v*Math.PI)*.035*Math.sin(theta);return {p:point,uv:sheetUV(point,back)}}));
    if(order.hem==='rib'||order.contrast.hem){mesh.push(surfaceMesh('Pretina '+mat,order.contrast.hem?'contrast':'body',64,6,(u,v)=>{const point=bodyAt(angle(u,back),lerp(bottom+.006,bottom+(order.hem==='rib'?.115:.047),v));point[0]*=1.008;point[2]*=1.022;return {p:point,uv:[u*4,v]};},order.hem==='rib'))}
    const seam=[];for(let i=0;i<=70;i++){const q=bodyAt(angle(i/70,back),bottom+.03);q[0]*=1.01;q[2]*=1.024;seam.push(q)}mesh.push(tubeMesh('Costura inferior '+mat,'seam',seam,.0018,5));
  }
  if(!sleeveless){
    for(const side of[-1,1]){const sleeveLength=2.0*p.sleeve/100,axis=norm3([side*.58,-.82,0]),origin=[side*.40*fit,.85,0],sideVec=[-axis[1]*side,axis[0]*side,0];
      const sleeveAt=(theta,t,extra=0)=>{const center=add3(origin,mul3(axis,sleeveLength*t)),r=lerp(.285*fit,.135*fit,t)+extra;const wrinkle=fold*.004*Math.sin(t*22+theta*3)*Math.sin(t*Math.PI);return add3(center,add3(mul3(sideVec,Math.cos(theta)*(r+wrinkle)),[0,0,Math.sin(theta)*(r*.89+wrinkle)]))};
      for(const back of[false,true]){mesh.push(surfaceMesh('Manga '+side+' '+back,back?'back':'front',40,40,(u,v)=>{const theta=angle(u,back),point=sleeveAt(theta,v),sourceX=side>0?lerp(567,687,v):lerp(233,113,v),sourceY=lerp(215,733,v),offset=-Math.cos(theta)*55;return {p:point,uv:[(back?800-sourceX:sourceX)/800,(sourceY+offset)/920]}}));
        if(order.cuff==='rib'||order.contrast.cuff){mesh.push(surfaceMesh('Puño '+side+' '+back,order.contrast.cuff?'contrast':'body',40,6,(u,v)=>({p:sleeveAt(angle(u,back),lerp(order.cuff==='rib'?.87:.93,1,v),.002),uv:[u*3,v]}),order.cuff==='rib'))}
        const linePts=[];for(let i=0;i<=45;i++)linePts.push(sleeveAt(angle(i/45,back),.965,.005));mesh.push(tubeMesh('Costura puño '+side+' '+back,'seam',linePts,.0019,5));
      }
    }
  }else{
    for(const side of[-1,1]){const rim=[];for(let i=0;i<=24;i++){const t=i/24,yy=lerp(.86,.28,t),xx=side*(.52+.06*Math.sin(t*Math.PI)),q=bodyAt(Math.acos(clamp(xx/bodyWidth,-1,1)),yy);rim.push([xx,yy,q[2]+.01])}mesh.push(tubeMesh('Sisa '+side,order.contrast.cuff?'contrast':'seam',rim,.007,6,order.cuff==='rib'))}
  }
  const neckMaterial=order.contrast.neck?'contrast':'body';
  mesh.push(surfaceMesh('Cuello',neckMaterial,80,7,(u,v)=>{const theta=u*Math.PI*2,front=Math.max(0,Math.sin(theta)),lower=order.neck==='v'?.255*(1-Math.abs(Math.cos(theta)))*(front>0?1:0):zip?0:.112*Math.pow(front,1.5);return {p:[(.24+.05*v)*Math.cos(theta),neckY-lower+(zip?.07:0)-.03*v+.005,.065+(.188+.045*v)*Math.sin(theta)],uv:[u*5,v]}},!zip));
  if(zip){
    mesh.push(surfaceMesh('Cierre',neckMaterial,2,16,(u,v)=>({p:[lerp(-.02,.02,u),lerp(1.18,.70,v),.328],uv:[u,v]})));
    mesh.push(surfaceMesh('Dientes cierre','metal',2,16,(u,v)=>({p:[lerp(-.006,.006,u),lerp(1.17,.71,v),.336],uv:[u,v]})));
    mesh.push(ellipseMesh('Tirador','metal',[0,.72,.348],[.013,.02,.008]));
  }
  if(p.mannequin){mesh.push(ellipseMesh('Torso de referencia','mannequin',[0,.025,-.015],[.52,1.16,.24]));mesh.push(ellipseMesh('Cuello de referencia','mannequin',[0,1.28,0],[.155,.25,.14]));mesh.push(ellipseMesh('Cabeza de referencia','mannequin',[0,1.82,-.028],[.22,.325,.218]));for(const side of[-1,1]){const arm=[];for(let i=0;i<=20;i++){const t=i/20;arm.push([side*(.44+t*(zip?1.12:sleeveless?.18:1.22)),.68-t*(zip?1.63:sleeveless?.22:.69),0])}mesh.push(tubeMesh('Brazo de referencia '+side,'mannequin',arm,sleeveless?.08:.10,18))}}
  for(const m of mesh){const flip=m.name.startsWith('Cuerpo ')||m.name.startsWith('Hombros ')||m.name.startsWith('Pretina ')||m.name.startsWith('Manga -1')||m.name.startsWith('Puño -1')||m.name==='Cierre';if(flip){for(let i=0;i<m.indices.length;i+=3)[m.indices[i+1],m.indices[i+2]]=[m.indices[i+2],m.indices[i+1]];m.normals=m.normals.map(n=>-n)}}
  const joins=new Map();for(const m of mesh.filter(m=>/^(Cuerpo|Hombros) /.test(m.name))){for(let i=0;i<m.positions.length;i+=3){const key=m.positions.slice(i,i+3).map(x=>x.toFixed(5)).join(',');if(!joins.has(key))joins.set(key,[]);joins.get(key).push([m,i])}}for(const entries of joins.values()){if(entries.length<2)continue;const sum=entries.reduce((a,[m,i])=>add3(a,m.normals.slice(i,i+3)),[0,0,0]),n=norm3(sum);for(const [m,i]of entries)m.normals.splice(i,3,...n)}
  return mesh;
};

const populateBeforeV82=populate;
populate=function(){populateBeforeV82();configureNeck()};
const syncPhotoUIBeforeChifon=typeof syncPhotoUI==='function'?syncPhotoUI:null;
if(syncPhotoUIBeforeChifon)syncPhotoUI=function(){
  syncPhotoUIBeforeChifon();
  if($('#photoBaseName')&&photoBaseInfo())$('#photoBaseName').textContent=photoBaseInfo().label;
};
const initPhotoBeforeChifon=typeof initPhoto==='function'?initPhoto:null;
if(initPhotoBeforeChifon)initPhoto=function(){
  initPhotoBeforeChifon();
  $$('[data-photo-cut]').forEach(b=>b.addEventListener('click',()=>{
    if(state.garment!=='sleeveless'||state.photoCut===b.dataset.photoCut)return;
    state.photoCut=b.dataset.photoCut;
    sleevelessTintCache.clear();
    populate();changed();
  }));
};
