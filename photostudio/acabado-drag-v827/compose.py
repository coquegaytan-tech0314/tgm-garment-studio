"""Direct click-and-drag of estampados on Acabado Frente/Espalda (MGM v8.2.7)."""
from pathlib import Path

def extend(html, root):
    source = Path(root) / 'acabado-drag-v827'
    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one acabado-drag-v827 anchor: ' + before[:120])
        html = html.replace(before, after, 1)
    once('</style>', (source / 'style.css').read_text() + '</style>')
    once("$('#photoEdit').addEventListener('click',()=>{tab('art')})",
         "$('#photoEdit').addEventListener('click',()=>enterAcabadoPlaceMode())")
    html = html.replace('en Logos, arrastra la aplicación o usa las flechas para moverla.',
                        'arrastra el estampado o usa las flechas para moverlo.')
    once('init().catch(e=>toast', (source / 'drag.js').read_text() + '\ninit().catch(e=>toast')
    return html
