def extend(html, root):
    source = root / 'pricing-v7'
    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one pricing integration anchor: ' + before[:100])
        html = html.replace(before, after, 1)
    once('VERSION=6,KEY=', 'VERSION=7,KEY=')
    once('![1,2,3,4,5,6].includes(raw.version)', '![1,2,3,4,5,6,7].includes(raw.version)')
    html = html.replace('ESTUDIO · v6', 'ESTUDIO · v7').replace('v6.0</span></footer>', 'v7.0</span></footer>').replace('(versiones 1 a 6).', '(versiones 1 a 7).')
    once('>Tallas</button>', '>Tallas y precio</button>')
    once('<th id="sizeTotal">0</th></tr></tfoot></table></div>', '<th id="sizeTotal">0</th></tr></tfoot></table>' + (source/'panel.html').read_text() + '</div>')
    once("!['Tallas','Cuidados','Empaque'].includes(label)", "!['Tallas','Cuidados','Empaque',...PRICE_LABELS].includes(label)")
    once("report.row('Empaque',state.packaging);", "report.row('Empaque',state.packaging);referencePricing(report);")
    once('</style>', (source/'style.css').read_text() + '</style>')
    once('init().catch(e=>toast', (source/'pricing.js').read_text() + '\ninit().catch(e=>toast')
    return html
