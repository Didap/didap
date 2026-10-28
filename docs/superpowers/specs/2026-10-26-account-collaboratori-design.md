# Account personali e pagina Collaboratori

Data: 2026-10-26. Stato: bozza da approvare.

## Perché

Oggi il pannello admin ha una sola password condivisa (`ADMIN_PASSWORD`): chi la conosce vede e modifica tutto, e non si sa chi ha fatto cosa. Serve un accesso con email e password per ogni persona, e la possibilità di decidere cosa vede ognuno.

C'è anche un secondo motivo: il prossimo progetto è un connettore MCP che permette ai titolari di Didap (persone interne, che useranno questi stessi account) di chiedere al loro Claude i bandi interessanti e farsi aiutare a candidarsi. Il login del connettore userà questi account, quindi questo progetto viene prima.

## Obiettivi

- Ogni persona entra nel pannello con la sua email e la sua password.
- Le persone si aggiungono solo dal pannello, nella nuova pagina **Collaboratori**. Nessuna registrazione dall'esterno.
- Per ogni persona si spuntano le pagine (i "ruoli") a cui ha accesso: Prodotti, Preventivi, Clienti, Bandi, Impostazioni, Collaboratori.
- Il permesso vale anche sul server: le API di una pagina non accessibile rispondono 403, non basta nascondere il menu.

## Non obiettivi

- Ruoli con un nome (pacchetti di pagine). Si spuntano le pagine persona per persona: deciso dall'utente.
- Distinzione tra lettura e modifica: chi vede una pagina la usa per intero.
- Registro di chi ha modificato cosa.
- Login con Google o altri provider, autenticazione a due fattori.
- Il connettore MCP (progetto successivo).

## Cosa non deve succedere

- Restare chiusi fuori: deve esistere sempre almeno una persona attiva, con la password già impostata, che ha accesso a Collaboratori (chi ha solo un invito in attesa non conta). Il server rifiuta di togliere l'ultimo accesso a Collaboratori e di disattivare o eliminare l'ultima persona che ce l'ha. Nessuno può togliere a sé stesso l'accesso a Collaboratori, né disattivare o eliminare sé stesso. (Scelta mia.)
- Che chi gestisce i collaboratori conosca le password degli altri.
- Che una persona rimossa o a cui è stata tolta una pagina continui a usarla con la sessione già aperta.

## Come funziona

### Persone

Ogni persona ha: nome, email (unica, confrontata in minuscolo), password (hash), elenco delle pagine accessibili, stato attivo/disattivato, data di creazione, ultimo accesso.

Le password si salvano con `scrypt` di `node:crypto` (sale casuale per persona), senza nuove dipendenze. Lunghezza minima 10 caratteri.

### Aggiungere una persona

Dalla pagina Collaboratori si inseriscono nome, email e pagine spuntate. Il server crea la persona senza password e manda con Resend (`server/utils/mail.ts`) un'email con un link per scegliere la password. Il link contiene un token casuale, salvato nel database solo come hash, valido 7 giorni e usabile una volta. Dalla stessa pagina si può rimandare l'invito.

Senza `RESEND_API_KEY` l'invio non parte: la pagina mostra il link da copiare e mandare a mano.

### Password dimenticata

Dalla schermata di login, "Password dimenticata" chiede l'email e manda un link come quello dell'invito (valido 1 ora). La risposta è sempre la stessa, che l'email esista o no.

### Sessioni

Si tiene il meccanismo di oggi: cookie sigillato da h3 con dentro solo l'id di una riga di `admin_sessions`, durata 7 giorni, logout che cancella la riga. Cambia questo:

- `admin_sessions` ha la colonna con la persona.
- A ogni richiesta il server rilegge dal database la persona e le sue pagine, così i cambi di permesso valgono subito.
- Disattivare o eliminare una persona, o cambiarle la password, cancella le sue sessioni.
- La chiave del cookie non deriva più da `ADMIN_PASSWORD` ma da una nuova variabile `SESSION_SECRET`.

Il limite di tentativi di login per IP resta come oggi.

### Permessi sulle pagine e sulle API

