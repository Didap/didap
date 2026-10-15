import { describe, expect, it } from 'vitest'
import {
  formatDecimal,
  formatEuro,
  formatEuroPlain,
  parseDaysInput,
  parseEuroInput,
  parsePercentInput,
} from '#shared/money'

// Intl usa uno spazio non separabile prima di €
const plain = (s: string) => s.replace(/\s/g, ' ')

describe('formattazione', () => {
  it('formatta euro all\'italiana con le migliaia', () => {
    expect(plain(formatEuro(123450))).toBe('1.234,50 €')
    expect(plain(formatEuro(5))).toBe('0,05 €')
    expect(plain(formatEuro(-5000))).toBe('-50,00 €')
    expect(formatEuroPlain(123450)).toBe('1.234,50')
  })

  it('formatta decimali senza zeri inutili', () => {
    expect(formatDecimal(1.5)).toBe('1,5')
    expect(formatDecimal(22)).toBe('22')
    expect(formatDecimal(1000)).toBe('1.000')
  })
})

describe('parseEuroInput', () => {
  it.each([
    ['1.234,50', 123450],
    ['1234,5', 123450],
    ['1234.50', 123450],
    ['1.234', 123400],
    ['1.5', 150],
    ['12,', 1200],
    ['€ 40', 4000],
    ['0', 0],
  ])('%s -> %d centesimi', (input, cents) => {
    expect(parseEuroInput(input)).toBe(cents)
  })

  it.each(['', 'abc', '-5', '1,2,3', '12.345,6.7', '1,234'])('rifiuta %s', (input) => {
    expect(parseEuroInput(input)).toBeNull()
  })

  it('rifiuta importi oltre il massimo', () => {
    expect(parseEuroInput('100.000.001')).toBeNull()
  })
})

describe('parseDaysInput e parsePercentInput', () => {
  it('accetta giorni a multipli di mezza giornata', () => {
    expect(parseDaysInput('1,5')).toBe(1.5)
    expect(parseDaysInput('3')).toBe(3)
    expect(parseDaysInput('0,5')).toBe(0.5)
    expect(parseDaysInput('1.000')).toBe(1000)
    expect(parseDaysInput('1.5')).toBe(1.5)
  })

  it.each(['0', '0,3', '-1', '1001', 'x', ''])('rifiuta %s giorni', (input) => {
    expect(parseDaysInput(input)).toBeNull()
  })

  it('accetta percentuali tra 0 e 100', () => {
    expect(parsePercentInput('22')).toBe(22)
    expect(parsePercentInput('12,5')).toBe(12.5)
    expect(parsePercentInput('0')).toBe(0)
    expect(parsePercentInput('100,1')).toBeNull()
    expect(parsePercentInput('-3')).toBeNull()
  })
})
