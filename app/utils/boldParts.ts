/**
 * Un testo breve con i grassetti segnati come in markdown (`**NX-TAB**`)
 * a pezzi, ognuno col suo peso: per le frasi dei clienti nella card del
 * carosello e nella nuvoletta di Didi, che non passano dal markdown.
 */
export type BoldPart = { text: string, bold: boolean }

export function boldParts(text: string): BoldPart[] {
  return text
    .split(/\*\*(.+?)\*\*/)
    .map((t, i) => ({ text: t, bold: i % 2 === 1 }))
    .filter(p => p.text)
}

/** Il testo senza i segni dei grassetti */
export const stripBold = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '$1')
