// ─── GPS 좌표 유틸 ─────────────────────────────────────────────────────────────
//
// 샷을 친 지점을 GPS로 찍어 "샷 거리"만 측정한다. 핀 위치와 티박스 위치는 매일
// 바뀌므로 골프장별 고정 전장거리 DB는 두지 않는다 — 측정값만 기록한다.
//
// 좌표점 모양: { lat, lng, acc, t }
//   acc = 측위 오차 반경(m, 68% 신뢰), t = 기록 시각(epoch ms)

const EARTH_RADIUS_M = 6371008.8; // IUGG 평균 반지름

const toRad = (deg) => (deg * Math.PI) / 180;

const isPoint = (p) => !!p && typeof p.lat === 'number' && typeof p.lng === 'number';

// 두 좌표 사이 대권거리(m). 한 홀 범위(<1km)에서는 오차가 1m 미만이다.
export function haversine(a, b) {
  if (!isPoint(a) || !isPoint(b)) return null;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// 두 측위점의 오차를 독립으로 보고 합성한 거리 오차(1σ).
// 각 점이 ±5m면 두 점 사이 거리는 ±7m가 된다 — 짧은 샷일수록 치명적이다.
export function combinedAccuracy(a, b) {
  if (!isPoint(a) || !isPoint(b)) return null;
  if (a.acc == null || b.acc == null) return null;
  return Math.sqrt(a.acc * a.acc + b.acc * b.acc);
}

// gpsPoints[i] = (i+1)번째 샷을 친 지점, gpsGreen = 그린 도착 지점.
// 그린 지점을 배열 끝에 넣지 않고 따로 받는 이유: 나중에 익스트라샷이
// 추가되면 필드샷 개수가 늘어나는데, 배열 끝에 섞어두면 그때마다 그린
// 좌표의 인덱스가 밀려서 어긋난다.
//
// 반환 out[i] = (i+1)번째 샷의 측정 거리(m). 양 끝점 중 하나라도 없으면 null.
export function shotDistances(gpsPoints, gpsGreen, fieldShotCount) {
  const seq = [];
  for (let i = 0; i < fieldShotCount; i++) seq.push(gpsPoints?.[i] ?? null);
  seq.push(gpsGreen ?? null);

  const out = [];
  for (let i = 0; i < seq.length - 1; i++) out.push(haversine(seq[i], seq[i + 1]));
  return out;
}

// 한 홀에서 실제로 친 "필드샷"(퍼팅 제외) 개수.
// 1온(파4·5의 teeGIR, 파3의 GIR)이면 1타, 아니면 티샷+세컨샷+익스트라샷.
export function fieldShotCount(score, par) {
  if (!score) return 0;
  const onGreenInOne = score.teeGIR === true || (par === 3 && score.gir === true);
  if (onGreenInOne) return 1;
  return 2 + (score.extraShots?.length ?? 0);
}

// 측위 품질 — 오차 반경(m) 기준.
const QUALITY_TIERS = [
  { id: 'good', max: 8,        label: '양호', color: '#3db87a' },
  { id: 'fair', max: 15,       label: '보통', color: '#c9a228' },
  { id: 'poor', max: Infinity, label: '불량', color: '#ef5350' },
];

export function gpsQuality(acc) {
  if (acc == null) return null;
  return QUALITY_TIERS.find((q) => acc <= q.max);
}
