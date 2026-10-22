# Regole di sbandieramento

Come vanno a capo i testi del sito. Valgono in italiano e in inglese, su ogni
pagina pubblica. Le parole non cambiano: cambiano solo gli spazi e gli a capo.

## 1. I testi occupano lo spazio che hanno

Un testo arriva fino in fondo alla sua colonna. Niente larghezze massime sui
blocchi di testo e niente bilanciamento delle righe (`text-wrap: balance`),
che accorcia tutte le righe per pareggiarle.

## 2. Testo a bandiera, non a blocchi

I testi sono allineati a sinistra, mai giustificati, senza sillabazione. Una
riga va a capo quando è piena: le frasi scorrono una dopo l'altra nello
stesso paragrafo, il punto non manda a capo.

Il bordo destro lo uniforma il browser (`text-wrap: pretty`): sposta qualche
parola tra le ultime righe perché non restino molto più corte delle altre.

Un a capo scritto a mano c'è solo dove il design spezza un titolo apposta:
lo slogan in apertura, i titoli di "Come lavoriamo". Mai dopo un punto.

## 3. Una riga non finisce su una parola breve

Articoli, preposizioni e congiunzioni brevi (il, la, un, di, da, in, su, per,
con, e, o, che, non...; in inglese a, the, of, to, in, and...) restano attaccati
alla parola che segue. Mai "il" a fine riga e "prodotto" a capo.

## 4. Numeri e unità stanno insieme

Un numero non si separa da ciò che conta: 10 €, € 10, 3 novembre, 24 crediti,
5 MB.

## 5. Il trattino di un inciso non apre una riga

Nelle frasi con un inciso tra trattini ("Rispondiamo a tutti - anche solo per
dirti di no") il trattino resta in fondo alla riga, attaccato alla parola
prima. Una riga non comincia mai con un trattino.

## 6. Niente parola orfana

L'ultima riga di un paragrafo non è mai una parola sola: l'ultima parola resta
legata alla penultima. Fanno eccezione le parole molto lunghe, oltre 12
lettere, che reggono una riga da sole.

## Come è fatto nel codice

- **Regole 3, 4, 5 e 6**: `typeset()` in `shared/typeset.ts` mette spazi
  indivisibili dove serve. Si applica da sola a ogni testo tradotto
  (`postTranslation` in `i18n/i18n.config.ts`); i testi dal frontmatter dei
  contenuti passano da `typeset()` nel template.
- Il corpo in markdown dei contenuti (schede, casi cliente) passa da
  `typesetBody()` al caricamento, con l'hook `content:file:afterParse` in
  `nuxt.config.ts`: gli a capo del sorgente diventano spazi e le parole si
  legano come sopra.
- **Regola 2**: in `app/assets/css/main.css` paragrafi, voci di elenco e
  titoli hanno `text-align: start`, `hyphens: manual` e `text-wrap: pretty`.
  Gli a capo voluti si scrivono come `\n` nei file `i18n/locales/*.json` e
  l'elemento ha la classe `whitespace-pre-line`; gli altri testi non la hanno.
- **Regola 1**: i blocchi di testo non hanno classi `max-w-*`.
- Un test (`test/typeset.test.ts`) fallisce se un testo nei file di traduzione
  va a capo dopo la fine di una frase.
