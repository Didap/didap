import sys
out, W, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
mobile = W < 1200
D = 12.0
# Nickname inventati: nessun dato reale dei giocatori
rows = [("vocale-muta", "02:21,4", 1000, "#F6C8B8"), ("orizzontale7", "02:37,0", 1000, "#C9C3EE"),
        ("cicerchia", "03:02,9", 1000, "#F3C6DA"), ("pennino", "03:11,2", 1000, "#D9C9F0"),
        ("lucciola-blu", "03:18,5", 1000, "#F8D6B0"), ("tiralinee", "03:47,1", 981, "#BFE3CF"),
        ("bisillabo", "04:26,8", 925, "#C3E4EE"), ("enigma88", "04:43,0", 907, "#F2E2A6")]
# arrivi: (istante, giocatore, nuovo posto 0-based, tempo, punti)
arrivals = [(3.0, "parolaia", 2, "02:58,7", 1000, "#F7B9A6"), (7.0, "rebus-rosso", 0, "02:14,3", 1000, "#E7C7F2")]
rh = 76 if not mobile else 64
lx = 860 if not mobile else 40
lw = (W - lx - 140) if not mobile else W - 80
ly = 300 if not mobile else 420
css = f"""
@font-face{{font-family:Caprasimo;src:url('assets/fonts/caprasimo-400.woff2') format('woff2');font-weight:400}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var.woff2') format('woff2');font-weight:100 900}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var-italic.woff2') format('woff2');font-weight:100 900;font-style:italic}}
:root{{--paper:#FCFCF9;--ink:#1F130E;--soft:#473A33;--mute:#6D6059;--brand:#E93F29;--brand-soft:#FBE7E2;--hair:#DAD7D2}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:var(--paper)}}
#root{{position:absolute;inset:0;background:var(--paper);font-family:Piazzolla,serif;color:var(--ink)}}
.h1{{position:absolute;left:{140 if not mobile else 40}px;top:{170 if not mobile else 70}px;font-family:Caprasimo;font-size:{110 if not mobile else 80}px;line-height:1}}
.sub{{position:absolute;left:{140 if not mobile else 40}px;top:{310 if not mobile else 172}px;font-size:{20 if not mobile else 17}px;letter-spacing:.3em;color:var(--mute)}}
.lead{{position:absolute;left:{140 if not mobile else 40}px;top:{370 if not mobile else 220}px;width:{600 if not mobile else W-80}px;font-size:{40 if not mobile else 32}px;line-height:1.35}}
.lead u{{text-decoration:none;border-bottom:2px solid var(--ink)}}
.lh{{position:absolute;left:{lx}px;width:{lw}px;top:{ly-56}px;display:flex;justify-content:space-between;font-size:18px;letter-spacing:.3em;color:var(--mute);padding-bottom:14px;border-bottom:2px solid var(--ink)}}
.r{{position:absolute;left:{lx}px;top:{ly}px;width:{lw}px;height:{rh}px;display:flex;align-items:center;gap:18px;padding:0 18px;border-bottom:1px solid var(--hair);background:var(--paper);font-size:{30 if not mobile else 26}px}}
.r .p{{width:2ch;text-align:right;font-size:{24 if not mobile else 20}px;color:var(--mute)}}
.r .a{{width:{44 if not mobile else 38}px;height:{44 if not mobile else 38}px;border-radius:8px}}
.r .n{{flex:1}}
.r .t{{font-size:{22 if not mobile else 19}px;color:var(--mute)}}
.r .s{{width:3.2ch;text-align:right;font-weight:600}}
.r.new{{background:var(--brand-soft)}}
"""
h = ['<div class="h1">Classifica</div>', '<div class="sub">OGGI · MERCOLEDÌ 28 OTTOBRE</div>']
if not mobile:
    h.append('<div class="lead">Ogni gioco del giorno porta punti alla stessa classifica, quella di oggi e quella del mese.</div>')
h.append('<div class="lh"><span>CRUCIVERBA · OGGI</span><span>313 GIOCATORI</span></div>')
allrows = [(n, t, s, c, False) for n, t, s, c in rows] + [(a[1], a[3], a[4], a[5], True) for a in arrivals]
for i, (n, t, s, c, new) in enumerate(allrows):
    h.append(f'<div class="r{" new" if new else ""}" id="r_{n.replace("-", "_")}"><span class="p" id="p_{n.replace("-", "_")}">{i+1}</span><span class="a" style="background:{c}"></span><span class="n">{n}</span><span class="t">{t}</span><span class="s">{s}</span></div>')
js = ["const tl=gsap.timeline({paused:true});"]
key = lambda n: n.replace("-", "_")
order = [r[0] for r in rows]
for i, n in enumerate(order):
    js.append(f'gsap.set("#r_{key(n)}",{{y:{i*rh}}});')
for a in arrivals:
    js.append(f'gsap.set("#r_{key(a[1])}",{{y:{len(order)*rh + 40},opacity:0}});')
def place(t, order, dur=0.6):
    for i, n in enumerate(order):
        vis = i < len(rows)
        js.append(f'tl.to("#r_{key(n)}",{{y:{i*rh},opacity:{1 if vis else 0},duration:{dur},ease:"power3.inOut"}},{t:.2f});')
        js.append(f'tl.set("#p_{key(n)}",{{textContent:"{i+1}"}},{t+dur/2:.2f});')
for (t, n, pos, *_rest) in arrivals:
    js.append(f'tl.fromTo("#r_{key(n)}",{{opacity:0,y:{len(rows)*rh+40}}},{{opacity:1,y:{(len(rows)-1)*rh},duration:0.4,ease:"expo.out"}},{t-0.6:.2f});')
    order = order[:pos] + [n] + [x for x in order[pos:] if x != n]
    place(t, order)
# ritorno allo stato iniziale per il loop
start = [r[0] for r in rows]
for a in arrivals:
    js.append(f'tl.to("#r_{key(a[1])}",{{opacity:0,duration:0.3}},{D-1.4:.2f});')
for i, n in enumerate(start):
    js.append(f'tl.to("#r_{key(n)}",{{y:{i*rh},opacity:1,duration:0.6,ease:"power3.inOut"}},{D-1.1:.2f});')
    js.append(f'tl.set("#p_{key(n)}",{{textContent:"{i+1}"}},{D-0.8:.2f});')
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
