/**
 * Ogni incremento rimette in scena la splash (SiteSplash), anche a chi
 * l'ha già vista: "Rivedi l'apertura" in fondo alla home.
 */
export const useSplashReplay = () => useState('splash-replay', () => 0)
