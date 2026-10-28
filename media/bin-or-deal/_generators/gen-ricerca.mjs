// Writes ricerca/index.html (plain HTML; the generator only saves typing)
import { writeFileSync, mkdirSync } from "node:fs";
// id, tier, platform, title, city, cond, price, ref, pct, hue, delta
const C = {
  S1: ["deal", "Subito", "Charizard 4/102 italiano", "Roma", "buono", "110", "144", "−24%", 40, 0.24],
  S2: ["bin", "Subito", "Charizard Set Base Ita 4/102", "Napoli", "buono", "165", "144", "+15%", 210, -0.15],
  V1: ["deal", "Vinted", "Charizard base set mint", "Bologna", "mint", "135", "185", "−27%", 210, 0.27],
  V2: ["deal", "Vinted", "Charizard Base Set Unlimited, Near Mint", "Milano", "near-mint", "139", "176", "−21%", 14, 0.21],
  V3: ["fair", "Vinted", "Carta Charizard set base originale", "Torino", "near-mint", "170", "176", "−3%", 170, 0.03],
  E1: ["deal", "eBay", "Pokemon Charizard 4/102 Unlimited", "FR", "eccellente", "128", "163", "−21%", 320, 0.215],
  E2: ["fair", "eBay", "Charizard 4/102 Base Set Holo Rare", "DE", "eccellente", "155", "163", "−5%", 40, 0.05],
  W1: ["deal", "Wallapop", "Charizard base set holo 1999", "Madrid", "eccellente", "120", "163", "−26%", 280, 0.26],
  W2: ["bin", "Wallapop", "Charizard holo base set NM", "Barcelona", "near-mint", "199", "176", "+13%", 14, -0.13],
};
const chunks = [
  [1.5, ["S1", "S2"]],
  [2.5, ["V1", "V2", "V3"]],
  [3.5, ["E1", "E2"]],
  [6.0, ["W1", "W2"]],
];
const P = 100;
const art = (h, i) => `<svg class="art" viewBox="0 0 160 200"><defs><linearGradient id="g${i}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="hsl(${h},70%,62%)"/><stop offset="1" stop-color="hsl(${h + 30},60%,36%)"/></linearGradient></defs><rect width="160" height="200" fill="url(#g${i})"/><rect x="10" y="10" width="140" height="180" rx="8" fill="none" stroke="rgba(255,255,255,.4)"/><circle cx="80" cy="86" r="42" fill="hsl(${h},90%,82%)" opacity=".7"/><rect x="20" y="146" width="120" height="34" rx="4" fill="rgba(255,255,255,.2)"/></svg>`;
const cards = Object.entries(C).map(([id, [t, p, title, city, cond, price, ref, pct, h]]) => `
            <article class="card ${t} lc" id="c-${id}">
              <div class="thumb">${art(h, id)}<div class="plat mono">${p}</div></div>
              <div class="body">
                <div class="row1"><div class="title">${title}</div><span class="badge ${t}">${t.toUpperCase()} ${pct}</span></div>
                <div class="meta"><span>live</span>·<span>${city}</span>·<span>${cond}</span></div>
                <div class="prow"><div class="price">${price} €</div><div class="ref"><div class="k">rif. cardmarket</div><div class="v">${ref} €</div></div></div>
              </div>
            </article>`).join("");
