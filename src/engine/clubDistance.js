// ─── 클럽별 샷거리 역산 (기획서 §3-1) ──────────────────────────────────────────
//
// 샷거리(n) = 잔여거리(n) - 잔여거리(n+1)
// 그린 도달 시: 샷거리(n) = 잔여거리(n) - PUTT1 실제 퍼트거리
//
// "잔여거리"는 항상 그 샷을 치기 '전' 남은 거리다 (세컨샷 클럽 선택 UI에서
// 라이/거리 입력이 클럽 선택보다 먼저 오는 순서와 동일한 기준).
//
// GPS로 샷 지점을 찍은 홀에서는 실측 거리를 쓴다. 잔여거리는 사용자가 슬라이더로
// 눈대중 입력한 추정값이라 뺄셈 결과도 추정이지만, GPS는 측정값이다.
// 티샷 거리도 GPS가 있을 때만 구할 수 있다 — 홀 전장을 기록하지 않아 잔여거리
// 체인으로는 역산이 불가능하기 때문(extractTeeShot).

import { median, iqr, distanceTier } from './stats.js';
import { shotDistances, pinDistances, fieldShotCount, saneRemaining } from './geo.js';

// GPS 오측(튄 fix)으로 터무니없는 값이 들어오는 것을 막는 상한 — 한 샷이
// 날아간 거리. 핀까지 남은 거리 상한은 geo.js 의 saneRemaining.
const SANE_MAX_M = 300;

const saneDistance = (d) => (d != null && d > 0 && d < SANE_MAX_M ? d : null);

// gpsDist[n-1] = n번째 샷의 실측 거리(m).
const gpsDistancesFor = (hole, s) =>
  shotDistances(s.gpsPoints, s.gpsGreen, fieldShotCount(s, hole.par));

// pinDist[n-1] = n번째 샷을 치는 자리에서 핀까지 남은 실측 거리(m).
const pinDistancesFor = (hole, s) =>
  pinDistances(s.gpsPoints, s.gpsPin, fieldShotCount(s, hole.par));

export function extractClubShots(hole, player) {
  const s = hole.scores?.[player];
  if (!s) return [];

  const gpsDist = gpsDistancesFor(hole, s);
  const pinDist = pinDistancesFor(hole, s);

  // 잔여거리는 원래 사용자가 슬라이더로 눈대중 입력한 추정값이다. 핀을 찍어 둔
  // 홀에서는 실측값으로 대체한다 — "어떤 거리에서 어떤 클럽을 썼고 결과가
  // 어땠나"가 복기의 핵심이라 이 값의 정확도가 분석 품질을 그대로 좌우한다.
  const remainingFor = (shotNo, manual) => {
    const measured = saneRemaining(pinDist[shotNo - 1]);
    if (measured != null) return { value: measured, measured: true };
    if (manual != null) return { value: manual, measured: false };
    return null;
  };

  // shotNo를 함께 들고 간다. 클럽이 비어 건너뛴 샷이 있으면 체인 인덱스와
  // 실제 샷 순번이 어긋나서, 인덱스로 GPS 거리를 찾으면 엉뚱한 샷에 붙는다.
  const chain = [];
  const secondFrom = s.secondClub ? remainingFor(2, s.remainingDistance) : null;
  if (secondFrom) {
    // 이 샷 뒤에 extraShots가 더 있으면 그린에 도달하지 못했다는 뜻이고,
    // 없으면 이 샷이 체인의 마지막이므로 GIR 여부로 그린 도달을 판단한다.
    chain.push({
      shotNo: 2,
      club: s.secondClub, subClub: s.secondClubSub ?? null,
      fromDistance: secondFrom.value, fromMeasured: secondFrom.measured,
      lie: s.terrainCondition ?? null,
      onGreen: (s.extraShots?.length ?? 0) > 0 ? false : s.gir === true,
    });
  }
  (s.extraShots || []).forEach((shot, k) => {
    if (!shot.club) return;
    const from = remainingFor(3 + k, shot.remainingDistance);
    if (!from) return;
    chain.push({
      shotNo: 3 + k,
      club: shot.club,
      subClub: shot.subClub ?? null,
      fromDistance: from.value, fromMeasured: from.measured,
      lie: Array.isArray(shot.lie) ? (shot.lie[0] ?? null) : (shot.lie ?? null),
      onGreen: shot.onGreen === true,
    });
  });

  const puttDistance = s.puttDetails?.[0]?.distance ?? null;

  return chain
    .map((shot, i) => {
      const measured = saneDistance(gpsDist[shot.shotNo - 1]);
      if (measured != null) return { ...shot, distance: measured, measured: true };

      const next = chain[i + 1];
      const toDistance = next ? next.fromDistance : puttDistance;
      if (toDistance == null) return null;
      const distance = shot.fromDistance - toDistance;
      if (!(distance > 0) || distance >= SANE_MAX_M) return null; // 미완료/입력오류 방어
      return { ...shot, distance, measured: false };
    })
    .filter(Boolean);
}

// 티샷은 잔여거리 체인으로 역산할 수 없어 GPS가 있을 때만 거리가 나온다.
// extractClubShots에 섞지 않고 따로 두는 이유: shotStats.js의 어프로치 근접도와
// 라이별 GIR이 그 체인을 "2타 이후 필드샷" 전제로 쓰고 있다.
export function extractTeeShot(hole, player) {
  const s = hole.scores?.[player];
  if (!s || !s.teeClub) return null;

  const distance = saneDistance(gpsDistancesFor(hole, s)[0]);
  if (distance == null) return null;

  return { shotNo: 1, club: s.teeClub, subClub: s.teeClubSub ?? null, distance, measured: true };
}

const CLUB_LABEL = { driver: 'DRIVER', wood: 'WOOD', hybrid: 'HYBRID', iron: 'IRON', wedge: 'WEDGE' };

// §5-4: 최근 20라운드 롤링 윈도우, 균등 가중 중앙값 (계절·세팅 변화 반영).
// rounds는 최신 라운드가 배열 맨 앞(index 0)에 오는 순서로 전달된다.
export function buildClubDistanceStats(rounds, windowSize = 20) {
  const recentRounds = rounds.slice(0, windowSize);
  const byClub = {};

  recentRounds.forEach(r => {
    const p = r.players[0];
    r.holes.forEach(h => {
      const tee = extractTeeShot(h, p);
      const shots = tee ? [tee, ...extractClubShots(h, p)] : extractClubShots(h, p);
      shots.forEach(shot => {
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
