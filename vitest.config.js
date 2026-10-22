import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 앱 빌드용 vite.config.js(PWA·git 버전 조회)와 따로 둔다 — 테스트에는 필요 없다.
// 엔진·DB 테스트는 node 환경, 화면 테스트는 파일 맨 위에 `// @vitest-environment jsdom` 을 단다.
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
