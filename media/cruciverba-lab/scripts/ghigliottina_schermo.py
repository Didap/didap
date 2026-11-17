# La Ghigliottina come sul telefono: la pagina mobile di cruciverba-lab.it/ghigliottina dentro lo
# schermo 1080x2330 del telefono della feature (media/cruciverba-lab/ghigliottina-telefono).
#   python media/cruciverba-lab/scripts/ghigliottina_schermo.py media/cruciverba-lab/ghigliottina-schermo/index.html
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from schermo import page, masthead

out = sys.argv[1]
D = 12.0
GAME, VIVID, TILE, WASH, BAD = "#a55d0c", "#da6d00", "#fed1ad", "#f6d2b9", "#b83930"
PAPER, EDGE, MUTE = "#fcfcf9", "#c2bdb5", "#6d6059"
# Ghigliottina del 27 ottobre 2026 (la stessa del clip di prima): la parola è TENERE.
# coppie, indice della giusta, indice scelto (la terza si sbaglia)
pairs = [("ASSENTE", "PRESENTE", 1, 1), ("STAFFE", "SPERONI", 0, 0), ("QUARESIMA", "BATTESIMO", 1, 0),
         ("BOTTA", "RISPOSTA", 0, 0), ("ZAMPA", "MUSO", 1, 1)]
answer = "TENERE"
links = [("PRESENTE", "Tenere presente: ricordarsi di una cosa e farci caso quando si decide."),
         ("STAFFE", "Tenere il piede in due staffe: restare con due parti opposte senza scegliere."),
         ("BATTESIMO", "Tenere a battesimo: fare da padrino, o assistere alla nascita di qualcosa.")]


def nb(s):
    # niente righe che finiscono su una parola corta
    return re.sub(r"\b(\w{1,2}) ", r"\1&nbsp;", s)


ROW0, STEP, RH = 102, 66, 54
TOP = ROW0 - 79  # la prima riga dentro il riquadro della lavagna
XL, XR, CW = 50, 221, 149

css = f"""
.board{{left:0;top:79px;width:390px;bottom:0;background:var(--paper)}}
.n{{position:absolute;left:20px;width:20px;font-size:11px;letter-spacing:.22em;color:var(--mute);line-height:{RH}px}}
.or{{position:absolute;left:206px;font-style:italic;font-size:15px;color:var(--mute);line-height:{RH}px}}
.cv{{position:absolute;width:{CW}px;height:{RH}px;border:1px dashed var(--edge);border-radius:12px}}
.cell{{position:absolute;width:{CW}px;height:{RH}px;border:1px solid var(--ink);border-radius:12px;background:var(--paper);
  box-shadow:inset 0 -3px 0 var(--skirt);display:grid;place-items:center;padding-bottom:2px;
  font-family:Caprasimo;font-size:17.55px;letter-spacing:.01em;color:var(--ink)}}
.cell .w{{position:relative;display:inline-block}}
.cell .s{{position:absolute;left:-.2em;right:-.2em;top:52%;height:2px;background:{BAD};transform-origin:0 50%}}
.tick{{position:absolute;top:6.4px;right:8px;width:14.4px;height:14.4px;color:{GAME}}}
.blade{{position:absolute;left:42px;width:336px;height:2px;background:{GAME};transform-origin:0 50%}}
.solve{{left:20px;right:20px;top:{TOP + 5 * STEP + 52}px;text-align:center}}
.prompt{{font-size:15px;line-height:1.55;color:var(--soft)}}
.irow{{position:relative;height:52px;margin-top:9px}}
.inp{{position:absolute;left:0;top:0;width:234px;height:52px;border:1px dashed {GAME};border-radius:12px;background:var(--paper)}}
.ph{{position:absolute;left:0;top:0;width:234px;height:52px;display:grid;place-items:center;font-style:italic;font-size:15px;color:var(--mute)}}
.typ{{position:absolute;left:0;top:0;width:234px;height:52px;display:flex;justify-content:center;align-items:center;font-family:Caprasimo;font-size:20px;letter-spacing:.01em}}
.typ .tl{{display:inline-block;max-width:0;overflow:hidden;flex:none}}
.typ .tl b{{display:inline-block;font-weight:400}}
.caret{{display:inline-block;width:1.5px;height:24px;background:{GAME};margin-left:1px;flex:none}}
.cut{{position:absolute;left:242px;top:0;width:108px;height:52px;border:1px solid {GAME};border-radius:12px;background:{GAME};
  box-shadow:inset 0 -3px 0 rgba(31,19,14,.26);display:grid;place-items:center;padding-bottom:3px;font-size:12px;letter-spacing:.22em;color:var(--paper);text-transform:uppercase}}
.meta{{margin-top:10px;font-size:11px;letter-spacing:.22em;color:var(--mute);text-transform:uppercase}}
.rv{{left:20px;right:20px;top:{TOP + 5 * STEP + 52}px}}
.rv .bl{{position:absolute;left:0;right:0;top:-1px;height:2px;background:{GAME};transform-origin:0 50%}}
.rv .word{{margin:20px auto 0;width:256px;padding:11px 0;border:1px solid {GAME};box-shadow:inset 0 0 0 1px {GAME};background:{WASH};border-radius:12px;
  font-family:Caprasimo;font-size:30px;line-height:1.1;text-align:center;letter-spacing:.02em}}
.rv h3{{margin-top:16px;font-weight:400;font-size:11px;letter-spacing:.22em;color:var(--mute);text-transform:uppercase}}
.rv ul{{list-style:none;margin-top:8px;border-top:1px solid var(--hair)}}
.rv li{{padding:11px 0;border-bottom:1px solid var(--hair)}}
.rv li b{{display:block;font-weight:400;font-size:12px;letter-spacing:.22em}}
.rv li p{{margin-top:4px;font-size:15px;line-height:1.55;color:var(--soft);text-wrap:pretty}}
.ini{{opacity:0}}
"""

