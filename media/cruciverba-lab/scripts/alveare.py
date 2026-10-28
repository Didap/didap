import sys, math
out = sys.argv[1]
W, H = 1256, 1520
D = 12.0
# Alveare del 28 ottobre: L al centro, obbligatoria
center = "L"
ring = ["Z", "B", "E", "I", "M", "O"]  # dall'alto a sinistra, in senso orario
words = ["MOLLE", "OLIO", "MOBILE", "ZOLLE", "BOZZOLO"]
hexw, hexh = 250, 216
cx, cy = W // 2, 930
# centri: centro + sei intorno (esagoni a punta piatta come sul sito: punte in alto)
pos = {"L": (cx, cy)}
offs = [(-0.5, -1), (0.5, -1), (1, 0), (0.5, 1), (-0.5, 1), (-1, 0)]
for ch, (dx, dy) in zip(ring, offs):
    pos[ch] = (cx + dx * (hexw + 14), cy + dy * (hexh * 0.86 + 12) * (1 if dx != 0 and abs(dx) == 1 else 1))
# riallinea: le colonne laterali stanno a metà altezza
pos["E"] = (cx + hexw + 14, cy); pos["O"] = (cx - hexw - 14, cy)
for ch, sgn in (("Z", -1), ("B", -1), ("I", 1), ("M", 1)):
    x = pos[ch][0]
    pos[ch] = (x, cy + sgn * (hexh * 0.86 + 6))
for ch in ("Z", "M"):
    pos[ch] = (cx - (hexw + 14) / 2, pos[ch][1])
for ch in ("B", "I"):
    pos[ch] = (cx + (hexw + 14) / 2, pos[ch][1])
css = f"""
@font-face{{font-family:Caprasimo;src:url('assets/fonts/caprasimo-400.woff2') format('woff2');font-weight:400}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var.woff2') format('woff2');font-weight:100 900}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var-italic.woff2') format('woff2');font-weight:100 900;font-style:italic}}
:root{{--paper:#FCFCF9;--ink:#1F130E;--soft:#473A33;--mute:#6D6059;--alv:#8A7410;--vivid:#F2C20F;--tile:#F8E59B;--hair:#DAD7D2}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:var(--paper)}}
#root{{position:absolute;inset:0;background:var(--paper);font-family:Piazzolla,serif;color:var(--ink)}}
.title{{position:absolute;left:110px;top:100px;font-family:Caprasimo;font-size:72px;color:var(--alv)}}
.count{{position:absolute;left:110px;top:210px;font-family:Caprasimo;font-size:48px}}
.count .of{{color:var(--alv)}}
.bar{{position:absolute;left:110px;right:110px;top:300px;height:16px;border-radius:8px;background:#F4EBC4}}
.fill{{position:absolute;left:0;top:0;bottom:0;width:100%;border-radius:8px;background:var(--vivid);transform-origin:0 50%}}
.field{{position:absolute;left:110px;right:110px;top:380px;height:120px;display:flex;justify-content:center;align-items:center;border-bottom:2px solid var(--ink)}}
.w{{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;justify-content:center;align-items:center;gap:6px;font-family:Caprasimo;font-size:84px;letter-spacing:.04em}}
.w span{{opacity:0}}
.w span.req{{color:#C99A00}}
.hex{{position:absolute;width:{hexw}px;height:{hexh}px;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);background:var(--tile);display:flex;align-items:center;justify-content:center;font-family:Caprasimo;font-size:84px}}
.hex.c{{background:var(--vivid)}}
.ok{{position:absolute;right:110px;top:222px;text-align:right;font-style:italic;font-size:36px;color:var(--alv)}}
"""
# ruota gli esagoni di 90 gradi rispetto al sito: il sito usa esagoni con punte in alto
css = css.replace("clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)", "clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)")
hexw2, hexh2 = 230, 262
css = css.replace(f"width:{hexw}px;height:{hexh}px", f"width:{hexw2}px;height:{hexh2}px")
# disposizione con punte in alto: righe sfalsate
g = 14
pos = {}
row0 = cy - (hexh2 * 0.75 + g)
row2 = cy + (hexh2 * 0.75 + g)
pos["Z"] = (cx - (hexw2 + g) / 2, row0); pos["B"] = (cx + (hexw2 + g) / 2, row0)
pos["O"] = (cx - (hexw2 + g), cy); pos["L"] = (cx, cy); pos["E"] = (cx + (hexw2 + g), cy)
pos["M"] = (cx - (hexw2 + g) / 2, row2); pos["I"] = (cx + (hexw2 + g) / 2, row2)
h = ['<div class="title">Alveare</div>',
     '<div class="count">Trovate <span id="n">0</span> <span class="of">su 109</span></div>',
     '<div class="bar"><div class="fill" id="fill"></div></div>',
     '<div class="field">']
