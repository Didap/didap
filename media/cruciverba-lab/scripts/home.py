# Lo sfondo della home per Cruciverba Lab: racconta il prodotto in quattro passaggi dentro
# un giro di 12 secondi, senza parole da tradurre (solo lettere delle soluzioni, numeri e
# simboli). Il sito ci mette sopra il marchio in SVG, quindi il centro resta vuoto e calmo.
#
#   1. i dieci giochi del giorno stanno sul tavolo come carte, ognuna col suo disegno;
#   2. il cruciverba si apre e si scrive, poi i rulli girano fino alla parola: spunte;
#   3. altre spunte, la classifica: la nostra riga sale al primo posto;
#   4. il giorno dopo: si strappa il foglio del calendario e le carte si girano, nuove.
#
# A desktop le carte stanno a sinistra del marchio e il gioco aperto a destra; al telefono
# (verticale, a tutto schermo) le carte sopra il marchio e il gioco sotto. Dietro, molto
# chiara, la griglia inclinata come il marchio. Tutto torna come all'inizio mentre i
# pannelli sono chiusi, quindi l'ultimo fotogramma combacia con il primo.
#
#   python media/cruciverba-lab/scripts/home.py media/cruciverba-lab/home/index.html 1920 1152
#   python media/cruciverba-lab/scripts/home.py media/cruciverba-lab/home-mobile/index.html 1080 2340
import math
import sys

out = sys.argv[1]
W, H = int(sys.argv[2]), int(sys.argv[3])
mobile = H > W   # il telefono è verticale, a tutto schermo
D = 12.0
ROT = -7

G = ["SOS#ALA###", "UNE#GAG###", "AGIVAMO###", "###IVA#FON", "COPPE#VOLO", "ORI##SOLAI",
     "NATA#TIC##", "##TOPO#LSD", "ODORI#BOIA", "PORTA#URTI", "SCIE##MIO#"]

# I dieci giochi, con i colori del sito (gioco, chiaro)
GAMES = [("cruciverba", "#D8361F", "#F7C3B4"), ("setaccio", "#2C7FA8", "#BFDCEB"),
         ("catena", "#1A8A86", "#BDE3E0"), ("crittografato", "#6A3FCB", "#D7CBF2"),
         ("rulli", "#C92A6B", "#F3C3D3"), ("chiave", "#0A7A3E", "#BFE6CC"),
         ("nessi", "#B02E8F", "#EFC6E3"), ("ghigliottina", "#9A5A12", "#F6D9BB"),
         ("alveare", "#8A7410", "#F8E59B"), ("mosaico", "#557F1C", "#DDEDB8")]

if mobile:
    # Marchio a 50% x e 30% y, alto il 16%; parole e disegni fra x 8-92% e y 8-55%;
    # sotto il 55% la nuvoletta di Didi
    lx, ly = 540, 702
    calm, fade = 220, 380
    tex = dict(C=100, cx=540, cy=680, bottom=(1100, 1300))
    card_w, card_h, gx, gy = 156, 118, 25, 22
    cards_x, cards_y = 100, 210
    S, sx, sy = 360, 360, 922          # il pannello del gioco aperto, sotto il marchio
else:
    # Barra in alto (12%), velo in basso (40%), menu a destra (x oltre il 90%), marchio a
    # 50% x e 38% y: carte a sinistra, gioco aperto a destra
    lx, ly = 960, 438
    calm, fade = 240, 440
    tex = dict(C=140, cx=960, cy=500, bottom=None)
    card_w, card_h, gx, gy = 106, 128, 22, 24
    cards_x, cards_y = 92, 276
    # a destra c'è l'indice con l'etichetta della voce attiva (x oltre il 76% del
    # fotogramma, col taglio di object-fit): il pannello sta fra il marchio e l'indice
    S, sx, sy = 310, 1148, 262

