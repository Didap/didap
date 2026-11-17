"""Cornice del telefono per le schede prodotto, ricavata dal clip di CityFix.

Il mockup iPhone 17 Pro (PSD 9052-01) ha una licenza e non sta nel repo. Il clip
public/covers/cityfix-punto1.mp4 lo mostra già alla misura degli slot: telefono alto 1320,
con lo sfondo #f4f4f4 e l'ombra della tessera. Da quei fotogrammi questo script toglie lo
sfondo e l'ombra (si conoscono, si ridisegnano uguali in Chrome) e buca lo schermo lasciando
la Dynamic Island. Scrive telefono.png accanto a sé: è fuori dal repo come la cornice del PSD.

    python media/telefono/telefono.py

Serve ffmpeg e Chrome (CHROME per un percorso diverso). Le misure sono in misure.json, quelle di
media/cityfix/landing/punto1/index.html, e le legge anche monta.mjs.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
CLIP = os.path.join(REPO, 'public', 'covers', 'cityfix-punto1.mp4')
CHROME = os.environ.get('CHROME', r'C:\Program Files\Google\Chrome\Application\chrome.exe')

OUT = os.path.join(HERE, 'telefono.png')

with open(os.path.join(HERE, 'misure.json'), encoding='utf-8') as f:
    M = json.load(f)
W, H = M['tessera']['w'], M['tessera']['h']
# Il telefono in punto1. Il buco è il vetro che si vede, dentro il bordo nero: lo schermo dei
# progetti è più grande e il bordo nero ne copre i lati, come nel PSD
BODY, GLASS = M['body'], M['glass']
# Dove cercare la Dynamic Island (fotogramma intero)
ISLAND = (520, 120, 740, 195)
SHADOW = M['ombra'] + ' rgba(43, 28, 232, 0.38)'


def rounded_sdf(xs, ys, b, inset=0.0):
    """Distanza (negativa dentro) dal rettangolo arrotondato b ristretto di inset."""
    cx, cy = b['x'] + b['w'] / 2, b['y'] + b['h'] / 2
    hw, hh, r = b['w'] / 2 - inset, b['h'] / 2 - inset, b['r'] - inset
    qx = np.abs(xs - cx) - (hw - r)
    qy = np.abs(ys - cy) - (hh - r)
    out = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0))
    return out + np.minimum(np.maximum(qx, qy), 0) - r


with tempfile.TemporaryDirectory() as tmp:
    # Sfondo e ombra senza telefono, disegnati come nel clip
    page = os.path.join(tmp, 'b.html')
    with open(page, 'w') as f:
        f.write(
            '<html><head><style>*{margin:0;padding:0}'
            f'html,body{{width:{W}px;height:{H}px;overflow:hidden;background:#f4f4f4}}'
            f'#o{{position:absolute;left:{BODY["x"]}px;top:{BODY["y"]}px;width:{BODY["w"]}px;'
            f'height:{BODY["h"]}px;border-radius:{BODY["r"]}px;box-shadow:{SHADOW}}}'
            '</style></head><body><div id=o></div></body></html>'
        )
    shot = os.path.join(tmp, 'b.png')
    subprocess.run([
        CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
        f'--screenshot={shot}', f'--window-size={W},{H}', 'file:///' + page.replace('\\', '/'),
    ], check=True, capture_output=True)
    back = np.asarray(Image.open(shot).convert('RGB')).astype(np.float32)

    # La mediana di 15 fotogrammi pulisce la cornice dalla compressione
    subprocess.run(['ffmpeg', '-v', 'error', '-i', CLIP, '-vf', 'fps=1.5', os.path.join(tmp, 'f%02d.png')], check=True)
    frames = [np.asarray(Image.open(os.path.join(tmp, n)).convert('RGB')) for n in sorted(os.listdir(tmp)) if n.startswith('f')]
    img = np.median(np.stack(frames), axis=0).astype(np.float32)

if back.shape != img.shape:
    sys.exit(f'Misure diverse: sfondo {back.shape}, clip {img.shape}')

ys, xs = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5

# Alfa: dentro la sagoma è telefono; sul bordo quanto il pixel si stacca dallo sfondo
diff = np.abs(img - back).max(axis=2)
alpha = np.clip((diff - 3) / 14, 0, 1)
alpha = np.maximum(alpha, np.clip(-rounded_sdf(xs, ys, BODY, inset=5), 0, 1))
alpha[rounded_sdf(xs, ys, BODY) > 6] = 0

# Lo schermo è un buco, tranne la Dynamic Island
hole = np.clip(-rounded_sdf(xs, ys, GLASS) + 0.5, 0, 1)
x0, y0, x1, y1 = ISLAND
lum = img @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
island = np.zeros_like(hole)
island[y0:y1, x0:x1] = np.clip((140 - lum[y0:y1, x0:x1]) / 80, 0, 1)
alpha *= 1 - hole * (1 - island)

# Il colore senza lo sfondo dietro
a = np.maximum(alpha, 1e-3)[..., None]
color = np.clip(back + (img - back) / a, 0, 255)
rgba = np.dstack([color, alpha * 255]).round().astype(np.uint8)

bx0, by0 = int(BODY['x']), int(BODY['y'])
bx1, by1 = int(np.ceil(BODY['x'] + BODY['w'])), int(np.ceil(BODY['y'] + BODY['h']))
Image.fromarray(rgba).crop((bx0, by0, bx1, by1)).save(OUT)
print(OUT, bx1 - bx0, 'x', by1 - by0, 'a', bx0, by0)
