import { describe, expect, it } from 'vitest'
import { addDays, formatDate, romeDate, romeYear } from '#shared/dates'

describe('date nel fuso di Roma', () => {
  it('usa il giorno di Roma, non quello UTC', () => {
    const lateNight = new Date('2026-12-31T23:30:00Z')
    expect(romeDate(lateNight)).toBe('2027-01-01')
    expect(romeYear(lateNight)).toBe(2027)
    expect(romeDate(new Date('2026-10-15T10:00:00Z'))).toBe('2026-10-15')
  })

  it('aggiunge giorni anche attraverso il cambio dell\'ora', () => {
    expect(addDays('2026-10-15', 30)).toBe('2026-11-14')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('formatta gg/mm/aaaa', () => {
    expect(formatDate('2026-03-09')).toBe('09/03/2026')
  })
})
