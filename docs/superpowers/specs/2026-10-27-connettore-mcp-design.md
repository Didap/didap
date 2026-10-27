# Connettore MCP per i bandi

Data: 2026-10-27. Stato: bozza da approvare.

## Perché

Il radar bandi l'ha voluto William, e lui "vuole mcp". La richiesta di Alessandro, con le sue parole: "io collego mcp e dal mio claude ti chiedo dimmi bandi interessanti, e poi se me ne interessa qualcuno ti dico di aiutarmi a candidarmi". Alessandro non lo usa in prima persona, lo useranno i titolari di Didap.

Il 2026-10-27 Alessandro ha chiarito cosa deve fare, in breve: "claude ti trova i bandi interessanti e ti consiglia come candidarti semplicemente". Claude consiglia; i documenti della candidatura li prepara la persona.

Oggi per parlare di un bando con Claude bisogna esportare un file dal pannello ("Esporta per Claude") e passarlo a Claude. Con il connettore Claude legge il radar da solo.

Le due basi sono pronte nella PR #15: gli account personali (il login del connettore usa quelli) e la cartella del bando su Cloudinary (Claude legge i PDF del bando che ci sono dentro).

## Obiettivi

- Un titolare aggiunge il connettore una volta al suo Claude (claude.ai sul web, l'app desktop, il telefono) ed entra con la sua email e password del pannello.
- Da lì può chiedere a Claude:
  - i bandi interessanti, con lo stesso giudizio che vede nel pannello;
  - tutto su un bando: requisiti con citazioni, documenti da presentare, testo completo;
  - di segnarlo tra gli interessanti e di creargli la cartella;
  - come candidarsi: Claude legge il bando e i file della cartella e consiglia in modo semplice cosa fare, in che ordine, con quali documenti, dove e entro quando.
- Vale solo per chi ha la pagina Bandi. Togliere la pagina, disattivare la persona o cambiarle la password toglie l'accesso anche al suo Claude, dalla richiesta successiva.

## Non obiettivi

Concordati il 2026-10-26, quando Alessandro ha approvato la proposta:

- Claude non avvia import, non cancella bandi e non cambia le impostazioni del radar. Queste cose restano solo nel pannello.

Dal chiarimento del 2026-10-27 ("ti consiglia come candidarti semplicemente"):

- Claude non scrive i documenti della candidatura e non salva file nella cartella del bando. Se più avanti servirà, si aggiunge uno strumento di scrittura.

Scelte mie:

- Claude non elimina, non sposta e non rinomina file e cartelle: nella cartella legge soltanto. Così un errore di Claude non può far perdere niente.
- Nessuna pubblicazione nella directory dei connettori di Anthropic: il connettore si aggiunge come connettore personalizzato, con l'indirizzo.
- Niente chiave API fissa al posto del login: ogni persona entra con il suo account, così si sa chi ha fatto cosa e si può togliere l'accesso a una persona sola.
- Nessuna altra pagina del pannello nel connettore (preventivi, clienti, prodotti).

## Cosa non deve succedere

- Claude che inventa dati di Didap (fatturato, dipendenti, ATECO, bilanci). Se mancano nel profilo dell'azienda Claude lo dice e li mette tra le cose da verificare, come dice già la skill `gestisci-bando`.
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

- `/mcp`: il server MCP, trasporto Streamable HTTP, senza stato (ogni richiesta porta il suo token). Si usa l'SDK ufficiale `@modelcontextprotocol/sdk`.
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
- **leggi_bando**: tutto il bando, cioè lo stesso Markdown di "Esporta per Claude" (`grantExport`), con il profilo dell'azienda dentro.
- **profilo_azienda**: i parametri dell'azienda che il radar usa per giudicare.
- **elenca_cartella**: il contenuto della cartella del bando, tutta in una volta (cartelle e file con nome, tipo, dimensione, chi li ha caricati, quando).
- **leggi_file**: un file della cartella. Testo e Markdown come testo; PDF come testo estratto con i numeri di pagina (con `unpdf`, già nel progetto); immagini come immagine. Gli altri tipi: solo nome e dimensione, con l'invito ad aprirli dal pannello. Scelta mia: limite di dimensione sul testo restituito, con un avviso se è stato tagliato.

Scrivono:

- **segna_interessante**: mette o toglie il cuore.
- **crea_cartella_bando**: come il bottone del pannello (`startGrantFolder`), con il file per Claude e i PDF della pagina del bando. Restituisce lo stato; il riempimento continua in background.
### Consigli per candidarsi

Due pezzi, scritti a partire dalla skill `gestisci-bando`:

- le **istruzioni del server** (il campo `instructions` che Claude riceve quando si collega), così valgono sempre: rispondere in italiano e in modo semplice; non inventare dati dell'azienda (fatturato, dipendenti, ATECO, bilanci) e dire quali mancano nel profilo; citare la pagina del bando per ogni requisito critico; quando i dati estratti dal radar non tornano, vale il testo del bando;
- un **prompt** "Come candidarsi a un bando" (gli utenti lo trovano nel menu "+" di Claude), che chiede l'id o il titolo del bando e guida Claude a: leggere il bando e i PDF della cartella; dire in poche righe se Didap può candidarsi e cosa resta da verificare; dare i passi della candidatura in ordine, con la piattaforma, i documenti da preparare (formato e firma), le scadenze e chi deve fornire cosa; aggiungere i consigli che contano per i criteri di valutazione del bando. Claude risponde nella chat; i documenti li prepara la persona.

La skill locale `gestisci-bando` resta com'è per chi lavora da Claude Code su un file esportato.

### Pannello

- Pagina Account: nuova sezione "Claude collegato" con i collegamenti attivi (client, da quando, ultimo uso) e "Scollega".
- Pagina di consenso `/oauth/authorize` nello stile della pagina di login (scheda al centro, come "Scegli la password").

### Deploy

- Nessuna variabile nuova: servono quelle della PR #15 (`SESSION_SECRET`, `NUXT_PUBLIC_SITE_URL` col dominio pubblico in https) e quelle di Cloudinary.
- Il proxy di Coolify deve passare all'app anche `/.well-known/*` e `/oauth/*`.
- Il server deve essere raggiungibile dagli indirizzi di Anthropic (`160.79.104.0/21`): nessun blocco per IP davanti.

## Verifiche

- Test sulle parti OAuth: indirizzi di ritorno accettati e rifiutati, PKCE, codice usato due volte, refresh con rotazione e riuso del vecchio, chiusura dei collegamenti su disattivazione e cambio password, `401` con `resource_metadata`.
- Test sugli strumenti con lo store in memoria che usano già i test della cartella: filtri di `cerca_bandi` rispetto alla ricerca salvata, `leggi_file` per testo, PDF, immagini e altri tipi, persona senza Bandi.
- Prova locale con MCP Inspector e con Claude Code su `http://localhost:3000/mcp`.
- claude.ai non raggiunge `localhost`: la prova vera dal sito si fa dopo il deploy (o con un tunnel temporaneo), con un account di prova.

## Lasciato a chi costruisce

- Nomi delle tabelle e delle colonne, struttura del codice, come si collega l'SDK MCP a Nitro.
- Testi esatti delle descrizioni degli strumenti, del prompt e della pagina di consenso.
- Il limite esatto sul testo restituito da `leggi_file`.
- Quanto tenere i client registrati mai usati prima di cancellarli.
