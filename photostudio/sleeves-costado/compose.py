"""Default sleeve estampados on costado/lateral. Does not stamp UI chrome."""
from pathlib import Path
import re


def extend(html, root):
    source = Path(root) / 'sleeves-costado'

    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one sleeves-costado anchor: ' + before[:120])
        html = html.replace(before, after, 1)

    once(
        '<p class="help">Izquierda y derecha de quien lleva puesta la prenda. Al verla de frente, aparecen invertidas en pantalla.</p>',
        '<p class="help">Izquierda y derecha de quien lleva puesta la prenda. Al verla de frente, aparecen invertidas en pantalla. '
        'El estampado de manga va en el <strong>costado / lateral</strong> (lado externo del brazo), horizontal y paralelo al puño, '
        'a ~3–4 cm arriba del puño. El frente de la manga es una excepción rara.</p>'
    )
    once(
        '<div class="field"><label for="sleeveView">Cara de la manga</label><select id="sleeveView"><option value="front">Visible desde el frente</option><option value="back">Visible desde la espalda</option></select></div>',
        '<div class="field"><label for="sleeveView">Vista de la prenda</label><select id="sleeveView">'
        '<option value="front">Costado visible desde el frente</option>'
        '<option value="back">Costado visible desde la espalda</option></select></div>'
    )
    once(
        '<p class="help">PNG / SVG / JPG. Después puedes limpiar el logo, ajustar tamaño, giro y medidas en Logos. Frente y espalda se registran por separado.</p>',
        '<p class="help">PNG / SVG / JPG. El default es <strong>costado / lateral</strong> (no el frente de la manga), horizontal y paralelo al puño. '
        'Frente y espalda se registran por separado; el frente de manga solo si el pedido lo pide.</p>'
    )
    once(
        '<option value="leftSleeve">Manga izquierda de la persona</option><option value="rightSleeve">Manga derecha de la persona</option>',
        '<option value="leftSleeve">Manga izquierda · costado / lateral</option><option value="rightSleeve">Manga derecha · costado / lateral</option>'
    )
    once('init().catch(e=>toast', (source / 'costado.js').read_text() + '\ninit().catch(e=>toast')
    return html
