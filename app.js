'use strict';
(() => {
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const canvas = $('#canvas');
const ctx = canvas.getContext('2d', {willReadFrequently:true});
const stage = $('#stageScroller');
const panel = $('#panelBody');
const PI = Math.PI;
const themeStorageKey = 'pixellab-studio-theme';
function setTheme(theme, persist = true) {
  const dark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const toggle = $('#themeToggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.title = dark ? 'Tukar ke mod cerah' : 'Tukar ke mod gelap';
    toggle.querySelector('.theme-icon').textContent = dark ? '☀' : '☾';
    toggle.querySelector('.theme-label').textContent = dark ? 'Cerah' : 'Gelap';
  }
  const themeMeta = $('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = dark ? '#141925' : '#dfe6ea';
  if (persist) {
    try { localStorage.setItem(themeStorageKey, dark ? 'dark' : 'light'); }
    catch (e) { /* Switching still works when storage is unavailable. */ }
  }
}

const fonts = ['Arial','Impact','Georgia','Trebuchet MS','Verdana','Tahoma','Courier New','Times New Roman','system-ui','serif','monospace'];
const palette = ['#ffffff','#0c102a','#a27aff','#58c9ff','#f472b6','#ffca71','#7de7a3','#ff7575','#b7a6f8','#64748b'];
const stickers = ['🔥','✨','❤️','⭐','💎','👑','⚡','🌈','🚀','💯','🎉','🎨','😊','😍','😎','👍','☀️','🌸','💜','✅','🎯','🏆','☁️','🌙'];
const stickerGroups = [
 {title:'Stiker popular',items:stickers},
 {title:'Hiasan & simbol',items:['💫','🌟','🌠','🪄','🪩','🪅','🎀','🎁','🎈','🎊','💥','💢','❄️','🌊','🔮','💐','☄️','🎐','🧿','🕊️','💌','🔔']},
 {title:'Emoji & ekspresi',items:['😀','😁','😂','🤣','🥹','🥰','😘','🤩','🥳','🤗','🤔','🤭','😴','😭','🥺','😤','😡','😱','🤯','🤠','🤖','👻','💀','👀','🙈','😇','😉','😋','🫶']},
 {title:'Alam & haiwan',items:['🌻','🌷','🌹','🌺','🌼','🌿','🍀','🍃','🌳','🌵','🌴','🌅','🌞','🌛','🌍','🌏','🌱','🦋','🐱','🐶','🐼','🦊','🐸','🐻','🐰','🦄','🐣','🐝','🐬','🦖']},
 {title:'Makanan & minuman',items:['🍕','🍔','🍟','🌮','🍿','🍣','🍜','🍩','🍪','🎂','🧁','🍦','🍉','🍓','🍒','🍋','🥑','🍎','🍍','☕','🧋','🥤']},
 {title:'Aktiviti & objek',items:['🎮','🎧','🎵','🎸','📸','📱','💻','💡','📚','✏️','🎬','🎤','⚽','🏀','🏸','🏅','🚗','✈️','🛸','⏰','🛍️','💰','📍','📢']},
 {title:'Hati & isyarat',items:['💖','💘','💝','💕','💞','💗','💓','💚','💙','💛','🧡','🖤','🤍','❤️‍🔥','💔','👏','🙌','🙏','💪','✌️','👌','🤞','🤟','🤙','👉','👈','☝️','✅','❌','❗']}
];
const shapes = [{id:'rect',glyph:'▢',label:'Kotak'},{id:'roundrect',glyph:'▢',label:'Bulat tepi'},{id:'circle',glyph:'◯',label:'Bulatan'},{id:'triangle',glyph:'△',label:'Segi tiga'},{id:'star',glyph:'☆',label:'Bintang'},{id:'diamond',glyph:'◇',label:'Berlian'},{id:'line',glyph:'／',label:'Garis'},{id:'arrow',glyph:'➜',label:'Anak panah'},
 {id:'pentagon',glyph:'⬠',label:'Segi lima'},{id:'hexagon',glyph:'⬡',label:'Segi enam'},{id:'octagon',glyph:'⯃',label:'Segi lapan'},{id:'heart',glyph:'♥',label:'Hati'},{id:'cross',glyph:'✚',label:'Palang'},{id:'bolt',glyph:'ϟ',label:'Kilat'},
 {id:'speech',glyph:'▢',label:'Buih dialog'},{id:'cloud',glyph:'☁',label:'Awan'},{id:'trapezoid',glyph:'▱',label:'Trapezium'},{id:'parallelogram',glyph:'▱',label:'Paralelogram'},{id:'chevron',glyph:'❯',label:'Chevron'},{id:'righttriangle',glyph:'◢',label:'Segi tiga siku'},
 {id:'semicircle',glyph:'◠',label:'Separuh bulat'},{id:'shield',glyph:'⬟',label:'Perisai'}];
let seq = 1, selectedId = null, activeTool='select', panelMode='home', activeTab='properties', zoom=1;
let history = [], historyIndex=-1, historyTimer=null, toastTimer=null, interaction=null, drawing=null;
let pendingImportMode = 'layer';
// Font yang dipasang disimpan berasingan daripada projek, dan boleh dipakai pada projek lain.
// IndexedDB menyimpan fail font yang lebih besar daripada kuota localStorage biasa.
const loadedCustomFonts = new Map();
const fontLibrary = new Map();
const fontBackupKey = 'pixellab-studio-installed-fonts';
let databasePromise = null;
function openDatabase(){
 if(databasePromise)return databasePromise;
 databasePromise=new Promise(resolve=>{
   if(!('indexedDB' in window)){resolve(null);return;}
   let request;
   try{request=indexedDB.open('pixellab-studio-data',1);}catch(e){resolve(null);return;}
   request.onupgradeneeded=()=>{
     const db=request.result;
     if(!db.objectStoreNames.contains('fonts'))db.createObjectStore('fonts',{keyPath:'family'});
     if(!db.objectStoreNames.contains('documents'))db.createObjectStore('documents',{keyPath:'id'});
   };
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>resolve(null);
   request.onblocked=()=>resolve(null);
 });
 return databasePromise;
}
function dbRequest(db,store,method,value){
 return new Promise((resolve,reject)=>{
   try{
     const tx=db.transaction(store,method==='get'||method==='getAll'?'readonly':'readwrite');
     const req=tx.objectStore(store)[method](...(method==='getAll'?[]:[value]));
     let result;
     req.onsuccess=()=>{result=req.result;};
     tx.oncomplete=()=>resolve(result);
     tx.onerror=()=>reject(tx.error||new Error('Simpanan gagal'));
     tx.onabort=()=>reject(tx.error||new Error('Simpanan dibatalkan'));
   }catch(e){reject(e);}
 });
}
async function storedFonts(){
 const db=await openDatabase();
 if(db){try{return await dbRequest(db,'fonts','getAll');}catch(e){console.warn('Pustaka font gagal dibaca:',e);}}
 try{return JSON.parse(localStorage.getItem(fontBackupKey)||'[]');}catch(e){return [];}
}
async function persistFont(font){
 const db=await openDatabase();
 if(db){try{await dbRequest(db,'fonts','put',font);return true;}catch(e){console.warn('Storan font penuh atau gagal:',e);return false;}}
 try{
   const previous=JSON.parse(localStorage.getItem(fontBackupKey)||'[]');
   const next=previous.filter(f=>f.family!==font.family);next.push(font);
   localStorage.setItem(fontBackupKey,JSON.stringify(next));return true;
 }catch(e){console.warn('Storan font tidak tersedia:',e);return false;}
}
async function storedAutosave(){
 const db=await openDatabase();
 if(db){try{const entry=await dbRequest(db,'documents','get','autosave');if(entry?.json)return entry.json;}catch(e){console.warn('Autosave gagal dibaca:',e);}}
 try{return localStorage.getItem('pixellab-studio-v1');}catch(e){return null;}
}
async function saveAutosave(json){
 const db=await openDatabase();
 if(db){await dbRequest(db,'documents','put',{id:'autosave',json});return;}
 localStorage.setItem('pixellab-studio-v1',json);
}
function isFontData(font){return font&&typeof font.family==='string'&&typeof font.src==='string'&&/^data:(?:(?:font|application|binary)\/[^;,]+)?;base64,/i.test(font.src);}
function loadCustomFont(font){
 if(!isFontData(font))return Promise.resolve(false);
 if(loadedCustomFonts.has(font.family))return loadedCustomFonts.get(font.family);
 if(!('FontFace' in window)||!document.fonts)return Promise.resolve(false);
 const task=(async()=>{try{
   const face=new FontFace(font.family,`url("${font.src}")`);
   await face.load();document.fonts.add(face);render();return true;
 }catch(e){console.warn('Font gagal dimuat:',font.name,e);return false;}})();
 loadedCustomFonts.set(font.family,task);return task;
}
async function loadInstalledFonts(){
 const stored=await storedFonts();
 for(const font of stored){if(isFontData(font)){fontLibrary.set(font.family,font);loadCustomFont(font);}}
}
async function loadProjectFonts(remember=false){
 if(!Array.isArray(doc.customFonts))doc.customFonts=[];
 for(const font of doc.customFonts){
   const complete=isFontData(font)?font:fontLibrary.get(font.family);
   if(!complete)continue;
   fontLibrary.set(complete.family,complete);
   loadCustomFont(complete);
   if(remember)await persistFont(complete);
 }
}
function projectFontOptions(){
 const opts=fonts.map(name=>[name,name]);
 const known=new Set(fonts);
 for(const font of fontLibrary.values())if(!known.has(font.family)){
   opts.push([font.family,'✦ '+font.name]);known.add(font.family);
 }
 return opts;
}
function selectCustomFont(family){
 const o=getItem(),font=fontLibrary.get(family);
 if(!o||o.type!=='text'||!font)return;
 o.font=font.family;
 if(!Array.isArray(doc.customFonts))doc.customFonts=[];
 if(!doc.customFonts.some(f=>f.family===font.family))doc.customFonts.push({family:font.family,name:font.name});
 commit();refreshPanel();render();
}
function importedFontContent(){
 const included=new Set((doc.customFonts||[]).map(f=>f.family));
 for(const o of doc.items||[])if(o.type==='text'&&fontLibrary.has(o.font))included.add(o.font);
 return [...included].map(family=>fontLibrary.get(family)||(doc.customFonts||[]).find(f=>f.family===family)).filter(isFontData);
}
function readFontFile(file){return new Promise((resolve,reject)=>{
 const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error||new Error('Fail tidak dapat dibaca'));reader.readAsDataURL(file);
});}
async function importFontFiles(files){
 const chosen=Array.from(files||[]);if(!chosen.length)return;
 const textId=getItem()?.type==='text'?selectedId:null;
 let added=0,duplicates=0,invalid=0,unsaved=0,first=null;
 for(const file of chosen){
   if(!/\.(ttf|otf|woff2?)$/i.test(file.name)||file.size>15*1024*1024||!file.size){invalid++;continue;}
   try{
     const src=await readFontFile(file),name=file.name.replace(/\.(ttf|otf|woff2?)$/i,'');
     const existing=[...fontLibrary.values()].find(f=>f.name===name&&f.src===src);
     if(existing){duplicates++;if(!first)first=existing;continue;}
     const font={family:'CustomFont_'+Date.now().toString(36)+'_'+(seq++),name,src};
     if(!await loadCustomFont(font)){invalid++;continue;}
     fontLibrary.set(font.family,font);
     if(!await persistFont(font))unsaved++;
     if(!first)first=font;
     added++;
   }catch(e){invalid++;console.warn('Gagal import font:',file.name,e);}
 }
 if(first&&textId){
   const layer=doc.items.find(o=>o.id===textId&&o.type==='text');
   if(layer){selectedId=textId;selectCustomFont(first.family);}
 }
 refreshPanel();render();
 const message=`${added} font diimport${duplicates?', '+duplicates+' sudah tersedia':''}${invalid?', '+invalid+' gagal':''}`;
 toast(unsaved?message+' · '+unsaved+' gagal disimpan kekal':message);
 if(!$('#modalShell').hidden&&$('#modalTitle').textContent==='Pustaka Font')showFontLibrary();
}
function showFontLibrary(){
 const chosen=getItem()?.type==='text';
 const installed=[...fontLibrary.values()].sort((a,b)=>a.name.localeCompare(b.name));
 const list=installed.length?installed.map(f=>`<div class="installed-font-row"><div class="installed-font-info"><strong>${escapeHTML(f.name)}</strong><span style="font-family:'${escapeHTML(f.family)}', sans-serif">Aa Bb Cc 123</span></div>${chosen?`<button class="mini-btn" data-usefont="${escapeHTML(f.family)}">Guna</button>`:''}</div>`).join(''):'<p class="field-help">Belum ada font diimport. Pilih beberapa fail font untuk memasangnya.</p>';
 showModal('Pustaka Font',`<p class="field-help">${installed.length} font dipasang dalam pelayar ini. Font boleh digunakan semula pada semua projek.</p><button id="modalImportFonts" class="primary-wide">＋ Import banyak font · TTF / OTF / WOFF / WOFF2</button><div class="installed-font-list">${list}</div><p class="field-help">Font yang digunakan disertakan dalam fail projek JSON. Storan pelayar kekal selagi data laman ini disimpan.</p>`);
 $('#modalImportFonts').onclick=()=>$('#fileFont').click();
 $('#modalContent').onclick=ev=>{const btn=ev.target.closest('[data-usefont]');if(btn){selectCustomFont(btn.dataset.usefont);hideModal();}};
}
const cropPresets = [['original','Asal'],['1:1','1:1'],['4:5','4:5'],['3:4','3:4'],['16:9','16:9'],['9:16','9:16'],['3:2','3:2'],['free','Bebas']];
const imageCache = new Map(), transparentCache = new Map();
let doc = {name:'Reka Bentuk Saya', width:1080, height:1080, background:{type:'color',color:'#ffffff',color2:'#ffffff',angle:0,src:''},items:[]};
const brush = {color:'#d59cff',size:16,opacity:1};
const clone = v => JSON.parse(JSON.stringify(v));
const uid = ()=>'obj_'+Date.now().toString(36)+'_'+(seq++);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const escapeHTML=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asNum=(v,d=0)=>Number.isFinite(+v)?+v:d;
const rad=deg=>deg*PI/180;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2450);}
function getItem(){return doc.items.find(o=>o.id===selectedId)||null;}
function imgObj(src){if(!src)return null;let cached=imageCache.get(src);if(cached)return cached.ready?cached.img:null;const im=new Image();cached={img:im,ready:false};imageCache.set(src,cached);im.onload=()=>{cached.ready=true;render();};im.onerror=()=>imageCache.delete(src);im.src=src;return im.complete&&im.naturalWidth?(cached.ready=true,im):null;}
function createText(text='TAJUK ANDA', x=doc.width/2,y=doc.height/2){return {id:uid(),type:'text',name:'Teks',visible:true,locked:false,x,y,w:750,h:200,rotation:0,opacity:1,text,font:'Impact',fontSize:110,weight:'700',italic:false,align:'center',letterSpacing:0,color:'#ffffff',color2:'#c3a2ff',gradient:false,strokeColor:'#151529',strokeWidth:0,shadow:false,shadowColor:'#000000',shadowBlur:12,shadowX:7,shadowY:8,innerShadow:false,depth3d:0,curve:0,textureSrc:'',reflection:false,emboss:false};}
function createShape(kind='rect',x=doc.width/2,y=doc.height/2){return {id:uid(),type:'shape',name:shapes.find(s=>s.id===kind)?.label||'Bentuk',shape:kind,visible:true,locked:false,x,y,w:310,h:220,rotation:0,opacity:1,color:'#a37aff',color2:'#67d2ff',gradient:false,strokeColor:'#ffffff',strokeWidth:0,roundness:35};}
function createImage(src,x=doc.width/2,y=doc.height/2){const o={id:uid(),type:'image',name:'Gambar',src,visible:true,locked:false,x,y,w:600,h:500,rotation:0,opacity:1,maintainRatio:true,relativeSize:100,cropLeft:0,cropTop:0,cropRight:0,cropBottom:0,removeBg:false,removeColor:'#ffffff',tolerance:55,effect:'none',brightness:100,contrast:100,saturation:100,blur:0,skewX:0,skewY:0,perspective:0};const im=imgObj(src);if(im){const ratio=im.naturalWidth/im.naturalHeight;if(ratio>=1){o.w=clamp(im.naturalWidth,200,720);o.h=o.w/ratio;}else{o.h=clamp(im.naturalHeight,220,650);o.w=o.h*ratio;}}o.referenceW=o.w;o.referenceH=o.h;return o;}
function createSticker(emoji){return {id:uid(),type:'sticker',name:'Stiker '+emoji,emoji,visible:true,locked:false,x:doc.width/2,y:doc.height/2,w:230,h:230,rotation:0,opacity:1};}
function defaultScene(){
 const a=createShape('circle',803,310);Object.assign(a,{name:'Orb cahaya',w:580,h:580,color:'#7b51d6',color2:'#cb6eff',gradient:true,opacity:.81});
 const b=createShape('circle',128,913);Object.assign(b,{name:'Orb biru',w:460,h:460,color:'#2d8ad9',color2:'#7568dd',gradient:true,opacity:.46});
 const line=createShape('roundrect',170,145);Object.assign(line,{name:'Label atas',w:226,h:59,color:'#ffffff',opacity:.12,roundness:27});
 const label=createText('PIXELLAB  •  DESIGN',170,145);Object.assign(label,{name:'Label',font:'Arial',weight:'700',fontSize:22,w:250,h:62,letterSpacing:2.6});
 const title=createText('CREATE\nANYTHING',doc.width/2,510);Object.assign(title,{name:'Tajuk utama',font:'Impact',fontSize:155,w:980,h:360,align:'center',letterSpacing:2,shadow:true,shadowBlur:28,shadowY:15});
 const subtitle=createText('YOUR IDEAS, YOUR CANVAS.',doc.width/2,758);Object.assign(subtitle,{name:'Slogan',font:'Arial',fontSize:34,w:830,h:100,weight:'700',letterSpacing:5,color:'#ded6ff'});
 const pill=createShape('roundrect',doc.width/2,927);Object.assign(pill,{name:'Butang hiasan',w:410,h:94,roundness:46,color:'#b994ff',color2:'#8170f2',gradient:true});
 const cta=createText('MULA BERKARYA   ↗',doc.width/2,927);Object.assign(cta,{name:'Teks butang',font:'Arial',fontSize:28,weight:'700',color:'#1c163b',w:410,h:80});
 doc.items=[a,b,line,label,title,subtitle,pill,cta];selectedId=title.id;
}
function snapshot(){return JSON.stringify({...doc,customFonts:(doc.customFonts||[]).map(f=>({family:f.family,name:f.name}))});}
function commit(){clearTimeout(historyTimer);const snap=snapshot();if(history[historyIndex]===snap)return;history=history.slice(0,historyIndex+1);history.push(snap);if(history.length>60)history.shift();historyIndex=history.length-1;updateHistoryUI();$('#saveStatus').style.color='#f3bb6b';scheduleAutosave();}
function delayedCommit(){clearTimeout(historyTimer);historyTimer=setTimeout(commit,330);}
function updateHistoryUI(){$('#undoBtn').disabled=historyIndex<=0;$('#redoBtn').disabled=historyIndex>=history.length-1;$('#layerCount').textContent=doc.items.length;}
function restore(snap){try{doc=JSON.parse(snap);loadProjectFonts();selectedId=null;$('#projectName').value=doc.name||'Tanpa Nama';canvas.width=doc.width;canvas.height=doc.height;syncPreset();render();refreshPanel();updateHistoryUI();scheduleAutosave();}catch(e){toast('Projek gagal dipulihkan.');}}
function undo(){if(historyIndex>0){historyIndex--;restore(history[historyIndex]);toast('Perubahan dibatalkan');}}
function redo(){if(historyIndex<history.length-1){historyIndex++;restore(history[historyIndex]);toast('Perubahan diulang');}}
let autosaveTimer=null;
function scheduleAutosave(){clearTimeout(autosaveTimer);autosaveTimer=setTimeout(async()=>{try{await saveAutosave(snapshot());$('#saveStatus').style.color='#65cba0';}catch(e){console.warn('Autosave gagal:',e);$('#saveStatus').style.color='#f3bb6b';toast('Simpanan automatik gagal · simpan projek JSON');}},650);}
function addObject(item){doc.items.push(item);selectedId=item.id;activeTool='select';panelMode='object';activeTab='properties';updateToolUI();refreshPanel();commit();render();showPanel();}
function pickSelected(id){if(id&&doc.items.some(o=>o.id===id))selectedId=id;else selectedId=null;panelMode=selectedId?'object':'home';activeTab='properties';refreshPanel();render();}
function removeItem(){const o=getItem();if(!o)return;doc.items=doc.items.filter(i=>i.id!==o.id);selectedId=null;panelMode='home';refreshPanel();commit();render();toast('Layer dipadam');}
function duplicateItem(){const o=getItem();if(!o)return;const cp=clone(o);cp.id=uid();cp.name+=' salinan';cp.x+=35;cp.y+=35;addObject(cp);toast('Layer digandakan');}
function shiftLayer(dir){const i=doc.items.findIndex(x=>x.id===selectedId);if(i<0)return;const to=clamp(i+dir,0,doc.items.length-1);if(to===i)return;[doc.items[i],doc.items[to]]=[doc.items[to],doc.items[i]];refreshPanel();commit();render();}
function selectTool(tool){activeTool=tool;activeTab='properties';updateToolUI();switch(tool){case'text':addObject(createText());return;case'image':pendingImportMode='layer';$('#fileImage').click();return;case'shape':case'sticker':case'background':case'draw':panelMode=tool;break;case'layers':activeTab='layers';panelMode='layers';break;default:panelMode=getItem()?'object':'home';}refreshPanel();render();if(tool==='draw')toast('Lukis terus di atas kanvas dengan jari atau tetikus');showPanel();}
function updateToolUI(){$$('.tool[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===activeTool));canvas.classList.toggle('drawmode',activeTool==='draw');$('#stageHint').textContent=activeTool==='draw'?'✎ Seret jari atau tetikus di atas kanvas untuk melukis':activeTool==='select'?'↖ Klik objek untuk mengedit · Tarik untuk pindah':'Pilih pilihan pada panel untuk mula mengedit';}
function showPanel(){if(innerWidth<=680)$('#inspector').classList.add('open');}
function closePanel(){$('#inspector').classList.remove('open');}
function getScale(){const w=Math.max(80,stage.clientWidth-42),h=Math.max(80,stage.clientHeight-42);return Math.min(w/doc.width,h/doc.height,1.8);}
function fitCanvas(){const s=getScale()*zoom;canvas.style.width=(doc.width*s)+'px';canvas.style.height=(doc.height*s)+'px';$('#zoomValue').value=String(Math.round(zoom*100));const dims=$('#stageDims');if(dims)dims.textContent=doc.width+' × '+doc.height;}
function setZoom(z){zoom=clamp(z,.4,3);fitCanvas();}
function getPoint(ev){const box=canvas.getBoundingClientRect();return {x:(ev.clientX-box.left)*doc.width/box.width,y:(ev.clientY-box.top)*doc.height/box.height};}
function localPoint(p,o){const dx=p.x-o.x,dy=p.y-o.y,a=-rad(o.rotation||0);return{x:dx*Math.cos(a)-dy*Math.sin(a),y:dx*Math.sin(a)+dy*Math.cos(a)};}
function hitItem(p,o){if(!o.visible)return false;const q=localPoint(p,o);return Math.abs(q.x)<=o.w/2+12/zoom&&Math.abs(q.y)<=o.h/2+12/zoom;}
function getHandle(p,o){const q=localPoint(p,o);const z=18/Math.max(.5,getScale()*zoom);if(Math.hypot(q.x,q.y+o.h/2+54)<z*1.4)return 'rotate';for(const [name,x,y] of [['nw',-o.w/2,-o.h/2],['ne',o.w/2,-o.h/2],['se',o.w/2,o.h/2],['sw',-o.w/2,o.h/2]])if(Math.hypot(q.x-x,q.y-y)<z)return name;return null;}
function pointerDown(ev){if(ev.button!==undefined&&ev.button!==0)return;const p=getPoint(ev);if(activeTool==='draw'){drawing={points:[p],...brush};canvas.setPointerCapture(ev.pointerId);render();return;}const target=getItem();if(target&&!target.locked){const handle=getHandle(p,target);if(handle){interaction={kind:handle,itemId:target.id,p0:p,original:clone(target)};canvas.setPointerCapture(ev.pointerId);return;}}for(let i=doc.items.length-1;i>=0;i--){const o=doc.items[i];if(hitItem(p,o)){if(selectedId!==o.id)pickSelected(o.id);if(!o.locked){interaction={kind:'move',itemId:o.id,p0:p,original:clone(o)};canvas.classList.add('dragging');canvas.setPointerCapture(ev.pointerId);}return;}}pickSelected(null);}
function pointerMove(ev){const p=getPoint(ev);if(drawing){const pts=drawing.points;if(Math.hypot(p.x-pts[pts.length-1].x,p.y-pts[pts.length-1].y)>1)pts.push(p);render();return;}if(!interaction)return;const o=doc.items.find(i=>i.id===interaction.itemId);if(!o)return;const init=interaction.original;const dx=p.x-interaction.p0.x,dy=p.y-interaction.p0.y;
 if(interaction.kind==='move'){o.x=init.x+dx;o.y=init.y+dy;}
 else if(interaction.kind==='rotate'){const a=Math.atan2(p.y-o.y,p.x-o.x), a0=Math.atan2(interaction.p0.y-o.y,interaction.p0.x-o.x);o.rotation=Math.round(init.rotation+(a-a0)*180/PI);}
 else{const l=localPoint(p,init);o.w=Math.max(25,Math.abs(l.x)*2);o.h=Math.max(25,Math.abs(l.y)*2);if((o.maintainRatio??o.type==='image')!==!!ev.shiftKey){const ar=init.w/Math.max(1,init.h);const scale=Math.max(o.w/init.w,o.h/init.h);o.w=Math.max(25,init.w*scale);o.h=o.w/ar;}if(o.referenceW)o.relativeSize=Math.round(o.w/o.referenceW*100);}
 render();}
function pointerUp(ev){if(drawing){const pts=drawing.points;if(pts.length>1){let xs=pts.map(q=>q.x),ys=pts.map(q=>q.y);const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),cx=(minX+maxX)/2,cy=(minY+maxY)/2;const obj={id:uid(),type:'draw',name:'Lukisan',visible:true,locked:false,x:cx,y:cy,w:Math.max(25,maxX-minX),h:Math.max(25,maxY-minY),baseW:Math.max(25,maxX-minX),baseH:Math.max(25,maxY-minY),rotation:0,opacity:drawing.opacity,size:drawing.size,color:drawing.color,points:pts.map(pt=>({x:pt.x-cx,y:pt.y-cy}))};doc.items.push(obj);selectedId=obj.id;commit();$('#layerCount').textContent=doc.items.length;}drawing=null;render();return;}if(interaction){interaction=null;canvas.classList.remove('dragging');commit();refreshPanel();render();}}
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);}
function filenameBase(){return (doc.name||'pixellab-design').replace(/[^\w\-\u00c0-\u024f\u1e00-\u1eff ]/g,'').trim().replace(/\s+/g,'-').slice(0,65)||'pixellab-design';}
function saveProject(){doc.name=$('#projectName').value.trim()||'Reka Bentuk Saya';const blob=new Blob([JSON.stringify({format:'pixellab-studio',version:2,...doc,customFonts:importedFontContent()},null,2)],{type:'application/json'});download(blob,filenameBase()+'.pixellab.json');commit();toast('Fail projek JSON disimpan');}
function onProjectFile(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!Array.isArray(data.items)||!Number.isFinite(data.width)||!Number.isFinite(data.height)||data.width<100||data.width>8000||data.height<100||data.height>8000)throw Error('Bukan projek sah');doc={name:String(data.name||'Projek dibuka'),width:data.width,height:data.height,background:data.background||{type:'color',color:'#ffffff'},items:data.items.filter(i=>i&&typeof i==='object'),customFonts:Array.isArray(data.customFonts)?data.customFonts.filter(f=>f&&typeof f.family==='string'&&typeof f.src==='string'):[]};loadProjectFonts(true);selectedId=null;canvas.width=doc.width;canvas.height=doc.height;$('#projectName').value=doc.name;history=[];historyIndex=-1;commit();syncPreset();fitCanvas();panelMode='home';refreshPanel();render();toast('Projek berjaya dibuka');}catch(e){toast('Fail projek JSON tidak sah');}};reader.readAsText(file);}
function exportCanvas(scale=1,format='png'){const c=document.createElement('canvas');c.width=Math.round(doc.width*scale);c.height=Math.round(doc.height*scale);const context=c.getContext('2d');context.scale(scale,scale);if(format==='jpeg'&&doc.background.type==='transparent'){context.fillStyle='#ffffff';context.fillRect(0,0,doc.width,doc.height);}renderScene(context,false);return c;}
async function exportImage(format,scale){const c=exportCanvas(scale,format);const type={'png':'image/png','jpeg':'image/jpeg','webp':'image/webp'}[format]||'image/png';return new Promise(res=>c.toBlob(res,type,.94));}
async function startExport(share=false){const format=$('#outFormat')?.value||'png',scale=+($('#outScale')?.value||'1');const btn=$('#confirmExport');if(btn){btn.disabled=true;btn.textContent='Menyediakan…';}try{const blob=await exportImage(format,scale);if(!blob)throw Error('Export failed');const fn=filenameBase()+'.'+(format==='jpeg'?'jpg':format);if(share&&navigator.share&&navigator.canShare){const file=new File([blob],fn,{type:blob.type});if(navigator.canShare({files:[file]}))await navigator.share({files:[file],title:doc.name});else download(blob,fn);}else download(blob,fn);toast(share?'Imej sedia untuk dikongsi':'Imej berjaya dieksport');hideModal();}catch(e){if(e.name!=='AbortError')toast('Eksport/kongsi gagal — cuba format PNG');}finally{if(btn){btn.disabled=false;btn.textContent='↥ Muat turun';}}}
function showModal(title,html,extraClass=''){$('#modalTitle').textContent=title;$('#modalContent').innerHTML=html;$('.modal').className='modal '+extraClass;$('#modalShell').hidden=false;}
function hideModal(){$('#modalShell').hidden=true;$('.modal').className='modal';syncPreset();}
function showExportModal(){showModal('Eksport reka bentuk',`<div class="export-preview" id="previewSpot"></div><div class="grid-two"><div class="field"><label>Format gambar</label><select id="outFormat"><option value="png">PNG — kualiti tinggi</option><option value="jpeg">JPG — saiz kecil</option><option value="webp">WebP — moden</option></select></div><div class="field"><label>Resolusi</label><select id="outScale"><option value="1">1× · ${doc.width} × ${doc.height}</option><option value="2">2× · ${doc.width*2} × ${doc.height*2}</option><option value="3">3× · ${doc.width*3} × ${doc.height*3}</option></select></div></div><div class="tip-line">Imej dieksport tanpa bingkai pilihan dan pemegang objek. PNG menyokong latar telus.</div><div class="modal-actions"><button class="btn secondary" id="shareExport">↗ Kongsi</button><button class="btn primary" id="confirmExport">↥ Muat turun</button></div>`);const preview=exportCanvas(.15,'png');$('#previewSpot').appendChild(preview);$('#confirmExport').onclick=()=>startExport(false);$('#shareExport').onclick=()=>startExport(true);}
function showResizeModal(){
 showModal('Saiz kanvas',`<p class="muted">Ubah resolusi. Aktifkan Maintain Ratio untuk mengekalkan nisbah kanvas.</p><div class="grid-two"><div class="field"><label>Lebar (px)</label><input id="customW" type="number" min="100" max="5000" value="${doc.width}"></div><div class="field"><label>Tinggi (px)</label><input id="customH" type="number" min="100" max="5000" value="${doc.height}"></div></div><label class="ratio-check"><input id="lockCanvasRatio" type="checkbox" checked><span>⌁ Maintain Ratio</span></label><div class="modal-actions"><button id="cancelResize" class="btn secondary">Batal</button><button id="confirmResize" class="btn primary">Guna saiz</button></div>`);
 const r=doc.width/doc.height;$('#customW').addEventListener('input',()=>{if($('#lockCanvasRatio').checked)$('#customH').value=Math.round(asNum($('#customW').value,doc.width)/r);});$('#customH').addEventListener('input',()=>{if($('#lockCanvasRatio').checked)$('#customW').value=Math.round(asNum($('#customH').value,doc.height)*r);});$('#cancelResize').onclick=hideModal;
 $('#confirmResize').onclick=()=>{const w=clamp(Math.round(asNum($('#customW').value,doc.width)),100,5000),h=clamp(Math.round(asNum($('#customH').value,doc.height)),100,5000);resizeDoc(w,h);hideModal();};
}
function resizeDoc(w,h){const ratioX=w/doc.width,ratioY=h/doc.height;doc.items.forEach(o=>{o.x*=ratioX;o.y*=ratioY;if(o.maintainRatio??o.type==='image'){const r=Math.min(ratioX,ratioY);o.w*=r;o.h*=r;}else{o.w*=ratioX;o.h*=ratioY;}if(o.referenceW)o.relativeSize=Math.round(o.w/o.referenceW*100);});doc.width=w;doc.height=h;canvas.width=w;canvas.height=h;syncPreset();fitCanvas();render();commit();toast('Saiz kanvas ditukar');}
function syncPreset(){const v=doc.width+'x'+doc.height;const el=$('#presetSelect');el.querySelectorAll('[data-dynamic-size]').forEach(x=>x.remove());if(![...el.options].some(o=>o.value===v)){const opt=document.createElement('option');opt.value=v;opt.dataset.dynamicSize='1';opt.textContent='Saiz imej · '+doc.width+' × '+doc.height;el.insertBefore(opt,el.querySelector('[value=custom]'));}el.value=v;}
function cleanBg(img,o){if(!o.removeBg)return img;const key=[o.src,o.removeColor,o.tolerance].join('|');if(transparentCache.has(key))return transparentCache.get(key);try{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0);const pixels=cx.getImageData(0,0,c.width,c.height);const hex=(o.removeColor||'#ffffff').replace('#','');const target=[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)];for(let i=0;i<pixels.data.length;i+=4){const d=Math.hypot(pixels.data[i]-target[0],pixels.data[i+1]-target[1],pixels.data[i+2]-target[2]);if(d<o.tolerance)pixels.data[i+3]=0;else if(d<o.tolerance+28)pixels.data[i+3]*=(d-o.tolerance)/28;}cx.putImageData(pixels,0,0);transparentCache.set(key,c);if(transparentCache.size>8)transparentCache.delete(transparentCache.keys().next().value);return c;}catch(e){return img;}}
function drawBackground(context,editing){const bg=doc.background||{type:'color',color:'#ffffff'};const w=doc.width,h=doc.height;if(bg.type==='transparent'){if(editing){context.save();const sz=28;for(let y=0;y<h;y+=sz)for(let x=0;x<w;x+=sz){context.fillStyle=((x/sz+y/sz)%2===0)?'#e9ebf0':'#c8cbd5';context.fillRect(x,y,sz,sz);}context.restore();}return;}if(bg.type==='image'&&bg.src){const image=imgObj(bg.src);if(image){const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight);const ww=image.naturalWidth*scale,hh=image.naturalHeight*scale;context.drawImage(image,(w-ww)/2,(h-hh)/2,ww,hh);}else{context.fillStyle=bg.color||'#202040';context.fillRect(0,0,w,h);}return;}if(bg.type==='gradient'){const a=rad(bg.angle||0),cx=w/2,cy=h/2,dist=Math.hypot(w,h)/2;const g=context.createLinearGradient(cx-Math.cos(a)*dist,cy-Math.sin(a)*dist,cx+Math.cos(a)*dist,cy+Math.sin(a)*dist);g.addColorStop(0,bg.color||'#11142a');g.addColorStop(1,bg.color2||'#7444ad');context.fillStyle=g;}else context.fillStyle=bg.color||'#ffffff';context.fillRect(0,0,w,h);}
function makeShapePath(c,o){const w=o.w,h=o.h;const x=-w/2,y=-h/2;c.beginPath();switch(o.shape){case'circle':c.ellipse(0,0,w/2,h/2,0,0,2*PI);break;case'roundrect':{const r=clamp(o.roundness||0,0,Math.min(w,h)/2);c.roundRect(x,y,w,h,r);break;}case'triangle':c.moveTo(0,y);c.lineTo(w/2,h/2);c.lineTo(-w/2,h/2);c.closePath();break;case'star':{for(let i=0;i<10;i++){const a=-PI/2+i*PI/5,r=i%2===0?1:.44,px=Math.cos(a)*w/2*r,py=Math.sin(a)*h/2*r;i===0?c.moveTo(px,py):c.lineTo(px,py);}c.closePath();break;}case'diamond':c.moveTo(0,y);c.lineTo(w/2,0);c.lineTo(0,h/2);c.lineTo(-w/2,0);c.closePath();break;case'line':c.moveTo(-w/2,h/2);c.lineTo(w/2,-h/2);break;case'arrow':{c.moveTo(-w/2,-h*.13);c.lineTo(w*.1,-h*.13);c.lineTo(w*.1,-h*.3);c.lineTo(w/2,0);c.lineTo(w*.1,h*.3);c.lineTo(w*.1,h*.13);c.lineTo(-w/2,h*.13);c.closePath();break;}
 case'pentagon':case'hexagon':case'octagon':{const n=o.shape==='pentagon'?5:o.shape==='hexagon'?6:8;for(let i=0;i<n;i++){const a=-PI/2+2*PI*i/n,px=Math.cos(a)*w/2,py=Math.sin(a)*h/2;i===0?c.moveTo(px,py):c.lineTo(px,py);}c.closePath();break;}
 case'heart':c.moveTo(0,h*.43);c.bezierCurveTo(-w*.09,h*.34,-w*.51,h*.03,-w*.5,-h*.24);c.bezierCurveTo(-w*.49,-h*.55,-w*.13,-h*.63,0,-h*.26);c.bezierCurveTo(w*.13,-h*.63,w*.49,-h*.55,w*.5,-h*.24);c.bezierCurveTo(w*.51,h*.03,w*.09,h*.34,0,h*.43);c.closePath();break;
 case'cross':{const a=w*.17,b=h*.17;c.moveTo(-a,y);c.lineTo(a,y);c.lineTo(a,-b);c.lineTo(w/2,-b);c.lineTo(w/2,b);c.lineTo(a,b);c.lineTo(a,h/2);c.lineTo(-a,h/2);c.lineTo(-a,b);c.lineTo(-w/2,b);c.lineTo(-w/2,-b);c.lineTo(-a,-b);c.closePath();break;}
 case'bolt':c.moveTo(w*.08,y);c.lineTo(-w*.32,-h*.01);c.lineTo(-w*.07,-h*.01);c.lineTo(-w*.2,h/2);c.lineTo(w*.34,-h*.1);c.lineTo(w*.08,-h*.1);c.closePath();break;
 case'speech':c.moveTo(-w*.41,-h*.44);c.lineTo(w*.41,-h*.44);c.quadraticCurveTo(w*.49,-h*.44,w*.49,-h*.32);c.lineTo(w*.49,h*.2);c.quadraticCurveTo(w*.49,h*.32,w*.36,h*.32);c.lineTo(-w*.03,h*.32);c.lineTo(-w*.3,h*.49);c.lineTo(-w*.23,h*.32);c.lineTo(-w*.41,h*.32);c.quadraticCurveTo(-w*.49,h*.32,-w*.49,h*.2);c.lineTo(-w*.49,-h*.32);c.quadraticCurveTo(-w*.49,-h*.44,-w*.41,-h*.44);c.closePath();break;
 case'cloud':c.moveTo(-w*.29,h*.28);c.bezierCurveTo(-w*.61,h*.27,-w*.61,-h*.08,-w*.38,-h*.15);c.bezierCurveTo(-w*.38,-h*.51,-w*.04,-h*.57,w*.12,-h*.32);c.bezierCurveTo(w*.40,-h*.42,w*.52,-h*.17,w*.41,-h*.01);c.bezierCurveTo(w*.64,h*.12,w*.48,h*.31,w*.27,h*.28);c.closePath();break;
 case'trapezoid':c.moveTo(-w*.3,y);c.lineTo(w*.3,y);c.lineTo(w/2,h/2);c.lineTo(-w/2,h/2);c.closePath();break;
 case'parallelogram':c.moveTo(-w*.3,y);c.lineTo(w/2,y);c.lineTo(w*.3,h/2);c.lineTo(-w/2,h/2);c.closePath();break;
 case'chevron':c.moveTo(-w/2,y);c.lineTo(-w*.03,y);c.lineTo(w/2,0);c.lineTo(-w*.03,h/2);c.lineTo(-w/2,h/2);c.lineTo(0,0);c.closePath();break;
 case'righttriangle':c.moveTo(-w/2,y);c.lineTo(-w/2,h/2);c.lineTo(w/2,h/2);c.closePath();break;
 case'semicircle':c.moveTo(-w/2,h/2);c.ellipse(0,h/2,w/2,h,0,PI,2*PI);c.closePath();break;
 case'shield':c.moveTo(-w*.44,y);c.lineTo(w*.44,y);c.lineTo(w*.4,h*.12);c.quadraticCurveTo(w*.31,h*.36,0,h/2);c.quadraticCurveTo(-w*.31,h*.36,-w*.4,h*.12);c.closePath();break;
 default:c.rect(x,y,w,h);}}
