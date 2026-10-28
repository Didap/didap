# Connettore MCP per i bandi

Data: 2026-10-27. Stato: bozza da approvare.

## Perché

Il radar bandi l'ha voluto William, e lui "vuole mcp". La richiesta di Alessandro, con le sue parole: "io collego mcp e dal mio claude ti chiedo dimmi bandi interessanti, e poi se me ne interessa qualcuno ti dico di aiutarmi a candidarmi". Alessandro non lo usa in prima persona, lo useranno i titolari di Didap.

Il 2026-10-27 Alessandro ha chiarito cosa deve fare, in breve: "claude ti trova i bandi interessanti e ti consiglia come candidarti semplicemente". Poi, nello stesso giorno, ha rettificato: "l'mcp deve produrre una bozza come se dovesse candidarsi al bando, quella bozza deve essere modificabile". Ha approvato questa forma: Claude salva la bozza nel pannello, in una scheda "Bozza" del bando; la persona la corregge lì; dalla chat si può chiedere a Claude di rileggerla e cambiarla, senza perdere le modifiche fatte a mano.

Oggi per parlare di un bando con Claude bisogna esportare un file dal pannello ("Esporta per Claude") e passarlo a Claude. Con il connettore Claude legge il radar da solo.

Le due basi sono pronte nella PR #15: gli account personali (il login del connettore usa quelli) e la cartella del bando su Cloudinary (Claude legge i PDF del bando che ci sono dentro).

## Obiettivi

