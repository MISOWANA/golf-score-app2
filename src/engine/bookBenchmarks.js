// ─── 책에서 가져온 기준값 ───────────────────────────────────────────────────────
//
// Mark Broadie, Every Shot Counts (2014). 쪽수는 요약 노트 PDF 기준이다.
// 투어 수치는 PGA Tour ShotLink(2003~2012), 아마추어 수치는 Broadie의 Golfmetrics 데이터.
//
// 이 값들은 내 기록과 비교하는 '참고 선'이다. 앱이 재는 지표가 책의 정의와 똑같지 않은 경우가
// 있어서(예: 끔찍한 샷은 페널티만 센다), 화면에는 비교 기준과 한계를 함께 적는다.
// 앱 단위가 미터라서 야드·피트는 여기서 미터로 환산해 둔다.

const YD = 0.9144;
const FT = 0.3048;

export const BOOK_SOURCE = 'Broadie, Every Shot Counts';

// 책 p.26 — GIRP(그린 또는 프린지에 규정 타수 + 1타 이내 도달): 라운드당 10개 이상이면
// 꾸준히 100타를 깨는 골퍼 수준.
export const GIRP_STEADY_100 = 10;

// 책 p.26 — 끔찍한 샷 점수: 약 2타를 잃는 샷(OB·분실구) 2점, 0.8~1.3타를 잃는 샷 1점.
// 90타를 치면서 합계가 6점을 넘으면 연습보다 일관성이 먼저.
// 앱은 페널티 기록만 갖고 있어 OB는 2점, 해저드·언플레이어블은 1점으로 센다.
export const AWFUL_POINTS = { ob: 2, hazard: 1, unplayable: 1 };
export const AWFUL_CONSISTENCY_LIMIT = 6;
export const AWFUL_LIMIT_SCORE_RANGE = [86, 94];   // '90타 전후'로 보는 라운드 스코어 범위

// 책 p.14 — 125야드에서 절반의 샷이 들어오는 홀까지 거리(전체 어프로치 샷 기준).
export const APPROACH_125YD = {
  distanceM: 125 * YD,             // 114m
  tourMedianM: 21 * FT,            // 6.4m
  golfer90MedianM: 45 * FT,        // 13.7m
};

// 책 p.16 — 드라이버를 20야드(18m) 더 보냈을 때 라운드당 아끼는 타수.
export const DRIVER_20YD_VALUE = { meters: 20 * YD, tour: 0.75, golfer90: 1.6, golfer100: 2.3 };
