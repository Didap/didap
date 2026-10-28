import { MAX_TOOL_TEXT } from './mcp-bandi'

// Testi del connettore MCP che Claude legge: istruzioni del server,
// descrizioni degli strumenti e prompt "Prepara la candidatura". Scritti a
// partire dalla skill gestisci-bando.

// Claude lavora solo su bozze che stanno in una risposta: rilegge e riscrive
// sempre il testo intero, e un testo arrivato a metà gli farebbe cancellare la
// coda. Il pannello arriva a MAX_DRAFT_CHARS.
const DRAFT_LIMIT = MAX_TOOL_TEXT.toLocaleString('it-IT')

export const MCP_DRAFT_TOO_LONG = `La bozza supera ${DRAFT_LIMIT} caratteri: lavorala nel pannello.`
export const MCP_TEXT_TOO_LONG = `Il testo supera ${DRAFT_LIMIT} caratteri: Claude lavora su bozze più corte. Accorcialo o lavoralo nel pannello.`

export const MCP_INSTRUCTIONS = [
  'Sei collegato al radar bandi di Didap: bandi pubblici e agevolazioni per l\'azienda, con la valutazione fatta sul profilo dell\'azienda.',
  'Rispondi in italiano, con frasi semplici e brevi, adatte a chi non è esperto di bandi.',
  'Non inventare mai dati dell\'azienda (fatturato, dipendenti, codice ATECO, bilanci): prendili da profilo_azienda e, se mancano, lascia un segnaposto [DA COMPLETARE: ...] che dica cosa serve e dillo alla persona.',
  'Per ogni requisito critico cita la pagina del bando, con il riferimento [[file | pagina N]] che trovi nel testo.',
  'I dati estratti dal radar (scadenze, importi, requisiti) sono automatici: quando non tornano con il testo del bando, vale il testo del bando.',
  'Prima di cambiare una bozza che c\'è già, leggila con leggi_bozza e parti da quel testo: tieni le correzioni fatte a mano dalle persone, non riscriverla da capo.',
  'Se salva_bozza risponde che la bozza è cambiata, rileggila con leggi_bozza e riapplica le tue modifiche sul testo nuovo.',
  `Lavori solo su bozze fino a ${DRAFT_LIMIT} caratteri: una bozza più lunga si lavora nel pannello, e non la puoi né leggere né salvare.`,
  'Prima di usare uno strumento che scrive (segna_interessante, crea_cartella_bando, salva_bozza) chiedi conferma alla persona e aspetta la risposta.',
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
    description: 'Il bando completo: dati estratti in YAML (requisiti con pagina, documenti, profilo) e sotto il testo della pagina e dei PDF, con i marcatori [[file | pagina N]]. Un testo lungo arriva a parti di 60.000 caratteri, con in testa "Parte X di Y": la parte 1 ha già i dati estratti, spesso basta quella.',
    args: { id: 'Id del bando, da cerca_bandi.', parte: 'Quale parte del testo leggere, da 1. Senza, la parte 1.' },
  },
  profilo_azienda: {
    title: 'Profilo dell\'azienda',
    description: 'Il profilo dell\'azienda usato per valutare i bandi: forma giuridica, ATECO, provincia, fatturato, dipendenti e gli altri dati inseriti nel pannello. I campi vuoti sono dati che mancano.',
  },
  elenca_cartella: {
    title: 'Elenca la cartella del bando',
    description: 'Cartelle e file della cartella di lavoro di un bando, con id, nome, tipo, dimensione e chi li ha caricati (uploadedBy). I file con uploadedBy vuoto li ha messi il radar: sono il testo e i PDF del bando, che leggi_bando ha già. Serve che il bando abbia la cartella (crea_cartella_bando).',
    args: { id: 'Id del bando.' },
  },
  leggi_file: {
    title: 'Leggi un file della cartella',
    description: 'Un file della cartella del bando: testo, PDF pagina per pagina con i marcatori [[file | pagina N]], immagini fino a 3,5 MB. Un testo lungo arriva a parti di 60.000 caratteri, con in testa "Parte X di Y". Gli altri tipi sono solo descritti: si aprono dal pannello.',
    args: { id: 'Id del bando.', file_id: 'Id del file, da elenca_cartella.', parte: 'Quale parte del testo leggere, da 1. Senza, la parte 1.' },
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
  leggi_bozza: {
    title: 'Leggi la bozza della candidatura',
    description: `La bozza della domanda per il bando, quella della scheda Bozza nel pannello: testo in Markdown, versione, data dell'ultimo salvataggio, chi l'ha salvata e se l'ha fatto tramite Claude. Le persone la correggono anche a mano: leggila prima di cambiarla e passa la sua versione a salva_bozza. Lavori solo su bozze fino a ${DRAFT_LIMIT} caratteri: di una bozza più lunga dice solo chi l'ha salvata e quando, senza testo né versione, e va lavorata nel pannello.`,
    args: { id: 'Id del bando.' },
  },
  salva_bozza: {
    title: 'Salva la bozza della candidatura',
    description: `Salva il testo intero della bozza della domanda (Markdown, al massimo ${DRAFT_LIMIT} caratteri) nella scheda Bozza del bando, al posto di quello di prima. Lavori solo su bozze fino a ${DRAFT_LIMIT} caratteri: non tocca una bozza salvata più lunga, che si lavora nel pannello. Indica la versione da cui parti, letta con leggi_bozza; senza versione vale solo per la prima bozza. Se nel frattempo qualcuno ha salvato, non scrive niente: rileggi con leggi_bozza e riapplica le modifiche. Se il bando non ha la cartella, la crea come crea_cartella_bando e segna il bando come interessante. Chiedi conferma prima di usarlo.`,
    args: {
      id: 'Id del bando.',
      testo: 'Il testo intero della bozza in Markdown, non solo le parti cambiate.',
      versione: 'La versione da cui parti, da leggi_bozza. Senza, solo se il bando non ha ancora una bozza.',
    },
  },
} as const

