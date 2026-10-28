# Scrive index.html della splash dai loghi in public/brand.
# Uso: python media/splash/build.py (dalla radice del repo)
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRAND = ROOT / 'public' / 'brand'
OUT = Path(__file__).resolve().parent / 'index.html'

PATH = re.compile(r'<g transform="([^"]+)"><path d="([^"]+)" fill="([^"]+)"/></g>')

esteso = PATH.findall((BRAND / 'logo-esteso.svg').read_text())
contratto = PATH.findall((BRAND / 'logo-contratto.svg').read_text())
testa = re.search(r'<svg[^>]*>(.*)</svg>', (BRAND / 'didi-testa.svg').read_text(), re.S).group(1)

# Ordine nel file: i, d, a, p, sagoma della D con la scimmia, il muso
ids = ['l-i', 'l-d', 'l-a', 'l-p', 'l-dbody', 'l-dface']
groups = '\n'.join(
    f'<g id="{i}"><g transform="{t}"><path d="{d}" fill="{f}"/></g></g>'
    for (t, d, f), i in zip(esteso, ids)
)
d_plain = contratto[0][1]

html = (Path(__file__).resolve().parent / 'template.html.txt').read_text(encoding='utf-8')
html = html.replace('%%ESTESO%%', groups).replace('%%DPLAIN%%', d_plain).replace('%%TESTA%%', testa)
OUT.write_text(html, encoding='utf-8')
print('scritto', OUT)
