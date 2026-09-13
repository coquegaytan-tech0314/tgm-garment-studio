"""TGM tela catalog presets + custom developments (MGM v8.2.10). Last compose step."""
from pathlib import Path
import csv
import json
import re

UI_VERSION = '8.2.10'
SEED_NAME = 'tgm-catalogo-telas-SEED_2026_05_25.csv'


def _seed_paths(root):
    source = Path(root) / 'telas-tgm'
    return [
        Path('/workspace') / SEED_NAME,
        source / SEED_NAME,
        Path(root) / SEED_NAME,
    ]


def load_seed_rows(root):
    for path in _seed_paths(root):
        if path.is_file():
            with path.open(newline='', encoding='utf-8-sig') as handle:
                rows = []
                for raw in csv.DictReader(handle):
                    rows.append({
                        'nombre': (raw.get('nombre') or '').strip(),
                        'composicion': (raw.get('composicion') or '').strip(),
                        'anchoUtil': (raw.get('anchoUtil') or '').strip(),
                        'pesoGm2': (raw.get('pesoGm2') or '').strip(),
                        'rendimiento': (raw.get('rendimiento') or '').strip(),
                        'nota': (raw.get('nota') or '').strip(),
                    })
                return path, [row for row in rows if row['nombre']]
    return None, []


def _with_seed(js, root):
    path, rows = load_seed_rows(root)
    if not rows:
        return js
    payload = json.dumps(rows, ensure_ascii=False)
    source = json.dumps(path.name)
    return js + f'\nTGM_TELA_CATALOG=telaMergeSeed(TGM_TELA_CATALOG,{payload},{source});\n'


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
    once('init().catch(e=>toast', _with_seed((source / 'catalog.js').read_text(), root) + '\ninit().catch(e=>toast')
    return html
