"""MGM / Tejidos Gaytán chrome. Last compose step so open v8.2.4 PRs can land first."""
from pathlib import Path
import base64
import re

UI_VERSION = '8.2.5'

ICONS = '''
<symbol id="i-lab" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.2" stroke-dasharray="1.5 1.7"/><path d="M10 6.6h4v1.3h-1.15v4.4c1 .5 1.65 1.45 1.65 2.6a3.5 3.5 0 1 1-7 0c0-1.15.65-2.1 1.65-2.6V7.9H10z"/><circle cx="13.15" cy="16.2" r=".45"/></symbol>
<symbol id="i-talk" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.2" stroke-dasharray="1.5 1.7"/><circle cx="8.6" cy="10.4" r="1.55"/><circle cx="15.4" cy="10.4" r="1.55"/><path d="M6.7 16.1c.45-1.7 1.85-2.55 3.5-2.55h.3c.7 0 1.3.2 1.7.55.4-.35 1-.55 1.7-.55h.3c1.65 0 3.05.85 3.5 2.55"/><path d="M9.4 6.7h5.2c.7 0 1.25.55 1.25 1.25v2.1c0 .7-.55 1.25-1.25 1.25h-1.15L12 12.7l-1.45-1.4H9.4c-.7 0-1.25-.55-1.25-1.25v-2.1c0-.7.55-1.25 1.25-1.25z"/><circle cx="10.7" cy="8.7" r=".35"/><circle cx="12" cy="8.7" r=".35"/><circle cx="13.3" cy="8.7" r=".35"/></symbol>
<symbol id="i-swatch" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.2" stroke-dasharray="1.5 1.7"/><rect x="6.6" y="8.2" width="10.8" height="7.6" rx="1.1"/><path d="M8.5 8.2v7.6M10.6 8.2v7.6M12.7 8.2v7.6M14.8 8.2v7.6M16.9 8.2v7.6"/></symbol>
'''

HEADER = '''<header class="topbar"><div class="brand"><img class="brand-logo" alt="Tejidos Gaytán" width="148" height="141" src="{logo}"><div class="brand-copy"><strong class="brand-product">MGM</strong><span class="brand-subtitle">Acabados · Estudio de acabado de prendas · Tejidos Gaytán</span></div><b class="pro-version">MGM · v{version}</b></div><span class="internal">Uso interno</span></header>'''


def _data_uri(path):
    return 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode()


def extend(html, root):
    source = Path(root) / 'brand-mgm'
    assets = Path(root) / 'assets' / 'brand'
    logo = _data_uri(assets / 'gaytan-logo.png')
    favicon = _data_uri(assets / 'favicon.png')

    def once(before, after):
        nonlocal html
        if html.count(before) != 1:
            raise RuntimeError('Expected one MGM brand anchor: ' + before[:120])
        html = html.replace(before, after, 1)

    once('</style>', (source / 'style.css').read_text() + '</style>')
    html = re.sub(r'<header class="topbar">.*?</header>', HEADER.format(logo=logo, version=UI_VERSION), html, count=1, flags=re.S)
    once('<title>TGM · Estudio de acabado de prendas</title>',
         '<title>MGM · Estudio de acabado de prendas</title>'
         '<meta name="application-name" content="MGM">'
         '<meta name="apple-mobile-web-app-title" content="MGM">'
         f'<link rel="icon" type="image/png" href="{favicon}">'
         f'<link rel="apple-touch-icon" href="{favicon}">')
    once('content="Configurador interno de prendas y pedidos de Tejidos Gaytán de Moroleón. Funciona sin conexión."',
         'content="MGM · Estudio de acabado de prendas · Tejidos Gaytán. Configurador interno de acabados. Funciona sin conexión."')
    once('content="#142337"', 'content="#FF2E4D"')
    once('<b>TGM</b> / Estudio de materiales', '<b>MGM</b> / Estudio de materiales')
    once('<strong>TEJIDOS GAYTÁN DE MOROLEÓN</strong>', '<strong>MGM · TEJIDOS GAYTÁN</strong>')
    once('<span>ACABADO DE PRENDA</span>', '<span>MGM · ACABADO</span>')
    html = html.replace("x.fillText('TEJIDOS GAYTÁN DE MOROLEÓN',margin,87)", "x.fillText('MGM · TEJIDOS GAYTÁN',margin,87)")
    html = html.replace("x.fillText('TEJIDOS GAYTÁN DE MOROLEÓN',68,65)", "x.fillText('MGM · TEJIDOS GAYTÁN',68,65)")
    html = re.sub(r'ESTUDIO · v8(?:\.\d+)*', f'MGM · v{UI_VERSION}', html)
    html = re.sub(r'(nube opcional · )v[\d.]+', rf'\g<1>v{UI_VERSION}', html)
    once('</defs></svg>', ICONS + '</defs></svg>')
    once('<button id="photoOpenSettings">Ajustar acabado</button>',
         '<button id="photoOpenSettings"><svg class="icon" aria-hidden="true"><use href="#i-lab"/></svg>Ajustar acabado</button>')
    once('>Abrir desde la nube</button>',
         '><svg class="icon" aria-hidden="true"><use href="#i-talk"/></svg>Abrir desde la nube</button>')
    once('<h3>Acabado y presentación</h3>',
         '<h3><svg class="icon" aria-hidden="true"><use href="#i-lab"/></svg> Acabado y presentación</h3>')
    return html
