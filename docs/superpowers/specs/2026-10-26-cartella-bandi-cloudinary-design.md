# Cartella dei bandi su Cloudinary

Data: 2026-10-26. Stato: bozza da approvare.

## Perché

Oggi "Crea cartella su Drive" crea per ogni bando una cartella in un Drive condiviso di Google Workspace, con il file per Claude e i PDF del bando. Il Drive condiviso però non c'è, e lavorare su Drive porta fuori dal pannello. Si vuole una cartella vera, in stile Finder, dentro il pannello, con i file salvati su Cloudinary.

È anche la base per il connettore MCP (progetto successivo): con la struttura delle cartelle nel nostro database, Claude potrà leggere e aggiungere file nella cartella di un bando.

## Obiettivi

- Nel dettaglio di ogni bando, nella colonna di destra della pagina Bandi, una scheda **File** accanto al dettaglio di oggi (scelta dell'utente: opzione A delle bozze).
- Dentro la scheda una cartella in stile Finder: sottocartelle, caricamento (anche trascinando i file), rinomina, spostamento tra cartelle, eliminazione, download, anteprima di PDF e immagini.
- La cartella si crea con un gesto voluto, come oggi: nella scheda File, finché il bando non ha una cartella, c'è un bottone "Crea cartella del bando". Crearla la riempie come faceva Drive (il file per Claude `bando-<slug>.md` e i PDF trovati sulla pagina del bando, in una sottocartella "Dal bando") e mette il cuore al bando, come oggi. (Scelta mia: aprire la scheda non deve scaricare PDF né mettere cuori a ogni bando guardato.)
- I file stanno su Cloudinary; nomi, cartelle e chi ha caricato cosa stanno nel nostro database.
- Il bottone "Crea cartella su Drive" e tutto il codice di Google Drive spariscono.

## Non obiettivi

- Spostare file già presenti nelle cartelle Drive: si riparte da zero (scelta mia, l'utente non ha indicato file da recuperare).
- Una sezione "Documenti" separata o cartelle generali non legate a un bando (opzione C, non scelta).
- Modifica dei file nel browser, versioni, cestino, condivisione con link pubblici.
- Il connettore MCP.

## Cosa non deve succedere

- Perdere i documenti di lavoro senza volerlo. Regola unica (scelta mia): un bando **con cartella** (creata col bottone, qualunque cosa contenga) è protetto.
  - "Svuota i dati" non tocca i bandi con cartella né il loro documento in `radar_documents` (oggi la cancellazione del documento si porta dietro il bando per `on delete cascade`). Il risultato dice quanti ne ha tenuti. Conseguenza accettata: quei bandi non vengono riletti finché il loro testo non cambia.
  - La rilettura di un bando con cartella che conclude "non è per le imprese" non cancella il bando e lascia il documento `read`, così resta nell'elenco (oggi il ramo di `server/utils/radar.ts` cancella il bando e mette il documento `skipped`, che lo toglie dall'elenco).
- Perdere l'accesso ai file quando il bando scade. I bandi con cartella restano nell'elenco del pannello anche chiusi o scaduti, segnati "Chiuso", nella scheda "Interessanti" (hanno il cuore), e non vengono nascosti dai filtri di ricerca per fonte o provincia. Il riepilogo via email e il resto del radar continuano a usare solo i bandi aperti. Per i bandi con cartella, anche chiusi, funzionano la scheda File e "Esporta per Claude" (oggi `readGrantDocument` risponde 404 sui bandi chiusi). (Scelta mia.)
- File raggiungibili da chiunque abbia il link. Visure, bilanci e bozze non devono mai avere un URL Cloudinary in mano al browser.

## Come funziona

### Dove stanno i file

- Su Cloudinary, account `drmjany9a` (piano Free: massimo 10 MB per file, 25 crediti al mese; lo spazio occupato si accumula nel tempo). L'account ha già circa 188 MB di altro: i file dei bandi stanno sotto la cartella `didap/bandi/<id del bando>/` di Cloudinary.
- Tutti i file si caricano come risorse `raw` di tipo `authenticated` (non pubbliche, nessuna trasformazione). `raw` evita il blocco dei PDF che il piano Free applica alle risorse immagine. (Scelta mia.)
- Vedere e scaricare passa sempre dal nostro server: il pannello chiama un'API nostra, che controlla il permesso Bandi, prende il file da Cloudinary con un URL firmato generato lato server e lo restituisce al browser (inline per l'anteprima, come allegato per il download). Il browser non vede mai un URL Cloudinary. (Scelta mia: sul piano Free gli URL firmati di Cloudinary non scadono, quindi non vanno dati al browser.) L'anteprima dei PDF usa il visore del browser, quella delle immagini un tag img sull'API nostra.
- Prima di tutto il resto, chi costruisce verifica sull'account vero che caricare un PDF `raw` `authenticated` e riprenderlo dal server funzioni; se Cloudinary lo blocca, ci si ferma e si sceglie insieme come procedere.
- Ogni file ha su Cloudinary un identificativo casuale che non cambia mai. Rinominare o spostare un file cambia solo il database, non Cloudinary.
- Il caricamento passa dal nostro server, che controlla permesso e dimensione, manda il file a Cloudinary e registra la riga nel database. (Scelta mia: più semplice da tenere coerente; con il limite di 10 MB il peso sul server è basso.)
- Variabili d'ambiente: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (già nel `.env` locale; da aggiungere su Coolify e in `.env.example`). Senza, la scheda File spiega che Cloudinary non è configurato.