# ---------------------------------------------------------------- disegni dei giochi
def icon(name, c, soft):
    ink, wh = "#1F130E", "#FFFFFF"
    s = []
    if name == "cruciverba":
        blk = {(0, 3), (1, 1), (2, 2), (3, 0)}
        for r in range(4):
            for k in range(4):
                x, y = 14 + k * 18.5, 14 + r * 18.5
                f = ink if (r, k) in blk else wh
                s.append(f'<rect x="{x}" y="{y}" width="17" height="17" rx="2" fill="{f}" stroke="{ink}" stroke-width="1.5"/>')
        s.append(f'<rect x="14" y="14" width="17" height="17" rx="2" fill="{c}"/>')
    elif name == "setaccio":
        for r in range(5):
            for k in range(5):
                s.append(f'<circle cx="{18 + k*16}" cy="{18 + r*16}" r="3.4" fill="{ink}"/>')
        s.append(f'<line x1="18" y1="34" x2="66" y2="82" stroke="{c}" stroke-width="12" stroke-linecap="round" opacity=".75"/>')
    elif name == "catena":
        for r in range(4):
            s.append(f'<rect x="{20 + (r % 2) * 8}" y="{14 + r*20}" width="52" height="13" rx="6.5" fill="{c if r == 1 else wh}" stroke="{ink}" stroke-width="1.8"/>')
            if r < 3:
                s.append(f'<line x1="50" y1="{27 + r*20}" x2="50" y2="{34 + r*20}" stroke="{ink}" stroke-width="2"/>')
    elif name == "crittografato":
        nums = ["3", "7", "1", "5", "2", "9", "4", "8", "6"]
        for i in range(9):
            r, k = divmod(i, 3)
            x, y = 18 + k * 22, 18 + r * 22
            f = c if i == 4 else wh
            s.append(f'<rect x="{x}" y="{y}" width="20" height="20" rx="2" fill="{f}" stroke="{ink}" stroke-width="1.5"/>')
            s.append(f'<text x="{x+3}" y="{y+8}" font-size="7" font-family="Piazzolla" font-weight="600" fill="{wh if i == 4 else ink}">{nums[i]}</text>')
    elif name == "rulli":
        s.append(f'<rect x="10" y="40" width="80" height="20" fill="{c}" opacity=".85"/>')
        for k in range(5):
            s.append(f'<rect x="{14 + k*15}" y="16" width="12" height="68" rx="5" fill="none" stroke="{ink}" stroke-width="1.8"/>')
    elif name == "chiave":
        cols = [["#E1DCD5", c, "#E1DCD5", "#F2C94C", "#E1DCD5"], [c, c, "#F2C94C", "#E1DCD5", c], [c] * 5]
        for r in range(3):
            for k in range(5):
                s.append(f'<rect x="{12 + k*15.5}" y="{24 + r*17}" width="13.5" height="14" rx="2" fill="{cols[r][k]}"/>')
    elif name == "nessi":
        for r in range(4):
            for k in range(4):
                f = c if r == 0 else (ink if (r + k) % 2 else wh)
                s.append(f'<rect x="{14 + k*18.5}" y="{14 + r*18.5}" width="17" height="17" rx="2.5" fill="{f}" stroke="{ink}" stroke-width="1.3"/>')
    elif name == "ghigliottina":
        for r in range(4):
            on = r % 2
            s.append(f'<rect x="12" y="{16 + r*18}" width="34" height="13" rx="4" fill="{c if not on else wh}" stroke="{ink}" stroke-width="1.5"/>')
            s.append(f'<rect x="54" y="{16 + r*18}" width="34" height="13" rx="4" fill="{c if on else wh}" stroke="{ink}" stroke-width="1.5"/>')
    elif name == "alveare":
        def hexa(x, y, f):
            pts = " ".join(f"{x + 12*math.cos(math.radians(60*i + 30)):.1f},{y + 12*math.sin(math.radians(60*i + 30)):.1f}" for i in range(6))
            return f'<polygon points="{pts}" fill="{f}" stroke="{wh}" stroke-width="1.5"/>'
        s.append(hexa(50, 50, c))
        for i in range(6):
            a = math.radians(60 * i)
            s.append(hexa(50 + 21 * math.cos(a), 50 + 21 * math.sin(a), "#F2D55C"))
    elif name == "mosaico":
        for i, a in enumerate((-14, 0, 14)):
            s.append(f'<rect x="38" y="20" width="26" height="40" rx="4" fill="{wh}" stroke="{ink}" stroke-width="1.6" transform="rotate({a} 51 78)"/>')
        s.append(f'<circle cx="51" cy="40" r="6" fill="{c}"/>')
    return f'<svg viewBox="0 0 100 100">{"".join(s)}</svg>'


CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
TROPHY = ('<svg viewBox="0 0 100 100"><path d="M30 18h40v20c0 14-9 24-20 24S30 52 30 38z" fill="#E93F29"/>'
          '<path d="M30 26H18c0 12 6 18 14 18M70 26h12c0 12-6 18-14 18" fill="none" stroke="#E93F29" stroke-width="5"/>'
          '<rect x="45" y="60" width="10" height="14" fill="#E93F29"/><rect x="32" y="74" width="36" height="9" rx="3" fill="#1F130E"/></svg>')


# ---------------------------------------------------------------- griglia di fondo
def texture():
    C, cx, cy = tex["C"], tex["cx"], tex["cy"]
    p = []
    for r in range(11):
        for c in range(10):
            ch = G[r][c]
            if ch == "#":
                q = C * 0.08
                p.append(f'<div class="tb" style="left:{c*C+q:.1f}px;top:{r*C+q:.1f}px;width:{C-2*q:.1f}px;height:{C-2*q:.1f}px"></div>')
            else:
                p.append(f'<div class="tc" style="left:{c*C-1}px;top:{r*C-1}px"></div>')
                p.append(f'<span class="tl" style="left:{c*C}px;top:{r*C+C*0.06:.1f}px">{ch}</span>')
    return f'<div class="tex" style="left:{cx - C*5}px;top:{cy - C*5.5:.0f}px">{"".join(p)}</div>'


def veil():
    stops = ["rgba(252,252,249,.94) 0px"]
    for i in range(11):
        u = i / 10
        a = 0.94 * (1 - (3 * u * u - 2 * u * u * u))
        stops.append(f"rgba(252,252,249,{a:.3f}) {calm + (fade - calm) * u:.0f}px")
    return ",".join(stops)


# ---------------------------------------------------------------- pannelli (500x500)
# A: il cruciverba (un pezzo vero della griglia, righe 4-8 e colonne 0-4)
XW = ["COPPE", "ORI##", "NATA#", "##TOP", "ODORI"]
xwords = [(0, 0, 5), (2, 0, 4), (4, 0, 5)]   # (riga, colonna, lunghezza), si scrivono
XC = 72
XX, XY = (500 - 5 * XC) // 2, 108

# B: i rulli, la riga centrale diventa MORSO
REELS = ["TCLPSAVMC", "AUEORIAOA", "SNTRLTNRN", "VTSCAEPST", "IAELOCIOE"]
RH = 104
RW, RG = 80, 14
RX = (500 - (5 * RW + 4 * RG)) // 2
RMID = 300

# C: la classifica, la nostra riga sale dal quarto al primo posto
ROWS = [("#F2C4B5", "02:21,4", "1000"), ("#D7CBF2", "02:37,0", "1000"),
        ("#BDE3E0", "02:58,7", "981"), (None, "03:12,5", "940"), ("#BFDCEB", "04:26,8", "925")]
RY0, RSTEP = 104, 76

# ---------------------------------------------------------------- tempi
T = dict(
    a_open=0.5, a_close=3.35,
    b_open=3.75, b_close=6.15,
    c_open=6.55, c_close=9.0,
    d_open=9.3, tear=9.75, flip=10.15, d_close=11.05,
)
EXTRA_CHECKS = [5, 6, 8, 1]   # le altre spunte, mentre si apre la classifica

