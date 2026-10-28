// Writes verdi/index.html (plain HTML; the generator only saves typing)
import { writeFileSync } from "node:fs";
const L = [
  ["deal", "Vinted", "Charizard Base Set Unlimited, Near Mint", "Milano", "near-mint", "139", "176", "−21%", 14, "20m fa"],
  ["fair", "eBay", "Charizard 4/102 Base Set Holo Rare", "DE", "eccellente", "155", "163", "−5%", 40, "1h fa"],
  ["bin", "Subito", "Charizard Set Base Ita 4/102", "Napoli", "buono", "165", "144", "+15%", 210, "2h fa"],
  ["deal", "Wallapop", "Charizard base set holo 1999", "Madrid", "eccellente", "120", "163", "−26%", 280, "3h fa"],
  ["fair", "Vinted", "Carta Charizard set base originale", "Torino", "near-mint", "170", "176", "−3%", 170, "4h fa"],
  ["deal", "eBay", "Pokemon Charizard 4/102 Unlimited", "FR", "eccellente", "128", "163", "−21%", 320, "5h fa"],
  ["bin", "Wallapop", "Charizard holo base set NM", "Barcelona", "near-mint", "199", "176", "+13%", 14, "7h fa"],
  ["deal", "Subito", "Charizard 4/102 italiano", "Roma", "buono", "110", "144", "−24%", 40, "9h fa"],
  ["deal", "Vinted", "Charizard base set mint", "Bologna", "mint", "135", "185", "−27%", 210, "12h fa"],
];
const P = 108; // pitch in CSS px
const art = (h, i) => `<svg class="art" viewBox="0 0 160 200"><defs><linearGradient id="g${i}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="hsl(${h},70%,62%)"/><stop offset="1" stop-color="hsl(${h + 30},60%,36%)"/></linearGradient></defs><rect width="160" height="200" fill="url(#g${i})"/><rect x="10" y="10" width="140" height="180" rx="8" fill="none" stroke="rgba(255,255,255,.4)"/><circle cx="80" cy="86" r="42" fill="hsl(${h},90%,82%)" opacity=".7"/><rect x="20" y="146" width="120" height="34" rx="4" fill="rgba(255,255,255,.2)"/></svg>`;
const cards = L.map(([t, p, title, city, cond, price, ref, pct, h, ago], i) => `
          <article class="card ${t} lc" id="c${i}" style="top:${i * P}px">
            <div class="thumb">${art(h, i)}<div class="plat mono">${p}</div></div>
            <div class="body">
              <div class="row1"><div class="title">${title}</div><span class="badge ${t}">${t.toUpperCase()} ${pct}</span></div>
              <div class="meta"><span>live</span>·<span>${city}</span>·<span>${cond}</span>·<span>${ago}</span></div>
              <div class="prow"><div class="price">${price} €</div><div class="ref"><div class="k">rif. cardmarket</div><div class="v">${ref} €</div></div></div>
            </div>
          </article>`).join("");
