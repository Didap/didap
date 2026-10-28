/**
 * Il modulo di contatto a tutto schermo, sopra la pagina. Lo apre ogni
 * navigazione verso /contact (vedi plugins/contact-dialog.client.ts);
 * `product` è il prodotto di "Avvisami quando esce", che scrive già il
 * messaggio. `mounted` resta vero dalla prima apertura: il dialog si
 * carica solo allora, e chiudendosi finisce la sua animazione.
 */
export const useContactDialog = () => {
  const open = useState('contact-open', () => false)
  const mounted = useState('contact-mounted', () => false)
  const product = useState('contact-product', () => '')

  function openContact(name = '') {
    product.value = name
    mounted.value = true
    open.value = true
  }

  return { open, mounted, product, openContact }
}