function drawShape(c,o){makeShapePath(c,o);if(o.gradient){const g=c.createLinearGradient(-o.w/2,-o.h/2,o.w/2,o.h/2);g.addColorStop(0,o.color);g.addColorStop(1,o.color2);c.fillStyle=g;}else c.fillStyle=o.color;c.fill();if(o.strokeWidth>0){c.strokeStyle=o.strokeColor;c.lineWidth=o.strokeWidth;c.stroke();}if(o.shape==='line'&&o.strokeWidth===0){c.strokeStyle=o.color;c.lineWidth=Math.max(5,o.h/16);c.stroke();}}
function drawImageLayer(c,o){const image=imgObj(o.src);if(!image)return;const im=cleanBg(image,o);let sx=(o.cropLeft||0)/100*im.width,sy=(o.cropTop||0)/100*im.height;let sw=im.width*(1-((o.cropLeft||0)+(o.cropRight||0))/100),sh=im.height*(1-((o.cropTop||0)+(o.cropBottom||0))/100);sw=Math.max(1,sw);sh=Math.max(1,sh);const filter=['brightness('+o.brightness+'%)','contrast('+o.contrast+'%)','saturate('+o.saturation+'%)','blur('+(o.blur||0)+'px)'];if(o.effect==='grayscale')filter.push('grayscale(100%)');if(o.effect==='sepia')filter.push('sepia(100%)');if(o.effect==='invert')filter.push('invert(100%)');if(o.effect==='vintage')filter.push('sepia(55%) contrast(90%) saturate(80%)');c.save();c.filter=filter.join(' ');if(o.skewX||o.skewY)c.transform(1,(o.skewY||0)/100,(o.skewX||0)/100,1,0,0);
 if(!o.perspective){c.drawImage(im,sx,sy,sw,sh,-o.w/2,-o.h/2,o.w,o.h);}else{const steps=96,p=clamp((o.perspective||0)/100,-.75,.75);for(let n=0;n<steps;n++){const t=n/steps,fw=1+p*(t*2-1),sliceH=o.h/steps+1,x=-o.w*fw/2,y=-o.h/2+t*o.h;c.drawImage(im,sx,sy+sh*t,sw,sh/steps+1,-o.w*fw/2,y,o.w*fw,sliceH);}}
 c.restore();}
