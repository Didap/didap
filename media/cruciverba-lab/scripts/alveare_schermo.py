# L'Alveare come sul telefono: la pagina mobile di cruciverba-lab.it/alveare dentro lo schermo
# 1080x2330 del telefono della pair (media/cruciverba-lab/alveare-telefono, media/telefono/monta.mjs).
#   python media/cruciverba-lab/scripts/alveare_schermo.py media/cruciverba-lab/alveare-schermo/index.html
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from schermo import page, masthead, icon

out = sys.argv[1]
D = 13.0
GAME, VIVID, TILE = "#896f09", "#b68c00", "#fae39f"
CELL, CENTRE, PRESS, PRESS_C = "#fde89a", "#f8c20d", "#efd99e", "#e2ac00"
# Alveare del 28 ottobre (lo stesso del clip di prima): L al centro, obbligatoria
ring = {"nw": "Z", "ne": "B", "e": "E", "se": "I", "sw": "M", "w": "O"}
# parole in ordine di gioco, coi punti in scala come sul sito (traguardo a 1000)
words = [("OLIO", 6), ("MOLLE", 30), ("ZOLLE", 30), ("MOBILE", 35), ("BOZZOLO", 41)]
# gradi del sito: Uovo, a 50 Larva, a 100 Operaia, a 200 Nutrice
grades = [(0, "Uovo", "Larva", 50), (50, "Larva", "Operaia", 100), (100, "Operaia", "Nutrice", 200)]


def grade(p):
    g = [x for x in grades if p >= x[0]][-1]
    return g[1], f"{g[3] - p} punti e diventi {g[2]}"


# centri delle celle in px css, misurati sul sito a 390 px
cells = {"nw": (145, 344.5), "ne": (245, 344.5), "w": (95, 431.5), "c": (195, 431.5),
         "e": (295, 431.5), "sw": (145, 518.5), "se": (245, 518.5)}
pos = {"L": cells["c"], **{ch: cells[k] for k, ch in ring.items()}}

css = f"""
.strip{{left:20px;right:20px;top:102px;height:82px;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair)}}
.strip .r{{position:absolute;left:0;right:0;height:40px;display:flex;align-items:center}}
.strip .r2{{top:40px;border-top:1px solid var(--hair)}}
.strip .n{{position:absolute;left:0;top:0;height:40px;display:flex;align-items:center;gap:6px;font-size:11px;color:var(--mute)}}
.strip .n b{{font-weight:400;color:var(--ink)}}
.empty{{position:absolute;left:68px;right:0;top:0;height:40px;display:flex;align-items:center;font-style:italic;font-size:14px;color:var(--mute);white-space:nowrap}}
.found{{position:absolute;left:68px;right:0;top:0;height:40px;display:flex;align-items:center;white-space:nowrap;overflow:hidden;
  -webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}}
.fw{{display:inline-block;max-width:0;overflow:hidden;flex:none}}
.fw span{{display:inline-block;margin-right:12px;font-size:14px;letter-spacing:.08em;color:var(--soft);border-bottom:1.5px dotted var(--edge);line-height:18px}}
.gr{{left:20px;top:200px;display:flex;align-items:baseline;gap:8px}}
.gr b{{font-family:Caprasimo;font-weight:400;font-size:20px;line-height:20px;color:{GAME}}}
.gr i{{font-size:12px;color:var(--mute)}}
.sc{{right:20px;top:204px;font-size:13px;color:var(--mute)}}
.sc b{{font-weight:400;color:var(--ink)}}
.plus{{right:96px;top:203px;font-family:Caprasimo;font-size:14px;color:{GAME};opacity:0}}
.jar{{left:20px;top:228px;width:350px;height:14px;border-radius:999px;background:{CELL};box-shadow:inset 0 0 0 1px rgba(137,111,9,.35);overflow:hidden}}
.fill{{position:absolute;inset:0;border-radius:999px;background:{CENTRE}}}
.tick{{position:absolute;top:4.5px;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:#c7b05f}}
.typed{{left:0;right:0;top:250px;height:36px;display:flex;justify-content:center;align-items:flex-end;font-family:Caprasimo;font-size:28px;line-height:1;letter-spacing:.06em}}
.tl{{display:inline-block;max-width:0;overflow:hidden;flex:none}}
.tl b{{display:inline-block;font-weight:400}}
.dot{{left:0;right:0;top:250px;height:36px;display:flex;justify-content:center;align-items:flex-end;font-family:Caprasimo;font-size:28px;line-height:1;color:rgba(109,96,89,.4)}}
.pts{{left:252px;top:262px;font-size:11px;color:{GAME};opacity:0}}
.cell{{position:absolute;width:96px;height:111px;margin:-55.5px 0 0 -48px;clip-path:url(#hx);background:{CELL};display:grid;place-items:center;font-family:Caprasimo;font-size:28.8px}}
.cell.c{{background:{CENTRE}}}
.btn{{position:absolute;top:589px;height:44px;border:1px solid var(--edge);border-radius:9.6px;background:var(--paper);box-shadow:inset 0 -2px 0 var(--skirt);display:grid;place-items:center;color:var(--ink)}}
.btn.ok{{border-color:{GAME};background:{GAME};color:var(--paper);font-size:12px;letter-spacing:.22em;text-transform:uppercase;box-shadow:inset 0 -2px 0 rgba(31,19,14,.26);padding-bottom:2px}}
.msg{{left:0;right:0;top:638px;text-align:center;font-size:14px;color:{GAME};opacity:0}}
.rule{{left:20px;right:20px;top:677px;height:1px;background:var(--hair)}}
.fb{{left:0;top:694px;width:390px;height:36px}}
.fb p{{position:absolute;right:162px;top:9px;font-style:italic;font-size:13px;color:var(--mute);white-space:nowrap}}
.fb .k{{position:absolute;top:0;width:36px;height:36px;border:1px solid var(--edge);border-radius:9.6px;display:grid;place-items:center;color:var(--soft)}}
.book{{left:16px;top:722px;width:48px;height:48px;border:1px solid var(--ink);border-radius:9.6px;background:var(--paper);display:grid;place-items:center;
  box-shadow:inset 0 -2px 0 var(--skirt),0 8px 18px -10px rgba(31,19,14,.55)}}
.bdg{{position:absolute;right:-6.4px;top:-6.4px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:{GAME};color:var(--paper);font-size:11px;font-weight:700;line-height:18px;text-align:center}}
"""

