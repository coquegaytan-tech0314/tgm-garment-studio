from pathlib import Path
import re

def extend(html, root):
    source = root / 'order-v4'
    def once(before, after):
        nonlocal html
        if before not in html:
            raise RuntimeError('Missing v4 integration anchor: ' + before[:110])
        html = html.replace(before, after, 1)
    once('</style>', (source / 'style.css').read_text() + '</style>')
    html = html.replace('ESTUDIO · v3', 'ESTUDIO · v4').replace('Funciona sin conexión · v3.0', 'Funciona sin conexión · v4.0')
    once("VERSION=3,KEY='tgm-estudio-v3'", "VERSION=4,KEY='tgm-estudio-v4'")
    once('![1,2,3].includes(raw.version)', '![1,2,3,4].includes(raw.version)')
    html = html.replace('(versiones 1, 2 y 3).', '(versiones 1, 2, 3 y 4).')
    once('<div id="panel-art"', '<div id="panel-art"')
    html, count = re.subn(r'<div id="panel-art".*?(?=<div id="panel-sizes")', lambda _: (source/'art.html').read_text()+'\n', html, count=1, flags=re.S)
    assert count == 1
    once('<button id="removeArt"', '<button id="removeArt"')
    once('<div class="logo-actions"><button id="duplicateLogo">', (source/'workshop-fields.html').read_text()+'<div class="logo-actions"><button id="duplicateLogo">')
    once('<label class="checkline"><input type="checkbox" id="logoRemoveBg"', (source/'crop.html').read_text()+'<label class="checkline"><input type="checkbox" id="logoRemoveBg"')
    once('<div id="panel-studio"', (source/'ficha.html').read_text()+'<div id="panel-studio"')
    once('<button id="saveFullOrder"', (source/'attachments.html').read_text()+'<button id="saveFullOrder"')
    once('>Acabado</button></nav>', '>Acabado</button><button role="tab" id="tab-ficha" data-tab="ficha" aria-controls="panel-ficha" aria-selected="false" tabindex="-1">Ficha de referencia</button></nav>')
    once('>Diseños</button>', '>Logos</button>')
    once('<dialog id="zoomDialog"', (source/'dialog.html').read_text()+'<dialog id="zoomDialog"')
    composition='''<div class="composition-fields"><div class="field"><label for="refComposition">Composición de la tela</label><select id="refComposition" data-ref="composition"><option value="unknown">Por confirmar</option><option value="polyester">100% poliéster</option><option value="cotton">100% algodón</option><option value="polycotton">Polialgodón</option><option value="other">Otra composición</option></select></div><div class="field" id="polyesterPercentField" hidden><label for="refPolyesterPercent">Poliéster en la mezcla (%)</label><input id="refPolyesterPercent" data-ref="polyesterPercent" type="number" min="0" max="100" step="0.1" placeholder="Por confirmar"></div><div class="field"><label for="refCompositionNotes">Detalle de composición</label><input id="refCompositionNotes" data-ref="compositionNotes" maxlength="500" placeholder="Fibras, porcentajes y referencia del proveedor"></div><div class="field"><label for="refFabricRef">Referencia de tela</label><input id="refFabricRef" data-ref="fabricRef" maxlength="180" placeholder="Código o muestra de tela"></div><div class="field"><label for="refColorRef">Referencia física de color</label><input id="refColorRef" data-ref="colorRef" maxlength="180" placeholder="Código o muestra física"></div></div>'''
    once('<div class="field"><label for="stretch">', composition+'<div class="field"><label for="stretch">')
    html = html.replace("print:'estampado'", "print:'serigrafía'").replace("sublimation:'sublimación'", "sublimation:'sublimado'")
    html = html.replace('>Colocar diseño</button>', '>Colocar logo</button>').replace('en Diseños,', 'en Logos,')
    once("tab('art');if(!state.artworks.length)addArt()", "tab('art')")
    html = re.sub(r"\$\('#artUpload'\)\.addEventListener\('change',async e=>\{.*?\}\);\n", "$('#artUpload').addEventListener('change',async e=>{const f=e.target.files[0],a=selected();e.target.value='';if(!f||!a)return;try{await uploadLogoTo(a,f)}catch(err){toast(err.message)}});\n", html, count=1)
    once("$('#saveAndNew').addEventListener('click',()=>{if(saveOrder(true))resetOrder()})", "$('#saveAndNew').addEventListener('click',e=>busy(e.currentTarget,async()=>{if(await saveOrder(true))resetOrder()}))")
    once("if(!saveDraft()&&dirty){e.preventDefault();e.returnValue=''}", "if(dirty){saveDraft();e.preventDefault();e.returnValue=''}")
    once("const raw=localStorage.getItem(KEY+'.draft')||localStorage.getItem('tgm-estudio-v2.draft')||localStorage.getItem('tgm-estudio-v1.draft');if(raw){state=await validateOrder(JSON.parse(raw));hadDraft=true}", "const draft=await storedDraft();if(draft){state=await validateOrder(draft);hadDraft=true}")
    once("localStorage.getItem(KEY+'.orders')||", "localStorage.getItem(KEY+'.orders')||localStorage.getItem('tgm-estudio-v3.orders')||")
    html = html.replace('60*1024*1024', '240*1024*1024').replace('El JSON excede 60 MB.', 'El JSON excede 240 MB.')
    once("input[from+3]*sample.a*(a.method==='sublimation'?.95:1)", "input[from+3]*sample.a*(a.method==='sublimation'?.95:1)*applicationMask(a,rect,wx,wy,src)")
    once("const pose=photoPose(a),g=await artGeometry(pose);if(activePointer", "if(fullSublimation(a))continue;const pose=photoPose(a),g=await artGeometry(pose);if(activePointer")
    once("currentTab!=='art'||!a||a.view!==view||ensurePhoto().source!=='generated'", "currentTab!=='art'||!a||fullSublimation(a)||a.view!==view||ensurePhoto().source!=='generated'")
    once("init().catch(e=>toast", (source/'order.js').read_text()+'\n'+(source/'workshop.js').read_text()+'\n'+(source/'reference.js').read_text()+"\ninit().catch(e=>toast")
    return html
