// ─── 클럽별 샷거리 역산 (기획서 §3-1) ──────────────────────────────────────────
//
// 샷거리(n) = 잔여거리(n) - 잔여거리(n+1)
// 그린 도달 시: 샷거리(n) = 잔여거리(n) - PUTT1 실제 퍼트거리
//
// "잔여거리"는 항상 그 샷을 치기 '전' 남은 거리다 (세컨샷 클럽 선택 UI에서
// 라이/거리 입력이 클럽 선택보다 먼저 오는 순서와 동일한 기준).
// 티샷(드라이버) 거리는 홀 전체 야디지를 기록하지 않아 역산 불가 — 2타 이후만 대상.

import { median, iqr, distanceTier } from './stats.js';

export function extractClubShots(hole, player) {
  const s = hole.scores?.[player];
  if (!s) return [];

  const chain = [];
  if (s.secondClub && s.remainingDistance != null) {
    // 이 샷 뒤에 extraShots가 더 있으면 그린에 도달하지 못했다는 뜻이고,
    // 없으면 이 샷이 체인의 마지막이므로 GIR 여부로 그린 도달을 판단한다.
    chain.push({
      club: s.secondClub, subClub: s.secondClubSub ?? null, fromDistance: s.remainingDistance,
      lie: s.terrainCondition ?? null,
      onGreen: (s.extraShots?.length ?? 0) > 0 ? false : s.gir === true,
    });
  }
  (s.extraShots || []).forEach(shot => {
    if (shot.club && shot.remainingDistance != null) {
      chain.push({
        club: shot.club,
        subClub: shot.subClub ?? null,
        fromDistance: shot.remainingDistance,
        lie: Array.isArray(shot.lie) ? (shot.lie[0] ?? null) : (shot.lie ?? null),
        onGreen: shot.onGreen === true,
      });
    }
  });

  const puttDistance = s.puttDetails?.[0]?.distance ?? null;

  return chain
    .map((shot, i) => {
      const next = chain[i + 1];
      const toDistance = next ? next.fromDistance : puttDistance;
      if (toDistance == null) return null;
      const distance = shot.fromDistance - toDistance;
      if (!(distance > 0) || distance >= 300) return null; // 미완료/입력오류 방어
      return { ...shot, distance };
    })
    .filter(Boolean);
}

const CLUB_LABEL = { wood: 'WOOD', hybrid: 'HYBRID', iron: 'IRON', wedge: 'WEDGE' };

// §5-4: 최근 20라운드 롤링 윈도우, 균등 가중 중앙값 (계절·세팅 변화 반영).
// rounds는 최신 라운드가 배열 맨 앞(index 0)에 오는 순서로 전달된다.
export function buildClubDistanceStats(rounds, windowSize = 20) {
  const recentRounds = rounds.slice(0, windowSize);
  const byClub = {};

  recentRounds.forEach(r => {
    const p = r.players[0];
    r.holes.forEach(h => {
      extractClubShots(h, p).forEach(shot => {
        const key = shot.subClub ? `${shot.club}:${shot.subClub}` : shot.club;
        if (!byClub[key]) byClub[key] = { club: shot.club, subClub: shot.subClub, distances: [] };
        byClub[key].distances.push(shot.distance);
      });
    });
  });

  return Object.values(byClub)
    .map(entry => {
      const range = iqr(entry.distances);
      return {
        club: entry.club,
        subClub: entry.subClub,
        label: entry.subClub ? `${CLUB_LABEL[entry.club] ?? entry.club} ${entry.subClub}` : (CLUB_LABEL[entry.club] ?? entry.club),
        n: entry.distances.length,
        median: median(entry.distances),
        iqr: range,
        tier: distanceTier(entry.distances),
      };
    })
    .sort((a, b) => (b.median ?? 0) - (a.median ?? 0));
}