- Un titolare aggiunge il connettore una volta al suo Claude (claude.ai sul web, l'app desktop, il telefono) ed entra con la sua email e password del pannello.
- Da lì può chiedere a Claude:
  - i bandi interessanti, con lo stesso giudizio che vede nel pannello;
  - tutto su un bando: requisiti con citazioni, documenti da presentare, testo completo;
  - di segnarlo tra gli interessanti e di creargli la cartella;
  - di preparare la candidatura: Claude legge il bando, i file della cartella e il profilo dell'azienda e scrive la bozza della domanda come se Didap dovesse candidarsi, salvata nella scheda "Bozza" del bando;
  - di rileggere e cambiare la bozza, anche dopo che una persona l'ha corretta nel pannello.
- Nel pannello, la scheda "Bozza" del bando mostra la bozza in un editor di testo: chi ha la pagina Bandi la modifica e la salva.
- Vale solo per chi ha la pagina Bandi. Togliere la pagina, disattivare la persona o cambiarle la password toglie l'accesso anche al suo Claude, dalla richiesta successiva.

## Non obiettivi

Concordati il 2026-10-26, quando Alessandro ha approvato la proposta:

- Claude non avvia import, non cancella bandi e non cambia le impostazioni del radar. Queste cose restano solo nel pannello.

Scelte mie:

- Claude non elimina, non sposta, non rinomina e non carica file nella cartella: lì legge soltanto. Scrive solo la bozza. Così un errore di Claude non può far perdere file.
- Una sola bozza per bando, condivisa da chi ha la pagina Bandi. Niente cronologia delle versioni, niente esportazione in Word, niente modifica in due nello stesso momento (vedi "Bozza della candidatura" per come si evita di sovrascrivere).
- Nessuna pubblicazione nella directory dei connettori di Anthropic: il connettore si aggiunge come connettore personalizzato, con l'indirizzo.
- Niente chiave API fissa al posto del login: ogni persona entra con il suo account, così si sa chi ha fatto cosa e si può togliere l'accesso a una persona sola.
- Nessuna altra pagina del pannello nel connettore (preventivi, clienti, prodotti).

## Cosa non deve succedere

- Claude che inventa dati di Didap (fatturato, dipendenti, ATECO, bilanci). Se mancano nel profilo dell'azienda, nella bozza restano segnaposto evidenti (`[DA COMPLETARE: ...]`) e finiscono nell'elenco delle cose da completare, come dice già la skill `gestisci-bando`.
- Perdere il lavoro di qualcuno sulla bozza: un salvataggio basato su una versione vecchia (Claude o un'altra persona hanno salvato nel frattempo) viene rifiutato, mai scritto sopra in silenzio.
- Un accesso che sopravvive alla persona: un token del connettore non vale più se la persona è disattivata, eliminata, ha cambiato password o non ha più la pagina Bandi.
- Un URL Cloudinary che arriva a Claude: i file passano sempre dal nostro server, come nel pannello.
- Che qualcuno registri un client OAuth con un indirizzo di ritorno suo e rubi un token: si accettano solo gli indirizzi di ritorno di Claude (sotto).

## Come si collega (lato utente)

1. In Claude, Impostazioni → Connettori → Aggiungi connettore personalizzato, con l'indirizzo `https://<dominio di Didap>/mcp`. Su un piano Team o Enterprise lo aggiunge un amministratore dell'organizzazione e i membri lo attivano.
2. Al primo uso Claude apre una finestra del pannello Didap: login con email e password (se non si è già dentro), poi una schermata "Claude vuole accedere ai bandi di Didap con il tuo account" con il nome della persona e il dominio di ritorno (`claude.ai`), e i bottoni Consenti e Annulla.
3. Fatto. Claude rinnova l'accesso da solo. Dalla pagina Account la persona vede i collegamenti attivi e può scollegarli.

Funziona anche da Claude Code (`claude mcp add --transport http didap https://<dominio>/mcp`), utile per provarlo.

## Come funziona

### Dove vive

Tutto dentro l'app Nuxt che c'è già, nessun servizio nuovo:

- `/mcp`: il server MCP, trasporto Streamable HTTP, senza stato (ogni richiesta porta il suo token). Si usa l'SDK ufficiale, versione 2 (`@modelcontextprotocol/server`).
- `/.well-known/oauth-protected-resource` e `/.well-known/oauth-authorization-server`: i documenti con cui Claude scopre come entrare.
- `/oauth/register`, `/oauth/authorize`, `/oauth/token`: il login OAuth, fatto da noi sopra gli account della PR #15.

Gli indirizzi pubblici si costruiscono da `NUXT_PUBLIC_SITE_URL`, mai dall'Host della richiesta, come per le email.

### Login OAuth

Requisiti di Claude (documentazione "Authentication for connectors" su claude.com, letta il 2026-10-27) e della specifica MCP del 2025-11-25:

- Una richiesta a `/mcp` senza token valido risponde `401` con `WWW-Authenticate: Bearer resource_metadata="<SITE_URL>/.well-known/oauth-protected-resource"`. Il `401` è obbligatorio: Claude ignora l'intestazione su un `200`.
- Il documento della risorsa ha `resource` uguale all'indirizzo `/mcp` esatto e un solo elemento in `authorization_servers` (il nostro).
- Il documento del server di autorizzazione (RFC 8414) dichiara: `registration_endpoint`, `code_challenge_methods_supported: ["S256"]`, `grant_types_supported` con `authorization_code` e `refresh_token`, `token_endpoint_auth_methods_supported: ["none"]`, `scopes_supported` con `bandi` e `offline_access`.
- **Registrazione dinamica del client (DCR, RFC 7591)** in `/oauth/register`, in JSON. Scelta mia: solo DCR, non i Client ID Metadata Document. Con CIMD il server dovrebbe scaricare documenti da indirizzi scelti dal client; per pochi utenti DCR basta e Claude lo usa quando CIMD non è dichiarato.
- **Indirizzi di ritorno accettati**, e solo questi: `https://claude.ai/api/mcp/auth_callback`, `https://claude.com/api/mcp/auth_callback` (Anthropic avvisa che potrebbe spostarsi lì) e, per Claude Code, `http://localhost:<porta>/callback` e `http://127.0.0.1:<porta>/callback` con qualsiasi porta. Una registrazione con altri indirizzi è rifiutata.
- **Autorizzazione** `/oauth/authorize`: PKCE S256 obbligatorio, parametro `resource` (se c'è) uguale all'indirizzo `/mcp`. Se la persona non è entrata, passa dal login del pannello e torna qui. Se non ha la pagina Bandi vede un messaggio chiaro e non c'è nessun Consenti. Il codice vale 1 minuto e una volta sola.
- **Token** `/oauth/token`: accetta `application/x-www-form-urlencoded`. Il token d'accesso dura 1 ora; il refresh token 30 giorni e cambia a ogni rinnovo (quello vecchio smette di valere nella stessa risposta). Un refresh token non più valido dà `invalid_grant`. Le risposte devono arrivare ben sotto i 10 secondi che Claude aspetta.
- Token e codici sono casuali e si salvano solo come hash, come i link d'invito. Limite di tentativi per IP su register, authorize e token.

### Collegamento alla persona

Ogni consenso crea un "collegamento" (persona, client, data, ultimo uso) con i suoi token. Il collegamento si chiude, e con lui tutti i token:

- quando la persona lo scollega dalla pagina Account;
- quando la persona viene disattivata o cambia password: lo fa lo stesso helper che oggi chiude sessioni e link (`revokeAccess` in `server/utils/users.ts`);
- quando le viene tolta la pagina Bandi: oggi `updateUser` chiama `revokeAccess` solo se la persona viene disattivata, va aggiunto il caso di Bandi tolto. Ridare la pagina non resuscita i vecchi collegamenti: la persona ricollega Claude. (Scelta mia: più semplice e senza token dormienti di 30 giorni.)
- quando la persona viene eliminata: `deleteUser` non chiama `revokeAccess`, quindi i collegamenti si cancellano a cascata con la persona (chiave esterna `on delete cascade`).

A ogni chiamata a `/mcp`, e a ogni rinnovo in `/oauth/token`, il server rilegge la persona: se non è attiva o non ha la pagina Bandi, `/mcp` risponde `401` (non `403`) e il rinnovo `invalid_grant`, così Claude ripropone il login invece di restare bloccato con un errore muto. (Scelta mia: con `403` Claude non sa cosa fare.)

### Strumenti per Claude

Nomi e testi in italiano, descrizioni pensate per Claude. Ogni strumento dichiara se legge o scrive (annotazioni `readOnlyHint` / `destructiveHint`), così Claude chiede conferma all'utente prima di scrivere.

Leggono:

- **cerca_bandi**: i bandi aperti valutati col profilo salvato. Di base segue la ricerca salvata nel radar, come il pannello e la mail: moduli (governo, regione, comuni), province dei comuni e "Solo digitali" (`isInScope` in `shared/radar.ts`). Così Claude non propone bandi di comuni che i titolari hanno spento apposta. Un parametro "fuori dalla ricerca" li include tutti, per quando l'utente lo chiede esplicitamente. Altri filtri: esito (candidabile, da verificare, escluso; di base tutti tranne gli esclusi), solo interessanti, scadenza entro N giorni, testo libero. Al contrario della mail, non conta se un bando è già stato mandato. (Scelte mie.) Per ogni bando: id, titolo, ente, fonte, esito con motivo, sintesi, importo massimo, agevolazione, scadenza, se è tra gli interessanti, se ha la cartella. I bandi con cartella restano anche chiusi, con "chiuso", come nel pannello.
- **leggi_bando**: tutto il bando, cioè lo stesso Markdown di "Esporta per Claude" (`grantExport`), con il profilo dell'azienda dentro. Alcuni bandi superano il milione di caratteri (pagina più PDF), troppo per una risposta: il testo arriva a parti di al massimo 60.000 caratteri, con un parametro per chiedere la parte successiva e in testa "parte X di Y". La prima parte comincia con i dati estratti (requisiti, documenti, scadenze), così spesso basta quella. (Aggiunto dopo la revisione finale del 2026-10-27.)
- **profilo_azienda**: i parametri dell'azienda che il radar usa per giudicare.
- **elenca_cartella**: il contenuto della cartella del bando, tutta in una volta (cartelle e file con nome, tipo, dimensione, chi li ha caricati, quando).
- **leggi_file**: un file della cartella. Testo e Markdown come testo; PDF come testo estratto con i numeri di pagina (con `unpdf`, già nel progetto); immagini come immagine, ma solo fino a 3,5 MB (Claude rifiuta immagini più grandi): oltre, solo nome e dimensione. Gli altri tipi: solo nome e dimensione, con l'invito ad aprirli dal pannello. Il testo arriva a parti di al massimo 60.000 caratteri come per `leggi_bando`.

Scrivono:

- **segna_interessante**: mette o toglie il cuore.
- **crea_cartella_bando**: come il bottone del pannello (`startGrantFolder`), con il file per Claude e i PDF della pagina del bando. Restituisce lo stato; il riempimento continua in background.
- **leggi_bozza** (legge): la bozza del bando con testo, versione, data e autore dell'ultimo salvataggio (persona o "Claude per <persona>"); se non c'è lo dice.
- **salva_bozza** (scrive): salva il testo intero della bozza. Chiede la versione da cui si parte (quella letta con `leggi_bozza`, o nessuna per la prima bozza): se nel frattempo qualcuno ha salvato, rifiuta con "La bozza è cambiata: rileggila con leggi_bozza e riapplica le modifiche". Se il bando non ha ancora la cartella, la crea come `crea_cartella_bando` (una bozza vuol dire che ci si lavora, e la cartella protegge il bando dalla pulizia del radar).

### Bozza della candidatura

Una bozza per bando, in Markdown, nel database (non su Cloudinary: è testo che si modifica spesso), in una tabella sua con il bando come chiave e cancellazione a cascata con il bando. Si salvano: testo, versione (un numero che sale a ogni salvataggio), data, nome di chi ha salvato come testo (resta anche se la persona viene eliminata) e se l'ha fatto Claude. Limite di 200.000 caratteri nel pannello. Claude invece lavora solo su bozze fino a 60.000 caratteri, il limite di una risposta: rilegge e riscrive sempre il testo intero, e un testo arrivato a metà gli farebbe cancellare la coda senza accorgersene. Oltre quel limite `leggi_bozza` dà solo chi e quando l'ha salvata e "La bozza supera 60.000 caratteri: lavorala nel pannello", e `salva_bozza` rifiuta. (Correzione dopo la seconda revisione finale.)

Il salvataggio è sempre "a partire dalla versione N", oppure "prima bozza" senza versione: se la versione attuale non è N (o se una bozza c'è già e si dichiara "prima bozza"), il salvataggio è rifiutato (`409`) e niente viene scritto. La risposta `409` porta versione, autore e ora della bozza attuale. Vale per Claude e per il pannello. Così una correzione fatta a mano non sparisce sotto una riscrittura di Claude basata su un testo vecchio, e viceversa.

Salvare una bozza protegge il bando: nella stessa transazione del salvataggio si segnano la cartella e il cuore (`folder_at`, `liked_at`), che sono ciò che lo salva dalla pulizia del radar. Poi, se Cloudinary è configurato, parte il riempimento della cartella come col bottone; senza Cloudinary la bozza si salva lo stesso e la scheda File dice già "Cloudinary non configurato". La bozza si cancella con il bando, cioè mai finché c'è la cartella. Oggi non esiste un modo di eliminare la cartella di un bando; se un giorno ci sarà, dovrà tenere conto della bozza. (Scelte mie.)

**Pannello.** Nella scheda del bando, accanto a "Dettaglio" e "File", una terza scheda "Bozza":
- senza bozza: "Nessuna bozza. Chiedi a Claude di preparare la candidatura, oppure scrivila qui." e l'editor vuoto; se il bando non ha la cartella, sotto "Salva": "Salvando, il bando va tra gli interessanti e gli si crea la cartella.";
- con la bozza: un campo di testo grande con il Markdown, "Salva", e sotto "Ultimo salvataggio: <data>, <nome>" (con "via Claude" se l'ha salvata Claude);
- uscendo con modifiche non salvate si chiede conferma;
- se il salvataggio è rifiutato perché la bozza è cambiata: "La bozza è stata cambiata da <nome> alle <ora>. Copia le tue modifiche, ricarica e riapplicale." con un bottone "Ricarica", senza perdere il testo scritto finché non si ricarica;
- "Scarica" la bozza come file `.md`.
(Scelte mie: niente anteprima formattata e niente editor ricco; il Markdown resta leggibile anche così.)

Le API stanno sotto `/api/admin/radar/grants/:id/draft` (lettura e salvataggio), quindi valgono i permessi della pagina Bandi.

### Istruzioni e prompt per Claude

Scritti a partire dalla skill `gestisci-bando`:

- le **istruzioni del server** (il campo `instructions` che Claude riceve quando si collega), così valgono sempre: rispondere in italiano e in modo semplice; non inventare dati dell'azienda (fatturato, dipendenti, ATECO, bilanci) e lasciare segnaposto `[DA COMPLETARE: ...]`; citare la pagina del bando per ogni requisito critico; quando i dati estratti dal radar non tornano, vale il testo del bando; prima di cambiare una bozza esistente, leggerla con `leggi_bozza` e partire da quella, tenendo le correzioni fatte dalle persone; chiedere conferma prima di scrivere;
- un **prompt** "Prepara la candidatura" (nome `prepara_candidatura`, al posto di `come_candidarsi` che non è mai uscito; gli utenti lo trovano nel menu "+" di Claude), che chiede l'id o il titolo del bando e guida Claude a: leggere il bando e il profilo, e dalla cartella solo i file che non sono già nel testo del bando (quelli caricati dalle persone); dire in poche righe se Didap può candidarsi e cosa resta da verificare; scrivere la bozza della domanda come se Didap si candidasse, seguendo la struttura e i criteri di valutazione del bando (presentazione dell'azienda dal profilo, progetto, obiettivi, attività e tempi, piano dei costi dentro le spese ammesse, risultati attesi) e in fondo "Da completare" con i dati mancanti, i documenti da allegare (formato e firma), la piattaforma e le scadenze; salvarla con `salva_bozza` e dire nella chat cosa ha scritto e cosa resta da fare a una persona.

La skill locale `gestisci-bando` resta com'è per chi lavora da Claude Code su un file esportato.

### Pannello

- Pagina Account: nuova sezione "Claude collegato" con i collegamenti attivi (client, da quando, ultimo uso) e "Scollega".
- Pagina di consenso `/oauth/authorize` nello stile della pagina di login (scheda al centro, come "Scegli la password").
- Scheda "Bozza" nel dettaglio del bando (sopra, "Bozza della candidatura").

### Deploy

- Nessuna variabile nuova: servono quelle della PR #15 (`SESSION_SECRET`, `NUXT_PUBLIC_SITE_URL` col dominio pubblico in https) e quelle di Cloudinary.
- Il proxy di Coolify deve passare all'app anche `/.well-known/*` e `/oauth/*`.
- Il server deve essere raggiungibile dagli indirizzi di Anthropic (`160.79.104.0/21`): nessun blocco per IP davanti.

## Verifiche

- Test sulle parti OAuth: indirizzi di ritorno accettati e rifiutati, PKCE, codice usato due volte, refresh con rotazione e riuso del vecchio, chiusura dei collegamenti su disattivazione e cambio password, `401` con `resource_metadata`.
- Test sugli strumenti con lo store in memoria che usano già i test della cartella: filtri di `cerca_bandi` rispetto alla ricerca salvata, `leggi_file` per testo, PDF, immagini e altri tipi, persona senza Bandi.
- Test sulla bozza: prima bozza senza versione, salvataggio da versione vecchia rifiutato senza scrivere, cartella creata al primo salvataggio, autore "via Claude", limite di lunghezza.
- Prova locale con MCP Inspector e con Claude Code su `http://localhost:3000/mcp`.
- claude.ai non raggiunge `localhost`: la prova vera dal sito si fa dopo il deploy (o con un tunnel temporaneo), con un account di prova.

## Lasciato a chi costruisce

- Nomi delle tabelle e delle colonne, struttura del codice, come si collega l'SDK MCP a Nitro.
- Testi esatti delle descrizioni degli strumenti, del prompt e della pagina di consenso.
- Il limite esatto sul testo restituito da `leggi_file`.
- Quanto tenere i client registrati mai usati prima di cancellarli. Un client che ha avuto almeno un collegamento non si cancella per pulizia: Claude riusa lo stesso client per ricollegarsi dopo "Scollega", un cambio di password o un mese senza uso. (Correzione dopo la revisione finale.)
