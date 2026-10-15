// Emette una nuova revisione: numero (la prima volta), snapshot e PDF
export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const sql = await useDb()
  const assets = await loadPdfAssets()
  return issueQuote(sql, id, { now: new Date(), render: (s) => renderQuotePdf(s, assets) })
})
