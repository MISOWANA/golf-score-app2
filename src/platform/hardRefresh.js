// 배포 뒤 폰 브라우저가 이전 번들을 그대로 들고 있을 때(캐시) 최신 버전을 받는 탈출구.
// 캐시를 비우고 주소에 값을 붙여 다시 불러온다. 기록(IndexedDB)은 건드리지 않는다.
export async function hardRefresh(now = Date.now()) {
  try {
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* 캐시 API 미지원 환경은 무시 */ }
  const url = new URL(window.location.href);
  url.searchParams.set('_r', String(now));
  window.location.replace(url.toString());
}
