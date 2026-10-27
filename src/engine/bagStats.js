// 마이백 화면이 쓰는 계산 — 구성 요약 · 라운드에서 잰 실제 거리와의 연결.
//
// 마이백 클럽은 { id, name: '7i', type: 'Iron', carry, total } 모양이다 (퍼터는 거리가 없다).
// 스코어 입력의 클럽 표기와 이어 주는 일은 clubRecommend.shotClubOf 가 한다 — 추천이 쓰는 것과 같은 규칙이라
// "이 클럽은 추천에 쓰인다 / 쓰이지 않는다"가 화면과 라운드 중에 어긋나지 않는다.

import { shotClubOf, clubLabelOf } from './clubRecommend.js';

export const BAG_LIMIT = 14;           // 규정상 최대 클럽 수
export const MIN_MEASURED_SHOTS = 3;   // 실측으로 보여 주는 최소 샷 수
export const MISMATCH_M = 5;           // 등록한 토탈과 실측 중앙값이 이만큼 다르면 '다르다'고 알린다

const TYPE_LABEL = { Wood: '우드', Hybrid: '하이브리드', Iron: '아이언', Wedge: '웨지', Putter: '퍼터' };
export const TYPE_ORDER = ['Wood', 'Hybrid', 'Iron', 'Wedge', 'Putter'];

// 종류별 개수와 한 줄 요약 문자열("우드 3 · 아이언 5 …"). 없는 종류는 뺀다.
export function bagComposition(clubs) {
  const counts = Object.fromEntries(TYPE_ORDER.map((t) => [t, 0]));
  (clubs ?? []).forEach((c) => { if (counts[c.type] != null) counts[c.type] += 1; });
  const parts = TYPE_ORDER.filter((t) => counts[t] > 0).map((t) => `${TYPE_LABEL[t]} ${counts[t]}`);
  return { counts, total: (clubs ?? []).length, overLimit: (clubs ?? []).length > BAG_LIMIT, text: parts.join(' · ') };
}

// 마이백 클럽별 실측 — 라운드에서 잰 샷 거리(buildClubDistanceStats 결과)를 마이백 클럽에 붙인다.
// 반환: { [clubId]: { median, n } }. 공이 멈춘 거리(토탈)를 재므로 마이백의 토탈과 견준다.
// 같은 클럽으로 읽히는 마이백 클럽이 둘이면(46°와 PW 등) 앞의 것에만 붙인다 — 추천과 같은 규칙.
export function measuredByClub(clubs, distanceStats) {
  const byKey = new Map();
  (distanceStats ?? []).forEach((d) => {
    if (d.n >= MIN_MEASURED_SHOTS && Number.isFinite(d.median)) byKey.set(`${d.club}:${d.subClub ?? ''}`, d);
  });
  const out = {};
  const seen = new Set();
  (clubs ?? []).forEach((c) => {
    const sc = shotClubOf(c);
    if (!sc) return;
    const key = `${sc.club}:${sc.subClub ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    const d = byKey.get(key);
    if (d) out[c.id] = { median: Math.round(d.median), n: d.n };
  });
  return out;
}

// 등록한 토탈 거리와 라운드 실측(중앙값)이 다른 클럽 — 차이가 큰 순.
// 클럽 사이를 '비었다·겹친다'고 판정하지 않는다 — 어떤 간격이 맞는지는 사람마다 다르다. 여기서 비교하는 건 내가 적은 숫자와 내가 친 숫자뿐이다.
// 반환: { compared: 실측이 있어 비교한 클럽 수, rows: [{ club, median, n, diff }] }  diff = 실측 − 등록 (양수면 실제로 더 나간다)
// 거리를 확인하지 않은 클럽(unset)은 등록한 숫자가 임시값이라 비교하지 않는다.
export function registeredVsMeasured(clubs, measured) {
  const compared = (clubs ?? []).filter((c) => c.type !== 'Putter' && !c.unset && c.total > 0 && measured?.[c.id]);
  const rows = compared
    .map((club) => ({ club, median: measured[club.id].median, n: measured[club.id].n, diff: measured[club.id].median - club.total }))
    .filter((r) => Math.abs(r.diff) >= MISMATCH_M)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  return { compared: compared.length, rows };
}

// 실측으로 토탈을 맞출 때의 새 캐리·토탈 — 런(토탈−캐리)은 그대로 둔다.
export function fitToMeasured(club, median) {
  const run = (club.total ?? 0) - (club.carry ?? 0);
  const total = Math.max(0, Math.min(350, Math.round(median)));
  return { carry: Math.max(0, Math.min(350, total - run)), total };
}

// 이 클럽이 스코어 입력의 어느 버튼으로 읽히는지(7I · 52° · DRIVER) — 이름 입력 도움말에 쓴다. 읽히지 않으면 null.
export function shotLabelOf(club) {
  const sc = shotClubOf(club);
  return sc ? clubLabelOf(sc.club, sc.subClub) : null;
}
