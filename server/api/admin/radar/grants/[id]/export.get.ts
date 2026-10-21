// "Esporta per Claude": il bando in un file Markdown con front matter YAML
export default defineEventHandler(async (event) => {
  const sql = await useDb()
  const [{ grant, content }, { profile }] = await Promise.all([readGrantDocument(sql, uuidParam(event)), readRadarSettings(sql)])
  setResponseHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${grantFileName(grant)}"`)
  return grantExport(grant, content, profile)
})
