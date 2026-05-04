import vueParser from 'vue-eslint-parser'
import tsParser from '@typescript-eslint/parser'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'

const tailwindSettings = {
  'better-tailwindcss': {
    entryPoint: 'app/assets/css/main.css',
  },
}

const tailwindRules = {
  ...betterTailwindcss.configs['recommended-warn'].rules,
  // Tailwind v4 entrypoint may not register every utility synchronously;
  // keep this off until the codebase is stable
  'better-tailwindcss/no-unregistered-classes': 'off',
}

export default [
  {
    ignores: [
      '.nuxt/**',
      '.output/**',
      'dist/**',
      'node_modules/**',
      'public/**',
    ],
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        sourceType: 'module',
        ecmaVersion: 'latest',
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: { 'better-tailwindcss': betterTailwindcss },
    settings: tailwindSettings,
    rules: tailwindRules,
  },
  {
    files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: 'module', ecmaVersion: 'latest' },
    },
    plugins: { 'better-tailwindcss': betterTailwindcss },
    settings: tailwindSettings,
    rules: tailwindRules,
  },
]
