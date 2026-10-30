// Nitro importa i file .md come testo (plugin raw); nei test lo fa
// vitest.config.ts
declare module '*.md' {
  const text: string
  export default text
}
