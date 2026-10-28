/**
 * Il modulo di contatto a tutto schermo, sopra la pagina. Lo apre ogni
 * link a /contact (vedi plugins/contact-dialog.client.ts); `product` è il
 * prodotto di "Avvisami quando esce", che scrive già il messaggio.
 */
export const useContactDialog = () => {
  const open = useState('contact-open', () => false)
  const product = useState('contact-product', () => '')

  function openContact(name = '') {
    product.value = name
    open.value = true
  }

  return { open, product, openContact }
}
