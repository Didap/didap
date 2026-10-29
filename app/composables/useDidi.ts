/**
 * Dov'è Didi, la scimmia della nav: 'home' al suo posto, 'away' in
 * basso a destra con le domande (DidiGuide), 'back' appena rimandata
 * nella nav, dove rientra cadendo dall'alto.
 */
export const useDidi = () => useState<'home' | 'away' | 'back'>('didi', () => 'home')