alpha = sorted(w for w, _ in words)
h = [f"<style>{css}</style>",
     '<svg width="0" height="0" style="position:absolute"><defs><clipPath id="hx" clipPathUnits="objectBoundingBox">'
     '<path d="M0.4 0.05Q0.5 0 0.6 0.05L0.9 0.2Q1 0.25 1 0.35L1 0.65Q1 0.75 0.9 0.8L0.6 0.95Q0.5 1 0.4 0.95L0.1 0.8Q0 0.75 0 0.65L0 0.35Q0 0.25 0.1 0.2Z"/>'
     '</clipPath></defs></svg>',
     masthead("Alveare", GAME, VIVID, TILE, 2),
     '<div class="a strip"><div class="r">',
     f'<span class="n" style="color:var(--soft)">{icon("check", 14)}<b id="fc">0</b></span>',
     '<p class="empty" id="empty">Ancora nessuna. Comincia da una parola corta.</p>',
     '<div class="found">' + "".join(f'<span class="fw" id="f{w}"><span>{w}</span></span>' for w in alpha) + '</div>',
     '</div><div class="r r2">',
     f'<span class="n" style="color:var(--soft)">{icon("sparkles", 14)}<b>0</b></span>',
     '</div></div>',
     '<p class="a gr"><b id="gr">Uovo</b><i id="gh">50 punti e diventi Larva</i></p>',
     '<p class="a sc"><b id="sc">0</b> su 1000</p>']
for wi, (w, p) in enumerate(words):
    h.append(f'<p class="a plus" id="pl{wi}">+{p}</p>')
h.append('<div class="a jar"><div class="fill" id="fill"></div>'
         + "".join(f'<i class="tick" style="left:{x}%"></i>' for x in (5, 10, 20, 30, 40, 50, 60, 70)) + '</div>')
h.append('<p class="a dot" id="dot">·</p>')
h.append('<p class="a typed">' + "".join(
    "".join(f'<span class="tl" id="t{wi}_{k}"><b style="{"color:" + GAME if ch == "L" else ""}">{ch}</b></span>'
            for k, ch in enumerate(w)) for wi, (w, _) in enumerate(words)) + '</p>')
