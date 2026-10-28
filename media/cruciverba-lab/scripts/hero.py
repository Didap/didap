import sys
W, H = int(sys.argv[2]), int(sys.argv[3])
out = sys.argv[1]
mobile = W < 1200
G = ["SOS#ALA###", "UNE#GAG###", "AGIVAMO###", "###IVA#FON", "COPPE#VOLO", "ORI##SOLAI",
     "NATA#TIC##", "##TOPO#LSD", "ODORI#BOIA", "PORTA#URTI", "SCIE##MIO#"]
nums = {(0,0):1,(0,1):2,(0,2):3,(0,4):4,(0,5):5,(0,6):6,(1,0):7,(1,4):8,(2,0):9,(2,3):10,(3,3):11,(3,7):12,(3,8):13,(3,9):14,(4,0):15,(4,1):16,(4,2):17,(4,6):18,(5,0):19,(5,5):20,(6,0):21,(6,3):22,(6,5):23,(7,2):24,(7,4):25,(7,7):26,(7,8):27,(7,9):28,(8,0):29,(8,1):30,(8,6):31,(9,0):32,(9,6):33,(10,0):34,(10,6):35}
words = [
    (1, 0, 0, 3, "Il naufrago lo traccia sulla spiaggia a lettere enormi (sigla)"),
    (4, 0, 4, 3, "Sotto la propria, il maestro prende l&rsquo;allievo pi&ugrave; promettente"),
    (7, 1, 0, 3, "Le ____ e le altre: tutte quante"),
    (8, 1, 4, 3, "Il comico la prova cento volte perch&eacute; sembri improvvisata"),
    (9, 2, 0, 7, "Passavamo dalle parole ai fatti"),
    (12, 3, 7, 3, "Dal parrucchiere fa coppia con la spazzola per la piega"),
    (15, 4, 0, 5, "Le alza chi vince la finale, le cala chi gioca a briscola"),
    (18, 4, 6, 4, "Chi lo perde resta in aeroporto, chi lo spicca si stacca da terra"),
    (20, 5, 5, 5, "Al Nord sono le soffitte dove finiscono i bauli della nonna"),
]
cell = 40 if mobile else 80
gx = 280 if mobile else 160
gy = 96 if mobile else 196
gx = (W - cell * 10) // 2 if mobile else gx
filled_rows = set(range(6, 11))
anim = {}
for wi, (n, r, c, l, _) in enumerate(words):
    for k in range(l):
        anim.setdefault((r, c + k), (wi, k))

css = f"""
@font-face{{font-family:Caprasimo;src:url('assets/fonts/caprasimo-400.woff2') format('woff2');font-weight:400}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var.woff2') format('woff2');font-weight:100 900;font-style:normal}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var-italic.woff2') format('woff2');font-weight:100 900;font-style:italic}}
:root{{--paper:#FCFCF9;--ink:#1F130E;--mute:#6D6059;--soft:#473A33;--brand:#E93F29;--brand-ink:#BE140E;--brand-soft:#FBE7E2;--tile:#F7C3B4;--hair:#DAD7D2}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:var(--paper)}}
#root{{position:absolute;inset:0;background:var(--paper);font-family:Piazzolla,serif;color:var(--ink)}}
.mast{{position:absolute;left:{40 if mobile else 160}px;top:{26 if mobile else 64}px;display:flex;align-items:baseline;font-family:Caprasimo;font-size:{30 if mobile else 64}px;line-height:1}}
.mast .sq{{display:inline-block;width:.56em;height:.56em;background:var(--ink);border-radius:.09em;margin:0 .08em;align-self:center}}
.mast .lab{{font-family:Piazzolla;font-weight:500;font-size:.34em;letter-spacing:.3em;margin-left:.55em;color:var(--soft)}}
.date{{position:absolute;right:{40 if mobile else 160}px;top:{34 if mobile else 82}px;font-style:italic;font-size:{17 if mobile else 30}px;color:var(--soft)}}
.rule{{position:absolute;left:0;right:0;top:{76 if mobile else 156}px;height:1px;background:var(--hair)}}
.grid{{position:absolute;left:{gx}px;top:{gy}px;width:{cell*10}px;height:{cell*11}px;outline:2px solid var(--ink)}}
.c{{position:absolute;width:{cell+1}px;height:{cell+1}px;border:1px solid var(--ink)}}
.blk{{position:absolute;background:var(--ink);border-radius:{cell*0.12:.1f}px;z-index:3}}
.n{{position:absolute;font-size:{cell*0.2:.1f}px;color:var(--mute);font-weight:500;z-index:3;line-height:1}}
.L{{position:absolute;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:{cell*0.52:.1f}px;z-index:3;color:var(--ink)}}
.wb{{position:absolute;background:var(--brand-soft);z-index:1}}
.cur{{position:absolute;left:0;top:0;width:{cell}px;height:{cell}px;background:var(--tile);z-index:2}}
.panel{{position:absolute;left:1100px;top:{gy}px;width:{W-1100-150}px}}
.head{{display:flex;align-items:center;gap:24px;font-weight:600;font-size:22px;letter-spacing:.3em;margin-bottom:22px}}
.head:before,.head:after{{content:"";flex:1;height:1px;background:var(--ink)}}
.cl{{position:relative;display:flex;gap:18px;font-size:27px;line-height:1.3;padding:14px 18px;color:var(--soft)}}
.cl b{{font-weight:600;color:var(--ink);min-width:2.2ch;text-align:right}}
.hl{{position:absolute;left:0;right:0;top:0;height:64px;background:var(--brand-soft)}}
.mclue{{position:absolute;left:0;right:0;top:{H-80}px;height:80px;background:var(--brand-soft)}}
.mc{{position:absolute;left:40px;right:40px;top:14px;font-size:19px;line-height:1.3}}
.mc .k{{font-weight:600;color:var(--brand-ink);margin-right:10px}}
"""
h = []
h.append('<div class="mast"><span>Cruciverb</span><span class="sq"></span><span class="lab">LAB.</span></div>')
h.append('<div class="date">28 ottobre 2026</div><div class="rule"></div>')
h.append('<div class="grid" id="grid">')
for wi, (n, r, c, l, _) in enumerate(words):
    h.append(f'<div class="wb" id="wb{wi}" style="left:{c*cell}px;top:{r*cell}px;width:{l*cell}px;height:{cell}px;opacity:0"></div>')
