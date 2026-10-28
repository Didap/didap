import { describe, expect, it } from 'vitest'
import { accountEmail, accountLink } from '../server/emails/account'
import { SITE_URL } from '../server/emails/contact-templates'

// Email d'invito e di reset della password

const URL_LINK = 'https://didap.it/admin/password?token=abc123'

describe('accountEmail', () => {
  for (const kind of ['invite', 'reset'] as const) {
    it(`${kind}: oggetto col nome, link in html e testo`, () => {
      const mail = accountEmail(kind, { name: 'Giulia', url: URL_LINK })
      expect(mail.subject).toContain('Giulia')
      expect(mail.html).toContain(URL_LINK)
      expect(mail.text).toContain(URL_LINK)
    })

    it(`${kind}: il nome è scappato nell'html`, () => {
      const mail = accountEmail(kind, { name: '<b>Giulia</b>', url: URL_LINK })
      expect(mail.html).not.toContain('<b>Giulia</b>')
      expect(mail.html).toContain('&lt;b&gt;Giulia&lt;/b&gt;')
    })
  }

  it('reset: il link vale 1 ora', () => {
    const mail = accountEmail('reset', { name: 'Giulia', url: URL_LINK })
    expect(mail.text).toContain('1 ora')
    expect(mail.html).toContain('1 ora')
  })

  it('invito: il link vale 7 giorni', () => {
    const mail = accountEmail('invite', { name: 'Giulia', url: URL_LINK })
    expect(mail.text).toContain('7 giorni')
    expect(mail.html).toContain('7 giorni')
  })
})

describe('accountLink', () => {
  it('usa il dominio del sito, senza doppia barra', () => {
    const link = accountLink('abc123')
    expect(link).toBe(`${SITE_URL.replace(/\/$/, '')}/admin/password?token=abc123`)
    expect(link).not.toContain('//admin')
  })
})
