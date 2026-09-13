"""Despiece / costo por parte (MGM v8.2.10). Schema VERSION stays 8."""
from pathlib import Path

def extend(html, root):
    source = Path(root) / 'despiece-v828'
    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one despiece-v828 anchor: ' + before[:120])
        html = html.replace(before, after, 1)
    html = html.replace('MGM · v8.2.9', 'MGM · v8.2.10')
    once('<button data-photo-view="orbit">360°</button>',
         '<button data-photo-view="orbit">360°</button><button type="button" id="photoDespieceView" aria-pressed="false">Despiece</button>')
    once('<span class="photo-origin" id="photoOrigin">Base generada · apariencia aproximada</span>',
         (source / 'stage.html').read_text() + '<span class="photo-origin" id="photoOrigin">Base generada · apariencia aproximada</span>')
    once('<div class="field"><label for="costNotes">Notas de costos · internas</label>',
         (source / 'panel.html').read_text() + '<div class="field"><label for="costNotes">Notas de costos · internas</label>')
    once('<button id="saveFullOrder" class="primary full">Guardar pedido + ficha + logos</button>',
         '<details class="logo-prep" id="fichaDespieceBox"><summary>Despiece · costo por parte</summary><p class="help">Uso interno. Toca una parte en Acabado → Despiece para editarla. No sale en el PDF del cliente.</p><div id="fichaDespieceRows" class="despiece-ficha-rows"></div></details>\n<button id="saveFullOrder" class="primary full">Guardar pedido + ficha + logos</button>')
    once('</style>', (source / 'style.css').read_text() + '</style>')
    once('init().catch(e=>toast', (source / 'despiece.js').read_text() + '\ninit().catch(e=>toast')
    return html