for wi, (w, p) in enumerate(words):
    h.append(f'<p class="a pts" id="pt{wi}">+{p}</p>')
for ch, (x, y) in pos.items():
    h.append(f'<div class="cell{" c" if ch == "L" else ""}" id="h{ch}" style="left:{x}px;top:{y}px">{ch}</div>')
h.append(f'<div class="btn" style="left:48px;width:45px">{icon("shuffle", 16)}</div>')
h.append(f'<div class="btn" id="del" style="left:105px;width:45px;opacity:.45">{icon("delete", 16)}</div>')
h.append(f'<div class="btn" style="left:163px;width:45px">{icon("bulb", 16)}</div>')
h.append('<div class="btn ok" id="ok" style="left:220px;width:122px;opacity:.45">Conferma</div>')
for wi, (w, p) in enumerate(words):
    h.append(f'<p class="a msg" id="m{wi}">{"Bene!" if len(w) == 4 else "Bella!"} +{p}</p>')
h.append('<div class="a rule"></div>')
h.append(f'<div class="a fb"><p>Ti è piaciuto il gioco di oggi?</p><span class="k" style="left:238px">{icon("up", 18)}</span>'
         f'<span class="k" style="left:280px">{icon("down", 18)}</span></div>')
h.append(f'<div class="a book">{icon("book", 20, sw=1.9)}<span class="bdg" id="bk">0</span></div>')

js = ["const tl=gsap.timeline({paused:true});",
      'tl.set("#fill",{xPercent:-100},0);']
t = 0.5
score = 0
for wi, (w, p) in enumerate(words):
    n = len(w)
    js.append(f'tl.to("#dot",{{opacity:0,duration:0.08}},{t:.2f});')
    js.append(f'tl.to(["#del","#ok"],{{opacity:1,duration:0.12}},{t:.2f});')
    for k, ch in enumerate(w):
        tk = t + k * 0.2
        js.append(f'tl.set("#t{wi}_{k}",{{maxWidth:40}},{tk:.2f});')
        js.append(f'tl.fromTo("#t{wi}_{k} b",{{opacity:0,y:8}},{{opacity:1,y:0,duration:0.14,ease:"power3.out"}},{tk:.2f});')
        press = PRESS_C if ch == "L" else PRESS
        base = CENTRE if ch == "L" else CELL
        js.append(f'tl.to("#h{ch}",{{scale:0.93,backgroundColor:"{press}",duration:0.07,ease:"power2.out"}},{tk - 0.04:.2f});')
        js.append(f'tl.to("#h{ch}",{{scale:1,backgroundColor:"{base}",duration:0.1,ease:"power2.out"}},{tk + 0.04:.2f});')
    tc = t + n * 0.2 + 0.15
    # Conferma: il tasto scende e torna
    js.append(f'tl.to("#ok",{{y:3,duration:0.06}},{tc:.2f});')
    js.append(f'tl.to("#ok",{{y:0,duration:0.12}},{tc + 0.07:.2f});')
    js.append(f'tl.to(["#del","#ok"],{{opacity:0.45,duration:0.15}},{tc + 0.15:.2f});')
    letters = ",".join(f'"#t{wi}_{k} b"' for k in range(n))
    js.append(f'tl.to([{letters}],{{opacity:0,y:-14,duration:0.3,ease:"power2.in"}},{tc + 0.1:.2f});')
    js.append(f'tl.set([{",".join(f"{chr(34)}#t{wi}_{k}{chr(34)}" for k in range(n))}],{{maxWidth:0}},{tc + 0.42:.2f});')
    js.append(f'tl.to("#dot",{{opacity:1,duration:0.15}},{tc + 0.42:.2f});')
    js.append(f'tl.fromTo("#pt{wi}",{{opacity:0,y:4}},{{opacity:1,y:-6,duration:0.25,ease:"power2.out"}},{tc + 0.12:.2f});')
    js.append(f'tl.to("#pt{wi}",{{opacity:0,y:-14,duration:0.3}},{tc + 0.7:.2f});')
    js.append(f'tl.fromTo("#m{wi}",{{opacity:0,y:4}},{{opacity:1,y:0,duration:0.2,ease:"power2.out"}},{tc + 0.12:.2f});')
    js.append(f'tl.to("#m{wi}",{{opacity:0,duration:0.2}},{tc + 0.9 if wi < len(words) - 1 else D - 1.2:.2f});')
    # la parola entra fra le trovate, il conteggio e il punteggio salgono
    js.append(f'tl.to("#f{w}",{{maxWidth:120,duration:0.5,ease:"power2.out"}},{tc + 0.2:.2f});')
    js.append(f'tl.fromTo("#f{w} span",{{opacity:0}},{{opacity:1,duration:0.3}},{tc + 0.3:.2f});')
    if wi == 0:
        js.append(f'tl.to("#empty",{{opacity:0,duration:0.15}},{tc + 0.15:.2f});')
    js.append(f'tl.set("#fc",{{textContent:"{wi + 1}"}},{tc + 0.2:.2f});')
    js.append(f'tl.set("#bk",{{textContent:"{wi + 1}"}},{tc + 0.2:.2f});')
    js.append(f'tl.set("#bk",{{scale:0.6}},{tc + 0.2:.2f});')
    js.append(f'tl.to("#bk",{{scale:1,duration:0.26,ease:"back.out(2.5)"}},{tc + 0.21:.2f});')
    js.append(f'tl.fromTo("#pl{wi}",{{opacity:0,y:4}},{{opacity:1,y:0,duration:0.2}},{tc + 0.15:.2f});')
    js.append(f'tl.to("#pl{wi}",{{opacity:0,y:-6,duration:0.25}},{tc + 0.85:.2f});')
    for s in range(1, 6):
        v = round(score + p * s / 5)
        js.append(f'tl.set("#sc",{{textContent:"{v}"}},{tc + 0.15 + s * 0.06:.2f});')
    score += p
    js.append(f'tl.to("#fill",{{xPercent:{-100 + score / 10:.1f},duration:0.5,ease:"power3.out"}},{tc + 0.15:.2f});')
    g, hint = grade(score)
    js.append(f'tl.set("#gr",{{textContent:"{g}"}},{tc + 0.45:.2f});')
    js.append(f'tl.set("#gh",{{textContent:"{hint}"}},{tc + 0.45:.2f});')
    if g != grade(score - p)[0]:
        js.append(f'tl.to("#gr",{{scale:1.15,duration:0.14,yoyo:true,repeat:1,transformOrigin:"0% 80%"}},{tc + 0.45:.2f});')
    t = tc + 0.85
