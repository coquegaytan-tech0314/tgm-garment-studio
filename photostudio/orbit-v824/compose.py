def extend(html, root):
    source = root / 'orbit-v824'
    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one orbit-v824 integration anchor: ' + before[:120])
        html = html.replace(before, after, 1)
    html = html.replace('ESTUDIO · v8.2.3', 'ESTUDIO · v8.2.4').replace('v8.2.3</span></footer>', 'v8.2.4</span></footer>')
    once('</style>', (source / 'style.css').read_text() + '</style>')
    once('init().catch(e=>toast', (source / 'orbit.js').read_text() + '\ninit().catch(e=>toast')
    return html
