import sys
out = sys.argv[1]
W, H = 822, 1080
D = 12.0
# Chiave: parola di 5 lettere in 6 tentativi. Verde = posto giusto, giallo = lettera presente.
target = "PRESA"
guesses = ["PIANO", "PRIMA", "PRESA"]
def score(g):
    res = []
    for i, ch in enumerate(g):
        if target[i] == ch: res.append("g")
        elif ch in target: res.append("y")
        else: res.append("x")
    return res
tile = 116
gap = 12
gx = (W - (5 * tile + 4 * gap)) // 2
gy = 230
css = f"""
@font-face{{font-family:Caprasimo;src:url('assets/fonts/caprasimo-400.woff2') format('woff2');font-weight:400}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var.woff2') format('woff2');font-weight:100 900}}
:root{{--paper:#FCFCF9;--ink:#1F130E;--soft:#473A33;--green:#008238;--yellow:#F2CC4A;--hair:#C2BDB5;--chiave:#0A7A3E}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:var(--paper)}}
#root{{position:absolute;inset:0;background:var(--paper);font-family:Piazzolla,serif;color:var(--ink)}}
.title{{position:absolute;left:{gx}px;top:110px;font-family:Caprasimo;font-size:64px;color:var(--chiave);display:flex;align-items:center;gap:18px}}
.dots{{display:flex;gap:6px}}.dots i{{width:14px;height:14px;border:2px solid var(--chiave);display:block}}.dots i.on{{background:var(--chiave)}}
.t{{position:absolute;width:{tile}px;height:{tile}px;border:2px solid var(--hair);border-radius:8px;background:var(--paper)}}
.f{{position:absolute;inset:-2px;border-radius:8px;opacity:0}}
.f.g{{background:var(--green)}}.f.y{{background:var(--yellow)}}.f.x{{background:#fff;border:2px solid var(--ink)}}
.ch{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:44px;opacity:0}}
.foot{{position:absolute;left:{gx}px;right:{gx}px;top:{gy - 70}px;left:auto;right:{gx}px;text-align:right;font-style:italic;font-size:30px;color:var(--soft)}}
"""
h = ['<div class="title">Chiave<span class="dots"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i></span></div>']
js = ["const tl=gsap.timeline({paused:true});"]
for r in range(6):
    for c in range(5):
        x = gx + c * (tile + gap); y = gy + r * (tile + gap)
        inner = ""
        if r < len(guesses):
            s = score(guesses[r])[c]
            ch = guesses[r][c]
            color = "#fff" if s == "g" else "var(--ink)"
            inner = f'<div class="f {s}" id="f{r}{c}"></div><div class="ch" id="c{r}{c}" style="color:var(--ink)">{ch}</div>'
        h.append(f'<div class="t" style="left:{x}px;top:{y}px">{inner}</div>')
h.append('<div class="foot" id="foot" style="opacity:0">Trovata al terzo tentativo.</div>')
t = 0.5
for r, g in enumerate(guesses):
    s = score(g)
    for c in range(5):
        js.append(f'tl.fromTo("#c{r}{c}",{{opacity:0,scale:0.7}},{{opacity:1,scale:1,duration:0.14,ease:"back.out(2)"}},{t + c*0.16:.2f});')
    tr = t + 5*0.16 + 0.35
    for c in range(5):
        js.append(f'tl.fromTo("#f{r}{c}",{{opacity:0,scaleY:0}},{{opacity:1,scaleY:1,duration:0.22,ease:"power3.out"}},{tr + c*0.12:.2f});')
        if s[c] == "g":
            js.append(f'tl.to("#c{r}{c}",{{color:"#fff",duration:0.1}},{tr + c*0.12 + 0.1:.2f});')
    t = tr + 5*0.12 + 0.7
js.append(f'tl.fromTo("#foot",{{opacity:0,filter:"blur(6px)"}},{{opacity:1,filter:"blur(0px)",duration:0.2}},{t:.2f});')
# reset per il loop
allc = ",".join(f'"#c{r}{c}","#f{r}{c}"' for r in range(len(guesses)) for c in range(5))
js.append(f'tl.to([{allc},"#foot"],{{opacity:0,duration:0.35,stagger:0.01,ease:"power2.in"}},{D-1.2:.2f});')
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
