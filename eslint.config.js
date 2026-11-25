import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'test-results', 'playwright-report', 'blob-report']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: { ...globals.browser, __APP_VERSION__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // 실제 브라우저 테스트(Playwright) — node 에서 돈다. React 코드가 아니라서 훅 규칙은 맞지 않는다
  // (Playwright 의 use() 를 React 의 use 훅으로 오인한다)
  {
    files: ['e2e/**/*.js', 'playwright.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
])
