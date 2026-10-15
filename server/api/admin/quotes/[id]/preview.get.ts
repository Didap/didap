import { pdfFilename } from '#shared/quote'

// PDF della bozza al volo, non salvato
export default defineEventHandler(async (event) => {
  const snapshot = await previewSnapshot(await useDb(), uuidParam(event), new Date())
  const pdf = await renderQuotePdf(snapshot, await loadPdfAssets())
  return sendPdf(event, { pdf, filename: pdfFilename(snapshot.number, snapshot.rev) }, 'inline')
})
