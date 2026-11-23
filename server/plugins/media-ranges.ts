// I video a pezzi. Il server dei file statici di Nitro risponde sempre con
// il file intero (200), anche quando il browser ne chiede solo un pezzo con
// l'header Range: così un video non si può saltare in avanti, ogni volta
// che il browser vuole un punto preciso lo riscarica tutto, e Safari può
// rifiutarsi di riprodurlo. Qui, prima che parta la risposta, si ritaglia
// il pezzo chiesto e si risponde 206. Vale solo per i video letti dai file
// statici (corpo già in memoria) e non compressi: il resto passa com'è.
// Il file si legge comunque intero a ogni richiesta (lo fa Nitro prima di
// noi): i video sono di pochi MB e restano nella cache del disco.

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event, response) => {
    const type = String(getResponseHeader(event, 'Content-Type') ?? '')
    const body = response.body
    if (
      !type.startsWith('video/')
      || !Buffer.isBuffer(body)
      || getResponseHeader(event, 'Content-Encoding')
    ) return
    setResponseHeader(event, 'Accept-Ranges', 'bytes')

    const range = parseByteRange(getRequestHeader(event, 'range'), body.length)
    if (!range) return
    // If-Range (ETag o data): il pezzo vale solo se il file è ancora quello
    // che il browser conosce, sennò gli si manda tutto
    const ifRange = getRequestHeader(event, 'if-range')
    if (
      ifRange
      && ifRange !== getResponseHeader(event, 'ETag')
      && ifRange !== getResponseHeader(event, 'Last-Modified')
    ) return

    if (range === 'unsatisfiable') {
      setResponseStatus(event, 416, 'Range Not Satisfiable')
      setResponseHeader(event, 'Content-Range', `bytes */${body.length}`)
      setResponseHeader(event, 'Content-Length', 0)
      response.body = Buffer.alloc(0)
      return
    }
    setResponseStatus(event, 206, 'Partial Content')
    setResponseHeader(event, 'Content-Range', `bytes ${range.start}-${range.end}/${body.length}`)
    setResponseHeader(event, 'Content-Length', range.end - range.start + 1)
    response.body = body.subarray(range.start, range.end + 1)
  })
})