for wi, w in enumerate(words):
    letters = "".join(f'<span id="w{wi}_{k}" class="{"req" if ch == "L" else ""}">{ch}</span>' for k, ch in enumerate(w))
    h.append(f'<div class="w" id="w{wi}">{letters}</div>')
h.append('</div>')
h.append('<div class="ok" id="ok" style="opacity:0">Bella!</div>')
for ch, (x, y) in pos.items():
    h.append(f'<div class="hex {"c" if ch == "L" else ""}" id="h{ch}" style="left:{x - hexw2/2:.0f}px;top:{y - hexh2/2:.0f}px">{ch}</div>')
js = ["const tl=gsap.timeline({paused:true});", 'gsap.set("#fill",{scaleX:0.02});']
t = 0.5
counts = [0, 1, 2, 3, 4, 5]
for wi, w in enumerate(words):
    for k, ch in enumerate(w):
        tk = t + k * 0.16
        js.append(f'tl.fromTo("#w{wi}_{k}",{{opacity:0,y:10}},{{opacity:1,y:0,duration:0.12,ease:"power3.out"}},{tk:.2f});')
        js.append(f'tl.fromTo("#h{ch}",{{scale:1}},{{scale:0.92,duration:0.06,ease:"power2.out",yoyo:true,repeat:1}},{tk:.2f});')
    te = t + len(w) * 0.16 + 0.25
    js.append(f'tl.fromTo("#ok",{{opacity:0}},{{opacity:1,duration:0.12}},{te:.2f});')
    js.append(f'tl.to("#ok",{{opacity:0,duration:0.15}},{te + 0.6:.2f});')
    js.append(f'tl.to("#w{wi} span",{{opacity:0,y:-30,duration:0.25,stagger:0.02,ease:"power2.in"}},{te + 0.35:.2f});')
    js.append(f'tl.set("#n",{{textContent:"{wi + 1}"}},{te:.2f});')
    js.append(f'tl.to("#fill",{{scaleX:{0.02 + 0.06 * (wi + 1):.2f},duration:0.4,ease:"power3.out"}},{te:.2f});')
    t = te + 1.0
js.append(f'tl.set("#n",{{textContent:"0"}},{D - 0.6:.2f});')
js.append(f'tl.to("#fill",{{scaleX:0.02,duration:0.5,ease:"power2.inOut"}},{D - 0.9:.2f});')
js.append(f'tl.set({{}},{{}},{D:.2f});')
js.append('window.__timelines["main"]=tl;')
html = f"""<!doctype html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width={W}, height={H}" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>{css}</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{D:g}" data-width="{W}" data-height="{H}">
<div id="stage" class="clip" data-start="0" data-duration="{D:g}" data-track-index="0" style="position:absolute;inset:0" data-layout-allow-overlap>
{chr(10).join(h)}
</div>
</div>
<script>
{chr(10).join(js)}
</script>
</body>
</html>
"""
open(out, 'w', encoding='utf8').write(html)
