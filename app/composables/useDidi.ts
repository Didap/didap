import { CONTACT_EMAIL, CONTACT_WHATSAPP, mailtoHref, whatsappHref } from '#shared/contact'
import type { DidiTopic } from '#shared/didi'
import { untypeset } from '#shared/typeset'

/**
 * Didi, la scimmia della nav, è via con DidiGuide in basso a destra:
 * intanto nella nav il suo posto resta vuoto.
 */
export const useDidiAway = () => useState('didi-away', () => false)

/**
 * Le strade per sentirci che propone Didi (DidiGuide, DidiTalk): il nome
 * della voce, la mail già scritta con la voce nell'oggetto, WhatsApp se
 * c'è il numero. Il testo tradotto passa da typeset(): nei link va con
 * gli spazi normali
 */
export function useDidiContact() {
  const { t } = useI18n()
  const label = (k: DidiTopic) => t(k === 'chat' ? 'didi.chat' : `contact.form.option_${k}`)
  const mailto = (k: DidiTopic, body: string) =>
    mailtoHref(CONTACT_EMAIL, untypeset(t('didi.subject', { topic: label(k) })), body)
  const whatsapp = (body: string) => (CONTACT_WHATSAPP ? whatsappHref(CONTACT_WHATSAPP, body) : '')
  return { label, mailto, whatsapp }
}
