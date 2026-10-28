// Writes condizione/, lotteria/, riferimento/ index.html (plain HTML; the generator only saves typing)
import { writeFileSync, mkdirSync } from "node:fs";
const art = (h, i) => `<svg class="art" viewBox="0 0 160 200"><defs><linearGradient id="g${i}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="hsl(${h},70%,62%)"/><stop offset="1" stop-color="hsl(${h + 30},60%,36%)"/></linearGradient></defs><rect width="160" height="200" fill="url(#g${i})"/><rect x="10" y="10" width="140" height="180" rx="8" fill="none" stroke="rgba(255,255,255,.4)"/><circle cx="80" cy="86" r="42" fill="hsl(${h},90%,82%)" opacity=".7"/></svg>`;
const cursor = `<svg id="cursor" viewBox="0 0 24 24"><path d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.6 L11 13.4 L18 13.4 Z" fill="#15120d" stroke="#f4eedb" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
const page = (body, script) => `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=822, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link rel="stylesheet" href="assets/bod.css" />
    <link rel="stylesheet" href="assets/cards.css" />
    <style>
      html, body { width: 822px; height: 1080px; }
      #root { position: relative; width: 100%; height: 100%; background: var(--paper); overflow: hidden; }
      #stage { position: absolute; inset: 0; zoom: 2; padding: 36px 20px; }
      h2 { font-family: "BOD Display", serif; font-weight: 900; font-size: 34px; letter-spacing: -0.04em; line-height: 0.95; margin: 8px 0 22px; }
      h2 em { font-family: "BOD Display", serif; font-style: italic; font-weight: 300; color: var(--ink-muted); }
      .sw { position: relative; }
      .sw > .v { position: absolute; left: 0; top: 0; white-space: nowrap; }
      .bx { position: relative; width: 84px; height: 17px; }
      .bx .badge { position: absolute; right: 0; top: 0; }
      .card { height: 130px; }
      .thumb { width: 84px; }
      .body { padding: 12px 14px; }
      .title { font-size: 15px; }
      .price { font-size: 22px; }
      .bl { position: absolute; left: -6px; top: -2px; bottom: -2px; width: 6px; }
      #cursor { position: absolute; left: 0; top: 0; width: 22px; height: 22px; z-index: 10; }
      .pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
      .pill { position: relative; border: 2px solid var(--ink); background: var(--surface); font-family: "BOD Mono", monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 8px; }
      .pill i { position: absolute; inset: -2px; background: var(--ink); color: var(--paper); font-style: normal; padding: 8px 10px; }
      .lot { display: inline-flex; gap: 6px; align-items: center; background: rgba(166,48,42,0.15); border: 2px solid var(--bin); color: var(--bin); padding: 4px 8px; font-family: "BOD Mono", monospace; font-weight: 700; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }
      .chk { display: flex; align-items: center; gap: 8px; border: 2px solid var(--ink); background: var(--paper-deep); padding: 10px 12px; margin-bottom: 18px; font-family: "BOD Mono", monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }
      .box { position: relative; width: 16px; height: 16px; border: 2px solid var(--ink); background: var(--surface); }
      .box i { position: absolute; inset: 1px; background: var(--ink); color: var(--paper); font-style: normal; font-size: 10px; line-height: 10px; text-align: center; }
      .rm { border-top: 3px double var(--ink); padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
      .rm .nm { font-family: "BOD Display", serif; font-weight: 700; font-size: 15px; letter-spacing: -0.03em; margin-top: 4px; height: 20px; width: 230px; }
      .rm .avg { font-family: "BOD Mono", monospace; font-weight: 800; font-size: 24px; height: 30px; width: 110px; }
      .rm .avg .v { right: 0; left: auto; }
      .cbtn { display: inline-block; margin-top: 8px; border: 2px solid var(--ink); padding: 4px 8px; font-family: "BOD Mono", monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; background: var(--paper); }
      .cand { border: 2px solid var(--ink); background: var(--surface); margin-bottom: 14px; }
      .cand div { display: flex; justify-content: space-between; padding: 9px 12px; border-bottom: 1px solid var(--line); font-family: "BOD Display", serif; font-weight: 700; font-size: 13px; letter-spacing: -0.02em; }
      .cand div:last-child { border-bottom: 0; }
      .cand b { font-family: "BOD Mono", monospace; font-size: 12px; }
      .cand .hd { font-family: "BOD Mono", monospace; font-weight: 400; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-muted); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="12" data-width="822" data-height="1080">
      <div id="stage" class="clip" data-start="0" data-duration="12" data-track-index="0" data-layout-allow-overflow data-layout-allow-overlap>
${body}
        ${cursor}
      </div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
${script}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
const out = (dir, html) => { mkdirSync(new URL(`./${dir}/`, import.meta.url), { recursive: true }); writeFileSync(new URL(`./${dir}/index.html`, import.meta.url), html); };

// 1. condizione: same listing, the stated condition changes the reference
const conds = [
  ["near-mint", "×0,95", "176", "deal", "DEAL −32%", "near mint"],
  ["giocato", "×0,62", "115", "fair", "FAIR +4%", "played"],
  ["rovinato", "×0,45", "83", "bin", "BIN +45%", "poor"],
];
out("condizione", page(`
        <div class="kicker">Condizione dichiarata</div>
        <h2>Stessa carta.<br /><em>Altro riferimento.</em></h2>
        <div class="pills">${["mint", "near-mint", "eccellente", "buono", "giocato", "rovinato"].map((c) => `<span class="pill">${c}${conds.find((x) => x[0] === c) ? `<i id="p-${c}">${c}</i>` : ""}</span>`).join("")}</div>
        <article class="card unk">
          ${conds.map((c, i) => `<div class="bl" id="bl${i}" style="background:var(--${c[3]})"></div>`).join("")}
          <div class="thumb">${art(14, "a")}<div class="plat mono">Vinted</div></div>
          <div class="body">
            <div class="row1"><div class="title">Charizard Base Set 4/102</div><span class="bx">${conds.map((c, i) => `<span class="badge ${c[3]}" id="b${i}">${c[4]}</span>`).join("")}</span></div>
            <div class="meta"><span>live</span>·<span>Torino</span>·<span class="sw" style="width:80px;height:12px">${conds.map((c, i) => `<span class="v" id="m${i}">${c[0]}</span>`).join("")}</span></div>
            <div class="prow"><div class="price">120 €</div><div class="ref"><div class="k">rif. cardmarket</div><div class="v sw" style="width:50px;height:18px;margin-left:auto">${conds.map((c, i) => `<span class="v" id="r${i}" style="right:0;left:auto">${c[2]} €</span>`).join("")}</div></div></div>
            <div class="arow"><span class="sw" style="width:200px;height:12px">${conds.map((c, i) => `<span class="v" id="n${i}">ref adjusted for ${c[5]}</span>`).join("")}</span></div>
          </div>
        </article>
        <div class="formula" style="margin-top:18px;font-family:'BOD Mono',monospace;font-size:12px;color:var(--ink-muted);line-height:1.6">Cardmarket 185 € <span class="sw" style="display:inline-block;width:46px;height:14px;vertical-align:top">${conds.map((c, i) => `<span class="v" id="f${i}" style="color:var(--ink)">${c[1]}</span>`).join("")}</span></div>`,
`      const n = 3;
      const ids = (k) => ["#p-", "#bl", "#b", "#m", "#r", "#n", "#f"].map((p) => (p === "#p-" ? "#p-" + ${JSON.stringify(conds.map((c) => c[0]))}[k] : p + k));
      // t=0 shows the last state (rovinato), so 12 s flows into 0
      for (let k = 0; k < n; k++) tl.set(ids(k), { opacity: k === n - 1 ? 1 : 0 }, 0);
      tl.set("#cursor", { x: 300, y: 420 }, 0);
      const px = [115, 354, 57], py = [150, 150, 185];
      for (let k = 0; k < n; k++) {
        const t = 0.4 + k * 4, prev = (k + n - 1) % n;
        tl.to("#cursor", { x: px[k], y: py[k], duration: 0.7, ease: "power3.inOut" }, t);
        tl.to("#cursor", { scale: 0.82, duration: 0.08, yoyo: true, repeat: 1 }, t + 0.75);
        tl.to(ids(prev), { opacity: 0, duration: 0.15 }, t + 0.85);
        tl.to(["#p-" + ${JSON.stringify(conds.map((c) => c[0]))}[k], "#m" + k, "#f" + k, "#n" + k], { opacity: 1, duration: 0.15 }, t + 0.9);
        tl.fromTo("#r" + k, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.35, ease: "expo.out", immediateRender: false }, t + 1.2);
        tl.set("#b" + k, { opacity: 0, scale: 1.4, filter: "blur(4px)" }, t + 1.6);
        tl.to("#b" + k, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.3, ease: "power4.out" }, t + 1.6);
        tl.to("#bl" + k, { opacity: 1, duration: 0.3 }, t + 1.6);
      }`));

// 2. lotteria: a raffle priced as a card, then Escludi lotterie
out("lotteria", page(`
        <div class="kicker">Ricerca · Pokémon</div>
        <h2>5 € per un Charizard?<br /><em>È una lotteria.</em></h2>
        <div class="chk"><span class="box"><i id="tick">✓</i></span>Escludi lotterie</div>
        <div style="position:relative;height:300px">
          <article class="card unk" id="lot" style="position:absolute;left:0;right:0;top:0">
            <div class="thumb">${art(280, "l")}<div class="plat mono">Vinted</div></div>
            <div class="body">
              <div class="row1"><div class="title">Lotteria Charizard Base Set, 1 biglietto</div><span class="badge" style="border:1px solid var(--line-strong);color:var(--ink-muted)">PREZZO?</span></div>
              <div class="meta"><span>live</span>·<span>Bari</span>·<span>n.d.</span></div>
              <div class="prow"><div class="sw" style="width:200px;height:30px"><div class="v price" id="lp">5 €</div><div class="v lot" id="lf">⚠ prezzo fake · lotteria</div></div></div>
            </div>
          </article>
          <article class="card deal" id="nx" style="position:absolute;left:0;right:0;top:142px">
            <div class="thumb">${art(40, "n")}<div class="plat mono">Subito</div></div>
            <div class="body">
              <div class="row1"><div class="title">Charizard 4/102 italiano</div><span class="badge deal">DEAL −24%</span></div>
              <div class="meta"><span>live</span>·<span>Roma</span>·<span>buono</span></div>
              <div class="prow"><div class="price">110 €</div><div class="ref"><div class="k">rif. cardmarket</div><div class="v">144 €</div></div></div>
            </div>
          </article>
        </div>`,
`      // t=0 and t=12: lotteries shown, price still looks real
      tl.set(["#tick", "#lf"], { opacity: 0 }, 0);
      tl.set(["#lot", "#lp"], { opacity: 1 }, 0);
      tl.set("#lot", { x: 0, filter: "blur(0px)" }, 0);
      tl.set("#nx", { y: 0 }, 0);
      tl.set("#cursor", { x: 300, y: 470 }, 0);
      // the price is flagged
      tl.to("#lp", { opacity: 0, filter: "blur(4px)", duration: 0.2 }, 1.2);
      tl.set("#lf", { opacity: 0, scale: 1.3 }, 1.35);
      tl.to("#lf", { opacity: 1, scale: 1, duration: 0.3, ease: "power4.out" }, 1.35);
      // tick Escludi lotterie: the listing leaves and the next one moves up
      tl.to("#cursor", { x: 30, y: 152, duration: 0.8, ease: "power3.inOut" }, 3.2);
      tl.to("#cursor", { scale: 0.82, duration: 0.08, yoyo: true, repeat: 1 }, 4.05);
      tl.to("#tick", { opacity: 1, duration: 0.1 }, 4.15);
      tl.to("#lot", { opacity: 0, x: 40, filter: "blur(6px)", duration: 0.3, ease: "power3.in" }, 4.3);
      tl.to("#nx", { y: -142, duration: 0.6, ease: "expo.out" }, 4.55);
      tl.to("#cursor", { x: 300, y: 470, duration: 1.0, ease: "power3.inOut" }, 5.0);
      // untick and reset for the loop
      tl.to("#cursor", { x: 30, y: 152, duration: 0.8, ease: "power3.inOut" }, 8.6);
      tl.to("#cursor", { scale: 0.82, duration: 0.08, yoyo: true, repeat: 1 }, 9.45);
      tl.to("#tick", { opacity: 0, duration: 0.1 }, 9.55);
      tl.to("#nx", { y: 0, duration: 0.6, ease: "expo.out" }, 9.65);
      tl.set("#lf", { opacity: 0 }, 9.7);
      tl.set("#lp", { opacity: 1, filter: "blur(0px)" }, 9.7);
      tl.to("#lot", { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.45, ease: "expo.out" }, 9.9);
      tl.to("#cursor", { x: 300, y: 470, duration: 1.0, ease: "power3.inOut" }, 10.4);`));

// 3. riferimento: the auto-match is wrong, pick Shadowless
out("riferimento", page(`
        <div class="kicker">Il match del catalogo</div>
        <h2>Non è questo?<br /><em>Cambia.</em></h2>
        <div class="rm">
          <div><div class="kicker">Prezzo di riferimento · cardmarket</div>
            <div class="nm sw"><span class="v" id="nm0">Charizard, Base Set (Unlimited) #4</span><span class="v" id="nm1">Charizard, Base Set (Shadowless) #4</span></div>
            <span class="cbtn">Non è questo? Cambia →</span></div>
          <div class="avg sw"><span class="v" id="av0">185 €</span><span class="v" id="av1">480 €</span></div>
        </div>
        <div class="cand" id="cand" style="position:absolute;left:20px;right:20px;top:255px;z-index:5"><div class="hd">Altri riferimenti per questa ricerca</div><div id="c1">Charizard, Base Set (Shadowless) #4<b>480 €</b></div><div>Charizard, Base Set 1st Edition #4<b>4.200 €</b></div></div>
        <article class="card" id="card" style="border-left-color:var(--bin)">
          <div class="bl" id="blg" style="background:var(--deal)"></div>
          <div class="thumb">${art(170, "r")}<div class="plat mono">Wallapop</div></div>
          <div class="body">
            <div class="row1"><div class="title">Charizard shadowless holo NM</div><span class="bx"><span class="badge bin" id="bb">BIN +13%</span><span class="badge deal" id="bd">DEAL −56%</span></span></div>
            <div class="meta"><span>live</span>·<span>Valencia</span>·<span>near-mint</span></div>
            <div class="prow"><div class="price">199 €</div><div class="ref"><div class="k">rif. cardmarket</div><div class="v sw" style="width:50px;height:18px;margin-left:auto"><span class="v" id="r0" style="right:0;left:auto">176 €</span><span class="v" id="r1" style="right:0;left:auto">456 €</span></div></div></div>
          </div>
        </article>`,
`      // t=0 and t=12: auto-match on Unlimited, the Shadowless listing reads as Bin
      tl.set(["#nm1", "#av1", "#bd", "#blg", "#r1", "#cand"], { opacity: 0 }, 0);
      tl.set(["#nm0", "#av0", "#bb", "#r0"], { opacity: 1 }, 0);
      tl.set("#cursor", { x: 300, y: 470 }, 0);
      // open the candidates
      tl.to("#cursor", { x: 120, y: 166, duration: 0.8, ease: "power3.inOut" }, 0.6);
      tl.to("#cursor", { scale: 0.82, duration: 0.08, yoyo: true, repeat: 1 }, 1.45);
      tl.set("#cand", { opacity: 0, y: -6 }, 1.55);
      tl.to("#cand", { opacity: 1, y: 0, duration: 0.3, ease: "expo.out" }, 1.55);
      // pick Shadowless
      tl.to("#cursor", { x: 140, y: 290, duration: 0.6, ease: "power3.inOut" }, 2.3);
      tl.to("#cursor", { scale: 0.82, duration: 0.08, yoyo: true, repeat: 1 }, 3.0);
      tl.to("#cand", { opacity: 0, duration: 0.2 }, 3.15);
      tl.to(["#nm0", "#av0"], { opacity: 0, duration: 0.15 }, 3.2);
      tl.to(["#nm1", "#av1"], { opacity: 1, duration: 0.25 }, 3.3);
      tl.to("#r0", { opacity: 0, duration: 0.15 }, 3.6);
      tl.fromTo("#r1", { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.35, ease: "expo.out", immediateRender: false }, 3.65);
      tl.to("#bb", { opacity: 0, duration: 0.15 }, 3.9);
      tl.set("#bd", { opacity: 0, scale: 1.4, filter: "blur(4px)" }, 4.0);
      tl.to("#bd", { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.3, ease: "power4.out" }, 4.0);
      tl.to("#blg", { opacity: 1, duration: 0.3 }, 4.0);
      tl.to("#cursor", { x: 300, y: 470, duration: 1.0, ease: "power3.inOut" }, 4.4);
      // back to the auto-match for the loop
      tl.to(["#nm1", "#av1", "#r1", "#bd", "#blg"], { opacity: 0, duration: 0.25 }, 10.8);
      tl.to(["#nm0", "#av0", "#r0", "#bb"], { opacity: 1, duration: 0.3 }, 11.0);`));
console.log("ok");
