// ─── 두 번째 안전장치 (Content-Security-Policy) ───────────────────────────────
//
// 브라우저에게 "이 앱은 여기서 온 것만 실행하고 불러온다"고 미리 알려 두는 규칙이다.
// 나중에 실수로 사용자 글이 코드처럼 들어가는 구멍이 생겨도, 바깥 주소의 스크립트를 불러오거나
// 기록을 다른 서버로 보내는 일을 브라우저가 막는다.
//
// GitHub Pages 는 응답 헤더를 바꿀 수 없어서 index.html 의 <meta> 로 넣는다 (vite.config.js 의 bb-csp 플러그인).
// 배포용으로 만들 때만 넣는다 — 개발 서버(npm run dev)는 화면 즉시 갱신용 인라인 스크립트를 써서 이 규칙이면 멈춘다.
//
// 지금 앱이 바깥에서 불러오는 것은 VWorld 위성 지도 사진 하나뿐이다 (engine/mapTiles.js).
// 바깥 주소를 새로 쓰면 여기에 더해야 한다 — csp.test.js 가 src 안의 주소를 모아 빠진 게 없는지 본다.
//
// 'unsafe-inline' 은 글꼴·색 같은 꾸밈(style)에만 연다: 앱 전체 CSS 를 <style> 로 넣고(GolfScoringApp 의 globalCSS),
// 지도 마커(holeMapLayers 의 divIcon)가 style="…" 속성이 붙은 HTML 이라서다. 스크립트에는 열지 않는다.

export const MAP_TILE_ORIGIN = 'https://api.vworld.kr';

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  // data: 지도 이미지 저장(canvas → PNG) · Leaflet CSS 의 작은 그림 / blob: 공유·저장용 파일
  'img-src': ["'self'", 'data:', 'blob:', MAP_TILE_ORIGIN],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", MAP_TILE_ORIGIN],
  'worker-src': ["'self'"],
  'manifest-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

export const cspContent = (directives = CSP_DIRECTIVES) =>
  Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`).join('; ');

// vite 플러그인 — 빌드한 index.html 의 <head> 맨 앞에 <meta http-equiv="Content-Security-Policy"> 를 넣는다
export function cspPlugin() {
  return {
    name: 'bb-csp',
    apply: 'build',
    transformIndexHtml: () => [{
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: cspContent() },
      injectTo: 'head-prepend',
    }],
  };
}