TICK = (f'<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" '
        f'stroke-linejoin="round"><path d="M 3.8 12.5 Q 6 14.2 9.8 18.4 L 20.2 4.8"/></svg>')


def rows(pre, live):
    # le cinque coppie; pre separa gli id della copia ferma che chiude il loop
    h = []
    for i, (a, b, win, pick) in enumerate(pairs):
        y = TOP + i * STEP
        h.append(f'<span class="n" style="top:{y}px">{i + 1}</span>')
        h.append(f'<span class="or" id="{pre}o{i}" style="top:{y}px;opacity:{1 if i == 0 else 0.45}">o</span>')
        for j, x in enumerate((XL, XR)):
            h.append(f'<span class="cv" id="{pre}v{i}{j}" style="left:{x}px;top:{y}px;opacity:{0 if i == 0 else 1}"></span>')
        for j, (x, wd) in enumerate(((XL, a), (XR, b))):
            extra = f'<i class="s" id="s{i}{j}" ></i>' if live and j == pick != win else ""
            tick = TICK.replace('class="tick"', f'class="tick" id="k{i}{j}" style="opacity:0"') if live and j == win == pick else ""
            h.append(f'<span class="cell" id="{pre}c{i}{j}" style="left:{x}px;top:{y}px;opacity:{1 if i == 0 else 0}">'
                     f'<span class="w">{wd}{extra}</span>{tick}</span>')
        if live:
            h.append(f'<i class="blade" id="b{i}" style="top:{y + RH / 2 - 1}px"></i>')
    return "\n".join(h)


