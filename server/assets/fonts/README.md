# Font del PDF dei preventivi

Il PDF usa Obviously se in questa cartella ci sono i file:

- `obviously-regular` (testo)
- `obviously-bold` (titoli e grassetti)
- `obviously-wide-bold` (opzionale, la parola "Preventivo" in testata)

con estensione `.otf`, `.ttf` o `.woff`. Il formato `.woff2` non
funziona: la libreria dei font di pdfmake non riesce a estrarne i glifi.

Servono almeno regular e bold. Se mancano, il PDF usa Inter (cartella
`fallback/`, licenza OFL) e il server lo scrive nel log.

JetBrains Mono (numeri e importi, licenza OFL) è sempre in `fallback/`.