h.append('<div class="cur" id="cur"></div>')
for r in range(11):
    for c in range(10):
        ch = G[r][c]
        if ch == '#':
            p = cell * 0.08
            h.append(f'<div class="blk" style="left:{c*cell+p:.1f}px;top:{r*cell+p:.1f}px;width:{cell-2*p:.1f}px;height:{cell-2*p:.1f}px"></div>')
            continue
        h.append(f'<div class="c" style="left:{c*cell-1}px;top:{r*cell-1}px"></div>')
        if (r, c) in nums:
            h.append(f'<span class="n" style="left:{c*cell+cell*0.08:.1f}px;top:{r*cell+cell*0.07:.1f}px">{nums[(r,c)]}</span>')
        if (r, c) in anim or r in filled_rows:
            op = '0' if (r, c) in anim else '1'
            h.append(f'<span class="L" id="l{r}_{c}" style="left:{c*cell}px;top:{r*cell+cell*0.06:.1f}px;width:{cell}px;height:{cell}px;opacity:{op}">{ch}</span>')
h.append('</div>')
if not mobile:
    h.append('<div class="panel"><div class="head">ORIZZONTALI</div><div id="clues" style="position:relative">')
    h.append('<div class="hl" id="hl"></div>')
    for wi, (n, r, c, l, t) in enumerate(words):
        h.append(f'<div class="cl" id="cl{wi}"><b>{n}.</b><span>{t}</span></div>')
    h.append('</div></div>')
else:
    h.append('<div class="mclue">')
    for wi, (n, r, c, l, t) in enumerate(words):
        h.append(f'<div class="mc" id="mc{wi}" style="opacity:{1 if wi == 0 else 0}"><span class="k">{n} Orizz.</span>{t}</div>')
    h.append('</div>')

js = ["const tl=gsap.timeline({paused:true});",
      "const off=(id)=>document.getElementById(id).offsetTop;",
      "const hgt=(id)=>document.getElementById(id).offsetHeight;",
      'gsap.set("#hl",{y:off("cl0"),height:hgt("cl0")});' if not mobile else ""]
step = 1.0
t0 = 0.35
for wi, (n, r, c, l, t) in enumerate(words):
    ts = t0 + wi * step
    js.append(f'tl.to("#cur",{{x:{c*cell},y:{r*cell},duration:0.22,ease:"power3.out"}},{ts:.2f});')
    js.append(f'tl.fromTo("#wb{wi}",{{opacity:0}},{{opacity:1,duration:0.15}},{ts:.2f});')
    if wi > 0:
        js.append(f'tl.to("#wb{wi-1}",{{opacity:0,duration:0.2}},{ts:.2f});')
    if not mobile:
        if wi > 0:
            js.append(f'tl.to("#hl",{{y:off("cl{wi}"),height:hgt("cl{wi}"),duration:0.3,ease:"power3.out"}},{ts:.2f});')
    else:
        if wi > 0:
            js.append(f'tl.to("#mc{wi-1}",{{opacity:0,duration:0.15}},{ts:.2f});')
            js.append(f'tl.fromTo("#mc{wi}",{{opacity:0,filter:"blur(6px)"}},{{opacity:1,filter:"blur(0px)",duration:0.18}},{ts+0.1:.2f});')
    for k in range(l):
        tk = ts + 0.28 + k * 0.09
        if k > 0:
            js.append(f'tl.to("#cur",{{x:{(c+k)*cell},duration:0.06,ease:"none"}},{tk-0.03:.2f});')
        js.append(f'tl.fromTo("#l{r}_{c+k}",{{opacity:0,scale:0.6}},{{opacity:1,scale:1,duration:0.14,ease:"back.out(2)"}},{tk:.2f});')
end = t0 + len(words) * step
D = 12.0
js.append(f'tl.to("#wb{len(words)-1}",{{opacity:0,duration:0.3}},{end+0.2:.2f});')
lst = ",".join(f'"#l{r}_{c}"' for (r, c) in sorted(anim))
js.append(f'tl.to([{lst}],{{opacity:0,duration:0.35,stagger:0.012,ease:"power2.in"}},{D-1.6:.2f});')
js.append(f'tl.to("#cur",{{x:0,y:0,duration:0.4,ease:"power2.inOut"}},{D-1.0:.2f});')
if not mobile:
    js.append(f'tl.to("#hl",{{y:off("cl0"),height:hgt("cl0"),duration:0.4,ease:"power2.inOut"}},{D-1.0:.2f});')
else:
    js.append(f'tl.to("#mc{len(words)-1}",{{opacity:0,duration:0.2}},{D-1.0:.2f});')
    js.append(f'tl.to("#mc0",{{opacity:1,duration:0.2}},{D-0.7:.2f});')
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
