import sys
out, W, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
mobile = W < 1200
D = 12.0
# I dieci giochi del giorno, con le descrizioni della pagina Abbonamento del sito
games = [("Cruciverba", "Il classico, con definizioni scritte a quattro mani.", "#D8361F", "#F7C3B4"),
         ("Setaccio", "Dieci parole a tema nascoste in un campo di lettere.", "#2C7FA8", "#BFDCEB"),
         ("Catena", "Otto parole in colonna, ognuna legata alla vicina.", "#1A8A86", "#BDE3E0"),
         ("Crittografato", "Un cruciverba senza definizioni: ogni numero è una lettera.", "#6A3FCB", "#D7CBF2"),
         ("Rulli", "Cinque rulli di lettere da girare finché la riga forma una parola.", "#C92A6B", "#F3C3D3"),
         ("Chiave", "Una parola di cinque lettere da trovare in sei tentativi.", "#0A7A3E", "#BFE6CC"),
         ("Nessi", "Sedici parole da dividere in quattro gruppi.", "#B02E8F", "#EFC6E3"),
         ("Ghigliottina", "Cinque coppie di parole e la parola che le lega tutte.", "#9A5A12", "#F6D9BB"),
         ("Alveare", "Sette lettere, una obbligatoria: tutte le parole che riesci a formare.", "#8A7410", "#F8E59B"),
         ("Mosaico", "Un solitario con le carte napoletane, una partita al giorno.", "#557F1C", "#DDEDB8")]
cols = 2 if mobile else 5
pad = 40 if mobile else 90
top = 250 if mobile else 330
gap = 18 if mobile else 26
cw = (W - 2 * pad - (cols - 1) * gap) / cols
chh = 210 if mobile else 520
css = f"""
@font-face{{font-family:Caprasimo;src:url('assets/fonts/caprasimo-400.woff2') format('woff2');font-weight:400}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var.woff2') format('woff2');font-weight:100 900}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var-italic.woff2') format('woff2');font-weight:100 900;font-style:italic}}
:root{{--paper:#FCFCF9;--ink:#1F130E;--soft:#473A33;--mute:#6D6059;--hair:#DAD7D2}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:var(--paper)}}
#root{{position:absolute;inset:0;background:var(--paper);font-family:Piazzolla,serif;color:var(--ink)}}
.mast{{position:absolute;left:{pad}px;top:{50 if mobile else 80}px;display:flex;align-items:baseline;font-family:Caprasimo;font-size:{44 if mobile else 64}px;line-height:1}}
.mast .sq{{display:inline-block;width:.56em;height:.56em;background:var(--ink);border-radius:.09em;margin:0 .08em;align-self:center}}
.mast .lab{{font-family:Piazzolla;font-weight:500;font-size:.34em;letter-spacing:.3em;margin-left:.55em;color:var(--soft)}}
.bar{{position:absolute;left:0;right:0;top:{130 if mobile else 190}px;height:{80 if mobile else 90}px;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair);display:flex;align-items:center;padding:0 {pad}px;gap:20px;font-size:{28 if mobile else 34}px}}
.bar b{{font-family:Caprasimo;font-weight:400}}
.card{{position:absolute;width:{cw:.0f}px;height:{chh}px;border-top:3px solid var(--ink);padding-top:{14 if mobile else 22}px}}
.nm{{font-family:Caprasimo;font-size:{30 if mobile else 40}px;line-height:1.1}}
.ds{{margin-top:{8 if mobile else 14}px;font-size:{19 if mobile else 24}px;line-height:1.35;color:var(--soft)}}
.tile{{position:absolute;left:0;right:0;bottom:0;height:{70 if mobile else 250}px;border-radius:8px}}
.ck{{position:absolute;right:{10 if mobile else 18}px;bottom:{10 if mobile else 18}px;width:{50 if mobile else 76}px;height:{50 if mobile else 76}px;border-radius:50%;display:flex;align-items:center;justify-content:center;opacity:0}}
.ck svg{{width:56%;height:56%}}
"""
h = ['<div class="mast"><span>Cruciverb</span><span class="sq"></span><span class="lab">LAB.</span></div>',
     '<div class="bar"><b>Fatti oggi</b><span><span id="cnt">0</span> su 10</span></div>']
for i, (nm, ds, col, tile) in enumerate(games):
    r, c = divmod(i, cols)
    x = pad + c * (cw + gap); y = top + r * (chh + gap + (8 if mobile else 30))
    h.append(f'<div class="card" id="g{i}" style="left:{x:.0f}px;top:{y}px"><div class="nm" style="color:{col}">{nm}</div>'
             + ("" if mobile else f'<div class="ds">{ds}</div>')
             + f'<div class="tile" id="tl{i}" style="background:{tile}"></div>'
             + f'<div class="ck" id="ck{i}" style="background:{col}"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>')
js = ["const tl=gsap.timeline({paused:true});"]
t = 0.6
for i, (nm, ds, col, tile) in enumerate(games):
    js.append(f'tl.fromTo("#tl{i}",{{scaleY:1}},{{scaleY:1.04,duration:0.12,yoyo:true,repeat:1,ease:"power2.out",transformOrigin:"50% 100%"}},{t:.2f});')
    js.append(f'tl.fromTo("#ck{i}",{{opacity:0,scale:0.4}},{{opacity:1,scale:1,duration:0.3,ease:"back.out(2.2)"}},{t+0.1:.2f});')
    js.append(f'tl.set("#cnt",{{textContent:"{i+1}"}},{t+0.15:.2f});')
    t += 0.85
js.append(f'tl.to([{",".join(chr(34)+"#ck"+str(i)+chr(34) for i in range(10))}],{{opacity:0,scale:0.6,duration:0.25,stagger:0.03,ease:"power2.in"}},{D-1.0:.2f});')
js.append(f'tl.set("#cnt",{{textContent:"0"}},{D-0.5:.2f});')
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