function textLayout(c,o){const lines=String(o.text||' ').split('\n'),fontSize=+o.fontSize||100;c.font=`${o.italic?'italic ':''}${o.weight||'700'} ${fontSize}px "${o.font||'Arial'}", Arial, sans-serif`;c.textBaseline='middle';const maxLines=Math.max(1,lines.length),lineHeight=fontSize*1.06;return{lines,fontSize,lineHeight,startY:-(maxLines-1)*lineHeight/2};}
function runText(c,o,mode='fill'){const L=textLayout(c,o);const {lines,lineHeight,startY}=L;for(let li=0;li<lines.length;li++){const line=lines[li]||' ';const widths=[...line].map(ch=>c.measureText(ch).width);const fullWidth=widths.reduce((a,b)=>a+b,0)+Math.max(0,line.length-1)*(o.letterSpacing||0);let start= o.align==='left'?-o.w/2:o.align==='right'?o.w/2-fullWidth:-fullWidth/2;const y=startY+li*lineHeight;
 if(!(o.letterSpacing||o.curve)){c.textAlign=o.align||'center';c[mode+'Text'](line,o.align==='left'?-o.w/2:o.align==='right'?o.w/2:0,y);continue;}
 for(let j=0;j<line.length;j++){const width=widths[j],x=start+width/2;const normalized=fullWidth>0?((x-(o.align==='left'?-o.w/2:o.align==='right'?o.w/2-fullWidth:-fullWidth/2))/fullWidth-.5)*2:0;const bend=(o.curve||0)*2.4;const cy=-bend*(1-normalized*normalized);const tilt=bend===0?0:Math.atan2(4*bend*normalized,fullWidth);c.save();c.translate(x,y+cy);c.rotate(tilt);c.textAlign='center';c[mode+'Text'](line[j],0,0);c.restore();start+=width+(o.letterSpacing||0);}
 }}
