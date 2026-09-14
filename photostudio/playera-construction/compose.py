"""MGM playera cuello redondo measurement standards (v8.2.15). Schema VERSION stays 8."""
from pathlib import Path

def extend(html, root):
    source = Path(root) / 'playera-construction'

    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one playera-construction anchor: ' + before[:140])
        html = html.replace(before, after, 1)

    once('</style>', (source / 'style.css').read_text() + '</style>')
    once(
        '<p class="note">Textura y caída aproximadas. El color en pantalla es una referencia; confirmar con muestra física.</p>',
        (source / 'fields.html').read_text() +
        '<p class="note">Textura y caída aproximadas. El color en pantalla es una referencia; confirmar con muestra física.</p>'
    )
    once(
        '<section class="pricing-card" aria-labelledby="pricingTitle">',
        (source / 'tallas.html').read_text() +
        '<section class="pricing-card" aria-labelledby="pricingTitle">'
    )
    once(
        '<div id="poloFichaSpecs" hidden>',
        (source / 'ficha.html').read_text() +
        '<div id="poloFichaSpecs" hidden>'
    )
    once(
        'Opcionales · EJEMPLO. Prenda plana; completar con medidas reales. No son una tabla de tallas calculada.',
        'Prenda plana. Playera cuello redondo: A tórax 1″ bajo sisa · B espalda/hombros costura a costura · C largo desde HPS · D manga desde hombro. Costura 0.5–1.0 cm. Completar con medidas reales; no es una tabla calculada.'
    )
    once(
        "for(const row of poloConstructionRows())report.row(row[0],row[1]);",
        "for(const row of poloConstructionRows())report.row(row[0],row[1]);for(const row of roundNeckConstructionRows())report.row(row[0],row[1]);"
    )
    once(
        "!['Tallas','Cuidados','Empaque','Cuello (TGM)','Puño (después de coser)','Rayas del puño','Aletilla','Abertura lateral',...PRICE_LABELS].includes(label)",
        "!['Tallas','Cuidados','Empaque','Cuello (TGM)','Puño (después de coser)','Rayas del puño','Aletilla','Abertura lateral','Ancho de tórax (A)','Ancho de espalda / hombros (B)','Largo desde HPS (C)','Largo de manga (D)','Costura',...PRICE_LABELS].includes(label)"
    )
    once('init().catch(e=>toast', (source / 'construction.js').read_text() + '\ninit().catch(e=>toast')
    return html
