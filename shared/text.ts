import { z } from 'zod'

// Stringa ripulita dagli spazi ai lati, con lunghezza massima
export const text = (max: number) => z.string().trim().max(max)
