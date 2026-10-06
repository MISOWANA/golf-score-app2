import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages 배포 경로. manifest의 start_url/scope와 service worker의
// navigateFallback이 모두 이 값을 기준으로 해야 한다.
const BASE = '/golf-score-app2/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      // 배포(main push)마다 새 service worker가 즉시 적용된다. 라운드 데이터는
      // 입력할 때마다 saveActiveRound로 IndexedDB에 저장되고 앱 시작 시 복원되므로
      // 갱신 중 새로고침이 일어나도 입력 내용은 유실되지 않는다.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Birdie Buddy',
        short_name: 'Birdie',
        description: '골프 스코어 기록과 라운드 분석',
        lang: 'ko',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0e18',
        theme_color: '#0b0e18',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // @fontsource/noto-sans-kr의 한글 서브셋이 woff/woff2 합쳐 1,736개(약 34MB)라
        // 전부 precache하면 설치 시 그만큼을 내려받게 된다. 앱 셸(JS/CSS/HTML/아이콘,
        // 약 1.2MB)만 미리 받고 폰트는 아래 runtimeCaching으로 실제 화면에 쓰인
        // 서브셋만 캐시에 쌓는다 (unicode-range 분할이라 몇 개만 요청된다).
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /\.(?:woff2?|ttf|otf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bb-fonts',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // VWorld 위성 타일. 한 번 본 홀은 데이터가 끊겨도 다시 보인다.
            // 위성영상은 자주 바뀌지 않으므로 30일 보관, 홀당 수십 장 단위라
            // 한 라운드(18홀)를 여유 있게 담도록 800장까지 둔다.
            urlPattern: /^https:\/\/api\.vworld\.kr\/req\/wmts\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bb-map-tiles',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // 개발 중에는 service worker를 띄우지 않는다 (HMR과 캐시가 충돌한다).
        enabled: false,
      },
    }),
  ],
})
