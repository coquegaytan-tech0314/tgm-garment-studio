def extend(html, root):
    source = root / 'sleeves-v5'
    def once(before, after):
        nonlocal html
        if before not in html:
            raise RuntimeError('Missing sleeve integration anchor: ' + before[:100])
        html = html.replace(before, after, 1)
    once('</style>', (source/'style.css').read_text()+'</style>')
    html = html.replace('ESTUDIO · v4', 'ESTUDIO · v5').replace('Funciona sin conexión · v4.0', 'Funciona sin conexión · v5.0')
    once("VERSION=4,KEY='tgm-estudio-v4'", "VERSION=5,KEY='tgm-estudio-v5'")
    once('![1,2,3,4].includes(raw.version)', '![1,2,3,4,5].includes(raw.version)')
    html = html.replace('(versiones 1, 2, 3 y 4).', '(versiones 1 a 5).')
    once("[KEY,'tgm-estudio-v3'", "[KEY,'tgm-estudio-v4','tgm-estudio-v3'")
    once("localStorage.getItem(KEY+'.orders')||", "localStorage.getItem(KEY+'.orders')||localStorage.getItem('tgm-estudio-v4.orders')||")
    once('<button role="tab" id="tab-art"', '<button role="tab" id="tab-sleeves" data-tab="sleeves" aria-controls="panel-sleeves" aria-selected="false" tabindex="-1">Mangas</button><button role="tab" id="tab-art"')
    once('<div id="panel-art"', (source/'panel.html').read_text()+'<div id="panel-art"')
    once('<div class="logo-add">', '<div class="sleeve-shortcut"><p>¿Logo o detalles en las mangas?</p><button id="artSleeves">Ir a Mangas</button></div><div class="logo-add">')
    once('<div class="field"><label for="logoName">', '<p id="sleeveLogoLocation" class="sleeve-location" hidden></p><div class="field"><label for="logoName">')
    once('<div class="photo-tools">', '<div class="photo-tools"><button id="photoSleeves">Editar mangas</button>')
    once('p.exposure,p.relief,p.thread]);if(photoTintCache', 'p.exposure,p.relief,p.thread,sleeveVisualState()]);if(photoTintCache')
    once('const exposure=Math.pow(2,p.exposure/50)', 'const sleevePalette=makeSleevePalette(view);const exposure=Math.pow(2,p.exposure/50)')
    once('for(let j=0;j<3;j++){const color=body[j]*(1-weight)+contrast[j]*weight;', 'const sleeveColor=sleeveColorAt(xx/(src.w-1),yy/(src.h-1),sleevePalette,src.masks.cuff[n+3]);for(let j=0;j<3;j++){const color=sleeveColor?sleeveColor[j]:body[j]*(1-weight)+contrast[j]*weight;')
    once("if($('#photoDetailDialog').open)await refreshPhotoDetail()", "updateSleevePreview(canvases);if($('#photoDetailDialog').open)await refreshPhotoDetail()")
    once("report.row('Costuras, avíos y etiquetas',r.construction);", "report.row('Costuras, avíos y etiquetas',r.construction);for(const [label,value]of sleeveReferenceRows())report.row(label,value);")
    once("init().catch(e=>toast", (source/'sleeves.js').read_text()+"\ninit().catch(e=>toast")
    return html
