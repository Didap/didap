import { romeDate } from '#shared/dates'
import {
  ELIGIBILITY_LABELS,
  sourceLabel,
  titleSlug,
  VERDICT_LABELS,
  type EvaluatedGrant,
  type Outcome,
  type RadarProfile,
} from '#shared/radar'
import { profileText } from './radar-reader'

// Un bando in un file per lavorarci in locale con Claude Code (Opus): in
// testa i dati in YAML, sotto il riassunto, cosa fare e il testo del bando.
// È il formato delle skill di Claude Code: Markdown con front matter YAML.

const OUTCOME_LABELS: Record<Outcome, string> = { met: 'rispettato', not_met: 'non rispettato', to_verify: 'da verificare' }

// Le stringhe JSON sono stringhe YAML valide (doppi apici, stessi escape)
const scalar = (v: string | number | boolean | null) => (typeof v === 'string' ? JSON.stringify(v) : String(v))

const block = (text: string, indent: string) => text.split('\n').map(l => `${indent}${l}`).join('\n')

export const grantFileName = (g: EvaluatedGrant) => `bando-${titleSlug(g.title) || g.id}.md`

export function grantExport(g: EvaluatedGrant, content: string, profile: RadarProfile): string {
  const day = (iso: string | null) => (iso ? romeDate(new Date(iso)) : null)
  const yaml: string[] = [
    '---',
    'tipo: bando',
    `id: ${scalar(g.id)}`,
    `titolo: ${scalar(g.title)}`,
    `ente: ${scalar(g.issuer)}`,
    `fonte: ${scalar(sourceLabel(g.source))}`,
    `url: ${scalar(g.url)}`,
    `apertura: ${scalar(day(g.opensAt))}`,
    `scadenza: ${scalar(day(g.deadline))}`,
    `importo_massimo: ${scalar(g.maxAmount)}`,
    `agevolazione: ${scalar(g.funding)}`,
    `digitale: ${scalar(g.digital)}`,
    `esito: ${scalar(ELIGIBILITY_LABELS[g.eligibility])}`,
  ]
  if (g.verdict) {
    yaml.push('giudizio:', `  esito: ${scalar(VERDICT_LABELS[g.verdict])}`, `  motivo: ${scalar(g.verdictReason)}`)
  }
  yaml.push(g.requirements.length ? 'requisiti:' : 'requisiti: []')
  g.requirements.forEach((r, i) => {
    const e = g.evaluations[i]!
    yaml.push(
      `  - requisito: ${scalar(r.label)}`,
      `    esito: ${scalar(OUTCOME_LABELS[e.outcome])}`,
      `    motivo: ${scalar(e.reason)}`,
      `    citazione: ${scalar(r.quote)}`,
      `    pagina: ${scalar(r.page)}`,
    )
  })
  const app = g.application
  yaml.push('presentazione:', `  piattaforma: ${scalar(app?.platform ?? '')}`)
  yaml.push(app?.documents.length ? '  documenti:' : '  documenti: []')
  for (const d of app?.documents ?? []) {
    yaml.push(`    - nome: ${scalar(d.name)}`, `      formato: ${scalar(d.format)}`, `      note: ${scalar(d.notes)}`)
  }
  yaml.push('azienda: |', block(profileText(profile), '  '), '---')

  return [
    yaml.join('\n'),
    '',
    `# ${g.title}`,
    '',
    '## In breve',
    '',
    g.summary || 'Nessun riassunto.',
    '',
    '## Cosa fare',
    '',
    'Il file viene dal radar bandi di Didap. I dati in testa sono estratti in automatico dal testo qui sotto: se non tornano, vale il testo del bando.',
    '',
    '1. Controlla requisiti ed esito: segnala ogni condizione che Didap non rispetta o che va verificata con un documento.',
    '2. Prepara la lista dei documenti da presentare, con formato e firma richiesti, e le scadenze.',
    '3. Fai quello che ti viene chiesto (bozza della domanda, prototipo, documentazione del progetto), restando dentro le spese ammesse e i limiti del bando.',
    '',
    '## Testo del bando',
    '',
    content,
    '',
  ].join('\n')
}
