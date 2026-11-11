import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Nomes em maiúscula são componentes usados só no JSX, que o ESLint não conta como uso.
      // Vale também para parâmetros, como em `({ icon: Icon })`.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
      // Dívida conhecida (CI-01 do docs/PLANO-DE-ACAO.md): 5 efeitos com setState e 2 arquivos
      // que exportam componente junto com outra coisa. Ficam como aviso, para a CI não nascer
      // vermelha; corrigir pede mexer no estado das telas. Voltam a "error" quando zerarem.
      'react-hooks/set-state-in-effect': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
  // Arquivos de configuração rodam no Node, não no navegador.
  {
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
])
