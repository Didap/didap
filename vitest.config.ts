import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Test unitari (shared, PDF) e di integrazione (servizi su Postgres).
// I test di integrazione usano TEST_DATABASE_URL, letta anche da .env.
try {
  process.loadEnvFile('.env')
}
catch {}

export default defineConfig({
  // I .md importati dal server sono testo, come nel build di Nitro
  plugins: [{
    name: 'raw-md',
    transform: (code, id) => (id.endsWith('.md') ? { code: `export default ${JSON.stringify(code)}`, map: null } : undefined),
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
