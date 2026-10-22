// 마이백 화면이 쓰는 계산 — 구성 요약 · 클럽 사이 간격 · 라운드에서 잰 실제 거리와의 연결.
//
// 마이백 클럽은 { id, name: '7i', type: 'Iron', carry, total } 모양이다 (퍼터는 거리가 없다).
// 스코어 입력의 클럽 표기와 이어 주는 일은 clubRecommend.shotClubOf 가 한다 — 추천이 쓰는 것과 같은 규칙이라
// "이 클럽은 추천에 쓰인다 / 쓰이지 않는다"가 화면과 라운드 중에 어긋나지 않는다.

import { shotClubOf, clubLabelOf } from './clubRecommend.js';

export const BAG_LIMIT = 14;           // 규정상 최대 클럽 수
export const FULL_SWING_MIN_M = 60;    // 클럽 사이 간격은 풀스윙 클럽(토탈 60m 이상)끼리만 본다 (스탯의 클럽 간격과 같은 기준)
export const WIDE_GAP_M = 18;          // 이만큼 벌어지면 그 사이를 칠 클럽이 없다
export const OVERLAP_GAP_M = 3;        // 이 안이면 사실상 같은 거리
export const MIN_MEASURED_SHOTS = 3;   // 실측으로 보여 주는 최소 샷 수
export const MIN_GAP_CLUBS = 3;        // 클럽 간격을 말하려면 필요한 풀스윙 클럽 수

const TYPE_LABEL = { Wood: '우드', Hybrid: '하이브리드', Iron: '아이언', Wedge: '웨지', Putter: '퍼터' };
export const TYPE_ORDER = ['Wood', 'Hybrid', 'Iron', 'Wedge', 'Putter'];

// 종류별 개수와 한 줄 요약 문자열("우드 3 · 아이언 5 …"). 없는 종류는 뺀다.
export function bagComposition(clubs) {
  const counts = Object.fromEntries(TYPE_ORDER.map((t) => [t, 0]));
  (clubs ?? []).forEach((c) => { if (counts[c.type] != null) counts[c.type] += 1; });
  const parts = TYPE_ORDER.filter((t) => counts[t] > 0).map((t) => `${TYPE_LABEL[t]} ${counts[t]}`);
  return { counts, total: (clubs ?? []).length, overLimit: (clubs ?? []).length > BAG_LIMIT, text: parts.join(' · ') };
}

// 클럽 간격 보고 — 간격은 '내 백'에 적은 거리로 말하는 것이라, 데이터가 모자라면 아무 말도 하지 않는다.
// 거리가 없는 것은 클럽이 없다는 뜻이 아니라 아직 안 적었다는 뜻일 수 있기 때문이다.
//   saved       사용자가 구성을 한 번이라도 저장했다 (저장 전에는 기본 클럽·기본 거리를 보고 있을 뿐이라 내 백이 아니다)
//   풀스윙 클럽  토탈 60m 이상이 MIN_GAP_CLUBS 개 이상이다 (적으면 '고르게 벌어졌다'도 '클럽이 비었다'도 단정하지 않는다)
//   unset       거리를 아직 확인하지 않은 클럽(새로 추가했거나 등록에서 제안값 그대로인 클럽)은 계산에서 뺀다
// speak 가 false 이면 화면은 간격 카드를 통째로 감춘다. skippedUnset 은 계산에서 뺀 새 클럽 수.
export function gapReport(clubs, saved) {
  const all = clubs ?? [];
  const used = all.filter((c) => !c.unset);
  const info = bagGaps(used);
  return { ...info, speak: !!saved && info.count >= MIN_GAP_CLUBS, skippedUnset: all.length - used.length };
}

// 토탈 거리순으로 이웃한 클럽의 간격. 드라이버와 그 다음 클럽 사이는 따로 채울 클럽이 없는 게 정상이라 '벌어짐'에서 뺀다.
export function bagGaps(clubs) {
  const ladder = (clubs ?? [])
    .filter((c) => c.type !== 'Putter' && Number.isFinite(c.total) && c.total >= FULL_SWING_MIN_M)
    .sort((a, b) => b.total - a.total);
  const gaps = [];
  for (let i = 0; i + 1 < ladder.length; i++) {
    gaps.push({
      longer: ladder[i].name, shorter: ladder[i + 1].name,
      from: ladder[i].total, to: ladder[i + 1].total, gap: ladder[i].total - ladder[i + 1].total,
      fromDriver: shotClubOf(ladder[i])?.club === 'driver',
    });
  }
  return {
    count: ladder.length,
    gaps,
    wide: gaps.filter((g) => g.gap >= WIDE_GAP_M && !g.fromDriver).sort((a, b) => b.gap - a.gap),
    overlap: gaps.filter((g) => g.gap <= OVERLAP_GAP_M).sort((a, b) => a.gap - b.gap),
  };
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
