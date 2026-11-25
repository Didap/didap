// Il giro di un'asta live di Fanta Rainbow, nello stile nuovo dell'app: fondo nero, la carta
// del calciatore blu elettrico con la banda lime, etichette bianche con l'ombra piena blu,
// titoli condensati in corsivo, il tasto tondo con l'anello arcobaleno. Tre telefoni dei
// giocatori rilanciano, il countdown riparte a ogni rilancio e alla fine scende a zero, il
// martello chiude e la carta vola nella rosa di chi ha vinto. Nessuna parola da tradurre:
// numeri, icone, sigle di ruolo e nomi propri (calciatore e squadre inventati). Stessi file in
// home/ e home-mobile/: cambiano la disposizione (`window.__astaConfig` in index.html) e le
// misure in CSS. Forme della carta: "stretto" (desktop, una colonna), "largo" (telefono, una
// riga sopra il logo).
//
// Ogni stato è funzione di t: render(t) non ricorda niente del fotogramma prima, e il
// fotogramma a 12 s è identico a quello a 0 s (la carta rientra fra 11,2 e 11,9 s).

const SQUADRE = [
  { nome: "Real Divano", colore: "#ff5d8f" },
  { nome: "Dinamo Tisana", colore: "#ffb020" },
  { nome: "Atletico Bar Sport", colore: "#6edb7e" },
];
// I rilanci: quando arrivano (s), da quale telefono, a quanto
const RILANCI = [
  { t: 1.2, s: 1, v: 5 },
  { t: 2.1, s: 0, v: 12 },
  { t: 2.9, s: 2, v: 18 },
  { t: 3.7, s: 1, v: 25 },
  { t: 4.5, s: 0, v: 31 },
  { t: 5.3, s: 2, v: 32 },
];
const VINCE = 2;
const TIMER = 3; // il countdown riparte da 3 s a ogni rilancio
const COLPO = 5.3 + TIMER; // il martello
const VOLO = [8.9, 9.75]; // la carta vola nella rosa
const RITORNO = 11.0; // il telefono torna all'asta
const RIENTRO = [11.2, 11.9]; // la carta del giro dopo
const DURATA = 12;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const morbido = (x) => x * x * (3 - 2 * x);
const dentroFuori = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const fuori = (x) => 1 - Math.pow(1 - x, 3);
const gobba = (x) => Math.sin(Math.PI * clamp(x));
const lerp = (a, b, x) => a + (b - a) * x;
function bezier(p0, c1, c2, p3, x) {
  const u = 1 - x;
  return [
    u * u * u * p0[0] + 3 * u * u * x * c1[0] + 3 * u * x * x * c2[0] + x * x * x * p3[0],
    u * u * u * p0[1] + 3 * u * u * x * c1[1] + 3 * u * x * x * c2[1] + x * x * x * p3[1],
  ];
}

// --- Le icone
const MONETA = `<svg class="moneta" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#ffc83d"/><circle cx="12" cy="12" r="7.4" fill="none" stroke="#a86b00" stroke-width="1.8"/><path d="M12 7.8v8.4M9.6 9.8h4.8" stroke="#a86b00" stroke-width="2" stroke-linecap="round"/></svg>`;
const SPUNTA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5L19.5 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="square"/></svg>`;
const STEMMA = (colore) => `<i class="stemma" style="background:${colore}"></i>`;
// Il martello di lato, piatto: il manico va a destra fino al perno (220, 55), la faccia che
// batte è sotto la testa, in (40, 110)
const MARTELLO = `<svg viewBox="0 0 236 126" aria-hidden="true">
  <rect x="66" y="53" width="166" height="16" fill="#1a1ab0"/>
  <rect x="60" y="47" width="166" height="16" fill="#ffffff"/>
  <rect x="16" y="6" width="60" height="110" fill="#1a1ab0"/>
  <rect x="10" y="0" width="60" height="110" fill="#ffffff"/>
  <rect x="10" y="16" width="60" height="12" fill="#6edb7e"/>
  <rect x="10" y="82" width="60" height="12" fill="#6edb7e"/>
