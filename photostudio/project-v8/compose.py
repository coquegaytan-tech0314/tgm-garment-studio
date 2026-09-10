def extend(html, root):
    source = root / 'project-v8'
    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one v8 integration anchor: ' + before[:120])
        html = html.replace(before, after, 1)
    once('VERSION=7,KEY=', 'VERSION=8,KEY=')
    once('![1,2,3,4,5,6,7].includes(raw.version)', '![1,2,3,4,5,6,7,8].includes(raw.version)')
    html = html.replace('ESTUDIO · v7', 'ESTUDIO · v8').replace('v7.0</span></footer>', 'v8.0</span></footer>').replace('(versiones 1 a 7).', '(versiones 1 a 8).')
    once('<button id="openOrders"><svg class="icon"><use href="#i-folder"/></svg>Abrir</button>', '<button id="openOrders"><svg class="icon"><use href="#i-folder"/></svg>Abrir</button><button id="projectButton"><svg class="icon"><use href="#i-folder"/></svg>Proyecto completo</button>')
    once('</section>\n<main class="layout">', '</section>' + (source/'banner.html').read_text() + '\n<main class="layout">')
    once('<dialog id="ordersDialog"', (source/'dialog.html').read_text() + '\n<dialog id="ordersDialog"')
    once('</style>', (source/'style.css').read_text() + '</style>')
    once('init().catch(e=>toast', (source/'project.js').read_text() + '\ninit().catch(e=>toast')
    return html
