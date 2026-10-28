import sys
out = sys.argv[1]
W, H = 822, 1080
D = 12.0
# Rulli: cinque rulli di lettere da girare finché la riga centrale forma una parola (dati di esempio)
reels = [list("LPMCL"), list("UEOAU"), list("TSRNT"), list("VCSTV"), list("IAOEI")]
words = ["PESCA", "MORSO", "CANTO"]
cw, chh = 128, 120
gap = 14
x0 = (W - (5 * cw + 4 * gap)) // 2
mid = 470
css = f"""
@font-face{{font-family:Caprasimo;src:url('assets/fonts/caprasimo-400.woff2') format('woff2');font-weight:400}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var.woff2') format('woff2');font-weight:100 900}}
:root{{--paper:#FCFCF9;--ink:#1F130E;--mute:#C2BDB5;--rulli:#C92A6B;--tile:#F3C3D3}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:var(--paper)}}
#root{{position:absolute;inset:0;background:var(--paper);font-family:Piazzolla,serif;color:var(--ink)}}
.title{{position:absolute;left:{x0}px;top:110px;font-family:Caprasimo;font-size:64px;color:var(--rulli)}}
.band{{position:absolute;left:{x0-20}px;right:{x0-20}px;top:{mid}px;height:{chh}px;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink)}}
.hit{{position:absolute;inset:0;background:var(--tile);opacity:0}}
.win{{position:absolute;top:{mid - 2*chh}px;width:{cw}px;height:{5*chh}px;overflow:hidden}}
.reel{{position:absolute;left:0;top:0;width:{cw}px}}
.reel div{{height:{chh}px;display:flex;align-items:center;justify-content:center;font-family:Caprasimo;font-size:76px;color:var(--ink)}}
.fade{{position:absolute;left:0;right:0;height:{2*chh}px;pointer-events:none}}
.found{{position:absolute;left:{x0}px;right:{x0}px;top:{mid + 3*chh + 30}px;display:flex;gap:16px;flex-wrap:wrap}}
.found span{{font-weight:600;font-size:26px;letter-spacing:.12em;padding:8px 16px;border-radius:6px;background:var(--tile);color:var(--ink);opacity:0}}
.mk{{position:absolute;left:{W//2 - 14}px;width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent}}
"""
h = ['<div class="title">Rulli</div>', '<div class="band"><div class="hit" id="hit"></div></div>',
]
# ogni rullo ripete le sue lettere per poter girare
for i, r in enumerate(reels):
    seq = (r[:4] * 4)
    letters = "".join(f'<div>{c}</div>' for c in seq)
    h.append(f'<div class="win" data-layout-allow-occlusion style="left:{x0 + i*(cw+gap)}px"><div class="reel" id="reel{i}">{letters}</div></div>')
h.append(f'<div class="fade" data-layout-allow-occlusion style="top:{mid-2*chh}px;background:linear-gradient(var(--paper),rgba(252,252,249,0.15))"></div>')
h.append(f'<div class="fade" data-layout-allow-occlusion style="top:{mid+chh}px;background:linear-gradient(rgba(252,252,249,0.15),var(--paper))"></div>')
h.append('<div class="found">' + "".join(f'<span id="fw{k}">{w}</span>' for k, w in enumerate(words)) + '</div>')
js = ["const tl=gsap.timeline({paused:true});"]
# posizione: la lettera j del rullo sta al centro quando y = -(j + 4 - 2) * chh (si usa la seconda ripetizione)
def ypos(j, rep=1):
    return -((j + 4 * rep) - 2) * chh
for i in range(5):
    js.append(f'gsap.set("#reel{i}",{{y:{ypos(0)}}});')
t = 0.6
for k, w in enumerate(words):
    for i, ch in enumerate(w):
        j = reels[i][:4].index(ch)
        js.append(f'tl.to("#reel{i}",{{y:{ypos(j)},duration:0.5,ease:"power3.inOut"}},{t + i*0.16:.2f});')
    tw = t + 4*0.16 + 0.55
    js.append(f'tl.fromTo("#hit",{{opacity:0}},{{opacity:1,duration:0.15}},{tw:.2f});')
    js.append(f'tl.to("#hit",{{opacity:0,duration:0.3}},{tw+0.9:.2f});')
    js.append(f'tl.fromTo("#fw{k}",{{opacity:0,y:12}},{{opacity:1,y:0,duration:0.25,ease:"expo.out"}},{tw+0.1:.2f});')
    t = tw + 1.5
for i in range(5):
    js.append(f'tl.to("#reel{i}",{{y:{ypos(0)},duration:0.5,ease:"power3.inOut"}},{D-1.2 + i*0.05:.2f});')
js.append(f'tl.to(["#fw0","#fw1","#fw2"],{{opacity:0,duration:0.25,stagger:0.05}},{D-1.2:.2f});')
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
