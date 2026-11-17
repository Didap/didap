
      // Il match che entra (scopri-schermo) o già fermo (match-schermo). Servono write, fall e
      // FRAME della parte pen, con i set mb (le lll celesti dietro le carte) e mw (lo sticker).
      const MATCH_FALLS = ['#ms-pill', '#ms-h', '#ms-e', '#ms-o', '#ms-x', '#m-luca-in', '#m-nord-in', '#m-ruolo', '#m-c1', '#m-c2', '#m-c3'];
      const MATCH_FADES = ['#m-t1', '#m-t2', '#m-campo', '#m-fissa', '#m-continua', '#m-badge'];
      // Tutto fermo, come a fine entrata
      const matchFermo = () => {
        gsap.set(['#mb', '#mw'], { opacity: 1 });
        gsap.set(['#mb-pen', '#mw-pen'], { opacity: 0 });
      };
      // Lo stato prima dell'entrata, all'inizio della timeline
      const matchVuoto = (tl) => {
        const hide = [...MATCH_FALLS, ...MATCH_FADES, '#mb', '#mw'];
        gsap.set(hide, { opacity: 0 });
        gsap.set(['#mb-pen', '#mw-pen'], { opacity: 0 });
        tl.set(hide, { opacity: 0 }, 0);
        tl.set(['#mb-pen', '#mw-pen'], { opacity: 0 }, 0);
      };
      // L'entrata, in 3.4 s da at: le lll celesti si scrivono, le carte cadono, poi lo
      // sticker con le sue lll, le frasi e le domande rompighiaccio
      const matchEntra = (tl, at) => {
        write(tl, 'mb', at, 1.4);
        fall(tl, '#m-luca-in', at + 0.15, -30);
        fall(tl, '#m-nord-in', at + 0.3, 30);
        tl.set('#m-badge', { opacity: 1 }, at + 0.5);
        tl.fromTo('#m-badge', { scale: 0.4 }, { scale: 1, duration: 0.35, ease: 'expo.out', immediateRender: false }, at + 0.5);
        fall(tl, '#m-ruolo', at + 0.6, -30);
        fall(tl, '#ms-pill', at + 0.55, -30);
        fall(tl, '#ms-h', at + 0.75, 30);
        fall(tl, '#ms-e', at + 0.85, -30);
        write(tl, 'mw', at + 1.0, 1.4);
        fall(tl, '#ms-o', at + 2.3, 30);
        fall(tl, '#ms-x', at + 2.45, -30);
        ['#m-t1', '#m-t2'].forEach((s, i) => {
          tl.fromTo(s, { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.2, ease: 'power4.out', immediateRender: false }, at + 1.9 + i * 0.12);
        });
        ['#m-c1', '#m-c2', '#m-c3'].forEach((s, i) => fall(tl, s, at + 2.5 + i * 0.1, i % 2 ? 30 : -30));
        ['#m-campo', '#m-fissa', '#m-continua'].forEach((s, i) => {
          tl.fromTo(s, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', immediateRender: false }, at + 2.85 + i * 0.08);
        });
      };