css = f"""
@font-face{{font-family:Caprasimo;src:url('assets/fonts/caprasimo-400.woff2') format('woff2');font-weight:400}}
@font-face{{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var.woff2') format('woff2');font-weight:100 900;font-style:normal}}
:root{{--paper:#FCFCF9;--ink:#1F130E;--mute:#6D6059;--hair:#E3DFD9;--brand:#E93F29;--brand-soft:#FBE7E2;--tile:#F7C3B4}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:var(--paper)}}
#root{{position:absolute;inset:0;background:var(--paper);font-family:Piazzolla,serif;color:var(--ink);overflow:hidden}}
.texw{{position:absolute;inset:0;opacity:.06}}
.tex{{position:absolute;width:{tex['C']*10}px;height:{tex['C']*11}px;outline:3px solid var(--ink);transform:rotate({ROT}deg)}}
.tc{{position:absolute;width:{tex['C']+2}px;height:{tex['C']+2}px;border:2px solid var(--ink)}}
.tb{{position:absolute;background:var(--ink);border-radius:{tex['C']*0.12:.0f}px}}
.tl{{position:absolute;width:{tex['C']}px;height:{tex['C']}px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:{tex['C']*0.52:.0f}px}}
.calm{{position:absolute;inset:0;background:radial-gradient(circle at {lx}px {ly}px,{veil()})}}
.card{{position:absolute;width:{card_w}px;height:{card_h}px}}
.cf{{position:absolute;inset:0;border-radius:{card_w*0.12:.0f}px;display:flex;align-items:center;justify-content:center}}
.cf svg{{width:{min(card_w, card_h)*0.8:.0f}px;height:{min(card_w, card_h)*0.8:.0f}px}}
.ring{{position:absolute;inset:-6px;border-radius:{card_w*0.12+6:.0f}px;border:4px solid;opacity:0}}
.ck{{position:absolute;right:-8px;bottom:-8px;width:{card_w*0.34:.0f}px;height:{card_w*0.34:.0f}px;border-radius:50%;display:flex;align-items:center;justify-content:center;opacity:0;box-shadow:0 0 0 3px var(--paper)}}
.ck svg{{width:58%;height:58%}}
.stage{{position:absolute;left:{sx}px;top:{sy}px;width:500px;height:500px;transform:scale({S/500:.4f});transform-origin:0 0}}
.pn{{position:absolute;inset:0;border-radius:24px;background:#FFFEFB;box-shadow:0 26px 60px rgba(31,19,14,.14),0 0 0 2px var(--hair);overflow:hidden;opacity:0}}
.ph{{position:absolute;left:0;right:0;top:0;height:78px;display:flex;align-items:center;padding:0 24px;gap:16px}}
.ph svg{{width:54px;height:54px}}
.dots{{margin-left:auto;display:flex;gap:7px}}
.dots i{{display:block;width:13px;height:13px;border-radius:3px;border:2px solid var(--ink)}}
.xc{{position:absolute;width:{XC+2}px;height:{XC+2}px;border:2px solid var(--ink)}}
.xb{{position:absolute;background:var(--ink);border-radius:8px;z-index:3}}
.xl{{position:absolute;width:{XC}px;height:{XC}px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:40px;z-index:3}}
.xw{{position:absolute;background:var(--brand-soft);z-index:1}}
.xcur{{position:absolute;left:0;top:0;width:{XC}px;height:{XC}px;background:var(--tile);z-index:2}}
.band{{position:absolute;left:14px;right:14px;top:{RMID - RH//2}px;height:{RH}px;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink)}}
.hit{{position:absolute;inset:0;background:#F3C3D3;opacity:0}}
.win{{position:absolute;top:96px;width:{RW}px;height:392px;overflow:hidden}}
.reel{{position:absolute;left:0;top:{RMID - 96 - RH//2}px;width:{RW}px}}
.reel div{{height:{RH}px;display:flex;align-items:center;justify-content:center;font-family:Caprasimo;font-size:64px}}
.rfade{{position:absolute;left:0;right:0;height:150px}}
.rk{{position:absolute;left:22px;width:40px;height:66px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:26px;color:var(--mute)}}
.row{{position:absolute;left:70px;right:22px;top:0;height:66px;border-radius:12px;display:flex;align-items:center;padding:0 18px;gap:20px}}
.av{{width:40px;height:40px;border-radius:10px;flex:none;display:flex;align-items:center;justify-content:center}}
.tm{{font-size:24px;color:var(--mute);font-variant-numeric:tabular-nums}}
.pt{{margin-left:auto;font-weight:700;font-size:32px;font-variant-numeric:tabular-nums}}
.plus{{position:absolute;right:150px;top:0;padding:4px 12px;border-radius:8px;background:var(--brand);color:#fff;font-weight:700;font-size:24px;opacity:0}}
.cal{{position:absolute;left:100px;top:92px;width:300px;height:340px}}
.pg{{position:absolute;inset:0;border-radius:20px;background:#FFFEFB;box-shadow:0 0 0 2px var(--hair);overflow:hidden}}
.pg .hd{{position:absolute;left:0;right:0;top:0;height:86px;background:var(--brand)}}
.pg .dn{{position:absolute;left:0;right:0;top:104px;text-align:center;font-family:Caprasimo;font-size:150px;line-height:1}}
.pg .wk{{position:absolute;left:40px;right:40px;bottom:30px;display:flex;justify-content:space-between}}
.pg .wk i{{display:block;width:22px;height:22px;border-radius:5px;background:var(--hair)}}
.ringc{{position:absolute;top:-18px;width:22px;height:40px;border-radius:11px;background:var(--ink);z-index:4}}
"""

