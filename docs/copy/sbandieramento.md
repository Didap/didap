# Regole di sbandieramento

Come vanno a capo i testi del sito. Valgono in italiano e in inglese, su ogni
pagina pubblica. Le parole non cambiano: cambiano solo gli spazi e gli a capo.

## 1. I testi occupano lo spazio che hanno

Un testo arriva fino in fondo alla sua colonna. Niente larghezze massime sui
blocchi di testo e niente bilanciamento delle righe: una riga va a capo solo
quando è piena o quando finisce la frase.

## 2. Dopo il punto si va a capo

Ogni frase comincia su una riga nuova. Il punto (o il punto interrogativo o
esclamativo) chiude la riga, la frase dopo comincia sotto. Vale per tutti i
testi che si vedono: titoli, intro, descrizioni, paragrafi delle schede e
delle pagine, testi dei moduli.

Ne restano fuori solo i testi che non si vedono: alt delle immagini e
descrizioni SEO.

Esempio:

> Ogni offerta scrive la scadenza del lotto.
> La prima richiesta che la trova nel passato assegna il giocatore.
> Due offerte nello stesso istante non si sovrascrivono mai: la seconda viene
> rigiocata sull’offerta aggiornata.

## 3. Una riga non finisce su una parola breve

Articoli, preposizioni e congiunzioni brevi (il, la, un, di, da, in, su, per,
con, e, o, che, non...; in inglese a, the, of, to, in, and...) restano attaccati
alla parola che segue. Mai "il" a fine riga e "prodotto" a capo.

## 4. Numeri e unità stanno insieme

Un numero non si separa da ciò che conta: 10 €, € 10, 3 novembre, 24 crediti,
5 MB.

## 5. Niente parola orfana

L’ultima riga di una frase non è mai una parola sola: l’ultima parola resta
legata alla penultima. Fanno eccezione le parole molto lunghe, oltre 12
lettere, che reggono una riga da sole.

## Come è fatto nel codice

- **Regole 3, 4 e 5**: `typeset()` in `shared/typeset.ts`. Si applica da sola a
  ogni testo tradotto (`postTranslation` in `i18n/i18n.config.ts`).
- **Regola 2**: nei file `i18n/locales/*.json` l’a capo si scrive come `\n` e
  l’elemento che mostra il testo ha la classe `whitespace-pre-line`. I testi
  che arrivano dai contenuti delle schede passano da `typesetLines()` nel
  template, che aggiunge l’a capo e applica le altre regole.
- **Regola 1**: i blocchi di testo non hanno classi `max-w-*` e le utility di
  testo in `app/assets/css/main.css` non usano `text-wrap`.
- Un test (`test/typeset.test.ts`) fallisce se un testo nei file di traduzione
  ha due frasi sulla stessa riga.
- Il corpo in markdown dei contenuti (schede, casi cliente) passa da
  `typesetBody()` al caricamento, con l’hook `content:file:afterParse` in
  `nuxt.config.ts`: gli a capo del sorgente diventano spazi e ogni frase va
  su una riga sua. I blocchi lo mostrano con `whitespace-pre-line`.