</svg>`;

function carta() {
  return `
    <div class="raggi" id="raggi"></div>
    <div class="carta" id="carta">
      <div class="banda"><span class="ruolo">A</span><span class="biglietto">1x</span><span class="maglia">9</span></div>
      <div class="corpo">
        <div class="nome">Rossetti</div>
        <div class="offerta"><span class="etichetta offerta-in" id="offerta">${MONETA}<span class="cifra tnum" id="cifra">1</span></span></div>
        <div class="anello" id="anello">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="10"/>
            <circle id="arco" cx="50" cy="50" r="42" fill="none" stroke="#ffffff" stroke-width="10" stroke-dasharray="263.89" stroke-dashoffset="0" transform="rotate(-90 50 50)"/>
          </svg>
          <span class="secondi tnum" id="secondi">3.0</span>
          <span class="anello-spunta" id="anello-spunta">${SPUNTA}</span>
        </div>
        <div class="classifica">
          ${[0, 1, 2].map((k) => `<div class="posto-cl" id="cl-${k}"><b>${k + 1}</b><span class="cl-in" id="cl-in-${k}"><span class="cl-nome" id="cl-nome-${k}"></span><span class="cl-cifra tnum" id="cl-cifra-${k}"></span></span></div>`).join("")}
        </div>
      </div>
    </div>`;
}

function telefono(i) {
  const s = SQUADRE[i];
  const righe = [
    ["P", 3, 2],
    ["D", 5, 3],
    ["C", 5, 2],
    ["A", 4, 1],
  ];
  const rosa = righe
    .map(([r, n, pieni]) => {
      let caselle = "";
      for (let k = 0; k < n; k++) {
        const nuovo = r === "A" && k === pieni;
        caselle += `<i class="${k < pieni ? "pieno" : ""}"${nuovo ? ` id="nuovo-${i}"` : ""}>${nuovo ? `<span id="nuovo9-${i}">9</span>` : ""}</i>`;
      }
      return `<div class="riga"><b>${r}</b>${caselle}</div>`;
    })
    .join("");
  return `
    <div class="tel" id="tel-${i}">
      <div class="schermo">
        <div class="isola"></div>
        <div class="tel-testa">${STEMMA(s.colore)}<span>${s.nome}</span></div>
        <div class="tel-asta" id="tel-asta-${i}">
          <div class="tel-lotto"><span class="ruolo">A</span><span class="tel-nome">Rossetti</span></div>
          <div class="tel-cifra tnum" id="tcifra-${i}">1</div>
          <div class="pillola"><i id="pill-${i}"></i></div>
          <div class="tasto" id="tasto-${i}">
            <div class="onda" id="onda-${i}"></div>
            <div class="tasto-in">
              <div class="tasto-on" id="ton-${i}">${MONETA}<span class="tnum" id="tnum-${i}">2</span></div>
              <div class="tasto-testa" id="ttesta-${i}">${SPUNTA}</div>
            </div>
          </div>
        </div>
        <div class="rosa" id="rosa-${i}">${rosa}</div>
      </div>
      <div class="meno etichetta" id="meno-${i}">${MONETA}<span class="tnum">-32</span></div>
    </div>`;
}

export function monta(radice, cfg) {
  radice.dataset.forma = cfg.forma;
  radice.innerHTML = `
    <div class="posto" id="posto-carta">${carta()}</div>
    ${SQUADRE.map((_, i) => `<div class="posto" id="posto-tel-${i}">${telefono(i)}</div>`).join("")}
    ${RILANCI.map((r, k) => `<div class="gettone etichetta" id="gettone-${k}">${STEMMA(SQUADRE[r.s].colore)}${MONETA}<span class="tnum">${r.v}</span></div>`).join("")}
    <div class="colpo" id="colpo"></div>
    <div class="martello" id="martello">${MARTELLO}</div>`;
  const $ = (id) => document.getElementById(id);

  // I posti fissi (left/top non si animano: si muove solo il transform dei figli)
  const pc = $("posto-carta");
  pc.style.left = cfg.carta.x + "px";
  pc.style.top = cfg.carta.y + "px";
  cfg.telefoni.forEach((p, i) => {
    const el = $("posto-tel-" + i);
    el.style.left = p.x + "px";
    el.style.top = p.y + "px";
  });

  const el = {
    carta: $("carta"),
    raggi: $("raggi"),
    cifra: $("cifra"),
    offerta: $("offerta"),
    arco: $("arco"),
    secondi: $("secondi"),
    spunta: $("anello-spunta"),
    cl: [0, 1, 2].map((k) => ({ box: $("cl-" + k), dentro: $("cl-in-" + k), nome: $("cl-nome-" + k), cifra: $("cl-cifra-" + k) })),
    gettoni: RILANCI.map((_, k) => $("gettone-" + k)),
    colpo: $("colpo"),
    martello: $("martello"),
    tel: SQUADRE.map((_, i) => ({
      tel: $("tel-" + i),
      asta: $("tel-asta-" + i),
      cifra: $("tcifra-" + i),
      pill: $("pill-" + i),
      tasto: $("tasto-" + i),
      onda: $("onda-" + i),
      on: $("ton-" + i),
      num: $("tnum-" + i),
      testa: $("ttesta-" + i),
      rosa: $("rosa-" + i),
      nuovo: $("nuovo-" + i),
      nuovo9: $("nuovo9-" + i),
      meno: $("meno-" + i),
    })),
  };
  const CIRC = 263.89;
  const testo = (nodo, v) => {
    const s = String(v);
    if (nodo.textContent !== s) nodo.textContent = s;
  };

  // Le misure, una volta sola, con tutto nella posizione di riposo
  const base = radice.getBoundingClientRect();
  const centro = (n) => {
    const r = n.getBoundingClientRect();
    return [r.left - base.left + r.width / 2, r.top - base.top + r.height / 2];
  };
  let mis = null;
  function misura() {
    mis = {
      carta: centro(el.carta),
      cifra: centro(el.offerta),
      tasti: el.tel.map((x) => centro(x.tasto)),
      nuovo: el.tel.map((x) => centro(x.nuovo)),
    };
  }

  function offertaA(t) {
    let o = { v: 1, s: -1, k: -1 };
    if (t >= RIENTRO[0]) return o;
    RILANCI.forEach((r, k) => {
      if (r.t <= t) o = { v: r.v, s: r.s, k };
    });
    return o;
  }
  // La classifica dei rilanci: per ogni squadra la sua offerta più alta, dalla più alta
  function classificaA(t) {
    const meglio = {};
    if (t < RIENTRO[0]) {
      RILANCI.forEach((r) => {
        if (r.t <= t) meglio[r.s] = Math.max(meglio[r.s] ?? 0, r.v);
      });
    }
    return Object.keys(meglio)
      .map((s) => ({ s: Number(s), v: meglio[s] }))
      .sort((a, b) => b.v - a.v);
  }

  function render(t) {
    const o = offertaA(t);
    const venduto = t >= COLPO && t < RIENTRO[0];

    // --- La carta: il countdown, l'offerta, la classifica
    let secondi = TIMER;
    if (t < COLPO) {
      const via = o.k >= 0 ? RILANCI[o.k].t : 0;
      secondi = clamp(TIMER - (t - via), 0, TIMER);
    } else if (t < RIENTRO[0]) secondi = 0;
    const colore = venduto ? "#6edb7e" : secondi > 1.5 ? "#ffffff" : secondi > 0.75 ? "#ffc83d" : "#ff4d6d";
    el.arco.setAttribute("stroke", colore);
    el.arco.setAttribute("stroke-dashoffset", (venduto ? 0 : CIRC * (1 - secondi / TIMER)).toFixed(2));
    testo(el.secondi, secondi.toFixed(1));
    el.secondi.style.color = colore;
    el.secondi.style.opacity = venduto ? 0 : 1;
    el.spunta.style.opacity = venduto ? seg(t, COLPO, COLPO + 0.15) : 0;
    testo(el.cifra, o.v);
    el.carta.classList.toggle("venduto", venduto);
    let spinta = 0;
    if (o.k >= 0) spinta = gobba(seg(t, RILANCI[o.k].t, RILANCI[o.k].t + 0.35));
    if (venduto) spinta = Math.max(spinta, gobba(seg(t, COLPO, COLPO + 0.4)));
    el.offerta.style.transform = `scale(${(1 + 0.14 * spinta).toFixed(4)})`;
    // La classifica gira come un tabellone quando arriva un rilancio
    const ora = classificaA(t);
    const giro = o.k >= 0 ? seg(t, RILANCI[o.k].t, RILANCI[o.k].t + 0.3) : 1;
    const prima = o.k >= 0 ? classificaA(RILANCI[o.k].t - 0.001) : ora;
    el.cl.forEach((c, k) => {
      const nuova = ora[k];
      const vecchia = prima[k];
      const cambia = (nuova?.s !== vecchia?.s || nuova?.v !== vecchia?.v) && giro < 1;
      const mostra = cambia && giro < 0.5 ? vecchia : nuova;
      testo(c.nome, mostra ? SQUADRE[mostra.s].nome : "");
      testo(c.cifra, mostra ? mostra.v : "");
      const sy = cambia ? Math.abs(Math.cos(Math.PI * giro)) : 1;
      c.dentro.style.transform = `scaleY(${sy.toFixed(4)})`;
      c.box.classList.toggle("vuoto", !mostra);
    });

    // La carta: il colpo, il volo nella rosa, il rientro
    let cx = 0, cy = 0, cs = 1, co = 1, cr = 0;
    if (t >= COLPO && t < VOLO[0]) cs = 1 + 0.035 * gobba(seg(t, COLPO, COLPO + 0.3));
    if (t >= VOLO[0] && t < VOLO[1]) {
      const p = dentroFuori(seg(t, VOLO[0], VOLO[1]));
      const a = mis.carta;
      const b = mis.nuovo[VINCE];
      const [x, y] = bezier(a, cfg.volo[0], cfg.volo[1], b, p);
      cx = x - a[0];
      cy = y - a[1];
      cs = lerp(1, cfg.voloScala, fuori(p));
      cr = -8 * Math.sin(Math.PI * p);
      co = 1 - seg(p, 0.88, 1);
    }
    if (t >= VOLO[1] && t < RIENTRO[0]) co = 0;
    if (t >= RIENTRO[0] && t < RIENTRO[1]) {
      const p = fuori(seg(t, RIENTRO[0], RIENTRO[1]));
      co = p;
      cs = lerp(0.92, 1, p);
      cy = lerp(28, 0, p);
    }
    el.carta.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px) rotate(${cr.toFixed(3)}deg) scale(${cs.toFixed(4)})`;
    el.carta.style.opacity = co.toFixed(4);
    el.raggi.style.opacity = (0.9 * gobba(seg(t, COLPO, COLPO + 1.1))).toFixed(4);
    el.raggi.style.transform = `rotate(${(t * 14).toFixed(2)}deg)`;

    // --- Il martello e il colpo
    let mo = 0, mr = 48;
    if (t >= COLPO - 0.7 && t < COLPO + 0.75) {
      mo = seg(t, COLPO - 0.7, COLPO - 0.45) * (1 - seg(t, COLPO + 0.45, COLPO + 0.75));
      if (t < COLPO - 0.18) mr = lerp(70, 48, fuori(seg(t, COLPO - 0.7, COLPO - 0.4)));
      else if (t < COLPO) mr = lerp(48, 0, Math.pow(seg(t, COLPO - 0.18, COLPO), 2));
      else mr = 14 * gobba(seg(t, COLPO, COLPO + 0.5)) * (1 - seg(t, COLPO + 0.25, COLPO + 0.5));
    }
    const g = cfg.martello;
    el.martello.style.left = (g.x - 220 + 180 * g.s).toFixed(1) + "px";
    el.martello.style.top = (g.y - 55 - 55 * g.s).toFixed(1) + "px";
    el.martello.style.transform = `scale(${g.s}) rotate(${mr.toFixed(3)}deg)`;
    el.martello.style.opacity = mo.toFixed(4);
    const cp = seg(t, COLPO, COLPO + 0.55);
    el.colpo.style.left = g.x + "px";
    el.colpo.style.top = g.y + "px";
    el.colpo.style.transform = `translate(-50%, -50%) scale(${(0.4 + 1.9 * fuori(cp)).toFixed(4)})`;
    el.colpo.style.opacity = (t >= COLPO && t < COLPO + 0.55 ? 1 - cp : 0).toFixed(4);

    // --- I gettoni dei rilanci, dal telefono all'offerta
    el.gettoni.forEach((n, k) => {
      const r = RILANCI[k];
      const a0 = r.t - 0.45;
      if (t < a0 || t >= r.t) {
        n.style.opacity = 0;
        return;
      }
      const p = dentroFuori(seg(t, a0, r.t));
      const da = mis.tasti[r.s];
      const a = mis.cifra;
      const cs2 = cfg.gettone(da, a);
      const [x, y] = bezier(da, cs2[0], cs2[1], a, p);
      n.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) translate(-50%, -50%) scale(${lerp(1, 0.8, p).toFixed(4)})`;
      n.style.opacity = (seg(t, a0, a0 + 0.07) * (1 - seg(t, r.t - 0.06, r.t))).toFixed(4);
    });

    // --- I telefoni
    el.tel.forEach((x, i) => {
      const p = cfg.telefoni[i];
      const galleggia = 4 * Math.sin((2 * Math.PI * t) / DURATA + i * 2.1);
      let s = p.s;
      if (i === VINCE && t >= VOLO[1]) s *= 1 + 0.04 * gobba(seg(t, VOLO[1], VOLO[1] + 0.35));
      let mio = null;
      RILANCI.forEach((r) => {
        if (r.s === i && t >= r.t - 0.95 && t < r.t) mio = r;
      });
      const premi = mio ? gobba(seg(t, mio.t - 0.55, mio.t - 0.35)) : 0;
      x.tel.style.transform = `translateY(${galleggia.toFixed(2)}px) rotate(${p.r}deg) scale(${s.toFixed(4)})`;
      x.tel.classList.toggle("vince", i === VINCE && t >= COLPO && t < RITORNO + 0.2);
      testo(x.cifra, o.v);
      x.cifra.classList.toggle("venduto", venduto);
      // La pillola del countdown, uguale all'anello della carta
      x.pill.style.transform = `scaleX(${(venduto ? 1 : secondi / TIMER).toFixed(4)})`;
      x.pill.style.background = venduto ? "#6edb7e" : "#ff4d6d";
      // Il tasto: in testa, spento a lotto chiuso, o pronto col prossimo rilancio
      const chiuso = t >= COLPO && t < RIENTRO[0];
      const inTesta = o.s === i && !chiuso;
      let prossimo = o.v + 1;
      if (mio) prossimo = Math.round(lerp(o.v + 1, mio.v, morbido(seg(t, mio.t - 0.95, mio.t - 0.55))));
      testo(x.num, prossimo);
      x.on.style.opacity = inTesta ? 0 : 1;
      x.testa.style.opacity = inTesta ? 1 : 0;
      x.tasto.classList.toggle("spento", chiuso || inTesta);
      x.tasto.style.transform = `scale(${(1 - 0.08 * premi).toFixed(4)})`;
      const on = mio ? seg(t, mio.t - 0.5, mio.t - 0.05) : 1;
      x.onda.style.transform = `scale(${(1 + 0.45 * fuori(on)).toFixed(4)})`;
      x.onda.style.opacity = (mio && t >= mio.t - 0.5 ? 0.9 * (1 - on) : 0).toFixed(4);
      // La rosa di chi vince
      const r = i === VINCE ? seg(t, VOLO[0] - 0.25, VOLO[0] + 0.05) * (1 - seg(t, RITORNO, RITORNO + 0.3)) : 0;
      x.rosa.style.opacity = r.toFixed(4);
      x.asta.style.opacity = (1 - r).toFixed(4);
      if (x.nuovo) {
        const f = i === VINCE ? seg(t, VOLO[1] - 0.08, VOLO[1] + 0.15) : 0;
        x.nuovo.style.background = f > 0 ? `rgba(110, 219, 126, ${f.toFixed(3)})` : "";
        x.nuovo9.style.opacity = f.toFixed(3);
        x.nuovo.style.transform = `scale(${(1 + 0.45 * gobba(f)).toFixed(4)})`;
      }
      const m = i === VINCE ? seg(t, VOLO[1], VOLO[1] + 1.0) : 0;
      x.meno.style.opacity = (m > 0 ? gobba(m) : 0).toFixed(4);
      x.meno.style.transform = `translate(-50%, ${(-30 * fuori(m)).toFixed(2)}px)`;
    });
  }

  return { render, misura };
}
