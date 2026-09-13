"""Free any-degree estampado tilt on Acabado Frente/Espalda (MGM v8.2.9)."""
from pathlib import Path

def extend(html, root):
    source = Path(root) / 'acabado-rotate-v829'

    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one acabado-rotate-v829 anchor: ' + before[:120])
        html = html.replace(before, after, 1)

    html = html.replace('MGM · v8.2.8', 'MGM · v8.2.9')
    once('</style>', (source / 'style.css').read_text() + '</style>')
    once('<div class="field"><label class="range-label" for="artRotation">Rotación <output id="artRotationValue"></output></label><input id="artRotation" type="range" min="-180" max="180" step="1"></div>',
         '<div class="field art-rotation-field"><label class="range-label" for="artRotation">Rotación <output id="artRotationValue"></output></label>'
         '<div class="art-rotation-controls">'
         '<input id="artRotationDeg" type="number" min="-180" max="180" step="1" value="0" title="Giro en grados">'
         '<span class="art-rotation-unit">°</span>'
         '<input id="artRotation" type="range" min="-180" max="180" step="1">'
         '</div></div>')
    once('<p class="help" id="artPlacement">Posición de la regla: arrastra el estampado en Acabado para medir en cm y pulgadas.</p>',
         '<p class="help" id="artPlacement">Posición de la regla: arrastra o gira el estampado. Cuello y dobladillo miden el recuadro girado; centro y costados, el centro del print.</p>')
    html = html.replace('arrastra el estampado o usa las flechas para moverlo.',
                        'arrastra o gira el estampado; flechas mueven, [ ] gira.')
    once('init().catch(e=>toast', (source / 'rotate.js').read_text() + '\ninit().catch(e=>toast')
    return html
