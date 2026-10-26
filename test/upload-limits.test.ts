import { describe, expect, it } from 'vitest'
import { MAX_FILE_BYTES } from '../shared/grant-files'
import { browserName, checkUploadLength, checkUploadParts, MAX_UPLOAD_BYTES, uploadMime } from '../server/utils/upload-limits'

describe('checkUploadLength', () => {
  it('senza Content-Length o con un valore non numerico: 411', () => {
    for (const bad of [undefined, '', 'abc', '-1', '1e9']) {
      expect(() => checkUploadLength(bad), String(bad)).toThrow(expect.objectContaining({
        statusCode: 411,
        statusMessage: 'Lunghezza del caricamento mancante',
      }))
    }
  })

  it('oltre 10 file da 10 MB più 64 KB: 413', () => {
    expect(MAX_UPLOAD_BYTES).toBe(10 * MAX_FILE_BYTES + 64 * 1024)
    expect(() => checkUploadLength(String(MAX_UPLOAD_BYTES + 1))).toThrow(expect.objectContaining({
      statusCode: 413,
      statusMessage: 'Caricamento troppo grande',
    }))
    expect(() => checkUploadLength(String(MAX_UPLOAD_BYTES))).not.toThrow()
    expect(() => checkUploadLength('1234')).not.toThrow()
  })
})

describe('checkUploadParts', () => {
  const err = (statusCode: number, statusMessage: string) => expect.objectContaining({ statusCode, statusMessage })

  it('nessun file: 400; più di 10: 413', () => {
    expect(() => checkUploadParts([])).toThrow(err(400, 'Nessun file'))
    expect(() => checkUploadParts(Array(11).fill(1))).toThrow(err(413, 'Al massimo 10 file per volta'))
    expect(() => checkUploadParts(Array(10).fill(1))).not.toThrow()
  })

  it('un file vuoto o oltre 10 MB, anche dopo altri buoni: 413', () => {
    expect(() => checkUploadParts([5, 0])).toThrow(err(413, 'File vuoto'))
    expect(() => checkUploadParts([5, MAX_FILE_BYTES + 1])).toThrow(err(413, 'File oltre 10 MB'))
    expect(() => checkUploadParts([MAX_FILE_BYTES])).not.toThrow()
  })
})

describe('browserName', () => {
  it('rimette le virgolette e toglie gli a capo codificati dal browser', () => {
    expect(browserName('Bando %22ok%22.pdf')).toBe('Bando "ok".pdf')
    expect(browserName('a%0D%0ab.pdf')).toBe('a  b.pdf')
    expect(browserName(undefined)).toBe('')
  })
})

describe('uploadMime', () => {
  it('un .pdf senza tipo o con un tipo generico diventa application/pdf', () => {
    for (const type of [undefined, '', 'application/octet-stream', 'application/x-pdf', 'Application/X-PDF']) {
      expect(uploadMime(type, 'Bando.PDF'), String(type)).toBe('application/pdf')
    }
    expect(uploadMime('application/pdf', 'bando.pdf')).toBe('application/pdf')
  })

  it('gli altri tipi restano; senza tipo e senza .pdf: octet-stream', () => {
    expect(uploadMime('text/plain', 'note.pdf')).toBe('text/plain')
    expect(uploadMime('application/x-pdf', 'bando.pdf.zip')).toBe('application/x-pdf')
    expect(uploadMime('', 'foto')).toBe('application/octet-stream')
    expect(uploadMime(undefined, 'domanda.docx')).toBe('application/octet-stream')
    expect(uploadMime('image/png', 'foto.png')).toBe('image/png')
  })
})
