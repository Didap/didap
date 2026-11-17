
      // Il profilo che entra, comune a profilo e profilo-mobile. o: pannelli (i contenitori blu),
      // rullo (la colonna che scorre), corsa (di quanto sale), scorre [inizio, durata], esce.
      const profiloEntra = (tl, o) => {
        const EASE = 'expo.out';
        const entra = (sel, at, dy = 40) => {
          gsap.set(sel, { opacity: 0 });
          tl.fromTo(sel, { opacity: 0, y: dy }, { opacity: 1, y: 0, duration: 0.7, ease: EASE, immediateRender: false }, at);
        };
        const parole = (sel, at, passo) => {
          const w = document.querySelectorAll(sel);
          gsap.set(w, { opacity: 0 });
          w.forEach((el, i) => tl.fromTo(el, { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.16, ease: 'power4.out', immediateRender: false }, at + i * passo));
        };
        o.pannelli.forEach((p, i) => entra(p, 0.2 + i * 0.2, 80));
        entra('#p-testa', 0.55, 20);
        entra('#p-cerco', 0.75);
        parole('#p-cerco .w', 1.0, 0.06);
        document.querySelectorAll('#p-sapere, #p-sapere .riga').forEach((el, i) => entra(el, 1.5 + i * 0.09, 24));
        entra('#p-flag-b', 2.45);
        parole('#p-flag-b .r', 2.6, 0.1);
        entra('#p-comp', 3.0);
        document.querySelectorAll('#p-comp .chips span').forEach((el, i) => {
          gsap.set(el, { opacity: 0 });
          tl.fromTo(el, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.45, ease: EASE, immediateRender: false }, 3.2 + i * 0.07);
        });
        entra('#p-meglio', 3.8);
        entra('#p-prog', 4.3);
        gsap.set('#p-foto', { clipPath: 'inset(100% 0% 0% 0%)' });
        tl.fromTo('#p-foto', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power3.out', immediateRender: false }, 4.5);
        entra('#p-tasti', 4.8, 24);
        // La colonna scorre fino ai bottoni, poi helllo!
        tl.fromTo(o.rullo, { y: 0 }, { y: -o.corsa, duration: o.scorre[1], ease: 'sine.inOut', immediateRender: false }, o.scorre[0]);
        const premi = o.scorre[0] + o.scorre[1] + 0.35;
        tl.fromTo('#p-helllo', { scale: 1 }, { scale: 0.9, duration: 0.1, ease: 'power2.out', immediateRender: false }, premi);
        tl.to('#p-helllo', { scale: 1, duration: 0.35, ease: EASE }, premi + 0.1);
        // Esce tutto e si torna al fondo vuoto del primo fotogramma
        o.pannelli.forEach((p, i) => tl.to(p, { opacity: 0, y: 50, duration: 0.45, ease: 'power3.in' }, o.esce + i * 0.1));
        tl.set(o.rullo, { y: 0 }, o.esce + 0.8);
        tl.set({}, {}, 12);
      };
