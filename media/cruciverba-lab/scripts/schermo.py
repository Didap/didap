# Pezzi comuni degli schermi da telefono (alveare_schermo.py, ghigliottina_schermo.py): la
# pagina mobile del sito a 390 px di larghezza, ingrandita sullo schermo 1080x2330 del
# telefono, con barra di stato e indicatore home come gli schermi di CityFix.
W, H = 1080, 2330
K = W / 390  # px dello schermo per px css del sito
TOP = 150  # barra di stato, in px dello schermo (54 px css)
PAGE_H = round(H / K - TOP / K, 2)

ICONS = {
    "back": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    "cal": '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/><path d="M8 17h.01"/><path d="M12 17h.01"/><path d="M16 17h.01"/>',
    "trophy": '<path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"/><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"/><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"/>',
    "login": '<path d="m10 17 5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "sparkles": '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
    "book": '<path d="M12 5v16"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/>',
    "shuffle": '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>',
    "delete": '<path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="m12 9 6 6"/><path d="m18 9-6 6"/>',
    "bulb": '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    "up": '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
    "down": '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>',
}


def icon(name, size, cls="", sw=2):
    return (f'<svg class="ic {cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="currentColor" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</svg>')


# Il favicon del sito, come nella testata
MARK = ('<svg class="mark" viewBox="0 0 64 64"><g transform="rotate(-7 32 32)">'
        '<rect x="7" y="7" width="50" height="50" rx="4" fill="#1f130e"/>'
        '<rect x="25.67" y="10" width="12.67" height="12.67" fill="#fcfcf9"/>'
        '<rect x="41.33" y="10" width="12.67" height="12.67" fill="#fcfcf9"/>'
        '<rect x="10" y="25.67" width="12.67" height="12.67" fill="#fcfcf9"/>'
        '<rect x="25.67" y="25.67" width="12.67" height="12.67" fill="#e93f29"/>'
        '<rect x="41.33" y="25.67" width="12.67" height="12.67" fill="#fcfcf9"/>'
        '<rect x="10" y="41.33" width="12.67" height="12.67" fill="#fcfcf9"/>'
        '<rect x="25.67" y="41.33" width="12.67" height="12.67" fill="#fcfcf9"/>'
        '</g></svg>')

CSS = """
@font-face{font-family:Caprasimo;src:url('assets/fonts/caprasimo-400.woff2') format('woff2');font-weight:400}
@font-face{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var.woff2') format('woff2');font-weight:100 900}
@font-face{font-family:Piazzolla;src:url('assets/fonts/piazzolla-var-italic.woff2') format('woff2');font-weight:100 900;font-style:italic}
:root{--paper:#fcfcf9;--ink:#1f130e;--soft:#473a33;--mute:#6d6059;--hair:#dad7d2;--edge:#c2bdb5;--skirt:rgba(31,19,14,.13)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:%(W)dpx;height:%(H)dpx;overflow:hidden;background:var(--paper)}
#root{position:relative;width:100%%;height:100%%;background:var(--paper);color:var(--ink);font-family:Piazzolla,serif}
/* barra di stato e indicatore home, come gli schermi di CityFix */
.status{position:absolute;left:0;right:0;top:0;height:%(TOP)dpx;padding:24px 88px 0;display:flex;align-items:center;justify-content:space-between;font-family:Inter,sans-serif;font-weight:600;font-size:44px;color:var(--ink);background:var(--paper)}
.bars{display:flex;gap:4px;align-items:flex-end}
.bars i{width:8px;border-radius:2px;background:var(--ink)}
.home{position:absolute;left:50%%;bottom:22px;width:370px;height:14px;margin-left:-185px;border-radius:7px;background:var(--ink)}
/* la pagina del sito in px css, ingrandita sullo schermo */
#page{position:absolute;left:0;top:%(TOP)dpx;width:390px;height:%(PAGE_H)spx;transform:scale(%(K).5f);transform-origin:0 0;overflow:hidden}
.a{position:absolute}
.ic{display:block}
.mark{width:24px;height:24px;display:block}
.mast{left:0;right:0;top:0;height:78px;border-bottom:1px solid var(--hair)}
.mast .row{position:absolute;left:0;right:0;top:0;height:48px}
.mast .tool{position:absolute;left:0;right:0;top:48px;height:29px;border-top:1px solid var(--hair)}
.badge{position:absolute;left:127px;top:15px;width:41px;height:18px}
.badge i{position:absolute;inset:0;border:1px solid var(--hair);background:var(--paper)}
.badge b{position:absolute;inset:0;border:1px solid var(--ink);background:var(--paper);font-family:Caprasimo;font-weight:400;font-size:12px;line-height:16px;text-align:center}
.tname{position:absolute;left:20px;top:7px;font-family:Caprasimo;font-size:13px;line-height:14px}
.pips{position:absolute;top:10px;display:flex;gap:3.5px}
.pips i{width:6.7px;height:6.7px;border:1px solid;border-radius:1.5px}
.help{position:absolute;right:20px;top:3px;width:22px;height:22px;border-radius:50%%;display:grid;place-items:center;font-family:Caprasimo;font-size:12px}
"""


def css():
    return CSS % dict(W=W, H=H, TOP=TOP, PAGE_H=PAGE_H, K=K)


def masthead(game, color, vivid, tile, pips):
    pip = "".join(f'<i style="background:{vivid if k < pips else "transparent"}"></i>' for k in range(5))
    tw = {"Alveare": 49, "Ghigliottina": 79}[game]
    return f"""<div class="a mast">
<div class="row" style="color:var(--ink)">
<span style="position:absolute;left:20px;top:14px">{icon("back", 20)}</span>
<span style="position:absolute;left:54px;top:12px">{MARK}</span>
<span style="position:absolute;left:92px;top:14px">{icon("cal", 20)}</span>
<span class="badge"><i style="transform:translate(4px,4px)"></i><i style="transform:translate(2px,2px)"></i><b>+112</b></span>
<span style="position:absolute;left:290px;top:14px;color:var(--soft)">{icon("trophy", 20)}</span>
<span style="position:absolute;left:338px;top:14px;color:var(--soft)">{icon("login", 20)}</span>
</div>
<div class="tool">
<span class="tname" style="color:{color}">{game}</span>
<span class="pips" style="left:{20 + tw + 13}px;color:{vivid}">{pip}</span>
<span class="help" style="background:{tile}">?</span>
</div>
</div>"""


def chrome_top():
    return ('<div class="status"><span>9:41</span><span class="bars"><i style="height: 11px"></i>'
            '<i style="height: 17px"></i><i style="height: 22px"></i><i style="height: 28px"></i></span></div>')


def page(title, D, body, js):
    return f"""<!doctype html>
<html lang="it">
<!-- {title} -->
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width={W}, height={H}" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>{css()}</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{D:g}" data-width="{W}" data-height="{H}">
<div id="stage" class="clip" data-start="0" data-duration="{D:g}" data-track-index="0" style="position:absolute;inset:0" data-layout-allow-overlap data-layout-allow-overflow>
<div id="page">
{body}
</div>
{chrome_top()}
<div class="home"></div>
</div>
</div>
<script>
window.__timelines = window.__timelines || {{}};
{js}
</script>
</body>
</html>
"""
