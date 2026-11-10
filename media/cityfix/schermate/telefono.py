"""Cornice del telefono per le schermate di CityFix, dal mockup iPhone 17 Pro (PSD 9052-01).

Rende il telefono senza sfondo e senza il disegno dello schermo, poi buca lo schermo
(la forma dello smart object) lasciando la Dynamic Island: la schermata va sotto.
Scrive telefono.png e telefono.json (dove sta lo schermo) accanto a questo file.
Il PSD è una risorsa con licenza: telefono.png resta fuori dal repo (.gitignore).

    pip install "psd-tools[composite]"
    python media/cityfix/schermate/telefono.py <9052-01-iphone-17-pro-mockup.psd>
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from psd_tools import PSDImage

psd = PSDImage.open(sys.argv[1])
here = os.path.dirname(os.path.abspath(__file__))


def inside(layer, name):
    while layer is not None and layer is not psd:
        if layer.name == name:
            return True
        layer = layer.parent
    return False


# Il telefono senza lo sfondo beige, senza ombra (la fa la tessera) e senza lo schermo segnaposto
phone = psd.composite(
    layer_filter=lambda l: l.is_visible() and l.name != 'Object Shadow'
    and not inside(l, 'Background') and not inside(l, 'Smart Object')
)
screen_layer = next(l for l in psd.descendants() if l.kind == 'smartobject' and l.name == 'Smart Object')
body = next(l for l in psd.descendants() if l.name == 'Main Object')

px = np.asarray(phone.convert('RGBA')).astype(np.float32)
sx0, sy0, sx1, sy1 = screen_layer.bbox
screen = np.asarray(screen_layer.composite().convert('RGBA'))[..., 3].astype(np.float32) / 255

# La Dynamic Island: i pixel scuri in alto nello schermo restano del telefono
region = px[sy0:sy1, sx0:sx1]
lum = region[..., :3] @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
island = np.clip((140 - lum) / 80, 0, 1)
island[int((sy1 - sy0) * 0.08):] = 0

hole = screen * (1 - island)
region[..., 3] *= 1 - hole

bx0, by0, bx1, by1 = body.bbox
Image.fromarray(px.astype(np.uint8)).crop((bx0, by0, bx1, by1)).save(os.path.join(here, 'telefono.png'))
with open(os.path.join(here, 'telefono.json'), 'w') as f:
    json.dump({
        'width': bx1 - bx0,
        'height': by1 - by0,
        'screen': {'x': sx0 - bx0, 'y': sy0 - by0, 'width': sx1 - sx0, 'height': sy1 - sy0},
    }, f, indent=2)
print('telefono.png', bx1 - bx0, 'x', by1 - by0)
