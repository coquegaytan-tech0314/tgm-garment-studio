"""TGM polo construction standards + Acabado/ficha simulation (MGM v8.2.8)."""
from pathlib import Path
import re

def extend(html, root):
    source = Path(root) / 'polo-construction'

    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one polo-construction anchor: ' + before[:120])
        html = html.replace(before, after, 1)

    html = re.sub(r'MGM · v8\.2\.\d+', 'MGM · v8.2.8', html)
    html = re.sub(r'(nube opcional · )v[\d.]+', r'\g<1>v8.2.8', html)
    once('</style>', (source / 'style.css').read_text() + '</style>')
    once('<p class="help">Vivo y tapeta aproximados en Acabado. Confirmar grosor, material y confección en la ficha.</p>',
         (source / 'fields.html').read_text() +
         '<p class="help">Vivo y tapeta aproximados en Acabado. Confirmar grosor, material y confección en la ficha.</p>')
    once('<div class="field"><label for="refConstruction">Costuras, avíos, etiquetas y acabados</label>',
         (source / 'ficha.html').read_text() +
         '<div class="field"><label for="refConstruction">Costuras, avíos, etiquetas y acabados</label>')
    once("report.row('Costuras, avíos y etiquetas',r.construction);",
         "report.row('Costuras, avíos y etiquetas',r.construction);for(const row of poloConstructionRows())report.row(row[0],row[1]);")
    once("!['Tallas','Cuidados','Empaque',...PRICE_LABELS].includes(label)",
         "!['Tallas','Cuidados','Empaque','Cuello (TGM)','Puño (después de coser)','Rayas del puño','Aletilla',...PRICE_LABELS].includes(label)")
    once('init().catch(e=>toast', (source / 'construction.js').read_text() + '\ninit().catch(e=>toast')
    return html