h = [f'<div class="texw" data-layout-allow-occlusion>{texture()}</div>']
if tex["bottom"]:
    b0, b1 = tex["bottom"]
    h.append(f'<div class="calm" data-layout-allow-occlusion style="background:linear-gradient(to bottom,rgba(252,252,249,0) {b0}px,var(--paper) {b1}px)"></div>')
h.append('<div class="calm" data-layout-allow-occlusion></div>')

# Le carte
for i, (nm, col, soft) in enumerate(GAMES):
    r, k = divmod(i, 5)
    x = cards_x + k * (card_w + gx)
    y = cards_y + r * (card_h + gy)
    h.append(f'<div class="card" data-layout-allow-occlusion id="cd{i}" style="left:{x}px;top:{y}px">'
             f'<div class="ring" id="rg{i}" style="border-color:{col}"></div>'
             f'<div class="cf" style="background:{soft}">{icon(nm, col, soft)}</div>'
             f'<div class="ck" id="ck{i}" style="background:{col}">{CHECK}</div></div>')

# I pannelli
st = ['<div class="stage">']
# A, cruciverba
col, soft = GAMES[0][1], GAMES[0][2]
dots = '<div class="dots">' + "".join('<i></i>' for _ in range(5)) + '</div>'
a = [f'<div class="pn" data-layout-allow-occlusion id="pA"><div class="ph" data-layout-allow-occlusion style="background:{soft}">{icon("cruciverba", col, soft)}{dots}</div>',
     f'<div style="position:absolute;left:{XX}px;top:{XY}px;width:{5*XC}px;height:{5*XC}px;outline:3px solid var(--ink)">']
typed = set()
for wi, (r, c, l) in enumerate(xwords):
    a.append(f'<div class="xw" id="xw{wi}" style="left:{c*XC}px;top:{r*XC}px;width:{l*XC}px;height:{XC}px;opacity:0"></div>')
    typed.update((r, c + k) for k in range(l))
a.append('<div class="xcur" id="xcur" style="opacity:0"></div>')
for r in range(5):
    for c in range(5):
        ch = XW[r][c]
        if ch == "#":
            a.append(f'<div class="xb" style="left:{c*XC+6}px;top:{r*XC+6}px;width:{XC-12}px;height:{XC-12}px"></div>')
            continue
        a.append(f'<div class="xc" style="left:{c*XC-1}px;top:{r*XC-1}px"></div>')
        if (r, c) in typed:
            a.append(f'<span class="xl" id="x{r}_{c}" style="left:{c*XC}px;top:{r*XC+3}px;opacity:0">{ch}</span>')
        else:
            a.append(f'<span class="xl" style="left:{c*XC}px;top:{r*XC+3}px">{ch}</span>')
a.append('</div></div>')
st += a
# B, rulli
col, soft = GAMES[4][1], GAMES[4][2]
b = [f'<div class="pn" data-layout-allow-occlusion id="pB"><div class="ph" data-layout-allow-occlusion style="background:{soft}">{icon("rulli", col, soft)}{dots}</div>',
     '<div class="band" data-layout-allow-occlusion><div class="hit" id="hit"></div></div>']
for j, s in enumerate(REELS):
    b.append(f'<div class="win" data-layout-allow-occlusion style="left:{RX + j*(RW+RG)}px"><div class="reel" id="rl{j}">'
             + "".join(f'<div>{ch}</div>' for ch in s) + '</div></div>')
b.append('<div class="rfade" data-layout-allow-occlusion style="top:92px;background:linear-gradient(#FFFEFB 20%,rgba(255,254,251,0))"></div>')
b.append('<div class="rfade" data-layout-allow-occlusion style="top:350px;background:linear-gradient(rgba(255,254,251,0),#FFFEFB 80%)"></div>')
b.append('</div>')
st += b
# C, classifica
c_ = [f'<div class="pn" data-layout-allow-occlusion id="pC"><div class="ph" data-layout-allow-occlusion style="background:var(--brand-soft)">{TROPHY}{dots}</div>']
for i in range(5):
    c_.append(f'<div class="rk" style="top:{RY0 + i*RSTEP}px">{i+1}</div>')
