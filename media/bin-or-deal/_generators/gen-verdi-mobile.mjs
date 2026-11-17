// Scrive verdi-mobile/index.html: il filtro Score di verdi/ rifatto per la feature[0] sul telefono,
// 1080x1920 ridotto a 810x1440 nella codifica (il generatore risparmia solo battute)
import { writeFileSync, mkdirSync } from "node:fs";
const L = [
  ["deal", "Vinted", "Charizard Base Set Unlimited NM", "Milano", "near-mint", "139", "176", "−21%", 14, "20m fa"],
  ["fair", "eBay", "Charizard 4/102 Holo Rare", "DE", "eccellente", "155", "163", "−5%", 40, "1h fa"],
  ["bin", "Subito", "Charizard Set Base Ita 4/102", "Napoli", "buono", "165", "144", "+15%", 210, "2h fa"],
  ["deal", "Wallapop", "Charizard base set holo 1999", "Madrid", "eccellente", "120", "163", "−26%", 280, "3h fa"],
  ["fair", "Vinted", "Carta Charizard set base", "Torino", "near-mint", "170", "176", "−3%", 170, "4h fa"],
  ["deal", "eBay", "Pokemon Charizard 4/102", "FR", "eccellente", "128", "163", "−21%", 320, "5h fa"],
  ["bin", "Wallapop", "Charizard holo base set NM", "Barcelona", "near-mint", "199", "176", "+13%", 14, "7h fa"],
  ["deal", "Subito", "Charizard 4/102 italiano", "Roma", "buono", "110", "144", "−24%", 40, "9h fa"],
  ["deal", "Vinted", "Charizard base set mint", "Bologna", "mint", "135", "185", "−27%", 210, "12h fa"],
];
const P = 100; // passo delle card in px CSS
const art = (h, i) => `<svg class="art" viewBox="0 0 160 200" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g${i}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="hsl(${h},70%,62%)"/><stop offset="1" stop-color="hsl(${h + 30},60%,36%)"/></linearGradient></defs><rect width="160" height="200" fill="url(#g${i})"/><rect x="10" y="10" width="140" height="180" rx="8" fill="none" stroke="rgba(255,255,255,.4)"/><circle cx="80" cy="86" r="42" fill="hsl(${h},90%,82%)" opacity=".7"/></svg>`;
const cards = L.map(([t, p, title, city, cond, price, ref, pct, h, ago], i) => `
          <article class="card ${t} lc" id="c${i}" style="top:${i * P}px">
            <div class="thumb">${art(h, i)}<div class="plat mono">${p}</div></div>
            <div class="body">
              <div class="row1"><div class="title">${title}</div><span class="badge ${t}">${t.toUpperCase()} ${pct}</span></div>
              <div class="meta"><span>${city}</span>·<span>${cond}</span>·<span>${ago}</span></div>
              <div class="prow"><div class="price">${price} €</div><div class="ref"><div class="k">rif. cardmarket</div><div class="v">${ref} €</div></div></div>
            </div>
          </article>`).join("");
