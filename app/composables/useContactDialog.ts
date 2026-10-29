import type { ProjectType } from '#shared/contact'

/**
 * Il modulo di contatto a tutto schermo, sopra la pagina. Lo apre ogni
 * navigazione verso /contact (vedi plugins/contact-dialog.client.ts);
 * `product` è il prodotto di "Avvisami quando esce", che scrive già il
 * messaggio; `projectType` è la voce già scelta con Didi; `message`
 * quello che il cliente ha già scritto a Didi (la chiusura della home),
 * che apre dritto il modulo compilato. `mounted`
 * resta vero dalla prima apertura: il dialog si carica solo allora, e
 * chiudendosi finisce la sua animazione.
 */
export const useContactDialog = () => {
  const open = useState('contact-open', () => false)
  const mounted = useState('contact-mounted', () => false)
  const product = useState('contact-product', () => '')
  const projectType = useState<ProjectType | ''>('contact-type', () => '')
  const message = useState('contact-message', () => '')

  function openContact(name = '', type: ProjectType | '' = '', text = '') {
    product.value = name
    projectType.value = type
    message.value = text
    mounted.value = true
    open.value = true
  }

  return { open, mounted, product, projectType, message, openContact }
}