### Cosa sta nel database

- Le cartelle: bando, cartella madre, nome.
- I file: bando, cartella, nome mostrato, tipo, dimensione, identificativo Cloudinary, chi l'ha caricato (persona degli account del pannello, o "radar" per quelli messi in automatico), data.
- Nomi unici dentro la stessa cartella, come nel Finder: caricare un file con un nome già presente gli aggiunge un numero ("visura (2).pdf").
- Eliminare una cartella elimina tutto quello che contiene, dopo una conferma che dice quanti file spariscono.

### Riempimento automatico

- Col bottone "Crea cartella del bando", il server crea la cartella e "Dal bando", ci mette il file per Claude e i PDF della pagina del bando, riusando la logica di oggi (`grantExport`, `grantPdfLinks`, massimo 10 file), e mette il cuore al bando.
- Gira in background come oggi Drive, con lo stato nel database, ripresa se si interrompe, e una nota su com'è andata. Le colonne `drive_*` di `radar_grants` si riusano o si sostituiscono, a scelta di chi costruisce.
- I PDF oltre i 10 MB non si possono caricare sul piano Free: vengono saltati e la nota lo dice, con il link al PDF originale.

### La scheda File

- Barra con il percorso (Bando / Bozze / ...), bottoni "Nuova cartella" e "Carica".
- Elenco di cartelle e file con icona, nome, dimensione, data e chi l'ha caricato. Doppio clic su una cartella per entrarci.
- Trascinare file dal computer sulla scheda li carica nella cartella aperta. Trascinare un file o una cartella su un'altra cartella li sposta.
- Menu su ogni elemento: Apri, Scarica, Rinomina, Sposta in..., Elimina.
- Anteprima di PDF e immagini in un riquadro o in una finestra sopra il pannello.
- File oltre i 10 MB: errore chiaro prima del caricamento.
- Lo spazio è stretto (colonna di destra): l'elenco è a una colonna, l'anteprima si apre sopra.

### Permessi

Chi ha accesso alla pagina Bandi usa la cartella per intero. Le nuove API stanno sotto `/api/admin/radar/`, già coperto dalla regola `bandi` del middleware.

## Lasciato a chi costruisce

- Schema delle tabelle, nomi delle API, come firmare le richieste a Cloudinary (API REST con firma SHA, o l'SDK ufficiale `cloudinary` se si preferisce una dipendenza).
- Come si presenta la scheda, entro lo stile del pannello e della pagina Bandi.
- Test: utilità e database come nel resto del progetto, con Cloudinary sostituito da un finto client nei test.

## Base del lavoro

Il lavoro parte dal branch `feat/account-collaboratori` (non ancora unito a `main`), perché usa gli account e i permessi per pagina.
