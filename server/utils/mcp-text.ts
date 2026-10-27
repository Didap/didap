// Testi del connettore MCP che Claude legge: istruzioni del server,
// descrizioni degli strumenti e prompt "Come candidarsi". Scritti a partire
// dalla skill gestisci-bando.

export const MCP_INSTRUCTIONS = [
  'Sei collegato al radar bandi di Didap: bandi pubblici e agevolazioni per l\'azienda, con la valutazione fatta sul profilo dell\'azienda.',
  'Rispondi in italiano, con frasi semplici e brevi, adatte a chi non è esperto di bandi.',
  'Non inventare mai dati dell\'azienda (fatturato, dipendenti, codice ATECO, bilanci): prendili da profilo_azienda e, se mancano, dillo e scrivi quali servono.',
  'Per ogni requisito critico cita la pagina del bando, con il riferimento [[file | pagina N]] che trovi nel testo.',
  'I dati estratti dal radar (scadenze, importi, requisiti) sono automatici: quando non tornano con il testo del bando, vale il testo del bando.',
  'Prima di usare segna_interessante o crea_cartella_bando chiedi conferma alla persona e aspetta la risposta.',
].join('\n')

export const MCP_TOOLS = {
  cerca_bandi: {
    title: 'Cerca bandi',
    description: 'Cerca i bandi del radar con la ricerca salvata nel pannello e la valutazione sul profilo dell\'azienda. Senza filtri restituisce i candidabili e quelli da verificare, al massimo 50 (`altri` conta il resto). Restituisce id, titolo, ente, esito, scadenza, importo e se il bando ha già la cartella.',
    args: {
      esito: 'Esiti da includere. Senza, candidabile e da_verificare.',
      solo_interessanti: 'Solo i bandi segnati come interessanti.',
      scadenza_entro_giorni: 'Solo i bandi che scadono entro questi giorni (da 1 a 365).',
      testo: 'Parole da cercare in titolo, ente e sintesi.',
      fuori_dalla_ricerca: 'Includi anche i bandi fuori dalla ricerca salvata (altre fonti o province).',
    },
  },
  leggi_bando: {
    title: 'Leggi un bando',
    description: 'Il bando completo: dati estratti in YAML (requisiti con pagina, documenti, profilo) e sotto il testo della pagina e dei PDF, con i marcatori [[file | pagina N]].',
    args: { id: 'Id del bando, da cerca_bandi.' },
  },
  profilo_azienda: {
    title: 'Profilo dell\'azienda',
    description: 'Il profilo dell\'azienda usato per valutare i bandi: forma giuridica, ATECO, provincia, fatturato, dipendenti e gli altri dati inseriti nel pannello. I campi vuoti sono dati che mancano.',
  },
  elenca_cartella: {
    title: 'Elenca la cartella del bando',
    description: 'Cartelle e file della cartella di lavoro di un bando, con id, nome, tipo e dimensione. Serve che il bando abbia la cartella (crea_cartella_bando).',
    args: { id: 'Id del bando.' },
  },
  leggi_file: {
    title: 'Leggi un file della cartella',
    description: 'Un file della cartella del bando: testo, PDF pagina per pagina con i marcatori [[file | pagina N]], immagini. Gli altri tipi sono solo descritti: si aprono dal pannello.',
    args: { id: 'Id del bando.', file_id: 'Id del file, da elenca_cartella.' },
  },
  segna_interessante: {
    title: 'Segna come interessante',
    description: 'Segna un bando come interessante (o lo toglie) nel radar, come il cuore nel pannello. Chiedi conferma prima di usarlo.',
    args: { id: 'Id del bando.', interessante: 'true per segnarlo, false per toglierlo.' },
  },
  crea_cartella_bando: {
    title: 'Crea la cartella del bando',
    description: 'Crea la cartella di lavoro del bando nel pannello e ci scarica il testo e i PDF della pagina del bando (servono alcuni secondi). Segna anche il bando come interessante. Chiedi conferma prima di usarlo.',
    args: { id: 'Id del bando.' },
  },
} as const

export const MCP_PROMPT = {
  title: 'Come candidarsi a un bando',
  description: 'Passi, documenti e scadenze per candidarsi a un bando del radar.',
  arg: 'Id o titolo del bando.',
}

export function mcpApplicationPrompt(bando: string): string {
  return [
    `Voglio candidare Didap a questo bando: ${bando}`,
    '',
    'Se è un titolo e non un id, trova il bando con cerca_bandi (anche con fuori_dalla_ricerca). Poi:',
    '1. Leggi il bando con leggi_bando e il profilo con profilo_azienda. Se il bando ha la cartella, leggi anche i PDF con elenca_cartella e leggi_file.',
    '2. Dimmi in poche righe se Didap può candidarsi e cosa resta da verificare, citando la pagina del bando per ogni requisito critico.',
    '3. Dammi i passi della candidatura in ordine: la piattaforma dove si presenta, i documenti da preparare con formato e firma richiesti, le scadenze e chi deve fornire cosa (l\'azienda, il commercialista, altri).',
    '4. Aggiungi i consigli che contano per i criteri di valutazione del bando.',
    '',
    'Rispondi qui in chat: i documenti li preparo io. Se nel profilo mancano dati che servono, dimmi quali.',
  ].join('\n')
}