function drawText(c,o){const pad=120,baseW=Math.max(1,Math.ceil(o.w+2*pad)),baseH=Math.max(1,Math.ceil(o.h+2*pad));const mask=document.createElement('canvas');mask.width=baseW;mask.height=baseH;const m=mask.getContext('2d');m.translate(baseW/2,baseH/2);
 if(o.emboss){m.save();m.translate(-3,-3);m.fillStyle='#ffffff9c';runText(m,o,'fill');m.restore();m.save();m.translate(4,4);m.fillStyle='#00000088';runText(m,o,'fill');m.restore();}
 if(o.depth3d>0){for(let z=Math.min(o.depth3d,45);z>=1;z-=2){m.save();m.translate(z*.8,z*.8);m.fillStyle='#241741';runText(m,o,'fill');m.restore();}}
 if(o.shadow){m.save();m.shadowColor=o.shadowColor||'#000000';m.shadowBlur=o.shadowBlur||0;m.shadowOffsetX=o.shadowX||0;m.shadowOffsetY=o.shadowY||0;m.fillStyle=o.color||'#ffffff';runText(m,o,'fill');m.restore();}
 if(o.strokeWidth>0){m.save();m.lineWidth=o.strokeWidth*2;m.strokeStyle=o.strokeColor||'#000000';m.lineJoin='round';runText(m,o,'stroke');m.restore();}
 const fillLayer=document.createElement('canvas');fillLayer.width=baseW;fillLayer.height=baseH;const f=fillLayer.getContext('2d');f.translate(baseW/2,baseH/2);f.fillStyle='#fff';runText(f,o,'fill');f.globalCompositeOperation='source-in';if(o.textureSrc){const texture=imgObj(o.textureSrc);if(texture){f.drawImage(texture,-baseW/2,-baseH/2,baseW,baseH);}else{f.fillStyle=o.color;f.fillRect(-baseW/2,-baseH/2,baseW,baseH);}}else if(o.gradient){const g=f.createLinearGradient(0,-o.fontSize*1.6,0,o.fontSize*1.6);g.addColorStop(0,o.color||'#ffffff');g.addColorStop(1,o.color2||'#a68aff');f.fillStyle=g;f.fillRect(-baseW/2,-baseH/2,baseW,baseH);}else{f.fillStyle=o.color||'#ffffff';f.fillRect(-baseW/2,-baseH/2,baseW,baseH);}if(o.innerShadow){f.save();f.globalCompositeOperation='source-atop';f.filter='blur(4px)';f.translate(5,6);f.fillStyle='#00000066';runText(f,o,'fill');f.restore();}
 m.drawImage(fillLayer,-baseW/2,-baseH/2);c.drawImage(mask,-baseW/2,-baseH/2);
 if(o.reflection){c.save();c.translate(0,o.fontSize*1.15);c.scale(1,-.48);c.globalAlpha*=.24;c.drawImage(fillLayer,-baseW/2,-baseH/2);c.restore();}
}
function drawPath(c,o){if(!o.points?.length)return;c.scale(o.w/(o.baseW||o.w),o.h/(o.baseH||o.h));c.strokeStyle=o.color;c.lineWidth=o.size;c.lineJoin='round';c.lineCap='round';c.beginPath();o.points.forEach((p,i)=>{if(i===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);});if(o.points.length===1)c.lineTo(o.points[0].x+.1,o.points[0].y+.1);c.stroke();}
function drawItem(c,o){if(o.visible===false)return;c.save();c.translate(o.x,o.y);c.rotate(rad(o.rotation||0));if(o.flipX)c.scale(-1,1);c.globalAlpha=clamp(o.opacity??1,0,1);if(o.type==='shape')drawShape(c,o);else if(o.type==='text')drawText(c,o);else if(o.type==='image')drawImageLayer(c,o);else if(o.type==='sticker'){c.textAlign='center';c.textBaseline='middle';c.font=`${Math.min(o.w,o.h)*.8}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;c.fillText(o.emoji||'⭐',0,0);}else if(o.type==='draw')drawPath(c,o);c.restore();}
function drawSelection(c,o){c.save();c.translate(o.x,o.y);c.rotate(rad(o.rotation||0));c.lineWidth=3;c.strokeStyle='#a77aff';c.setLineDash([13,8]);c.strokeRect(-o.w/2,-o.h/2,o.w,o.h);c.setLineDash([]);if(!o.locked){c.strokeStyle='#b18dff';c.beginPath();c.moveTo(0,-o.h/2);c.lineTo(0,-o.h/2-54);c.stroke();c.fillStyle='#a77aff';c.beginPath();c.arc(0,-o.h/2-54,11,0,2*PI);c.fill();for(const [x,y] of [[-o.w/2,-o.h/2],[o.w/2,-o.h/2],[-o.w/2,o.h/2],[o.w/2,o.h/2]]){c.fillStyle='#f8f5ff';c.fillRect(x-9,y-9,18,18);c.strokeStyle='#9274f6';c.lineWidth=2;c.strokeRect(x-9,y-9,18,18);}}
 c.restore();}
function renderScene(c,editing=true){c.save();drawBackground(c,editing);for(const o of doc.items)drawItem(c,o);if(editing){if(drawing&&drawing.points.length){c.save();c.strokeStyle=drawing.color;c.globalAlpha=drawing.opacity;c.lineWidth=drawing.size;c.lineCap='round';c.lineJoin='round';c.beginPath();drawing.points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.restore();}const sel=getItem();if(sel&&sel.visible)drawSelection(c,sel);}c.restore();}
let renderScheduled=false;function render(){if(renderScheduled)return;renderScheduled=true;requestAnimationFrame(()=>{renderScheduled=false;ctx.clearRect(0,0,canvas.width,canvas.height);renderScene(ctx,true);});}
// ---------- Property editor ----------
function propAttr(scope,key){return `data-scope="${scope}" data-key="${escapeHTML(key)}"`;}
// All slider properties have an editable keyboard input. Editing finishes on Enter / Tab / blur.
function rangeField(scope,key,label,value,min,max,step=1,suffix=''){
 return `<div class="field"><label>${escapeHTML(label)}</label><div class="with-number"><input type="range" ${propAttr(scope,key)} min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${escapeHTML(label)} — slider"><div class="number-wrap"><input class="range-number" type="number" inputmode="decimal" ${propAttr(scope,key)} min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${escapeHTML(label)} — taip nombor" title="Taip nombor dan tekan Enter">${suffix?`<span class="number-unit">${escapeHTML(suffix)}</span>`:''}</div></div></div>`;
}
function numField(scope,key,label,value,min=-99999,max=99999,step=1){return `<div class="field"><label>${label}</label><input type="number" ${propAttr(scope,key)} min="${min}" max="${max}" step="${step}" value="${value}"></div>`;}
function textField(scope,key,label,value,multiline=false){return `<div class="field"><label>${label}</label>${multiline?`<textarea ${propAttr(scope,key)} rows="3">${escapeHTML(value)}</textarea>`:`<input type="text" ${propAttr(scope,key)} value="${escapeHTML(value)}">`}</div>`;}
function colorField(scope,key,label,value){return `<div class="field"><label>${label}</label><div class="color-field"><input type="color" ${propAttr(scope,key)} value="${/^#[0-9a-f]{6}$/i.test(value)?value:'#ffffff'}"><span>${escapeHTML(value)}</span></div></div>`;}
function chooseField(scope,key,label,value,opts){return `<div class="field"><label>${label}</label><select ${propAttr(scope,key)}>${opts.map(([v,l])=>`<option value="${escapeHTML(v)}" ${v===value?'selected':''}>${escapeHTML(l)}</option>`).join('')}</select></div>`;}
function toggleField(scope,key,label,value){return `<div class="inline-field"><label>${label}</label><input class="switch" type="checkbox" ${propAttr(scope,key)} ${value?'checked':''} aria-label="${escapeHTML(label)}"></div>`;}
function section(title,inner,note=''){return `<section class="field-section"><h3 class="section-title">${title}${note?`<span class="section-note">${note}</span>`:''}</h3>${inner}</section>`;}
function transformProps(o){return section('Saiz & posisi',`<label class="ratio-check"><input type="checkbox" class="switch" data-scope="item" data-key="maintainRatio" ${(o.maintainRatio??o.type==='image')?'checked':''}><span>Maintain Ratio <small>· kekalkan nisbah semasa resize</small></span></label><div class="field relative-size-field"><label>Relative Size <strong>${Math.round(o.relativeSize??100)}%</strong></label><div class="with-number"><input type="range" ${propAttr('item','relativeSize')} min="10" max="300" step="1" value="${clamp(Math.round(o.relativeSize??100),10,300)}" aria-label="Relative Size — slider"><div class="number-wrap"><input class="range-number" type="number" inputmode="numeric" ${propAttr('item','relativeSize')} min="10" max="300" step="1" value="${clamp(Math.round(o.relativeSize??100),10,300)}" aria-label="Relative Size — taip peratus"><span class="number-unit">%</span></div></div><div class="relative-presets"><button data-relative="50">50%</button><button data-relative="75">75%</button><button data-relative="100">100%</button><button data-relative="150">150%</button></div></div><div class="grid-two">${numField('item','w','Lebar (px)',Math.round(o.w),20,5000)}${numField('item','h','Tinggi (px)',Math.round(o.h),20,5000)}${numField('item','x','Posisi X',Math.round(o.x))}${numField('item','y','Posisi Y',Math.round(o.y))}</div>${rangeField('item','rotation','Putaran (°)',o.rotation||0,-180,180)}${rangeField('item','opacity','Kelegapan',o.opacity??1,0,1,.01)}<div class="action-stack"><button class="mini-btn" data-action="alignH">↔ Tengah H</button><button class="mini-btn" data-action="alignV">↕ Tengah V</button><button class="mini-btn" data-action="flipH">⇆ Cermin</button><button class="mini-btn" data-action="duplicate">▢ Gandakan</button></div>`);}
function objectControls(o){return section('▱ Susunan layer',`<div class="action-stack"><button class="mini-btn" data-action="upLayer">↑ Ke depan</button><button class="mini-btn" data-action="downLayer">↓ Ke belakang</button><button class="mini-btn" data-action="lock">${o.locked?'🔓 Buka kunci':'🔒 Kunci objek'}</button><button class="mini-btn" data-action="visible">${o.visible?'◉ Sembunyi':'◎ Tunjuk'}</button><button class="mini-btn danger full" data-action="delete">⌫ Padam objek</button></div>`);}
function textInspector(o){return section('✎ Kandungan teks',textField('item','text','Edit Text',o.text,true)+chooseField('item','font','Jenis font',o.font,projectFontOptions())+`<button class="mini-btn full" type="button" data-action="importFont">＋ Import banyak font · TTF / OTF / WOFF / WOFF2</button><button class="mini-btn full" type="button" data-action="fontLibrary">▤ Pustaka font yang tersimpan</button><p class="field-help">Import banyak fail serentak. Font kekal dalam pelayar dan disertakan dalam projek JSON apabila digunakan.</p><div class="grid-two">${chooseField('item','weight','Ketebalan',o.weight,[['400','Regular'],['600','Semibold'],['700','Bold'],['900','Extra Bold']])}${toggleField('item','italic','Italic',o.italic)}</div>`)+section('Aa Tipografi',rangeField('item','fontSize','Saiz tulisan',o.fontSize,12,400)+rangeField('item','letterSpacing','Jarak huruf',o.letterSpacing,-10,45)+`<div class="field"><label>Align — penjajaran</label><div class="segmented">${[['left','≡ Kiri'],['center','≡ Tengah'],['right','≡ Kanan']].map(([v,l])=>`<button data-set="align" data-val="${v}" class="${o.align===v?'active':''}">${l}</button>`).join('')}</div></div>`+rangeField('item','curve','Curve — lengkung tulisan',o.curve,-100,100))+
 section('🎨 Warna & efek',`<div class="grid-two">${colorField('item','color','Warna teks',o.color)}${colorField('item','color2','Warna kedua',o.color2)}</div>`+toggleField('item','gradient','Gradient dua warna',o.gradient)+rangeField('item','strokeWidth','Stroke / outline',o.strokeWidth,0,30)+colorField('item','strokeColor','Warna outline',o.strokeColor)+toggleField('item','shadow','Shadow',o.shadow)+colorField('item','shadowColor','Warna bayang',o.shadowColor)+`<div class="grid-two">${numField('item','shadowX','Bayang X',o.shadowX,-150,150)}${numField('item','shadowY','Bayang Y',o.shadowY,-150,150)}</div>`+rangeField('item','shadowBlur','Kabur bayang',o.shadowBlur,0,70)+toggleField('item','innerShadow','Inner shadow',o.innerShadow)+rangeField('item','depth3d','3D Text — kedalaman',o.depth3d,0,45)+toggleField('item','reflection','Reflection / pantulan',o.reflection)+toggleField('item','emboss','Emboss / kesan timbul',o.emboss)+`<button class="mini-btn full" data-action="texture">▧ Import tekstur tulisan</button>${o.textureSrc?`<button class="mini-btn full" data-action="clearTexture">× Buang tekstur</button>`:''}`)+transformProps(o)+objectControls(o);}
function imageInspector(o){return section('▧ Sunting imej',`<div class="action-stack"><button class="mini-btn" data-action="replaceImage">▧ Tukar gambar</button><button class="mini-btn" data-action="cropReset">⟲ Reset crop</button></div><p class="field-help">Crop memotong bahagian imej mengikut peratus dari setiap sisi.</p><div class="grid-two">${numField('item','cropLeft','Crop kiri %',o.cropLeft,0,90)}${numField('item','cropRight','Crop kanan %',o.cropRight,0,90)}${numField('item','cropTop','Crop atas %',o.cropTop,0,90)}${numField('item','cropBottom','Crop bawah %',o.cropBottom,0,90)}</div>`)+section('◉ Kesan gambar',chooseField('item','effect','Image Effects',o.effect,[['none','Normal'],['grayscale','Hitam & putih'],['sepia','Sepia'],['vintage','Vintage'],['invert','Warna songsang']])+rangeField('item','brightness','Kecerahan',o.brightness,0,200)+rangeField('item','contrast','Kontras',o.contrast,0,200)+rangeField('item','saturation','Saturasi',o.saturation,0,200)+rangeField('item','blur','Blur',o.blur,0,16))+
 section('✂ Buang background',`<p class="field-help">Buang warna latar sekata, contohnya putih. Hasil terbaik untuk imej berlatar rata.</p>`+toggleField('item','removeBg','Aktifkan remove background',o.removeBg)+colorField('item','removeColor','Warna yang dibuang',o.removeColor)+rangeField('item','tolerance','Toleransi warna',o.tolerance,5,180))+
 section('◩ Perspektif & condong',rangeField('item','perspective','Perspektif (trapezium)',o.perspective,-70,70)+rangeField('item','skewX','Condong X',o.skewX,-75,75)+rangeField('item','skewY','Condong Y',o.skewY,-75,75))+transformProps(o)+objectControls(o);}
function shapeInspector(o){return section('◯ Bentuk & warna',chooseField('item','shape','Jenis bentuk',o.shape,shapes.map(s=>[s.id,s.label]))+`<div class="grid-two">${colorField('item','color','Warna bentuk',o.color)}${colorField('item','color2','Warna kedua',o.color2)}</div>`+toggleField('item','gradient','Gradient pada bentuk',o.gradient)+rangeField('item','strokeWidth','Saiz outline',o.strokeWidth,0,38)+colorField('item','strokeColor','Warna outline',o.strokeColor)+(o.shape==='roundrect'?rangeField('item','roundness','Lengkungan penjuru',o.roundness,0,160):''))+transformProps(o)+objectControls(o);}
function drawInspector(){return section('✎ Berus lukisan',colorField('brush','color','Warna pen',brush.color)+rangeField('brush','size','Pen Size / ketebalan',brush.size,2,90)+rangeField('brush','opacity','Ketelusan berus',brush.opacity,.1,1,.05)+`<div class="tip-line">Sentuh atau seret di atas kanvas untuk melukis secara bebas. Lukisan disimpan sebagai layer tersendiri.</div><button class="mini-btn full" data-action="endDraw">↖ Kembali ke alat Pilih</button>`);}
function bgInspector(){const b=doc.background;return section('▦ Jenis latar',`<div class="palette-grid"><button class="palette-button labelled" data-bgtype="color">◼<small>Warna</small></button><button class="palette-button labelled" data-bgtype="gradient">◩<small>Gradient</small></button><button class="palette-button labelled" data-bgtype="image">▧<small>Imej</small></button><button class="palette-button labelled" data-bgtype="transparent">▦<small>Telus</small></button></div>`)+section('🎨 Warna latar',`<div class="grid-two">${colorField('bg','color','Warna pertama',b.color||'#ffffff')}${colorField('bg','color2','Warna kedua',b.color2||'#af8bff')}</div>`+(b.type==='gradient'?rangeField('bg','angle','Arah gradient',b.angle||0,0,360):'')+`<div class="field"><label>Warna pantas</label><div class="swatches">${palette.map(col=>`<button class="swatch" data-bgcolor="${col}" style="background:${col}" title="${col}"></button>`).join('')}</div></div>`+(b.type==='image'?`<button class="primary-wide" data-action="bgImage">↥ Pilih gambar latar</button>`:`<button class="mini-btn full" data-action="bgImage">▧ Import gambar sebagai latar</button>`))+
 section('☷ Tetapan kanvas',`<div class="grid-two">${numField('doc','width','Lebar px',doc.width,100,5000)}${numField('doc','height','Tinggi px',doc.height,100,5000)}</div><button class="mini-btn full" data-action="resizeDialog">↔ Tukar saiz kanvas</button>`);}
function stickerInspector(o){return section('✨ Pelekat / emoji',`<p class="field-help">Pilih stiker atau emoji untuk gantikan ikon terpilih.</p>`+stickerGroups.map(g=>`<div class="field"><label>${g.title}</label><div class="palette-grid">${g.items.map(e=>`<button class="palette-button" data-emoji="${e}">${e}</button>`).join('')}</div></div>`).join(''))+transformProps(o)+objectControls(o);}
function strokeInspector(o){return section('✎ Gaya lukisan',colorField('item','color','Warna garisan',o.color)+rangeField('item','size','Saiz pen',o.size,1,120))+transformProps(o)+objectControls(o);}
function shapePalette(){return `<div class="tip-line">Tambah bentuk ke kanvas. Pilih objek selepas menambah untuk ubah warna, saiz, outline dan putaran.</div>`+section('Bentuk asas',`<div class="palette-grid">${shapes.map(s=>`<button class="palette-button labelled" data-shape="${s.id}">${s.glyph}<small>${s.label}</small></button>`).join('')}</div>`);}
function stickerPalette(){return `<div class="tip-line">Pilih stiker atau emoji. Anda boleh seret, putar dan ubah saiz pada kanvas.</div>`+stickerGroups.map(g=>section(g.title,`<div class="palette-grid">${g.items.map(e=>`<button class="palette-button" data-emoji="${e}">${e}</button>`).join('')}</div>`)).join('');}
function homeInspector(){return `<div class="home-start"><div class="start-mark">✦</div><h3>Mula dengan imej anda</h3><p>Pilih gambar, crop ke nisbah pilihan dan mula menyunting.</p><button class="primary-wide" data-action="openCanvasImage">▧ Buka imej</button><button class="mini-btn full" data-action="quickText">＋ Tambah teks</button><button class="mini-btn full" data-action="fontLibrary">▤ Pustaka font · Import banyak</button></div>`+section('Kanvas',`<div class="canvas-summary"><span>Resolusi</span><strong>${doc.width} × ${doc.height}</strong></div><button class="mini-btn full" data-action="resizeDialog">Ubah saiz kanvas</button>`)+section('Projek',`<div class="action-stack"><button class="mini-btn" data-action="newProject">Projek baru</button><button class="mini-btn" data-action="openProject">Buka JSON</button><button class="mini-btn" data-action="saveProject">Simpan JSON</button><button class="mini-btn" data-action="showExport">Eksport imej</button></div>`);}
function layersInspector(){const items=[...doc.items].reverse();return `<div class="layer-toolbar"><button class="mini-btn" data-action="newProject">＋ Baru</button><button class="mini-btn" data-action="openProject">↥ Buka</button><button class="mini-btn" data-action="saveProject">▣ Simpan</button></div><div class="layer-toolbar"><button class="mini-btn" data-action="upLayer">↑ Depan</button><button class="mini-btn" data-action="downLayer">↓ Belakang</button><button class="mini-btn" data-action="duplicate">▢ Salin</button><button class="mini-btn" data-action="delete">⌫</button></div><p class="layer-note">Objek paling atas dalam senarai berada di hadapan pada kanvas. Klik untuk memilih atau gunakan butang anak panah.</p><div class="layer-list">${items.map(o=>`<div class="layer-row ${selectedId===o.id?'selected':''}" data-layer="${escapeHTML(o.id)}"><span class="layer-thumb">${o.type==='image'?`<img src="${escapeHTML(o.src)}" alt="">`:o.type==='sticker'?o.emoji:o.type==='text'?'T':o.type==='shape'?'◯':'✎'}</span><span class="layer-info"><strong>${escapeHTML(o.name||o.type)}</strong><small>${escapeHTML(o.type.toUpperCase())} · ${Math.round(o.w)} × ${Math.round(o.h)}</small></span><span class="layer-actions"><button data-layeraction="toggleVisible" data-id="${escapeHTML(o.id)}" title="Tunjuk atau sembunyi">${o.visible?'◉':'◎'}</button><button data-layeraction="toggleLock" data-id="${escapeHTML(o.id)}" title="Kunci layer">${o.locked?'🔒':'◇'}</button></span></div>`).join('')||'<div class="layer-empty">Belum ada layer</div>'}</div>`;}
function refreshPanel(){const o=getItem();$('#panelTitle').textContent=activeTab==='layers'?'Layers & susunan':panelMode==='background'?'Background':panelMode==='shape'?'Tambah bentuk':panelMode==='sticker'?'Stiker & emoji':panelMode==='draw'?'Alat lukisan':o?(o.type==='text'?'Editor teks':o.type==='image'?'Editor gambar':o.type==='shape'?'Editor bentuk':o.type==='sticker'?'Editor stiker':'Editor lukisan'):'Editor';$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===activeTab));$('#layerCount').textContent=doc.items.length;
 let html;if(activeTab==='layers')html=layersInspector();else if(panelMode==='background')html=bgInspector();else if(panelMode==='shape')html=shapePalette();else if(panelMode==='sticker')html=stickerPalette();else if(panelMode==='draw')html=drawInspector();else if(o){html=o.type==='text'?textInspector(o):o.type==='image'?imageInspector(o):o.type==='shape'?shapeInspector(o):o.type==='sticker'?stickerInspector(o):strokeInspector(o);}else html=homeInspector();panel.innerHTML=html;}
// Sync controls sharing the same property (slider + typed number).
function syncNumericControls(el,value){
 const group=el.closest('.field');
 if(!group)return;
 group.querySelectorAll('[data-scope][data-key]').forEach(other=>{
   if(other.dataset.scope===el.dataset.scope && other.dataset.key===el.dataset.key &&
      ['number','range'].includes(other.type)) other.value=value;
 });
}
function changeBound(el,final=false){
 const scope=el.dataset.scope,key=el.dataset.key;if(!scope||!key)return;
 const target=scope==='item'?getItem():scope==='bg'?doc.background:scope==='brush'?brush:doc;if(!target)return;
 let val;
 if(el.type==='checkbox') val=el.checked;
 else if(['range','number'].includes(el.type)){
   const raw=el.value.trim();
   val=raw!=='' && Number.isFinite(Number(raw)) ? Number(raw) : (Number(target[key])||0);
   // Limits apply to both range and keyboard input, including decimal values.
   if(el.hasAttribute('min'))val=Math.max(Number(el.min),val);
   if(el.hasAttribute('max'))val=Math.min(Number(el.max),val);
   if(el.type==='number')el.value=String(val);
   syncNumericControls(el,val);
 }else val=el.value;
 if(key==='opacity')val=clamp(val,0,1);
 if(/^crop/.test(key)){
   val=clamp(val,0,90);
   const other={cropLeft:'cropRight',cropRight:'cropLeft',cropTop:'cropBottom',cropBottom:'cropTop'}[key];
   if(target[other]+val>95)val=95-target[other];
   syncNumericControls(el,val);
 }
 if(scope==='doc'&&(key==='width'||key==='height')){
   if(final){const w=key==='width'?clamp(Math.round(val),100,5000):doc.width,h=key==='height'?clamp(Math.round(val),100,5000):doc.height;resizeDoc(w,h);refreshPanel();}
   return;
 }
 if(scope==='item'&&key==='relativeSize'){
   val=clamp(Math.round(val),10,300);
   if(!target.referenceW){target.referenceW=target.w;target.referenceH=target.h;}
   target.relativeSize=val;target.w=Math.max(20,target.referenceW*val/100);target.h=Math.max(20,target.referenceH*val/100);
   const show=panel.querySelector('.relative-size-field strong');if(show)show.textContent=val+'%';
   syncNumericControls(el,val);
   const w=panel.querySelector('[data-key="w"]'),h=panel.querySelector('[data-key="h"]');
   if(w)w.value=Math.round(target.w);if(h)h.value=Math.round(target.h);
 }else if(scope==='item'&&(key==='w'||key==='h')){
   val=clamp(val,20,5000);const rw=target.w,rh=target.h;
   if(target.maintainRatio??target.type==='image'){
     const ratio=rw/Math.max(1,rh);
     if(key==='w')target.h=clamp(val/ratio,20,5000);else target.w=clamp(val*ratio,20,5000);
     const other=panel.querySelector(`[data-key="${key==='w'?'h':'w'}"]`);
     if(other)other.value=Math.round(key==='w'?target.h:target.w);
   }
   target[key]=val;if(!target.referenceW){target.referenceW=rw;target.referenceH=rh;}
   target.relativeSize=Math.round(target.w/target.referenceW*100);
   const label=panel.querySelector('.relative-size-field strong');if(label)label.textContent=target.relativeSize+'%';
   const rel=panel.querySelector('.relative-size-field input[type="range"]');
   if(rel){rel.value=clamp(target.relativeSize,10,300);syncNumericControls(rel,clamp(target.relativeSize,10,300));}
 }else{target[key]=val;}
 if(scope==='doc'&&key==='name')$('#projectName').value=val;
 if(scope==='bg'&&key.startsWith('color')&&doc.background.type==='transparent')doc.background.type='color';
 if(scope==='item'&&key==='text')target.name=val.split('\n')[0].slice(0,35)||'Teks';
 if(scope==='item'&&(key==='removeColor'||key==='tolerance'))transparentCache.clear();
 if(key==='font'){const font=fontLibrary.get(val);if(font&&scope==='item'&&target.type==='text'){if(!Array.isArray(doc.customFonts))doc.customFonts=[];if(!doc.customFonts.some(f=>f.family===font.family))doc.customFonts.push({family:font.family,name:font.name});}document.fonts.ready.then(render);}
 const colorTxt=el.closest('.color-field')?.querySelector('span');if(colorTxt)colorTxt.textContent=val;
 render();if(scope!=='brush'){if(final)commit();else delayedCommit();}
}
function performAction(a){const o=getItem();switch(a){case'newProject':newProject();break;case'openProject':$('#fileProject').click();break;case'saveProject':saveProject();break;case'showExport':showExportModal();break;case'quickText':selectTool('text');break;case'quickShape':selectTool('shape');break;case'quickImage':selectTool('image');break;case'openCanvasImage':pendingImportMode='canvas';$('#fileImage').click();break;case'quickBackground':selectTool('background');break;case'duplicate':duplicateItem();break;case'delete':removeItem();break;case'upLayer':shiftLayer(1);break;case'downLayer':shiftLayer(-1);break;case'lock':if(o){o.locked=!o.locked;commit();refreshPanel();render();}break;case'visible':if(o){o.visible=!o.visible;commit();refreshPanel();render();}break;case'alignH':if(o){o.x=doc.width/2;commit();refreshPanel();render();}break;case'alignV':if(o){o.y=doc.height/2;commit();refreshPanel();render();}break;case'flipH':if(o){o.flipX=!o.flipX;commit();refreshPanel();render();}break;case'replaceImage':pendingImportMode='replace';$('#fileImage').click();break;case'cropReset':if(o){o.cropLeft=o.cropRight=o.cropTop=o.cropBottom=0;commit();refreshPanel();render();}break;case'texture':$('#fileTexture').click();break;case'importFont':$('#fileFont').click();break;case'fontLibrary':showFontLibrary();break;case'clearTexture':if(o){o.textureSrc='';commit();refreshPanel();render();}break;case'bgImage':$('#fileBackground').click();break;case'endDraw':selectTool('select');break;case'resizeDialog':showResizeModal();break;}}
function handlePanelClick(ev){const rel=ev.target.closest('[data-relative]');if(rel){const slider=panel.querySelector('[data-key="relativeSize"]');if(slider){slider.value=rel.dataset.relative;changeBound(slider,true);refreshPanel();}return;}const a=ev.target.closest('[data-action]');if(a){performAction(a.dataset.action);return;}const shape=ev.target.closest('[data-shape]');if(shape){addObject(createShape(shape.dataset.shape));return;}const e=ev.target.closest('[data-emoji]');if(e){if(getItem()?.type==='sticker'&&panelMode==='object'){getItem().emoji=e.dataset.emoji;getItem().name='Stiker '+e.dataset.emoji;commit();render();}else addObject(createSticker(e.dataset.emoji));return;}const bgtype=ev.target.closest('[data-bgtype]');if(bgtype){doc.background.type=bgtype.dataset.bgtype;if(bgtype.dataset.bgtype==='image'&&!doc.background.src)$('#fileBackground').click();commit();refreshPanel();render();return;}const bgcol=ev.target.closest('[data-bgcolor]');if(bgcol){doc.background.color=bgcol.dataset.bgcolor;doc.background.type='color';commit();refreshPanel();render();return;}const set=ev.target.closest('[data-set]');if(set){const o=getItem();if(o){o[set.dataset.set]=set.dataset.val;commit();refreshPanel();render();}return;}const layeraction=ev.target.closest('[data-layeraction]');if(layeraction){const o=doc.items.find(i=>i.id===layeraction.dataset.id);if(o){if(layeraction.dataset.layeraction==='toggleVisible')o.visible=!o.visible;else o.locked=!o.locked;commit();refreshPanel();render();}return;}const layer=ev.target.closest('[data-layer]');if(layer){selectedId=layer.dataset.layer;refreshPanel();render();}}
function loadImageFile(file,usage){
 if(!file)return;if(!file.type.startsWith('image/')){toast('Pilih fail imej');return;}
 if(file.size>25*1024*1024){toast('Imej melebihi 25 MB');return;}
 const reader=new FileReader();reader.onerror=()=>toast('Fail gagal dibaca');
 reader.onload=()=>{const src=reader.result,im=new Image();im.onload=()=>{
   imageCache.set(src,{img:im,ready:true});
   if(usage==='texture'){const o=getItem();if(o?.type==='text'){o.textureSrc=src;commit();refreshPanel();render();toast('Tekstur teks ditambah');}return;}
   openCropImport(im,file,usage);
 };im.onerror=()=>toast('Imej gagal dibuka');im.src=src;};reader.readAsDataURL(file);
}
// Crop selection remains in original image pixels until the user confirms.
function openCropImport(im,file,usage='item'){
 const iw=im.naturalWidth,ih=im.naturalHeight;
 const state={preset:'original',ratio:iw/ih,rect:{x:0,y:0,w:iw,h:ih},drag:null};
 const aspectChoices=cropPresets.map(([v,label])=>`<button type="button" data-crop-ratio="${v}" class="${v==='original'?'active':''}">${label}</button>`).join('');
 const defaultCanvas=pendingImportMode==='canvas';
 showModal('Buka & crop imej',`<div class="crop-meta"><span>${escapeHTML(file.name)}</span><span>${iw} × ${ih} px</span></div><div class="crop-preview"><canvas id="cropCanvas" aria-label="Preview pemotongan imej; seret bingkai untuk mengubah crop"></canvas></div><div class="crop-note">Seret dalam kotak untuk alih · Seret penjuru untuk ubah crop</div><div class="crop-ratios" role="group" aria-label="Nisbah crop">${aspectChoices}</div><div class="crop-info" id="cropInfo">${iw} × ${ih} px</div>${doc.items.length?`<div class="crop-project-tip">Buka sebagai kanvas menggantikan projek semasa. Pilih Tambah layer untuk mengekalkan reka bentuk ini.</div>`:""}<div class="crop-footer"><button type="button" class="btn secondary" id="cropCancel">Batal</button><button type="button" class="btn ${defaultCanvas?'secondary':'primary'}" id="cropAdd">＋ Tambah layer</button><button type="button" class="btn ${defaultCanvas?'primary':'secondary'}" id="cropAsCanvas">${usage==='bg'?'✓ Guna latar':'▧ Buka sebagai kanvas'}</button></div>`, 'crop-modal');
 const cv=$('#cropCanvas'),c=cv.getContext('2d');const s=Math.min(650/iw,390/ih,1);cv.width=Math.max(1,Math.round(iw*s));cv.height=Math.max(1,Math.round(ih*s));
 const clampRect=(r)=>{r.w=clamp(r.w,1,iw);r.h=clamp(r.h,1,ih);r.x=clamp(r.x,0,iw-r.w);r.y=clamp(r.y,0,ih-r.h);return r;};
 const setPreset=(preset)=>{
   state.preset=preset;state.ratio=preset==='free'?null:preset==='original'?iw/ih:(()=>{const [w,h]=preset.split(':').map(Number);return w/h;})();
   if(state.ratio){const ratio=state.ratio;const w=Math.min(iw,ih*ratio),h=w/ratio;state.rect={x:(iw-w)/2,y:(ih-h)/2,w,h};}
   $$('[data-crop-ratio]').forEach(b=>b.classList.toggle('active',b.dataset.cropRatio===preset));drawCrop();
 };
 const drawCrop=()=>{
   c.clearRect(0,0,cv.width,cv.height);c.drawImage(im,0,0,cv.width,cv.height);
   const r=state.rect,x=r.x*s,y=r.y*s,w=r.w*s,h=r.h*s;
   c.fillStyle='rgba(13,18,27,.59)';c.fillRect(0,0,cv.width,y);c.fillRect(0,y,x,h);c.fillRect(x+w,y,cv.width-x-w,h);c.fillRect(0,y+h,cv.width,cv.height-y-h);
   c.strokeStyle='#ffffff';c.lineWidth=2;c.strokeRect(x+1,y+1,Math.max(0,w-2),Math.max(0,h-2));
   c.strokeStyle='#ffffff77';c.lineWidth=.75;
   for(let i=1;i<3;i++){c.beginPath();c.moveTo(x+w*i/3,y);c.lineTo(x+w*i/3,y+h);c.moveTo(x,y+h*i/3);c.lineTo(x+w,y+h*i/3);c.stroke();}
   c.fillStyle='#ffffff';for(const [hx,hy] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]]){c.fillRect(hx-4,hy-4,8,8);}
   $('#cropInfo').textContent=`Hasil crop: ${Math.round(r.w)} × ${Math.round(r.h)} px  ·  ${state.preset==='free'?'Bebas':state.preset==='original'?'Asal':state.preset}`;
 };
 const getPointer=e=>{const b=cv.getBoundingClientRect();return{x:clamp((e.clientX-b.left)*iw/b.width,0,iw),y:clamp((e.clientY-b.top)*ih/b.height,0,ih)};};
 const locate=(p,r)=>{
   const tol=Math.max(18,Math.min(iw,ih)*.025);
   const corners=[['nw',r.x,r.y],['ne',r.x+r.w,r.y],['sw',r.x,r.y+r.h],['se',r.x+r.w,r.y+r.h]];
   for(const [k,x,y] of corners)if(Math.hypot(p.x-x,p.y-y)<tol)return k;
   return p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h?'move':'center';
 };
 cv.addEventListener('pointerdown',e=>{e.preventDefault();const p=getPointer(e);const mode=locate(p,state.rect);state.drag={p0:p,rect:{...state.rect},mode};cv.setPointerCapture(e.pointerId);});
 cv.addEventListener('pointermove',e=>{if(!state.drag)return;const p=getPointer(e),d=state.drag,r=d.rect,dx=p.x-d.p0.x,dy=p.y-d.p0.y;
   if(d.mode==='move'){state.rect=clampRect({x:r.x+dx,y:r.y+dy,w:r.w,h:r.h});}
   else if(d.mode==='center'){state.rect=clampRect({x:p.x-r.w/2,y:p.y-r.h/2,w:r.w,h:r.h});}
   else{
     const west=d.mode.includes('w'),north=d.mode.includes('n');
     const anchorX=west?r.x+r.w:r.x,anchorY=north?r.y+r.h:r.y;
     let w=Math.max(15,Math.abs(p.x-anchorX)),h=Math.max(15,Math.abs(p.y-anchorY));
     const maxW=west?anchorX:iw-anchorX,maxH=north?anchorY:ih-anchorY;
     if(state.ratio){const ratio=state.ratio;w=Math.min(w,h*ratio,maxW,maxH*ratio);w=Math.max(1,w);h=w/ratio;}
     else {w=Math.min(w,maxW);h=Math.min(h,maxH);}
     state.rect=clampRect({x:west?anchorX-w:anchorX,y:north?anchorY-h:anchorY,w,h});
   }drawCrop();
 });
 cv.addEventListener('pointerup',e=>{state.drag=null;if(cv.hasPointerCapture(e.pointerId))cv.releasePointerCapture(e.pointerId);});
 cv.addEventListener('pointercancel',()=>state.drag=null);
 $$('.crop-ratios button').forEach(b=>b.onclick=()=>setPreset(b.dataset.cropRatio));
 $('#cropCancel').onclick=hideModal;
 const finish=(mode)=>{
   const r=state.rect;const maxDim=5000;const outputScale=Math.min(1,maxDim/Math.max(r.w,r.h));
   const w=Math.max(1,Math.round(r.w*outputScale)),h=Math.max(1,Math.round(r.h*outputScale));
   const out=document.createElement('canvas');out.width=w;out.height=h;const oc=out.getContext('2d');oc.drawImage(im,r.x,r.y,r.w,r.h,0,0,w,h);
   const mime=file.type==='image/jpeg'?'image/jpeg':'image/png';const src=out.toDataURL(mime,.93);const resultImage=new Image();const cacheEntry={img:resultImage,ready:false};imageCache.set(src,cacheEntry);resultImage.onload=()=>{cacheEntry.ready=true;render();};resultImage.src=src;
   if(mode==='canvas'){
     doc={name:file.name.replace(/\.[^.]+$/,'')||'Imej Saya',width:w,height:h,background:{type:'color',color:'#ffffff',color2:'#ffffff',angle:0,src:''},items:[]};
     const layer=createImage(src,w/2,h/2);Object.assign(layer,{x:w/2,y:h/2,w,h,referenceW:w,referenceH:h,relativeSize:100,maintainRatio:true});doc.items.push(layer);selectedId=layer.id;
     canvas.width=w;canvas.height=h;$('#projectName').value=doc.name;history=[];historyIndex=-1;panelMode='object';activeTab='properties';activeTool='select';updateToolUI();commit();syncPreset();fitCanvas();refreshPanel();render();toast('Imej dibuka sebagai kanvas '+w+' × '+h);
   }else if(mode==='background'){
     doc.background.type='image';doc.background.src=src;panelMode='background';commit();render();refreshPanel();toast('Imej ditetapkan sebagai latar');
   }else if(mode==='replace'){
     const layer=getItem();if(layer?.type==='image'){layer.src=src;const ratio=w/h;layer.h=layer.w/ratio;layer.referenceW=layer.w;layer.referenceH=layer.h;layer.relativeSize=100;layer.maintainRatio=true;commit();render();refreshPanel();toast('Imej diganti');}
     else{const layer=createImage(src);const k=Math.min(doc.width*.8/w,doc.height*.8/h,1);Object.assign(layer,{w:w*k,h:h*k,referenceW:w*k,referenceH:h*k});addObject(layer);}
   }else{
     const layer=createImage(src);const k=Math.min(doc.width*.8/w,doc.height*.8/h,1);Object.assign(layer,{w:Math.max(1,w*k),h:Math.max(1,h*k),referenceW:Math.max(1,w*k),referenceH:Math.max(1,h*k),relativeSize:100,maintainRatio:true});addObject(layer);toast('Imej ditambah sebagai layer');
   }
   hideModal();
 };
 $('#cropAdd').onclick=()=>finish(usage==='replace'?'replace':'layer');
 $('#cropAsCanvas').onclick=()=>finish(usage==='bg'?'background':'canvas');
 if(usage==='bg'){$('#cropAdd').textContent='＋ Tambah layer';}
 if(usage==='replace'){$('#cropAdd').textContent='✓ Ganti gambar';}
 setPreset('original');
}
function newProject(){showModal('Cipta projek baharu',`<p class="muted">Pilih kanvas kosong atau mula dengan susun atur contoh.</p><div class="grid-two"><div class="field"><label>Lebar (px)</label><input id="newW" type="number" value="1080" min="100" max="5000"></div><div class="field"><label>Tinggi (px)</label><input id="newH" type="number" value="1080" min="100" max="5000"></div></div><div class="modal-actions"><button id="newBlank" class="btn primary">▢ Kanvas kosong</button><button id="newDemo" class="btn secondary">✦ Guna contoh</button></div>`);const make=(demo)=>{doc={name:'Projek Baharu',width:clamp(asNum($('#newW').value,1080),100,5000),height:clamp(asNum($('#newH').value,1080),100,5000),background:{type:'color',color:'#ffffff',color2:'#a17aff',angle:35,src:''},items:[]};selectedId=null;if(demo){doc.background.type='gradient';doc.background.color='#0f1231';doc.background.color2='#31235e';defaultScene();}$('#projectName').value=doc.name;canvas.width=doc.width;canvas.height=doc.height;history=[];historyIndex=-1;commit();syncPreset();fitCanvas();panelMode=demo?'object':'home';refreshPanel();render();hideModal();toast('Projek baharu dicipta');};$('#newBlank').onclick=()=>make(false);$('#newDemo').onclick=()=>make(true);}
async function init(){
 setTheme(document.documentElement.getAttribute('data-theme') || 'light', false);
 $('#themeToggle').addEventListener('click', () => {
   setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
 });
 await loadInstalledFonts();
 try{const saved=await storedAutosave();if(saved){const data=JSON.parse(saved);if(data.width>0&&data.height>0&&Array.isArray(data.items)){doc=data;selectedId=null;}else {doc.items=[];selectedId=null;}}else {doc.items=[];selectedId=null;}}catch(e){doc.items=[];selectedId=null;}
 await loadProjectFonts(true);canvas.width=doc.width;canvas.height=doc.height;$('#projectName').value=doc.name||'Reka Bentuk Saya';syncPreset();history=[snapshot()];historyIndex=0;updateHistoryUI();refreshPanel();fitCanvas();render();updateToolUI();
 $$('.tool[data-tool]').forEach(b=>b.addEventListener('click',()=>selectTool(b.dataset.tool)));
 $('#fontLibraryBtn').addEventListener('click',showFontLibrary);
 $$('.tab').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.tab;if(activeTab==='properties'&&panelMode==='layers')panelMode=getItem()?'object':'home';refreshPanel();showPanel();}));
 panel.addEventListener('click',handlePanelClick);
 panel.addEventListener('input',ev=>{const el=ev.target;if(el.dataset.key && el.type!=='number'){changeBound(el,false);}});
 panel.addEventListener('keydown',ev=>{if(ev.target.matches('input[type=number][data-key]')){if(ev.key==='Enter'){ev.preventDefault();ev.target.blur();}else if(ev.key==='Escape'){ev.preventDefault();const el=ev.target;const target=el.dataset.scope==='item'?getItem():el.dataset.scope==='bg'?doc.background:el.dataset.scope==='brush'?brush:doc;el.value=String(target?.[el.dataset.key]??'');el.blur();}}});
 panel.addEventListener('change',ev=>{const el=ev.target;if(el.dataset.key){changeBound(el,true);}});
 canvas.addEventListener('pointerdown',pointerDown);
 canvas.addEventListener('pointermove',pointerMove);
 canvas.addEventListener('pointerup',pointerUp);
 canvas.addEventListener('pointercancel',pointerUp);
 canvas.addEventListener('dblclick',()=>{const o=getItem();if(o?.type==='text'){activeTab='properties';panelMode='object';refreshPanel();showPanel();panel.querySelector('[data-key="text"]')?.focus();}});
 $('#projectName').addEventListener('change',ev=>{doc.name=ev.target.value.trim()||'Reka Bentuk Saya';commit();});
 $('#openImageBtn').onclick=()=>{pendingImportMode='canvas';$('#fileImage').click();};$('#undoBtn').onclick=undo;$('#redoBtn').onclick=redo;$('#saveBtn').onclick=saveProject;$('#openBtn').onclick=()=>$('#fileProject').click();$('#newBtn').onclick=newProject;$('#exportBtn').onclick=showExportModal;
 $('#zoomIn').onclick=()=>setZoom(zoom+.25);$('#zoomOut').onclick=()=>setZoom(zoom-.25);$('#zoomFit').onclick=()=>setZoom(1);
 $('#zoomValue').addEventListener('change',ev=>{const v=Number(ev.target.value);setZoom((Number.isFinite(v)?v:zoom*100)/100);});
 $('#zoomValue').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();ev.target.blur();}});
 $('#presetSelect').onchange=ev=>{if(ev.target.value==='custom'){showResizeModal();return;}const [w,h]=ev.target.value.split('x').map(Number);resizeDoc(w,h);};
 $('#fileImage').onchange=ev=>{loadImageFile(ev.target.files?.[0],pendingImportMode==='replace'?'replace':'item');ev.target.value='';};$('#fileBackground').onchange=ev=>{loadImageFile(ev.target.files?.[0],'bg');ev.target.value='';};$('#fileTexture').onchange=ev=>{loadImageFile(ev.target.files?.[0],'texture');ev.target.value='';};$('#fileFont').onchange=ev=>{const files=Array.from(ev.target.files||[]);ev.target.value='';importFontFiles(files);};$('#fileProject').onchange=ev=>{onProjectFile(ev.target.files?.[0]);ev.target.value='';};
 $('#closePanel').onclick=closePanel;$('#modalClose').onclick=hideModal;$('.modal-backdrop').onclick=hideModal;
 $('#helpBtn').onclick=()=>showModal('Panduan PixelLab Studio',`<div class="tip-line"><strong>1. Buka imej</strong><p>Klik Buka imej, pilih ratio crop, seret bingkai dan buka sebagai kanvas atau layer.</p><strong>2. Tambah objek</strong><p>Pilih Teks, Gambar, Bentuk, Stiker atau Lukis pada bar alat.</p><strong>2. Ubah objek</strong><p>Sentuh objek, seret untuk pindah, gunakan bucu untuk resize dan pemegang bulat untuk putar.</p><strong>3. Urus layers</strong><p>Gunakan tab Layers untuk memilih, mengunci, menyusun atau menyembunyikan objek.</p><strong>4. Simpan / eksport</strong><p>Gunakan Simpan untuk projek JSON yang boleh diedit semula. Eksport untuk PNG, JPG atau WebP.</p></div><p class="muted">Projek cuba disimpan secara automatik pada browser ini. Simpan fail JSON juga sebagai salinan sandaran.</p>`);
 window.addEventListener('keydown',ev=>{const tag=(document.activeElement?.tagName||'').toLowerCase();if(['input','textarea','select'].includes(tag))return;if(!$('#modalShell').hidden){if(ev.key==='Escape')hideModal();return;}if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();ev.shiftKey?redo():undo();}else if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='y'){ev.preventDefault();redo();}else if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='d'){ev.preventDefault();duplicateItem();}else if((ev.key==='Delete'||ev.key==='Backspace')&&getItem()){ev.preventDefault();removeItem();}else if(ev.key==='Escape'){pickSelected(null);closePanel();}else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(ev.key)&&getItem()&&!getItem().locked){ev.preventDefault();const o=getItem(),n=ev.shiftKey?10:1;if(ev.key==='ArrowUp')o.y-=n;if(ev.key==='ArrowDown')o.y+=n;if(ev.key==='ArrowLeft')o.x-=n;if(ev.key==='ArrowRight')o.x+=n;commit();render();}});
 window.addEventListener('resize',fitCanvas);if('ResizeObserver' in window)new ResizeObserver(fitCanvas).observe(stage);
}
init();
})();