for i, (av, tm, pt) in enumerate(ROWS):
    me = av is None
    avd = ('<div class="av" style="background:var(--brand)"><svg viewBox="0 0 10 10" width="22" height="22">'
           '<rect x="1" y="1" width="8" height="8" rx="1.5" fill="#FCFCF9"/><rect x="3.6" y="3.6" width="2.8" height="2.8" fill="#E93F29"/></svg></div>'
           if me else f'<div class="av" style="background:{av}"></div>')
    bg = "background:var(--brand-soft);" if me else ""
    c_.append(f'<div class="row" id="rw{i}" style="{bg}">{avd}'
              f'<span class="tm" id="tm{i}">{tm}</span><span class="pt" id="pt{i}">{pt}</span></div>')
c_.append(f'<div class="plus" id="plus">+60</div>')
c_.append('</div>')
st += c_
# D, calendario: il foglio di oggi sopra quello di domani
d = ['<div class="pn" data-layout-allow-occlusion id="pD" style="background:transparent;box-shadow:none">', '<div class="cal">']
d.append('<div class="pg"><div class="hd"></div><div class="dn">29</div><div class="wk">' + "<i></i>" * 7 + '</div></div>')
d.append('<div class="pg" id="pg0" style="box-shadow:0 22px 50px rgba(31,19,14,.16),0 0 0 2px var(--hair)"><div class="hd"></div><div class="dn">28</div><div class="wk">' + "<i></i>" * 7 + '</div></div>')
d.append('<div class="ringc" style="left:80px"></div><div class="ringc" style="left:198px"></div>')
d.append('</div></div>')
st += d
st.append('</div>')
h += st

# ---------------------------------------------------------------- timeline
js = ["const tl=gsap.timeline({paused:true});"]


def lift(i, t0, t1):
    js.append(f'tl.to("#cd{i}",{{y:-10,scale:1.06,duration:0.3,ease:"power2.out"}},{t0:.2f});')
    js.append(f'tl.to("#rg{i}",{{opacity:1,duration:0.25}},{t0:.2f});')
    js.append(f'tl.to("#cd{i}",{{y:0,scale:1,duration:0.3,ease:"power2.inOut"}},{t1:.2f});')
    js.append(f'tl.to("#rg{i}",{{opacity:0,duration:0.25}},{t1:.2f});')


def check(i, t):
    js.append(f'tl.fromTo("#ck{i}",{{opacity:0,scale:0.3}},{{opacity:1,scale:1,duration:0.3,ease:"back.out(2.4)",immediateRender:false}},{t:.2f});')


def open_panel(p, t0, t1):
    js.append(f'tl.fromTo("#{p}",{{opacity:0,scale:0.92,y:16}},{{opacity:1,scale:1,y:0,duration:0.35,ease:"power3.out",immediateRender:false}},{t0:.2f});')
    js.append(f'tl.to("#{p}",{{opacity:0,scale:0.96,y:-10,duration:0.3,ease:"power2.in"}},{t1:.2f});')


# 1-2a. il cruciverba
lift(0, T["a_open"], T["a_close"])
open_panel("pA", T["a_open"], T["a_close"])
t = T["a_open"] + 0.45
for wi, (r, c, l) in enumerate(xwords):
    js.append(f'tl.set("#xcur",{{x:{c*XC},y:{r*XC}}},{t:.2f});')
    js.append(f'tl.to("#xcur",{{opacity:1,duration:0.12}},{t:.2f});')
    js.append(f'tl.to("#xw{wi}",{{opacity:1,duration:0.15}},{t:.2f});')
    for k in range(l):
        tk = t + 0.12 + k * 0.08
        if k:
            js.append(f'tl.to("#xcur",{{x:{(c+k)*XC},duration:0.06,ease:"power2.out"}},{tk-0.04:.2f});')
        js.append(f'tl.fromTo("#x{r}_{c+k}",{{opacity:0,scale:0.6}},{{opacity:1,scale:1,duration:0.14,ease:"back.out(2)",immediateRender:false}},{tk:.2f});')
    te = t + 0.12 + l * 0.08 + 0.12
    js.append(f'tl.to("#xcur",{{opacity:0,duration:0.07}},{te:.2f});')
    js.append(f'tl.to("#xw{wi}",{{opacity:0,duration:0.2}},{te:.2f});')
    t = te + 0.08
assert t < T["a_close"] - 0.15, t
check(0, T["a_close"] - 0.2)
reset_a = T["a_close"] + 0.35
js.append(f'tl.set([{",".join(chr(34) + "#x" + str(r) + "_" + str(c + k) + chr(34) for (r, c, l) in xwords for k in range(l))}],{{opacity:0}},{reset_a:.2f});')

