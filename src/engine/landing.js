// 온그린 랜딩 방향(1~12시) 집계 — 인사이트의 그린 랜딩 분포가 쓴다.
// 시각은 핀을 가운데 두고 12시=롱(넘침), 3시=라이트, 6시=숏(짧음), 9시=레프트 기준이다.

export const LANDING_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const QUADRANTS = ['long', 'right', 'short', 'left'];

// 11·12·1시=롱, 2~4시=라이트, 5~7시=숏, 8~10시=레프트
export function quadrantOf(hour) {
  if (hour >= 11 || hour <= 1) return 'long';
  if (hour <= 4) return 'right';
  if (hour <= 7) return 'short';
  return 'left';
}

// 저장된 값이 1~12 사이의 정수 시각이면 그 숫자를, 아니면 null (예전 기록의 숫자 문자열도 받아 준다)
export function landingHour(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}

// 라운드들의 온그린 랜딩을 시각별로 센다. playerOf 로 누구의 기록인지 정한다 (기본은 첫 번째 플레이어).
export function landingCounts(rounds, playerOf = (r) => r.players?.[0]) {
  const counts = {};
  let total = 0;
  for (const r of rounds) {
    const p = playerOf(r);
    for (const h of r.holes ?? []) {
      const hour = landingHour(h.scores?.[p]?.onGreenLanding);
      if (hour == null) continue;
      counts[hour] = (counts[hour] ?? 0) + 1;
      total++;
    }
  }
  return { counts, total };
}

// 분포를 읽기 쉬운 값으로: 방향별 횟수, 가장 많은 방향·시각, 평균 위치(x 오른쪽+, y 롱+)와 쏠림 정도(0~1)
export function landingSummary(counts) {
  const q = { long: 0, right: 0, short: 0, left: 0 };
  let total = 0, max = 0, peakHour = null, vx = 0, vy = 0;
  for (const h of LANDING_HOURS) {
    const c = counts[h] ?? 0;
    if (!c) continue;
    q[quadrantOf(h)] += c;
    total += c;
    if (c > max) { max = c; peakHour = h; }
    const a = (h % 12) * 30 * Math.PI / 180;
    vx += c * Math.sin(a);
    vy += c * Math.cos(a);
  }
  let top = null;
  for (const n of QUADRANTS) if (q[n] > 0 && (top == null || q[n] > q[top])) top = n;
  const mx = total ? vx / total : 0, my = total ? vy / total : 0;
  const angle = (Math.atan2(vx, vy) * 180 / Math.PI + 360) % 360;
  return {
    q, total, max, peakHour, top,
    mean: { x: mx, y: my },
    bias: Math.sqrt(mx * mx + my * my),          // 0 = 고르게, 1 = 한 방향으로만
    meanHour: total ? (Math.round(angle / 30) % 12 || 12) : null,
  };
}

// 분포 아래에 붙는 한 줄 — 평균 위치가 어느 쪽인지, 얼마나 치우쳤는지
export function landingCaption(summary) {
  if (!summary.total) return '';
  if (summary.bias < 0.2) return '고르게 퍼져 있어요';
  const tone = summary.bias < 0.5 ? '한쪽으로 조금 치우쳐요' : '한쪽으로 뚜렷하게 치우쳐요';
  return `평균 위치 ${summary.meanHour}시 쪽 · ${tone}`;
}