export const MCP_PROMPT = {
  title: 'Prepara la candidatura',
  description: 'Scrive la bozza della domanda per un bando del radar, come se Didap si candidasse, e la salva nella scheda Bozza del pannello.',
  arg: 'Id o titolo del bando.',
}

export function mcpApplicationPrompt(bando: string): string {
  return [
    `Voglio candidare Didap a questo bando: ${bando}`,
    '',
    'Se è un titolo e non un id, trova il bando con cerca_bandi (anche con fuori_dalla_ricerca). Poi:',
    '1. Leggi il bando con leggi_bando, a parti se è lungo (la parte 1 ha già requisiti, documenti e scadenze), e il profilo con profilo_azienda.',
    '2. Se il bando ha la cartella, guarda i file con elenca_cartella e leggi con leggi_file solo quelli caricati dalle persone, cioè con uploadedBy: quelli messi dal radar sono già nel testo del bando.',
    '3. Dimmi in poche righe se Didap può candidarsi e cosa resta da verificare, citando la pagina del bando per ogni requisito critico.',
    '4. Guarda con leggi_bozza se c\'è già una bozza: se c\'è, parti da quella e tieni le correzioni fatte a mano dalle persone.',
    '5. Scrivi la bozza della domanda in Markdown come se Didap si candidasse, seguendo la struttura e i criteri di valutazione del bando: se il bando dà un modulo o un indice, segui quello. Altrimenti usa queste sezioni: presentazione dell\'azienda (dal profilo), progetto, obiettivi, attività e tempi, piano dei costi (solo spese ammesse dal bando), risultati attesi.',
    '6. In fondo alla bozza metti la sezione "Da completare": i dati che mancano, i documenti da allegare con formato e firma richiesti, la piattaforma dove si presenta la domanda e le scadenze.',
    '7. Non inventare dati dell\'azienda: dove manca un dato scrivi un segnaposto [DA COMPLETARE: ...] che dica cosa serve.',
    '8. Chiedimi conferma, poi salva la bozza con salva_bozza, con la versione letta da leggi_bozza (senza versione se è la prima bozza).',
    '9. Dimmi qui in chat cosa hai scritto e cosa resta da fare a una persona (firme, visure, preventivi, accesso alla piattaforma).',
  ].join('\n')
}
