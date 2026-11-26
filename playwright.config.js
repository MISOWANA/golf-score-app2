import { defineConfig } from '@playwright/test';

// 실제 브라우저(Chromium) 테스트 — `npm run test:e2e`
//
// src 의 vitest 테스트는 가짜 브라우저(jsdom)에서 돈다. 여기 e2e/ 테스트는 배포본과 똑같이 빌드한 앱
// (보안 규칙 CSP · 서비스 워커 · /golf-score-app2/ 경로 포함)을 진짜 크롬에 휴대폰 크기로 띄워 손가락으로 누른다.
// jsdom 으로는 못 보는 것: 손가락 끌기 · 세로 스크롤, 새로고침 뒤 이어하기(진짜 IndexedDB), 보안 규칙 위반, 오프라인, 화면 넘침.
//
// 테스트마다 새 브라우저 저장소로 시작한다 (기록이 서로 섞이지 않는다).
// 실패하면 화면 캡처 · 동작 기록(trace)이 playwright-report/ 에 남는다 → `npm run test:e2e:report` 로 본다.

const PORT = 4173;
const BASE = `http://localhost:${PORT}/golf-score-app2/`;

// 휴대폰 화면 — 크롬에 휴대폰 모드(터치 · 모바일 화면)를 켠다
const phone = (width, height) => ({
  browserName: 'chromium',
  viewport: { width, height },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  // GitHub 에서는 'github' 보고도 켠다 — 실패한 테스트 이름과 이유가 실행 결과 화면(주석)에 바로 뜬다.
  // (로그는 로그인해야 보이지만 이 주석은 누구나 볼 수 있어, 실패 이유를 바로 확인할 수 있다)
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    // 서비스 워커는 기본으로 끈다 — 예전 빌드가 캐시에서 나와 결과가 흔들리지 않게. 오프라인 테스트만 켠다.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // 아이폰 13~16 크기 — 모든 테스트
    { name: '휴대폰-390', use: phone(390, 844) },
    // 아이폰 SE(1세대) 크기 — 좁은 화면에서 글자가 넘치지 않는지만 본다
    { name: '좁은휴대폰-320', use: phone(320, 568), testMatch: /layout\.spec\.js/ },
  ],
  webServer: {
    // 배포와 같은 빌드를 만들어 띄운다. 예전에 띄워 둔 서버를 다시 쓰지 않는다 — 옛 화면을 보고 판단하지 않게.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
