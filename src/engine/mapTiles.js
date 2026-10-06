// ─── 지도 타일 (VWorld) ────────────────────────────────────────────────────────
//
// 국토교통부 VWorld 위성영상. 무료 인증키가 필요하고 카드 등록은 없다.
// 키는 발급 시 등록한 도메인(서비스 URL)에서만 동작하므로 클라이언트에 두어도
// 다른 곳에서 쓸 수 없다 — 그래서 빌드에 박지 않고 앱에서 입력받아 보관한다.
//
// 발급: https://www.vworld.kr → 오픈API → 인증키 발급
//   · 서비스 환경: 웹사이트
//   · 서비스 URL: 배포 도메인과 개발용 localhost 둘 다 등록

const STORAGE_KEY = 'bb.vworldKey';

// 빌드 시 VITE_VWORLD_KEY를 넣어두면 그게 기본값이 된다(선택). 앱에서 입력한
// 값이 있으면 그쪽이 우선이라, 기기마다 다른 키를 쓰거나 바꿔 끼울 수 있다.
const BUILD_KEY = import.meta.env?.VITE_VWORLD_KEY || '';

export function getVWorldKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || BUILD_KEY;
  } catch {
    // 시크릿 모드 등에서 localStorage 접근 자체가 throw 할 수 있다.
    return BUILD_KEY;
  }
}

export function setVWorldKey(key) {
  const value = (key || '').trim();
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

// Leaflet 치환자를 그대로 둔 템플릿. VWorld WMTS 경로는 z/y/x 순서다.
export function satelliteTileUrl(key) {
  return `https://api.vworld.kr/req/wmts/1.0.0/${key}/Satellite/{z}/{y}/{x}.jpeg`;
}

export const TILE_MIN_ZOOM = 6;
export const TILE_MAX_ZOOM = 19;
export const TILE_ATTRIBUTION = '© VWorld 국토교통부';
export const VWORLD_SIGNUP_URL = 'https://www.vworld.kr/dev/v4api.do';