# ritorno all'inizio per il loop
R = D - 0.9
allw = ",".join(f'"#f{w} span"' for w in alpha)
js.append(f'tl.to([{allw}],{{opacity:0,duration:0.3}},{R:.2f});')
js.append(f'tl.set([{",".join(f"{chr(34)}#f{w}{chr(34)}" for w in alpha)}],{{maxWidth:0}},{R + 0.32:.2f});')
js.append(f'tl.to("#empty",{{opacity:1,duration:0.3}},{R + 0.35:.2f});')
js.append(f'tl.to("#fill",{{xPercent:-100,duration:0.6,ease:"power2.inOut"}},{R:.2f});')
for s in range(1, 6):
    js.append(f'tl.set("#sc",{{textContent:"{round(score * (1 - s / 5))}"}},{R + s * 0.1:.2f});')
js.append(f'tl.to(["#gr","#gh"],{{opacity:0,duration:0.2}},{R:.2f});')
js.append(f'tl.set("#gr",{{textContent:"Uovo"}},{R + 0.22:.2f});')
js.append(f'tl.set("#gh",{{textContent:"50 punti e diventi Larva"}},{R + 0.22:.2f});')
js.append(f'tl.to(["#gr","#gh"],{{opacity:1,duration:0.25}},{R + 0.25:.2f});')
js.append(f'tl.set(["#fc","#bk"],{{textContent:"0"}},{R + 0.3:.2f});')
js.append(f'tl.set({{}},{{}},{D:.2f});')
js.append('window.__timelines["main"]=tl;')

html = page("Generato da media/cruciverba-lab/scripts/alveare_schermo.py: l'Alveare nella pagina mobile del sito, schermo del telefono 1080x2330", D, "\n".join(h), "\n".join(js))
open(out, "w", encoding="utf8").write(html)