# 2b. i rulli: ogni rullo gira dalla lettera 1 alla 7, la riga diventa MORSO
lift(4, T["b_open"], T["b_close"])
open_panel("pB", T["b_open"], T["b_close"])
for j in range(5):
    js.append(f'gsap.set("#rl{j}",{{y:{-RH}}});')
    js.append(f'tl.to("#rl{j}",{{y:{-7*RH},duration:{0.9 + j*0.18:.2f},ease:"power3.inOut"}},{T["b_open"] + 0.35:.2f});')
tl_hit = T["b_open"] + 0.35 + 0.9 + 4 * 0.18 + 0.05
js.append(f'tl.to("#hit",{{opacity:1,duration:0.2}},{tl_hit:.2f});')
check(4, tl_hit + 0.2)
reset_b = T["b_close"] + 0.35
js.append(f'tl.set("#hit",{{opacity:0}},{reset_b:.2f});')
for j in range(5):
    js.append(f'tl.set("#rl{j}",{{y:{-RH}}},{reset_b:.2f});')

# 3. le altre spunte e la classifica
for n, i in enumerate(EXTRA_CHECKS):
    check(i, T["c_open"] - 0.25 + n * 0.14)
open_panel("pC", T["c_open"], T["c_close"])
order = [0, 1, 2, 3, 4]
for i in range(5):
    js.append(f'gsap.set("#rw{i}",{{y:{RY0 + i*RSTEP}}});')


def place(t):
    for pos, i in enumerate(order):
        js.append(f'tl.to("#rw{i}",{{y:{RY0 + pos*RSTEP},duration:0.35,ease:"power3.inOut"}},{t:.2f});')


t = T["c_open"] + 0.65
js.append(f'tl.set("#pt3",{{textContent:"961"}},{t:.2f});')
order = [0, 1, 3, 2, 4]
place(t)
t += 0.55
js.append(f'tl.set("#pt3",{{textContent:"1000"}},{t:.2f});')
js.append(f'tl.set("#tm3",{{textContent:"02:18,9"}},{t:.2f});')
js.append(f'tl.fromTo("#plus",{{opacity:0,y:{RY0 + 1*RSTEP + 14}}},{{opacity:1,y:{RY0 + 1*RSTEP - 2},duration:0.25,ease:"back.out(2)",immediateRender:false}},{t:.2f});')
order = [0, 3, 1, 2, 4]
place(t + 0.05)
t += 0.45
order = [3, 0, 1, 2, 4]
place(t)
js.append(f'tl.to("#plus",{{y:{RY0 - 2},duration:0.35,ease:"power3.inOut"}},{t:.2f});')
js.append(f'tl.to("#plus",{{opacity:0,duration:0.25}},{t + 0.5:.2f});')
assert t + 0.75 < T["c_close"]
reset_c = T["c_close"] + 0.35
for i in range(5):
    js.append(f'tl.set("#rw{i}",{{y:{RY0 + i*RSTEP}}},{reset_c:.2f});')
js.append(f'tl.set("#pt3",{{textContent:"940"}},{reset_c:.2f});')
js.append(f'tl.set("#tm3",{{textContent:"03:12,5"}},{reset_c:.2f});')

# 4. il giorno dopo: si strappa il foglio, le carte si girano e tornano senza spunte
open_panel("pD", T["d_open"], T["d_close"])
js.append(f'tl.to("#pg0",{{rotation:-14,x:-40,y:-120,opacity:0,duration:0.55,ease:"power2.in",transformOrigin:"0% 0%"}},{T["tear"]:.2f});')
for i in range(10):
    r, k = divmod(i, 5)
    tf = T["flip"] + (k + r) * 0.07
    js.append(f'tl.to("#cd{i}",{{scaleX:0,duration:0.13,ease:"power2.in"}},{tf:.2f});')
    js.append(f'tl.set("#ck{i}",{{opacity:0}},{tf + 0.13:.2f});')
    js.append(f'tl.to("#cd{i}",{{scaleX:1,duration:0.15,ease:"power2.out"}},{tf + 0.13:.2f});')
reset_d = T["d_close"] + 0.35
js.append(f'tl.set("#pg0",{{rotation:0,x:0,y:0,opacity:1}},{reset_d:.2f});')
assert reset_d < D - 0.2
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
<div id="stage" class="clip" data-start="0" data-duration="{D:g}" data-track-index="0" style="position:absolute;inset:0" data-layout-allow-overlap data-layout-allow-overflow>
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
