"""MGM v8.2.17 construction defaults (Koke 2026-10-02): hoodie rib puño + pretina 5.5 cm,
standard-size Acabado proportion for polo / playera, measures in Regla, Tallas, ficha and Despiece.
Schema VERSION stays 8. Runs after playera-construction and before telas-tgm (version stamp)."""
from pathlib import Path


def extend(html, root):
    source = Path(root) / 'construction-v8217'

    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one construction-v8217 anchor: ' + before[:140])
        html = html.replace(before, after, 1)

    once('</style>', (source / 'style.css').read_text() + '</style>')
    once('<div id="poloExtras" hidden>', (source / 'fields.html').read_text() + '<div id="poloExtras" hidden>')
    once('<div id="poloFichaSpecs" hidden>', (source / 'ficha.html').read_text() + '<div id="poloFichaSpecs" hidden>')
    once('<section class="pricing-card" aria-labelledby="pricingTitle">',
         (source / 'tallas.html').read_text() + '<section class="pricing-card" aria-labelledby="pricingTitle">')
    once('<p class="help" id="despiecePartHint">',
         '<p class="despiece-std" id="despiecePartStd" hidden></p>\n        <p class="help" id="despiecePartHint">')
    once("for(const row of roundNeckConstructionRows())report.row(row[0],row[1]);",
         "for(const row of roundNeckConstructionRows())report.row(row[0],row[1]);for(const row of hoodieStdRows())report.row(row[0],row[1]);")
    once("'Costura',...PRICE_LABELS]", "'Costura',...V8217_SPEC_LABELS,...PRICE_LABELS]")
    once('init().catch(e=>toast', (source / 'construction.js').read_text() + '\ninit().catch(e=>toast')
    return html
