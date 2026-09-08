const path=require('path');
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {createCanvas,Path2D,Image}=require(require.resolve('@napi-rs/canvas',{paths:[__dirname,process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
const xml=require(require.resolve('xml-js',{paths:[__dirname,process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
const {GlobalFonts}=require(require.resolve('@napi-rs/canvas',{paths:[__dirname,process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
if(fs.existsSync('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','Arial');
if(fs.existsSync('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','Arial');
function patchedCanvas(w,h){const c=createCanvas(w,h),get=c.getContext.bind(c);c.getContext=(t,...args)=>{const ctx=get(t,...args);if(t==='2d'&&!ctx._patched){const draw=ctx.drawImage.bind(ctx);ctx.drawImage=(src,...a)=>draw(src._canvas||src,...a);ctx._patched=true}return ctx};c.toBlob=(cb,type='image/png')=>cb(new Blob([c.toBuffer(type)],{type}));return c}
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
const script=Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g)).map(m=>m[1]).join('\n').replace(/\ninit\(\)\.catch[^\n]+\n?\s*$/,'');
let elements=[],map=new Map(),storage=new Map(),blocked=false,frames=[];
class Element{
 constructor(tag,attrs={}){this.tagName=tag.toUpperCase();this.attrs={};this.children=[];this.events={};this.style={setProperty(){}};this.dataset={};this.value='';this.textContent='';this.checked=false;this.hidden=false;this.disabled=false;this.open=false;this.className='';this.classList={toggle:(k,v)=>{let s=new Set(this.className.split(' '));if(v??!s.has(k))s.add(k);else s.delete(k);this.className=[...s].join(' ')},add:k=>this.classList.toggle(k,true),remove:k=>this.classList.toggle(k,false)};Object.entries(attrs).forEach(([k,v])=>this.setAttribute(k,v));elements.push(this)}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='id'){this.id=v;map.set(v,this)}else if(k==='class')this.className=v;else if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,a)=>a.toUpperCase())]=v;else this[k]=v}
 getAttribute(k){return this.attrs[k]??null}
 removeAttribute(k){delete this.attrs[k];delete this[k]}
 querySelector(s){return this.children.find(e=>e.tagName===s.toUpperCase())}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn)}
 async emit(k,props={}){for(const fn of this.events[k]||[])await fn({currentTarget:this,target:this,preventDefault(){},...props})}
 append(...children){for(const c of children){c.parent=this;this.children.push(c)}}
 replaceChildren(){this.children=[]}
 add(o){this.children.push(o)}focus(){}select(){}showModal(){this.open=true}close(){this.open=false}closest(){return this.parent}remove(){}click(){this.emit('click')}getBoundingClientRect(){return {left:0,top:0,width:400,height:460}}setPointerCapture(){}scrollIntoView(){}async decode(){}
}
function make(tag,attrs={}){const e=new Element(tag,attrs);if(tag==='canvas'){const native=patchedCanvas(800,920);e.width=800;e.height=920;e.getContext=(...a)=>a[0]==='webgl'?null:native.getContext(...a);Object.defineProperty(e,'width',{get:()=>native.width,set:v=>native.width=Number(v)});Object.defineProperty(e,'height',{get:()=>native.height,set:v=>native.height=Number(v)});e.width=attrs.width||800;e.height=attrs.height||920;e.toDataURL=(...a)=>native.toDataURL(...a);e._canvas=native}return e}
// Parse enough static attributes to exercise real initUI event bindings, without a browser.
for(const m of html.replace(/<script>[\s\S]*?<\/script>/g,'').replace(/<style>[\s\S]*?<\/style>/g,'').matchAll(/<([a-z][a-z0-9-]*)\b([^>]*?)>/gi)){if(m[1]==='script'||m[1]==='style')continue;let attrs={};for(const a of m[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[a[1]]=a[2]??'';make(m[1],attrs)}
function match(e,s){if(s.startsWith('#'))return e.id===s.slice(1);if(s.startsWith('.'))return e.className.split(' ').includes(s.slice(1));const m=s.match(/^\[([^\]]+)\]$/);if(m)return Object.hasOwn(e.attrs,m[1]);return false}
const $=s=>{const e=elements.find(e=>match(e,s));if(!e)throw Error('Missing selector: '+s);return e};
function domNode(n){return {localName:n.name?.split(':').at(-1),get attributes(){return Object.entries(n.attributes||{}).map(([name,value])=>({name,value}))},get textContent(){return (n.elements||[]).map(e=>e.text??'').join('')},getAttribute:k=>n.attributes?.[k]??null,setAttribute:(k,v)=>{(n.attributes??={})[k]=v},_node:n}}
function docFrom(s){try{const parsed=xml.xml2js(s);const nodes=[];function walk(n){if(n.type==='element')nodes.push(domNode(n));(n.elements||[]).forEach(walk)}walk(parsed);return {documentElement:nodes[0],querySelector:s=>null,querySelectorAll:()=>nodes,_parsed:parsed}}catch{return {querySelector:()=>({}),documentElement:{localName:'error'}}}}

let drawCalls=0,contextLost=false;let id=0;const mockGL={};for(const [i,key]of['VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','DEPTH_TEST','LEQUAL','CULL_FACE','TEXTURE_2D','RGBA','UNSIGNED_BYTE','TEXTURE_WRAP_S','TEXTURE_WRAP_T','CLAMP_TO_EDGE','TEXTURE_MIN_FILTER','TEXTURE_MAG_FILTER','LINEAR','UNPACK_FLIP_Y_WEBGL','ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','STATIC_DRAW','COLOR_BUFFER_BIT','DEPTH_BUFFER_BIT','TEXTURE0','FLOAT','TRIANGLES','UNSIGNED_SHORT'].entries())mockGL[key]=i+1;
for(const key of ['createShader','createProgram','createTexture','createBuffer'])mockGL[key]=()=>({id:++id});
for(const key of ['shaderSource','compileShader','attachShader','linkProgram','deleteShader','enable','depthFunc','disable','bindTexture','texImage2D','texParameteri','pixelStorei','deleteBuffer','bindBuffer','bufferData','viewport','clearColor','clear','useProgram','uniform1f','uniform1i','activeTexture','enableVertexAttribArray','vertexAttribPointer'])mockGL[key]=()=>{};
mockGL.getShaderParameter=mockGL.getProgramParameter=()=>true;mockGL.getAttribLocation=()=>0;mockGL.getUniformLocation=(p,n)=>n;mockGL.uniformMatrix4fv=(l,t,m)=>{assert.equal(m.length,16);assert(Array.from(m).every(Number.isFinite))};mockGL.uniform3fv=(l,v)=>{assert.equal(v.length,3);assert(Array.from(v).every(Number.isFinite))};mockGL.drawElements=()=>drawCalls++;mockGL.isContextLost=()=>contextLost;

const context={console,ResizeObserver:class{constructor(cb){this.cb=cb}observe(){}},document:{querySelector:$,querySelectorAll:s=>elements.filter(e=>match(e,s)),createElement:t=>t==='canvas'?patchedCanvas(300,150):make(t),createTextNode:s=>({textContent:s}),addEventListener(){},body:make('body')},DOMParser:class{parseFromString(s){return docFrom(s)}},XMLSerializer:class{serializeToString(d){const result=xml.js2xml(d._parsed||{elements:[d._node]});return result}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(blocked)throw Error('Quota');storage.set(k,v)}},Image:class extends Image{set src(v){super.src=v.startsWith('data:image/svg+xml')?Buffer.from(v.split(',')[1],'base64'):v}},Path2D,crypto:require('crypto').webcrypto,TextEncoder,TextDecoder,Blob,URL,atob,btoa,setTimeout:()=>0,clearTimeout(){},cancelAnimationFrame(){},requestAnimationFrame:f=>{frames.splice(0,frames.length,f);return 1},navigator:{},window:{addEventListener(){},print(){context.printed=true}},Option:function(t,v){this.text=t;this.value=v}};
vm.createContext(context);vm.runInContext(script,context);
const run=s=>vm.runInContext(s,context),set=(id,value,event='input')=>{const e=$('#'+id);e.value=value;return e.emit(event)};

module.exports={fs,vm,assert,createCanvas,context,run,set,$,elements,storage,frames};