h = [f"<style>{css}</style>", masthead("Ghigliottina", GAME, VIVID, TILE, 4),
     '<div class="a board" id="board">', rows("", True),
     '<div class="a solve" id="solve" style="opacity:0">',
     '<p class="prompt">Cinque parole, un filo solo. Qual è la parola<br>che le lega?</p>',
     '<div class="irow"><span class="inp" id="inp"></span><span class="ph" id="ph">Scrivi la parola</span>',
     '<span class="typ">' + "".join(f'<span class="tl" id="t{k}"><b>{c}</b></span>' for k, c in enumerate(answer))
     + '<i class="caret" id="caret" style="opacity:0"></i></span>',
     '<span class="cut" id="cut" style="opacity:.45">Taglia</span></div>',
     '<p class="meta">Tentativi rimasti: 3</p></div>',
     '<div class="a rv" id="rv"><i class="bl" id="rbl"></i>',
     f'<p class="word" id="rw" style="opacity:0">{answer}</p>',
     '<h3 id="rt" style="opacity:0">I cinque legami</h3><ul>'
     + "".join(f'<li id="r{i}" style="opacity:0"><b>{w}</b><p>{nb(t)}</p></li>' for i, (w, t) in enumerate(links))
     + '</ul></div>',
     '</div>',
     # la copia ferma dello stato iniziale: in dissolvenza alla fine, il loop riparte uguale
     '<div class="a board ini" id="ini">', rows("i", False), '</div>']

js = ["const tl=gsap.timeline({paused:true});"]
T0, GAP = 0.7, 1.05
for i, (a, b, win, pick) in enumerate(pairs):
    t = T0 + i * GAP
    c = f"#c{i}{pick}"
    # il tocco: il tasto scende
    js.append(f'tl.to("{c}",{{y:3,boxShadow:"inset 0 0px 0 rgba(31,19,14,.13)",duration:0.07}},{t:.2f});')
    js.append(f'tl.to("{c}",{{y:0,duration:0.1}},{t + 0.08:.2f});')
    r = t + 0.12
    right, other = f"#c{i}{win}", f"#c{i}{1 - win}"
    # la giusta: bordo del gioco, se scelta anche il fondo e la spunta
    js.append(f'tl.set("{right}",{{borderColor:"{GAME}",boxShadow:"inset 0 0 0 1px {GAME}"}},{r:.2f});')
    if pick == win:
        js.append(f'tl.to("{right}",{{backgroundColor:"{WASH}",duration:0.15}},{r:.2f});')
        js.append(f'tl.fromTo("{right}",{{scale:0.95}},{{scale:1,duration:0.38,ease:"back.out(2.2)",immediateRender:false}},{r + 0.14:.2f});')
        js.append(f'tl.fromTo("#k{i}{win}",{{opacity:0,scale:0.2,rotation:-16}},{{opacity:1,scale:1,rotation:0,duration:0.3,ease:"back.out(2.2)"}},{r + 0.32:.2f});')
    else:
        js.append(f'tl.fromTo("{right}",{{scale:0.95}},{{scale:1,duration:0.38,ease:"back.out(2.2)",immediateRender:false}},{r + 0.14:.2f});')
        js.append(f'tl.fromTo("#s{i}{pick}",{{scaleX:0,rotation:-4}},{{scaleX:1,rotation:-4,duration:0.28,ease:"power3.out"}},{r + 0.12:.2f});')
    # l'altra cade: tratteggio, inclinata
    tip = -1.6 if (1 - win) == 0 else 1.6
    js.append(f'tl.set("{other}",{{borderStyle:"dashed",borderColor:"{EDGE}",color:"{MUTE}",boxShadow:"none"}},{r:.2f});')
    js.append(f'tl.to("{other}",{{y:5,rotation:{tip * 1.6},opacity:0.9,duration:0.25,ease:"power2.out"}},{r + 0.14:.2f});')
    js.append(f'tl.to("{other}",{{y:3,rotation:{tip},opacity:0.8,duration:0.17,ease:"power2.out"}},{r + 0.39:.2f});')
    # la lama passa sulla riga
    js.append(f'tl.fromTo("#b{i}",{{scaleX:0}},{{scaleX:1,duration:0.19,ease:"power3.out"}},{r:.2f});')
    js.append(f'tl.to("#b{i}",{{opacity:0,duration:0.23}},{r + 0.19:.2f});')
    # si scopre la coppia dopo
    if i < len(pairs) - 1:
        u = t + 0.55
        js.append(f'tl.to("#o{i + 1}",{{opacity:1,duration:0.2}},{u:.2f});')
        js.append(f'tl.to(["#v{i + 1}0","#v{i + 1}1"],{{opacity:0,duration:0.2}},{u + 0.1:.2f});')
        for j in range(2):
            js.append(f'tl.fromTo("#c{i + 1}{j}",{{opacity:0,y:8,scale:0.96}},{{opacity:1,y:0,scale:1,duration:0.3,ease:"power3.out"}},{u + j * 0.07:.2f});')
