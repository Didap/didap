import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Test unitari (shared, PDF) e di integrazione (servizi su Postgres).
// I test di integrazione usano TEST_DATABASE_URL, letta anche da .env.
try {
  process.loadEnvFile('.env')
}
catch {}

export default defineConfig({
  // Il profilo di Didap, come nel build (nitro.virtual in nuxt.config)
  plugins: [{
    name: 'didap-profile',
    resolveId: id => (id === '#didap-profile' ? '\0didap-profile' : undefined),
    load: id => (id === '\0didap-profile'
      ? `export default ${JSON.stringify(readFileSync(new URL('./server/radar/didap.md', import.meta.url), 'utf8'))}`
      : undefined),
  }],
  resolve: {
    alias: { '#shared': fileURLToPath(new URL('./shared', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Un solo database di test: i file non girano in parallelo
    fileParallelism: false,
  },
})
