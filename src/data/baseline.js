// ─── 투어 기준선: 홀아웃까지 평균 타수 ──────────────────────────────────────────
//
// Mark Broadie, Every Shot Counts (2014), 5장 Table 5.2 "Pro baseline: average strokes to hole out
// by distance". PGA Tour ShotLink 데이터(2003~2012)에서 나온 값이다. 책 원표는 야드(티·페어웨이·
// 러프·벙커·리커버리)와 피트(그린) 단위라 그대로 옮기고, 조회할 때 앱 단위인 미터로 받는다.
//
// · 'fairway'는 페어웨이 프린지·첫 컷을 포함한다. 'recovery'는 나무 뒤처럼 막힌 샷.
// · 표 밖 거리: 위쪽은 마지막 값, 아래쪽(20야드 안)은 첫 값으로 막는다. 책에 20야드 안 그린 밖
//   값이 없어서다 — 아주 짧은 칩의 출발 기준선은 실제보다 높게 잡힐 수 있다.
// · 그린은 3피트 미만을 (0피트 = 1.00)과 (3피트 = 1.04) 사이 직선으로 이었다. 0피트에서는
//   딱 1타가 남기 때문이다.
//
// 검증: 책 본문의 제이슨 데이(Table 5.3), 타이거 우즈(Table 5.4), Mr. Longdrive 예제의 값을 이 표와
// 보간으로 다시 계산해 소수 둘째 자리까지 맞춰 보았다.

const YD = 0.9144;
const FT = 0.3048;

// [야드, 티, 페어웨이, 러프, 벙커, 리커버리] — 값이 없는 칸은 null
const OFF_GREEN_YD = [
  [20,  null, 2.40, 2.59, 2.53, null],
  [40,  null, 2.60, 2.78, 2.82, null],
  [60,  null, 2.70, 2.91, 3.15, null],
  [80,  null, 2.75, 2.96, 3.24, null],
  [100, 2.92, 2.80, 3.02, 3.23, 3.80],
  [120, 2.99, 2.85, 3.08, 3.21, 3.78],
  [140, 2.97, 2.91, 3.15, 3.22, 3.80],
  [160, 2.99, 2.98, 3.23, 3.28, 3.81],
  [180, 3.05, 3.08, 3.31, 3.40, 3.82],
  [200, 3.12, 3.19, 3.42, 3.55, 3.87],
  [220, 3.17, 3.32, 3.53, 3.70, 3.92],
  [240, 3.25, 3.45, 3.64, 3.84, 3.97],
  [260, 3.45, 3.58, 3.74, 3.93, 4.03],
  [280, 3.65, 3.69, 3.83, 4.00, 4.10],
  [300, 3.71, 3.78, 3.90, 4.04, 4.20],
  [320, 3.79, 3.84, 3.95, 4.12, 4.31],
  [340, 3.86, 3.88, 4.02, 4.26, 4.44],
  [360, 3.92, 3.95, 4.11, 4.41, 4.56],
  [380, 3.96, 4.03, 4.21, 4.55, 4.66],
  [400, 3.99, 4.11, 4.30, 4.69, 4.75],
  [420, 4.02, 4.15, 4.34, 4.73, 4.79],
  [440, 4.08, 4.20, 4.39, 4.78, 4.84],
  [460, 4.17, 4.29, 4.48, 4.87, 4.93],
  [480, 4.28, 4.40, 4.59, 4.98, 5.04],
  [500, 4.41, 4.53, 4.72, 5.11, 5.17],
  [520, 4.54, 4.66, 4.85, 5.24, 5.30],
  [540, 4.65, 4.78, 4.97, 5.36, 5.42],
  [560, 4.74, 4.86, 5.05, 5.44, 5.50],
  [580, 4.79, 4.91, 5.10, 5.49, 5.55],
  [600, 4.82, 4.94, 5.13, 5.52, 5.58],
];
const COLUMN = { tee: 1, fairway: 2, rough: 3, sand: 4, recovery: 5 };

// [피트, 그린]
const GREEN_FT = [
  [0, 1.00], [3, 1.04], [4, 1.13], [5, 1.23], [6, 1.34], [7, 1.42], [8, 1.50], [9, 1.56],
  [10, 1.61], [15, 1.78], [20, 1.87], [30, 1.98], [40, 2.06], [50, 2.14], [60, 2.21], [90, 2.40],
];

// 작은 거리부터 정렬된 [거리, 값] 목록을 직선으로 이어 x에서의 값을 구한다. 양 끝은 막는다.
function interpolate(points, x) {
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return last[1];
}

const OFF_GREEN_CURVES = Object.fromEntries(
  Object.entries(COLUMN).map(([lie, col]) => [
    lie,
    OFF_GREEN_YD.filter((r) => r[col] != null).map((r) => [r[0] * YD, r[col]]),   // 거리를 미터로
  ]),
);
const GREEN_CURVE = GREEN_FT.map(([ft, v]) => [ft * FT, v]);

export const BASELINE_LIES = ['tee', 'fairway', 'rough', 'sand', 'recovery', 'green'];

// lie: 'tee' | 'fairway' | 'rough' | 'sand' | 'recovery' | 'green', meters: 홀까지 거리(m)
// → 그 자리에서 홀아웃까지 투어 평균 타수. 모르는 lie나 음수·NaN 거리는 null.
export function expectedStrokes(lie, meters) {
  if (!Number.isFinite(meters) || meters < 0) return null;
  if (lie === 'green') return interpolate(GREEN_CURVE, meters);
  const curve = OFF_GREEN_CURVES[lie];
  return curve ? interpolate(curve, meters) : null;
}
