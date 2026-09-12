"""Dual-unit placement rulers on Acabado Frente/Espalda (MGM v8.2.8)."""
from pathlib import Path

def extend(html, root):
    source = Path(root) / 'acabado-ruler-v828'

    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one acabado-ruler-v828 anchor: ' + before[:120])
        html = html.replace(before, after, 1)

    html = html.replace('MGM · v8.2.7', 'MGM · v8.2.8')
    html = html.replace('v8.2.7', 'v8.2.8')
    once('</style>', (source / 'style.css').read_text() + '</style>')
    once('<button id="photoEdit">Colocar logo</button>',
         '<button id="photoEdit">Colocar logo</button><button id="photoRuler" type="button" aria-pressed="true">Regla</button>')
    once('<span class="photo-origin" id="photoOrigin">',
         '<div class="photo-ruler-readout" id="photoRulerReadout" hidden></div><span class="photo-origin" id="photoOrigin">')
    once('<p class="help">Las medidas en cm quedan en la ficha; no calibran automáticamente la foto.</p>',
         '<p class="help">Las medidas en cm quedan en la ficha; no calibran automáticamente la foto.</p>'
         '<p class="help" id="artPlacement">Posición de la regla: arrastra el estampado en Acabado para medir en cm y pulgadas.</p>')
    once("report.row('Ubicación medida',a.dimensions);report.row('Ubicación visual',",
         "report.row('Ubicación medida',a.dimensions);report.row('Posición (regla)',placementFichaText(a));report.row('Ubicación visual',")
    once('init().catch(e=>toast', (source / 'ruler.js').read_text() + '\ninit().catch(e=>toast')
    return html