# la soluzione
S = T0 + 4 * GAP + 0.75
js.append(f'tl.fromTo("#solve",{{opacity:0,y:8}},{{opacity:1,y:0,duration:0.32,ease:"power3.out"}},{S:.2f});')
F = S + 0.55
js.append(f'tl.set("#inp",{{borderStyle:"solid",boxShadow:"0 0 0 1px {PAPER},0 0 0 3px {GAME}"}},{F:.2f});')
js.append(f'tl.set("#caret",{{opacity:1}},{F:.2f});')
for k in range(len(answer)):
    tk = F + 0.15 + k * 0.14
    if k == 0:
        js.append(f'tl.set("#ph",{{opacity:0}},{tk:.2f});')
        js.append(f'tl.to("#cut",{{opacity:1,duration:0.12}},{tk:.2f});')
    js.append(f'tl.set("#t{k}",{{maxWidth:30}},{tk:.2f});')
    js.append(f'tl.fromTo("#t{k} b",{{opacity:0,y:5}},{{opacity:1,y:0,duration:0.1}},{tk:.2f});')
P = F + 0.15 + len(answer) * 0.14 + 0.3
js.append(f'tl.to("#cut",{{y:3,boxShadow:"inset 0 0px 0 rgba(31,19,14,.26)",duration:0.07}},{P:.2f});')
js.append(f'tl.to("#cut",{{y:0,boxShadow:"inset 0 -3px 0 rgba(31,19,14,.26)",duration:0.1}},{P + 0.08:.2f});')
# le cinque giuste si accendono una dopo l'altra, poi cala la lama sulla parola
C = P + 0.15
for i, (a, b, win, pick) in enumerate(pairs):
    tc = C + i * 0.08
    js.append(f'tl.to("#c{i}{win}",{{y:-4,scale:1.03,filter:"brightness(1.12)",duration:0.17,ease:"power2.out"}},{tc:.2f});')
    js.append(f'tl.to("#c{i}{win}",{{y:0,scale:1,filter:"brightness(1)",duration:0.25,ease:"power2.out"}},{tc + 0.17:.2f});')
js.append(f'tl.to("#solve",{{opacity:0,duration:0.25}},{C + 0.1:.2f});')
B = C + 0.4
js.append(f'tl.fromTo("#rbl",{{scaleX:0}},{{scaleX:1,duration:0.42,ease:"power3.out"}},{B:.2f});')
js.append(f'tl.fromTo("#rw",{{opacity:0,y:-14,scale:0.96}},{{opacity:1,y:0,scale:1,duration:0.48,ease:"back.out(1.6)"}},{B + 0.26:.2f});')
js.append(f'tl.fromTo("#rt",{{opacity:0,y:6}},{{opacity:1,y:0,duration:0.32,ease:"power3.out"}},{B + 0.62:.2f});')
for i in range(len(links)):
    js.append(f'tl.fromTo("#r{i}",{{opacity:0,y:6}},{{opacity:1,y:0,duration:0.32,ease:"power3.out"}},{B + 0.7 + i * 0.07:.2f});')
# ritorno allo stato iniziale, in dissolvenza
js.append(f'tl.to("#ini",{{opacity:1,duration:0.7,ease:"power1.inOut"}},{D - 0.85:.2f});')
js.append(f'tl.set({{}},{{}},{D:.2f});')
js.append('window.__timelines["main"]=tl;')

print(f"soluzione {S:.2f}, taglia {P:.2f}, parola {B + 0.26:.2f}, fine storia {B + 1.1:.2f}")
html = page("Generato da media/cruciverba-lab/scripts/ghigliottina_schermo.py: la Ghigliottina nella pagina mobile del sito, schermo del telefono 1080x2330", D, "\n".join(h), "\n".join(js))
open(out, "w", encoding="utf8").write(html)
