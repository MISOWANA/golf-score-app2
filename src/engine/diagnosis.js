// ─── 진단 카드 방향 문구 (기획서 §4-2) ─────────────────────────────────────────
// 스코어 5단계 분해에서 가장 많이 잃은 카테고리(topCause)를 정하고, 그 카테고리
// 안에서 우선순위가 가장 높은 트리거 하나만 골라 방향 문구를 만든다.
// 복수 출력 금지 — 여러 트리거가 동시에 맞아도 먼저 매치되는 것 하나만 쓴다.
// 명령형("~하세요") 대신 관찰 사실만 인용한다.

import { toBreakdownInput, buildRoundBreakdown } from './scoreBreakdown.js';

function firstPuttDistance(hole, player) {
  return hole.scores?.[player]?.puttDetails?.[0]?.distance ?? null;
}

function puttingDirective(round, player, breakdownHoles) {
  const threePuttHoles = breakdownHoles.filter(h => h.categories.putting > 0);
  if (threePuttHoles.length > 0) {
    const withFirstPuttDist = threePuttHoles
      .map(h => firstPuttDistance(round.holes[h.holeNumber - 1], player))
      .filter(d => d != null);
    const longStarts = withFirstPuttDist.filter(d => d >= 5).length;
    if (withFirstPuttDist.length > 0 && longStarts / withFirstPuttDist.length >= 0.6) {
      return {
        observation: `3퍼트 ${threePuttHoles.length}회 중 ${longStarts}회가 5m 이상 거리에서 시작됐습니다.`,
        directive: '롱퍼트 거리 컨트롤',
      };
    }
    return {
      observation: `이번 라운드 3퍼트가 ${threePuttHoles.length}회 발생했습니다.`,
      directive: '3퍼트 이후 다음 퍼트 루틴',
    };
  }

  // 2m 이내 실패
  let shortMiss = 0;
  round.holes.forEach(h => {
    (h.scores?.[player]?.puttDetails ?? []).forEach(p => {
      if (p?.holein === 'fail' && p.distance != null && p.distance <= 2) shortMiss++;
    });
  });
  if (shortMiss >= 3) {
    return { observation: `2m 이내 퍼트 실패가 ${shortMiss}회 있었습니다.`, directive: '숏퍼트 마무리' };
  }

  return { observation: '이번 라운드 퍼팅에서 손실이 가장 컸습니다.', directive: '그린 위 루틴 점검' };
}

function teeDirective(round, player) {
  let L = 0, R = 0;
  const penaltyByClub = {};
  round.holes.forEach(h => {
    if (h.par <= 3) return;
    const s = h.scores?.[player];
    if (!s) return;
    if (s.fairwayHit === 'L') L++;
    else if (s.fairwayHit === 'R') R++;
    const penalty = (s.ob ?? 0) + (s.hazard ?? 0);
    if (penalty > 0 && s.teeClub) {
      penaltyByClub[s.teeClub] = (penaltyByClub[s.teeClub] ?? 0) + penalty;
    }
  });

  if (L + R > 0 && Math.max(L, R) >= 2 && Math.max(L, R) >= 2 * Math.min(L, R)) {
    const side = R > L ? '오른쪽' : '왼쪽';
    return { observation: `티샷 미스 ${L + R}회 중 ${side}으로 ${Math.max(L, R)}회 치우쳤습니다.`, directive: `${side} 방향 미스 반복` };
  }

  const clubEntries = Object.entries(penaltyByClub).sort((a, b) => b[1] - a[1]);
  if (clubEntries.length > 0 && clubEntries[0][1] >= 2) {
    return { observation: `${clubEntries[0][0].toUpperCase()} 클럽에서 페널티 ${clubEntries[0][1]}회가 몰렸습니다.`, directive: '해당 홀에서 티샷 클럽 선택' };
  }

  return { observation: '이번 라운드 티샷에서 손실이 가장 컸습니다.', directive: '티샷 방향성 점검' };
}

function approachDirective(round, player) {
  let shortCount = 0, total = 0;
  round.holes.forEach(h => {
    const clock = h.scores?.[player]?.onGreenLanding;
    if (clock == null) return;
    total++;
    if (clock >= 5 && clock <= 7) shortCount++;
  });
  if (total >= 3 && shortCount / total >= 0.6) {
    return { observation: `그린 착탄 중 ${shortCount}/${total}회가 짧게(SHORT) 떨어졌습니다.`, directive: '거리 부족 반복' };
  }
  return { observation: '이번 라운드 어프로치에서 손실이 가장 컸습니다.', directive: '그린 적중 거리 관리' };
}

function shortGameDirective(round, player) {
  let attempts = 0, saves = 0;
  round.holes.forEach(h => {
    const s = h.scores?.[player];
    if (!s || s.gir !== false) return;
    attempts++;
    if ((s.strokes ?? h.par) - h.par <= 0) saves++;
  });
  if (attempts > 0) {
    const rate = (saves / attempts) * 100;
    return { observation: `그린 미스 ${attempts}회 중 파 세이브 ${saves}회 (${rate.toFixed(0)}%).`, directive: '그린 주변 리커버리' };
  }
  return { observation: '이번 라운드 숏게임에서 손실이 가장 컸습니다.', directive: '그린 주변 컨택 점검' };
}

function penaltyDirective(round, player) {
  let count = 0;
  round.holes.forEach(h => { const s = h.scores?.[player]; if (s) count += (s.ob ?? 0) + (s.hazard ?? 0); });
  return { observation: `OB·해저드가 ${count}건 발생했습니다.`, directive: '위험 지역 공략 루트 재검토' };
}

const DIRECTIVE_BUILDERS = {
  putting: (round, player, bh) => puttingDirective(round, player, bh),
  tee: (round, player) => teeDirective(round, player),
  approach: (round, player) => approachDirective(round, player),
  shortGame: (round, player) => shortGameDirective(round, player),
  penalty: (round, player) => penaltyDirective(round, player),
};

// round: 앱의 round 객체 (holes 배열 포함). player: 플레이어 키.
export function buildRoundDiagnosis(round, player) {
  const inputs = round.holes.map(h => toBreakdownInput(h, player));
  const breakdown = buildRoundBreakdown(inputs);
  const top = breakdown.topCause;
  if (!top) return { breakdown, top: null, observation: null, directive: null };

  const builder = DIRECTIVE_BUILDERS[top.category];
  const result = builder ? builder(round, player, breakdown.holes) : null;

  return {
    breakdown,
    top,
    observation: result?.observation ?? null,
    directive: result?.directive ?? null,
  };
}
