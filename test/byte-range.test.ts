import { describe, expect, it } from 'vitest'
import { parseByteRange } from '../server/utils/byte-range'

describe('parseByteRange', () => {
  it('intervallo chiuso, aperto e finale', () => {
    expect(parseByteRange('bytes=0-99', 1000)).toEqual({ start: 0, end: 99 })
    expect(parseByteRange('bytes=0-1', 1000)).toEqual({ start: 0, end: 1 })
    expect(parseByteRange('bytes=900-', 1000)).toEqual({ start: 900, end: 999 })
    expect(parseByteRange('bytes=-100', 1000)).toEqual({ start: 900, end: 999 })
  })

  it('la fine oltre il file si ferma all\'ultimo byte', () => {
    expect(parseByteRange('bytes=500-5000', 1000)).toEqual({ start: 500, end: 999 })
    expect(parseByteRange('bytes=-5000', 1000)).toEqual({ start: 0, end: 999 })
  })

  it('header assente o non valido: file intero', () => {
    expect(parseByteRange(undefined, 1000)).toBeNull()
    expect(parseByteRange('bytes=-', 1000)).toBeNull()
    expect(parseByteRange('bytes=500-100', 1000)).toBeNull()
    expect(parseByteRange('bytes=0-1,5-9', 1000)).toBeNull()
    expect(parseByteRange('items=0-1', 1000)).toBeNull()
  })

  it('fuori dal file: 416', () => {
    expect(parseByteRange('bytes=1000-', 1000)).toBe('unsatisfiable')
    expect(parseByteRange('bytes=-0', 1000)).toBe('unsatisfiable')
    expect(parseByteRange('bytes=-10', 0)).toBe('unsatisfiable')
  })
})
