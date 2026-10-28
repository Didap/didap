import sys
out = sys.argv[1]
W, H = 816, 1520
D = 12.0
# Ghigliottina del 27 ottobre 2026 (soluzione pubblica sul sito): la parola e TENERE
pairs = [("ASSENTE", "PRESENTE", 1), ("STAFFE", "SPERONI", 0), ("QUARESIMA", "BATTESIMO", 1),
         ("BOTTA", "RISPOSTA", 0), ("ZAMPA", "MUSO", 1)]
answer = "TENERE"
cw, ch, gap = 318, 132, 40
x0 = (W - (2 * cw + gap)) // 2
y0 = 270
css = f"""
@font-face{{font-family:Caprasimo;src:url('assets/fonts/caprasimo-400.woff2') format('woff2');font-weight:400}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var.woff2') format('woff2');font-weight:100 900}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var-italic.woff2') format('woff2');font-weight:100 900;font-style:italic}}
:root{{--paper:#FCFCF9;--ink:#1F130E;--soft:#473A33;--mute:#6D6059;--gh:#9A5A12;--vivid:#D9731F;--tile:#F8E6D6}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:var(--paper)}}
#root{{position:absolute;inset:0;background:var(--paper);font-family:Piazzolla,serif;color:var(--ink)}}
.title{{position:absolute;left:{x0}px;top:110px;font-family:Caprasimo;font-size:64px;color:var(--gh)}}
.slot{{position:absolute;width:{cw}px;height:{ch}px;border:2px dashed #E7B48C;border-radius:6px;background:var(--tile)}}
.card{{position:absolute;width:{cw}px;height:{ch}px;border:2px solid var(--ink);border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;font-family:Caprasimo;font-size:{38}px;letter-spacing:.03em;box-shadow:0 4px 0 var(--ink)}}
.card.win{{background:var(--ink);color:var(--paper)}}
.o{{position:absolute;width:{gap}px;text-align:center;font-style:italic;font-size:28px;color:var(--mute)}}
.ans{{position:absolute;left:{x0}px;right:{x0}px;top:{y0 + 5*(ch+34) + 60}px;height:150px;border-top:2px solid var(--ink);display:flex;align-items:center;justify-content:center;gap:8px;font-family:Caprasimo;font-size:88px;color:var(--vivid)}}
.ans span{{opacity:0}}
"""
h = ['<div class="title">Ghigliottina</div>']
js = ["const tl=gsap.timeline({paused:true});"]
t = 0.4
for i, (a, b, win) in enumerate(pairs):
    y = y0 + i * (ch + 22)
    h.append(f'<div class="slot" style="left:{x0}px;top:{y}px"></div><div class="slot" style="left:{x0+cw+gap}px;top:{y}px"></div>')
    h.append(f'<div class="o" style="left:{x0+cw}px;top:{y+46}px">o</div>')
    for j, wd in enumerate((a, b)):
        cls = "card win" if j == win else "card"
        h.append(f'<div class="{"card"}" id="p{i}{j}" style="left:{x0 + j*(cw+gap)}px;top:{y}px;opacity:0">{wd}</div>')
    js.append(f'tl.fromTo(["#p{i}0","#p{i}1"],{{opacity:0,y:-24,filter:"blur(6px)"}},{{opacity:1,y:0,filter:"blur(0px)",duration:0.3,stagger:0.08,ease:"expo.out"}},{t:.2f});')
    js.append(f'tl.to("#p{i}{win}",{{backgroundColor:"#1F130E",color:"#FCFCF9",duration:0.15}},{t+0.75:.2f});')
    js.append(f'tl.to("#p{i}{1-win}",{{opacity:0.25,duration:0.25}},{t+0.75:.2f});')
    t += 1.45
h.append('<div class="ans">' + "".join(f'<span id="a{k}">{c}</span>' for k, c in enumerate(answer)) + '</div>')
for k in range(len(answer)):
    js.append(f'tl.fromTo("#a{k}",{{opacity:0,y:20}},{{opacity:1,y:0,duration:0.16,ease:"back.out(2)"}},{t + 0.2 + k*0.1:.2f});')
allc = ",".join(f'"#p{i}{j}"' for i in range(5) for j in range(2))
alla = ",".join(f'"#a{k}"' for k in range(len(answer)))
js.append(f'tl.to([{alla}],{{opacity:0,duration:0.25,stagger:0.02}},{D-1.1:.2f});')
js.append(f'tl.to([{allc}],{{opacity:0,duration:0.3,stagger:0.02,ease:"power2.in"}},{D-1.0:.2f});')
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
