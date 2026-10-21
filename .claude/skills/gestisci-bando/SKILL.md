---
name: gestisci-bando
description: Lavora un bando esportato dal radar bandi di Didap (file bando-*.md con front matter YAML, bottone "Esporta per Claude" nella scheda del bando). Usala quando ti chiedono di gestire, preparare o valutare un bando, o di fare prototipi e documentazione per candidarsi.
---

# Gestire un bando

Il radar bandi (`/admin/bandi`) esporta ogni bando in un file `bando-<titolo>.md`:

- in testa, un front matter YAML con titolo, ente, fonte, url, apertura, scadenza, importo massimo, agevolazione, esito per Didap, giudizio del modello, requisiti (con esito, motivo, citazione e pagina), presentazione (piattaforma e documenti con formato) e il profilo dell'azienda;
- sotto, il riassunto, cosa fare e il testo completo del bando (pagina e PDF, con i marcatori `[[file | pagina N]]`).

I dati del front matter sono estratti in automatico: quando non tornano, vale il testo del bando.

## Come procedere

1. Chiedi il file se non te l'hanno dato (di solito sta in `bandi/` nella root del repo, che git ignora).
2. Leggi tutto il file. Riassumi in poche righe: cosa finanzia, quanto, entro quando, se Didap può candidarsi e cosa resta da verificare. Cita la pagina del bando per ogni requisito critico.
3. Crea la cartella di lavoro `bandi/<nome del file senza .md>/` e scrivi lì:
   - `checklist.md`: documenti da presentare con formato e firma, scadenze, requisiti da dimostrare e chi deve fornire cosa;
   - quello che ti chiedono: bozza della domanda o del progetto (sezioni e criteri di valutazione del bando), prototipo, documentazione tecnica, piano dei costi dentro le spese ammesse.
4. Non inventare dati di Didap (fatturato, dipendenti, ATECO, bilanci): se mancano nel profilo, lasciali come segnaposto evidenti e mettili in checklist.
5. Alla fine, elenca cosa hai prodotto e cosa serve da una persona (firme, visure, preventivi, accesso alla piattaforma).
