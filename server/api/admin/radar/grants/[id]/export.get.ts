// "Esporta per Claude": il bando in un file Markdown con front matter YAML
export default defineEventHandler(async (event) => {
  const { grant, content, profile } = await readGrantDocument(await useDb(), uuidParam(event))
  setResponseHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${grantFileName(grant)}"`)
  return grantExport(grant, content, profile)
})
