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

// 기본 경로: 빌드에 주입된 키를 쓰므로 사용자는 아무것도 입력하지 않는다.
// 배포는 GitHub Actions 시크릿(VITE_VWORLD_KEY), 로컬 개발은 .env 로 넣는다.
//
// 브라우저가 타일을 직접 받아오는 구조라 이 키는 배포된 JS 안에 그대로 보인다.
// 지도 API 키는 원래 그런 성격이지만(구글·맵박스도 동일), VWorld WMTS는 구글·
// 맵박스와 달리 Referer를 검사하지 않는다 — Referer 없이도, 다른 도메인에서도
// 타일이 내려오는 것을 확인했다. 신청서의 서비스URL은 기재 사항일 뿐 기술적
// 제한이 아니다. 즉 키가 새면 누구나 쓸 수 있으므로, 악용 정황이 보이면 재발급해야
// 한다. 실제로 숨기려면 타일을 중계하는 서버가 필요하다.
const BUILD_KEY = import.meta.env?.VITE_VWORLD_KEY || '';

export const hasBuildKey = () => !!BUILD_KEY;

// 앱에서 직접 입력한 키가 있으면 그쪽이 우선이다 — 빌드 키가 아직 없거나
// 만료됐을 때 재배포 없이 바로 끼워 넣을 수 있는 탈출구.
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
