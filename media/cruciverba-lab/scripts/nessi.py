import sys
out = sys.argv[1]
W, H = 822, 1080
D = 12.0
# Nessi del 27 ottobre 2026 (soluzione pubblica sul sito), dal giallo al viola
groups = [
    ("POSSONO SEGUIRE CON", ["SOLE", "TATTO", "FUSO", "SORTE"], "#F2CC4A"),
    ("HANNO OTTO ZAMPE", ["TARANTOLA", "SCORPIONE", "ZECCA", "ACARO"], "#8CC97A"),
    ("MEZZI SENZA MOTORE", ["CARRO", "DILIGENZA", "TANDEM", "ZATTERA"], "#8FB3E8"),
    ("DUE PAROLE RICUCITE IN UNA", ["FANTASCIENZA", "CANTAUTORE", "MANDARANCIO", "NETTURBINO"], "#C79BE0"),
]
# disposizione iniziale mescolata
order = ["ZECCA", "CARRO", "SOLE", "CANTAUTORE", "TANDEM", "FUSO", "SCORPIONE", "NETTURBINO",
         "TARANTOLA", "MANDARANCIO", "TATTO", "ZATTERA", "FANTASCIENZA", "ACARO", "DILIGENZA", "SORTE"]
tw, th, g = 166, 150, 10
x0 = (W - (4 * tw + 3 * g)) // 2
y0 = 250
def cellpos(i):
    return x0 + (i % 4) * (tw + g), y0 + (i // 4) * (th + g)
css = f"""
@font-face{{font-family:Caprasimo;src:url('assets/fonts/caprasimo-400.woff2') format('woff2');font-weight:400}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var.woff2') format('woff2');font-weight:100 900}}
:root{{--paper:#FCFCF9;--ink:#1F130E;--nessi:#B02E8F;--hair:#C2BDB5}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:var(--paper)}}
#root{{position:absolute;inset:0;background:var(--paper);font-family:Piazzolla,serif;color:var(--ink)}}
.title{{position:absolute;left:{x0}px;top:110px;font-family:Caprasimo;font-size:64px;color:var(--nessi)}}
.t{{position:absolute;left:0;top:0;width:{tw}px;height:{th}px;border:2px solid #8E857D;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:17px;letter-spacing:.04em;text-align:center;padding:0 4px}}
.t.sel{{background:#3A2E28;color:#fff}}
.row{{position:absolute;left:{x0}px;width:{4*tw+3*g}px;height:{th}px;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;opacity:0}}
.row b{{font-weight:700;font-size:20px;letter-spacing:.12em}}
.row span{{font-size:20px;letter-spacing:.04em}}
"""
h = ['<div class="title">Nessi</div>']
pos = {w: cellpos(i) for i, w in enumerate(order)}
for w in order:
    x, y = pos[w]
    h.append(f'<div class="t" id="t_{w}">{w}</div>')
for gi, (name, ws, col) in enumerate(groups):
    y = y0 + gi * (th + g)
    h.append(f'<div class="row" id="r{gi}" style="top:{y}px;background:{col}"><b>{name}</b><span>{", ".join(ws)}</span></div>')
js = ["const tl=gsap.timeline({paused:true});"]
for w in order:
    x, y = pos[w]
    js.append(f'gsap.set("#t_{w}",{{x:{x},y:{y}}});')
# stato corrente delle posizioni libere
free = list(order)
t = 0.5
for gi, (name, ws, col) in enumerate(groups):
    for k, w in enumerate(ws):
        js.append(f'tl.to("#t_{w}",{{backgroundColor:"#3A2E28",color:"#fff",duration:0.12}},{t + k*0.22:.2f});')
    t2 = t + 4 * 0.22 + 0.3
    # le parole del gruppo salgono nella riga gi, le altre scalano nelle caselle libere
    rest = [w for w in free if w not in ws]
    targets = ws + rest
    base = gi * 4
    for idx, w in enumerate(targets):
        x, y = cellpos(base + idx)
        js.append(f'tl.to("#t_{w}",{{x:{x},y:{y},duration:0.45,ease:"power3.inOut"}},{t2:.2f});')
    js.append(f'tl.fromTo("#r{gi}",{{opacity:0,scale:0.96}},{{opacity:1,scale:1,duration:0.25,ease:"power3.out"}},{t2+0.5:.2f});')
    js.append(f'tl.to([{",".join(chr(34)+"#t_"+w+chr(34) for w in ws)}],{{opacity:0,duration:0.1}},{t2+0.6:.2f});')
    free = rest
    t = t2 + 1.1
# reset per il loop: le righe spariscono, le parole tornano al loro posto
js.append(f'tl.to(["#r0","#r1","#r2","#r3"],{{opacity:0,duration:0.3,stagger:0.05}},{D-1.4:.2f});')
for w in order:
    x, y = pos[w]
    js.append(f'tl.to("#t_{w}",{{x:{x},y:{y},backgroundColor:"#ffffff",color:"#1F130E",opacity:1,duration:0.01}},{D-1.4:.2f});')
js.append(f'tl.fromTo(".t",{{opacity:0}},{{opacity:1,duration:0.3,stagger:0.02,immediateRender:false}},{D-1.05:.2f});')
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