// Tally states after each chunk
const states = [{ d: 0, f: 0, b: 0, n: 0, s: "eBay, Vinted, Wallapop, Subito in arrivo…" }];
const arrived = [];
const plan = [];
for (const [t, ids] of chunks) {
  arrived.push(...ids);
  const order = [...arrived].sort((a, b) => C[b][9] - C[a][9]);
  plan.push([t, ids, order]);
  const cnt = (x) => arrived.filter((i) => C[i][0] === x).length;
  const left = ["eBay", "Vinted", "Wallapop", "Subito"].filter((p) => !arrived.some((i) => C[i][1] === p));
  states.push({ d: cnt("deal"), f: cnt("fair"), b: cnt("bin"), n: arrived.length, s: left.length ? left.join(", ") + " in arrivo…" : "completata in 4,6s" });
}
const st = (k) => states.map((s, i) => `<span class="sv s${i}">${s[k]}</span>`).join("");
const html = `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link rel="stylesheet" href="assets/bod.css" />
    <link rel="stylesheet" href="assets/cards.css" />
    <style>
      html, body { width: 1920px; height: 1080px; }
      #root { position: relative; width: 100%; height: 100%; background: var(--paper); overflow: hidden; }
      #stage { position: absolute; inset: 0; zoom: 1.7; padding: 24px 36px; }
      .form { display: flex; border: 2px solid var(--ink); background: var(--surface); height: 48px; }
      .form .cat { background: var(--ink); color: var(--paper); font-family: "BOD Mono", monospace; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; display: flex; align-items: center; padding: 0 18px; width: 220px; }
      .form .q { flex: 1; display: flex; align-items: center; padding: 0 16px; font-size: 18px; }
      .form .btn { position: relative; width: 150px; background: var(--deal); color: var(--paper); border-left: 2px solid var(--ink); font-family: "BOD Mono", monospace; font-weight: 800; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; }
      .form .btn span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
      .grid { margin-top: 22px; display: grid; grid-template-columns: 230px 1fr; gap: 30px; }
      .src h3 { border-top: 2px solid var(--ink); padding: 8px 0 10px; font-family: "BOD Mono", monospace; font-weight: 400; font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; }
      .mrow { position: relative; display: flex; align-items: center; gap: 10px; border: 2px solid var(--ink); background: var(--surface); padding: 8px 10px; margin-bottom: 6px; font-family: "BOD Mono", monospace; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--line-strong); position: relative; }
      .dot i { position: absolute; inset: 0; border-radius: 50%; background: var(--deal); }
      .mrow .st { margin-left: auto; font-size: 10px; color: var(--ink-muted); position: relative; width: 70px; height: 14px; }
      .mrow .st span { position: absolute; right: 0; top: 0; }
      .refbox { margin-top: 18px; border-top: 3px double var(--ink); padding-top: 12px; }
      .refbox .nm { font-family: "BOD Display", serif; font-weight: 700; font-size: 16px; letter-spacing: -0.03em; margin-top: 4px; }
      .refbox .avg { font-family: "BOD Mono", monospace; font-weight: 800; font-size: 28px; margin-top: 6px; }
      .head { display: flex; align-items: center; gap: 10px; height: 30px; margin-bottom: 10px; font-family: "BOD Mono", monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-muted); }
      .num { position: relative; display: inline-block; width: 18px; height: 16px; font-weight: 700; color: var(--ink); }
      .num .sv, .stat .sv { position: absolute; left: 0; top: 0; white-space: nowrap; }
      .stat { position: relative; margin-left: auto; width: 420px; height: 16px; }
      .stat .sv { left: auto; right: 0; text-transform: none; letter-spacing: 0; color: var(--deal-deep); }
      .list { position: relative; height: 900px; }
      .lc { position: absolute; left: 0; right: 0; top: 0; height: 92px; }
      .lc .prow { padding-top: 2px; } .lc .meta { margin-top: 3px; }
      .lc .thumb { width: 68px; }
      .lc .title { font-size: 15px; }
      .lc .price { font-size: 20px; }
      .lc .body { padding: 10px 14px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="12" data-width="1920" data-height="1080">
      <div id="stage" class="clip" data-start="0" data-duration="12" data-track-index="0" data-layout-allow-overflow>
        <div class="form"><div class="cat">Carte collezionabili</div><div class="q">charizard base set</div><div class="btn"><span id="b-idle">Bin? Deal?</span><span id="b-busy">Cerco…</span></div></div>
        <div class="grid">
          <aside class="src">
            <h3>Sorgenti</h3>
            ${["Subito", "Vinted", "eBay", "Wallapop"].map((p) => `<div class="mrow"><span class="dot"><i id="d-${p}"></i></span>${p}<span class="st"><span id="w-${p}">attesa</span><span id="k-${p}">${Object.values(C).filter((c) => c[1] === p).length} annunci</span></span></div>`).join("\n            ")}
            <div class="refbox"><div class="kicker">Prezzo di riferimento · cardmarket</div><div class="nm">Charizard, Base Set (Unlimited) #4</div><div class="avg mono">185 €</div></div>
          </aside>
          <section>
            <div class="head"><span class="badge deal">DEAL</span><span class="num">${st("d")}</span><span class="badge fair">FAIR</span><span class="num">${st("f")}</span><span class="badge bin">BIN</span><span class="num">${st("b")}</span><span class="num" style="width:22px;margin-left:16px">${st("n")}</span>annunci<span class="stat">${st("s")}</span></div>
            <div class="list">${cards}
            </div>
          </section>
        </div>
      </div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      const P = ${P};
      const plan = ${JSON.stringify(plan)};
      const NS = ${states.length};
      const all = ${JSON.stringify(Object.keys(C))};
      const plats = ["Subito", "Vinted", "eBay", "Wallapop"];
      // t=0: empty results, nothing arrived
      tl.set(all.map((i) => "#c-" + i), { opacity: 0, y: 0, x: 0 }, 0);
      tl.set(plats.map((p) => "#d-" + p), { scale: 0 }, 0);
      tl.set(plats.map((p) => "#k-" + p), { opacity: 0 }, 0);
      tl.set(plats.map((p) => "#w-" + p), { opacity: 1 }, 0);
      tl.set("#b-busy", { opacity: 0 }, 0);
      for (let s = 1; s < NS; s++) tl.set(".s" + s, { opacity: 0 }, 0);
      tl.set(".s0", { opacity: 1 }, 0);
      // press the button
      tl.to("#b-idle", { opacity: 0, duration: 0.12 }, 0.6);
      tl.to("#b-busy", { opacity: 1, duration: 0.12 }, 0.65);
      plan.forEach(([t, ids, order], k) => {
        const p = { S: "Subito", V: "Vinted", E: "eBay", W: "Wallapop" }[ids[0][0]];
        tl.to("#d-" + p, { scale: 1, duration: 0.3, ease: "back.out(2)" }, t);
        tl.to("#w-" + p, { opacity: 0, duration: 0.15 }, t);
        tl.to("#k-" + p, { opacity: 1, duration: 0.2 }, t + 0.1);
        tl.to(".s" + k, { opacity: 0, duration: 0.12 }, t);
        tl.to(".s" + (k + 1), { opacity: 1, duration: 0.15 }, t + 0.1);
        order.forEach((id, slot) => {
          if (ids.includes(id)) {
            tl.set("#c-" + id, { y: slot * P, x: 40, filter: "blur(6px)" }, t);
            tl.to("#c-" + id, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.5, ease: "expo.out" }, t + 0.12 + slot * 0.03);
          } else {
            tl.to("#c-" + id, { y: slot * P, duration: 0.55, ease: "power3.inOut" }, t);
          }
        });
      });
      tl.to("#b-busy", { opacity: 0, duration: 0.12 }, 6.4);
      tl.to("#b-idle", { opacity: 1, duration: 0.12 }, 6.45);
      // reset for the loop
      tl.to(all.map((i) => "#c-" + i), { opacity: 0, filter: "blur(6px)", duration: 0.35, ease: "power3.in", stagger: 0.03 }, 11.2);
      tl.to(plats.map((p) => "#d-" + p), { scale: 0, duration: 0.25 }, 11.5);
      tl.to(plats.map((p) => "#k-" + p), { opacity: 0, duration: 0.2 }, 11.5);
      tl.to(plats.map((p) => "#w-" + p), { opacity: 1, duration: 0.2 }, 11.6);
      tl.to(".s" + (NS - 1), { opacity: 0, duration: 0.15 }, 11.5);
      tl.to(".s0", { opacity: 1, duration: 0.2 }, 11.6);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
mkdirSync(new URL("./ricerca/", import.meta.url), { recursive: true });
writeFileSync(new URL("./ricerca/index.html", import.meta.url), html);
console.log("ok");
