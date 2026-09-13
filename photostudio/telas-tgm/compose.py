"""TGM tela catalog presets + custom developments (MGM v8.2.10). Last compose step."""
from pathlib import Path
import re

UI_VERSION = '8.2.10'


def extend(html, root):
    source = Path(root) / 'telas-tgm'

    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one telas-tgm anchor: ' + before[:120])
        html = html.replace(before, after, 1)

    html = re.sub(r'MGM · v8\.2\.\d+', f'MGM · v{UI_VERSION}', html)
    html = re.sub(r'(nube opcional · )v[\d.]+', rf'\g<1>v{UI_VERSION}', html)
    once('</style>', (source / 'style.css').read_text() + '</style>')
    once(
        '<div class="divider"></div><div class="row"><div class="field"><label for="fabric">Tela</label>',
        (source / 'fields.html').read_text() +
        '<div class="divider"></div><div class="row"><div class="field"><label for="fabric">Tela</label>'
    )
    once('init().catch(e=>toast', (source / 'catalog.js').read_text() + '\ninit().catch(e=>toast')
    return html