const deals = L.map((l, i) => (l[0] === "deal" ? i : -1)).filter((i) => i >= 0);
const others = L.map((l, i) => (l[0] !== "deal" ? i : -1)).filter((i) => i >= 0);
const html = `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1696, height=1520" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link rel="stylesheet" href="assets/bod.css" />
    <link rel="stylesheet" href="assets/cards.css" />
    <style>
      html, body { width: 1696px; height: 1520px; }
      #root { position: relative; width: 100%; height: 100%; background: var(--paper); overflow: hidden; }
      #stage { position: absolute; inset: 0; zoom: 2; padding: 34px 32px; display: grid; grid-template-columns: 220px 1fr; gap: 28px; }
      .blk h3 { border-top: 2px solid var(--ink); padding: 8px 0 10px; font-family: "BOD Mono", monospace; font-weight: 400; font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; }
      .blk { margin-bottom: 20px; }
      .chip { position: relative; display: flex; justify-content: space-between; align-items: center; border: 2px solid var(--ink); background: var(--surface); padding: 7px 9px; margin-bottom: 6px; }
      .chip .tag { font-family: "BOD Mono", monospace; font-weight: 700; font-size: 10px; letter-spacing: 0.1em; padding: 2px 6px; }
      .chip .d { font-family: "BOD Mono", monospace; font-size: 11px; color: var(--ink-muted); margin-left: 8px; }
      .chip .n { font-family: "BOD Mono", monospace; font-size: 12px; color: var(--ink-soft); }
      .bg-deal { background: var(--deal); color: var(--paper); } .bg-fair { background: var(--fair); color: var(--ink); } .bg-bin { background: var(--bin); color: var(--paper); }
      .mk { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .mk span { border: 2px solid var(--ink); background: var(--ink); color: var(--paper); font-family: "BOD Mono", monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; text-align: center; padding: 7px 0; }
      .in { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .in span, .sel { border: 2px solid var(--ink); background: var(--surface); font-family: "BOD Mono", monospace; font-size: 13px; padding: 7px 9px; color: var(--ink-faint); }
      .sel { color: var(--ink); text-transform: uppercase; letter-spacing: 0.06em; }
      .head { display: flex; align-items: center; gap: 14px; height: 34px; margin-bottom: 12px; font-family: "BOD Mono", monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-muted); }
      .head .cnt { margin-left: auto; position: relative; width: 120px; height: 16px; text-align: right; }
      .head .cnt span { position: absolute; right: 0; top: 0; }
      .list { position: relative; height: 1200px; }
      .lc { position: absolute; left: 0; right: 0; height: 98px; }
      .lc .thumb { width: 78px; }
      .lc .title { font-size: 15px; }
      .lc .price { font-size: 22px; }
      #cursor { position: absolute; left: 0; top: 0; width: 22px; height: 22px; z-index: 10; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="12" data-width="1696" data-height="1520">
      <div id="stage" class="clip" data-start="0" data-duration="12" data-track-index="0" data-layout-allow-overflow>
        <aside>
          <div class="blk"><h3>Score</h3>
            <div class="chip" id="f-deal"><span><span class="tag bg-deal">DEAL</span><span class="d">sotto il mercato</span></span><span class="n">5</span></div>
            <div class="chip" id="f-fair"><span><span class="tag bg-fair">FAIR</span><span class="d">prezzo equo</span></span><span class="n">2</span></div>
            <div class="chip" id="f-bin"><span><span class="tag bg-bin">BIN</span><span class="d">sopra il mercato</span></span><span class="n">2</span></div>
          </div>
          <div class="blk"><h3>Marketplace</h3><div class="mk"><span>eBay</span><span>Vinted</span><span>Wallapop</span><span>Subito</span></div></div>
          <div class="blk"><h3>Prezzo (€)</h3><div class="in"><span>min</span><span>max</span></div></div>
          <div class="blk"><h3>Ordina</h3><div class="sel">Più recenti</div></div>
        </aside>
        <section>
          <div class="head"><span class="badge deal">DEAL</span><b class="t-soft">5</b><span class="badge fair">FAIR</span><b class="t-soft">2</b><span class="badge bin">BIN</span><b class="t-soft">2</b>
            <span class="cnt"><span id="cnt-all">9 annunci</span><span id="cnt-deal">5 annunci</span></span></div>
          <div class="list">${cards}
          </div>
        </section>
        <svg id="cursor" viewBox="0 0 24 24"><path d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.6 L11 13.4 L18 13.4 Z" fill="#15120d" stroke="#f4eedb" stroke-width="1.5" stroke-linejoin="round"/></svg>
      </div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      const P = ${P};
      const deals = ${JSON.stringify(deals)};
      const others = ${JSON.stringify(others)};
      // t=0 and t=12: full list, all tiers on, cursor parked bottom right
      tl.set("#cursor", { x: 520, y: 600 }, 0);
      tl.set("#cnt-deal", { opacity: 0 }, 0);
      // cursor to the DEAL chip and click
      tl.to("#cursor", { x: 150, y: 70, duration: 0.9, ease: "power3.inOut" }, 0.6);
      tl.to("#cursor", { scale: 0.82, duration: 0.08, ease: "power2.out", yoyo: true, repeat: 1 }, 1.55);
      tl.to(["#f-fair", "#f-bin"], { opacity: 0.55, backgroundColor: "rgba(0,0,0,0)", duration: 0.2 }, 1.62);
      tl.to("#cnt-all", { opacity: 0, duration: 0.15 }, 1.62);
      tl.to("#cnt-deal", { opacity: 1, duration: 0.2 }, 1.75);
      others.forEach((i, k) => tl.to("#c" + i, { opacity: 0, x: 40, filter: "blur(6px)", duration: 0.3, ease: "power3.in" }, 1.7 + k * 0.05));
      deals.forEach((i, k) => tl.to("#c" + i, { y: (k - i) * P, duration: 0.6, ease: "expo.out" }, 2.05 + k * 0.06));
      tl.to("#cursor", { x: 560, y: 560, duration: 1.0, ease: "power3.inOut" }, 2.6);
      // back: click DEAL again, everything returns
      tl.to("#cursor", { x: 150, y: 70, duration: 0.9, ease: "power3.inOut" }, 8.2);
      tl.to("#cursor", { scale: 0.82, duration: 0.08, ease: "power2.out", yoyo: true, repeat: 1 }, 9.15);
      tl.to(["#f-fair", "#f-bin"], { opacity: 1, backgroundColor: "#f4eedb", duration: 0.2 }, 9.22);
      tl.to("#cnt-deal", { opacity: 0, duration: 0.15 }, 9.22);
      tl.to("#cnt-all", { opacity: 1, duration: 0.2 }, 9.35);
      deals.forEach((i, k) => tl.to("#c" + i, { y: 0, duration: 0.6, ease: "expo.out" }, 9.3 + k * 0.04));
      others.forEach((i, k) => tl.to("#c" + i, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.45, ease: "expo.out" }, 9.6 + k * 0.06));
      tl.to("#cursor", { x: 520, y: 600, duration: 1.1, ease: "power3.inOut" }, 10.3);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
writeFileSync(new URL("./verdi/index.html", import.meta.url), html);
console.log("ok");