const deals = L.map((l, i) => (l[0] === "deal" ? i : -1)).filter((i) => i >= 0);
const others = L.map((l, i) => (l[0] !== "deal" ? i : -1)).filter((i) => i >= 0);
const html = `<!doctype html>
<html lang="it">
  <!-- Generato da _generators/gen-verdi-mobile.mjs: il filtro Score per la feature[0] sul
       telefono, 1080x1920 ridotto a 810x1440 nella codifica -->
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link rel="stylesheet" href="assets/bod.css" />
    <link rel="stylesheet" href="assets/cards.css" />
    <style>
      html, body { width: 1080px; height: 1920px; }
      #root { position: relative; width: 100%; height: 100%; background: var(--paper); overflow: hidden; }
      /* 450x800 px CSS, zoom 2.4 */
      #stage { position: absolute; inset: 0; zoom: 2.4; padding: 24px 22px 0; }
      .blk h3 { border-top: 2px solid var(--ink); padding: 8px 0 10px; font-family: "BOD Mono", monospace; font-weight: 400; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; }
      .blk + .blk { margin-top: 14px; }
      .chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .chip { position: relative; display: flex; justify-content: space-between; align-items: center; border: 2px solid var(--ink); background: var(--surface); padding: 9px 10px; }
      .chip .tag { font-family: "BOD Mono", monospace; font-weight: 700; font-size: 12px; letter-spacing: 0.1em; padding: 3px 7px; }
      .chip .n { font-family: "BOD Mono", monospace; font-size: 15px; color: var(--ink-soft); }
      .bg-deal { background: var(--deal); color: var(--paper); } .bg-fair { background: var(--fair); color: var(--ink); } .bg-bin { background: var(--bin); color: var(--paper); }
      .mk { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
      .mk span { border: 2px solid var(--ink); background: var(--ink); color: var(--paper); font-family: "BOD Mono", monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; text-align: center; padding: 7px 0; }
      .head { margin-top: 16px; border-top: 3px double var(--ink); padding-top: 10px; display: flex; align-items: center; gap: 8px; height: 40px; font-family: "BOD Mono", monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-muted); }
      .head .badge { font-size: 11px; }
      .head b { margin-right: 4px; }
      .head .cnt { margin-left: auto; position: relative; width: 110px; height: 16px; }
      .head .cnt span { position: absolute; right: 0; top: 0; }
      .list { position: absolute; left: 22px; right: 22px; top: 252px; bottom: 0; overflow: hidden;
        -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 60px), transparent 100%); mask-image: linear-gradient(to bottom, #000 calc(100% - 60px), transparent 100%); }
      .lc { position: absolute; left: 0; right: 0; height: 92px; }
      .lc .thumb { width: 68px; }
      .lc .thumb .art { height: 100%; aspect-ratio: auto; }
      .lc .body { padding: 9px 12px; }
      .lc .title { font-size: 16px; }
      .lc .meta { margin-top: 3px; font-size: 10px; }
      .lc .prow { padding-top: 2px; }
      .lc .price { font-size: 22px; }
      #tap { position: absolute; left: 0; top: 0; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; background: rgba(21, 18, 13, 0.22); border: 2px solid rgba(21, 18, 13, 0.35); z-index: 10; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="12" data-width="1080" data-height="1920">
      <div id="stage" class="clip" data-start="0" data-duration="12" data-track-index="0" data-layout-allow-overflow>
        <div class="blk"><h3>Score</h3>
          <div class="chips">
            <div class="chip" id="f-deal"><span class="tag bg-deal">DEAL</span><span class="n">5</span></div>
            <div class="chip" id="f-fair"><span class="tag bg-fair">FAIR</span><span class="n">2</span></div>
            <div class="chip" id="f-bin"><span class="tag bg-bin">BIN</span><span class="n">2</span></div>
          </div>
        </div>
        <div class="blk"><h3>Marketplace</h3><div class="mk"><span>eBay</span><span>Vinted</span><span>Wallapop</span><span>Subito</span></div></div>
        <div class="head"><span class="badge deal">DEAL</span><b class="t-soft">5</b><span class="badge fair">FAIR</span><b class="t-soft">2</b><span class="badge bin">BIN</span><b class="t-soft">2</b>
          <span class="cnt"><span id="cnt-all">9 annunci</span><span id="cnt-deal">5 annunci</span></span></div>
        <div class="list">${cards}
        </div>
        <div id="tap"></div>
      </div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      const P = ${P};
      const deals = ${JSON.stringify(deals)};
      const others = ${JSON.stringify(others)};
      // Un tocco del dito sul chip DEAL, in px CSS
      const tap = (t) => {
        tl.set("#tap", { x: 95, y: 84, scale: 0.6, opacity: 0 }, t);
        tl.to("#tap", { scale: 1, opacity: 1, duration: 0.12, ease: "power2.out" }, t);
        tl.to("#tap", { scale: 1.25, opacity: 0, duration: 0.3, ease: "power2.in" }, t + 0.2);
      };
      // t=0 e t=12: lista intera, tutti gli score accesi
      tl.set(["#cnt-deal", "#tap"], { opacity: 0 }, 0);
      // tocco su DEAL: Fair e Bin si spengono, restano i verdi
      tap(1.5);
      tl.to(["#f-fair", "#f-bin"], { opacity: 0.45, backgroundColor: "rgba(0,0,0,0)", duration: 0.2 }, 1.62);
      tl.to("#cnt-all", { opacity: 0, duration: 0.15 }, 1.62);
      tl.to("#cnt-deal", { opacity: 1, duration: 0.2 }, 1.75);
      others.forEach((i, k) => tl.to("#c" + i, { opacity: 0, x: 40, filter: "blur(6px)", duration: 0.3, ease: "power3.in" }, 1.7 + k * 0.05));
      deals.forEach((i, k) => tl.to("#c" + i, { y: (k - i) * P, duration: 0.6, ease: "expo.out" }, 2.05 + k * 0.06));
      // di nuovo DEAL: torna tutto
      tap(9.1);
      tl.to(["#f-fair", "#f-bin"], { opacity: 1, backgroundColor: "#f4eedb", duration: 0.2 }, 9.22);
      tl.to("#cnt-deal", { opacity: 0, duration: 0.15 }, 9.22);
      tl.to("#cnt-all", { opacity: 1, duration: 0.2 }, 9.35);
      deals.forEach((i, k) => tl.to("#c" + i, { y: 0, duration: 0.6, ease: "expo.out" }, 9.3 + k * 0.04));
      others.forEach((i, k) => tl.to("#c" + i, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.45, ease: "expo.out" }, 9.6 + k * 0.06));
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
mkdirSync(new URL("../verdi-mobile/", import.meta.url), { recursive: true });
writeFileSync(new URL("../verdi-mobile/index.html", import.meta.url), html);
console.log("ok");