Una tabella sola nel codice collega ogni pagina alle sue API:

| Pagina | Percorso | API |
|---|---|---|
| Prodotti | `/admin` | `/api/admin/products`, `/api/admin/assets` |
| Preventivi | `/admin/preventivi` | `/api/admin/quotes`, lettura di `/api/admin/clients` |
| Clienti | `/admin/clienti` | `/api/admin/clients` |
| Bandi | `/admin/bandi` | `/api/admin/radar` |
| Impostazioni | `/admin/impostazioni` | `/api/admin/settings` |
| Collaboratori | `/admin/collaboratori` | `/api/admin/users` (nuove) |

Il middleware `server/middleware/admin-auth.ts` usa questa tabella: 401 senza sessione, 403 se la persona non ha la pagina. Restano aperte senza sessione, in un elenco esplicito come l'`OPEN` di oggi: login, session, e le nuove API per password dimenticata e scelta della password da link. Logout e cambio della propria password richiedono la sessione ma nessuna pagina. Ogni altra API sotto `/api/admin/` che non compare nella tabella viene rifiutata, così una nuova API dimenticata resta chiusa invece che aperta. Preventivi usa l'elenco clienti in sola lettura: chi ha Preventivi ma non Clienti può leggere i clienti ma non modificarli.

Nel pannello, `AdminHeader.vue` mostra solo le pagine accessibili. Il guscio delle pagine admin è in due posti (`AdminShell.vue` e la pagina Prodotti `app/pages/admin/index.vue`, che ha il suo): il comportamento va messo in entrambi, o meglio la pagina Prodotti passa ad `AdminShell.vue`. Anche `AdminLogin.vue` e il campo `configured` di `session.get.ts` oggi dipendono da `ADMIN_PASSWORD` e vanno aggiornati. Aprendo una pagina non accessibile si va alla prima pagina accessibile. Se una persona non ha nessuna pagina vede un messaggio che la invita a chiedere l'accesso.

### Pagina Collaboratori

Elenco delle persone con nome, email, pagine, stato (attivo, invito in attesa, disattivato) e ultimo accesso. Per ogni persona: modificare nome e pagine, rimandare l'invito, disattivare o riattivare, eliminare. Lo stile segue le altre pagine admin (`clienti.vue` è il modello più vicino).

### Il primo account e il passaggio da oggi

Alla prima connessione al database (in `connect()` di `server/utils/db.ts`, dove oggi si applica lo schema), se non c'è nessuna persona, il server crea la prima usando `ADMIN_EMAIL`, con accesso a tutte le pagine. La password di questa prima persona è `ADMIN_PASSWORD`, così il primo accesso funziona subito; dopo si cambia dal pannello. Da quel momento `ADMIN_PASSWORD` non serve più per il login.

Le sessioni aperte con la vecchia password smettono di valere: tutti rifanno il login una volta.

Uscita d'emergenza (scelta mia), per quando nessuno riesce più a entrare in Collaboratori: con `ADMIN_RESET=true` nelle variabili, alla connessione al database la persona di `ADMIN_EMAIL` viene creata o riattivata, riceve accesso a tutte le pagine e la password `ADMIN_PASSWORD`, e le sue sessioni vengono chiuse. Si riavvia, si entra, si cambia password e si toglie la variabile. Il log del server avvisa finché la variabile resta attiva.

### Cambiare la propria password

Ogni persona, dal menu del pannello, può cambiare la sua password inserendo quella attuale.

## Lasciato a chi costruisce

- Nomi di tabelle e colonne, struttura delle API di `/api/admin/users`.
- Aspetto delle email di invito e reset (testo semplice in italiano va bene).
- Come si presenta la pagina Collaboratori, entro lo stile del pannello.
- Test: seguire quelli esistenti in `test/`.

## Variabili d'ambiente

- Nuove: `ADMIN_EMAIL` (prima persona), `SESSION_SECRET` (chiave del cookie), `ADMIN_RESET` (solo per l'emergenza).
- `ADMIN_PASSWORD` resta solo come password iniziale della prima persona.
- Da aggiornare `.env.example` e le variabili su Coolify.
