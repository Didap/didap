from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import sys

D = sys.argv[1]
black = TTFont(D + "/fontsrc/tmp_Fraunces-Black.ttf")
light = TTFont(D + "/fontsrc/tmp_Fraunces-LightItalic.ttf")
upm = black["head"].unitsPerEm

# (text, font, colour, gap after in em) as in src/components/logo.tsx
runs = [("Bin", black, "#a6302a", 0.22), ("or", light, "#6c6257", 0.22), ("Deal", black, "#2c8a44", 0.0), ("?", black, "#15120d", 0.0)]
track = -0.04 * upm


def glyphs(text, font):
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    for ch in text:
        g = cmap[ord(ch)]
        yield g, hmtx[g][0]


# total width in font units
total = 0
for text, font, _, gap in runs:
    for g, adv in glyphs(text, font):
        total += adv + track
    total += gap * upm
W, H = 628, 760
size = 104  # px per em
s = size / upm
x0 = (W - total * s) / 2
base = H / 2 + size * 0.24
paths = []
x = 0
for text, font, colour, gap in runs:
    gs = font.getGlyphSet()
    d = []
    for g, adv in glyphs(text, font):
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, (s, 0, 0, -s, x0 + x * s, base))
        gs[g].draw(tp)
        d.append(pen.getCommands())
        x += adv + track
    x += gap * upm
    paths.append('<path fill="%s" d="%s"/>' % (colour, " ".join(d)))
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 628 760">\n  <rect width="628" height="760" fill="#ebe4d3"/>\n  ' + "\n  ".join(paths) + "\n</svg>\n"
open(sys.argv[2], "w", encoding="utf-8").write(svg)
print(round(total * s), "px wide")
