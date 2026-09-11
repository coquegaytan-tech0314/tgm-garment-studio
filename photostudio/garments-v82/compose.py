def extend(html, root):
    source = root / 'garments-v82'
    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one v8.2 integration anchor: ' + before[:120])
        html = html.replace(before, after, 1)
    html = html.replace('ESTUDIO · v8', 'ESTUDIO · v8.2.4').replace('v8.0</span></footer>', 'v8.2.4</span></footer>')
    once('<symbol id="i-polo" viewBox="0 0 24 24"><path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4-4 4zM8 3l1 6 3-2 3 2 1-6M12 7v6"/></symbol>',
         '<symbol id="i-polo" viewBox="0 0 24 24"><path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4-4 4zM8 3l1 6 3-2 3 2 1-6M12 7v6"/></symbol>'
         '<symbol id="i-sleeveless" viewBox="0 0 24 24"><path d="M8 4c1 3 7 3 8 0l2 2v3l-3 3v8H9v-8L6 9V6zM9 4l3 3 3-3"/></symbol>'
         '<symbol id="i-zipneck" viewBox="0 0 24 24"><path d="m8 3-3 3 2 4 3-1v12h8V9l3 1 2-4-3-3c-1 3-7 3-8 0zM12 7v7M11 10h2M11 13h2"/></symbol>')
    once('<button data-garment="polo" aria-pressed="false"><svg class="icon"><use href="#i-polo"/></svg>Polo</button></div>',
         '<button data-garment="polo" aria-pressed="false"><svg class="icon"><use href="#i-polo"/></svg>Polo</button>'
         '<button data-garment="sleeveless" aria-pressed="false"><svg class="icon"><use href="#i-sleeveless"/></svg>Top sin mangas</button>'
         '<button data-garment="zipneck" aria-pressed="false"><svg class="icon"><use href="#i-zipneck"/></svg>Manga larga con cierre</button></div>')
    once('<button data-garment="zipneck" aria-pressed="false"><svg class="icon"><use href="#i-zipneck"/></svg>Manga larga con cierre</button></div>\n<div class="row"><div><label for="bodyColor">Cuerpo</label>',
         '<button data-garment="zipneck" aria-pressed="false"><svg class="icon"><use href="#i-zipneck"/></svg>Manga larga con cierre</button></div>'
         '<div id="photoCutField" hidden><span class="label">Corte de sisada</span><div class="photo-cut-picker">'
         '<button type="button" data-photo-cut="hombre" aria-pressed="true">Hombre · tank</button>'
         '<button type="button" data-photo-cut="mujer" aria-pressed="false">Mujer · crop</button>'
         '</div><p class="help">Base fotográfica Chifón. El tank hombre es la sisada por defecto; el crop mujer es una hoja alterna.</p></div>'
         '<div class="row"><div><label for="bodyColor">Cuerpo</label>')
    once('<div class="row"><div class="field"><label for="cuff">Puño</label>',
         '<div class="row"><div class="field" id="cuffField"><label for="cuff">Puño</label>')
    once('</style>', (source/'style.css').read_text() + '</style>')
    once('init().catch(e=>toast', (source/'garments.js').read_text() + '\ninit().catch(e=>toast')
    return html
