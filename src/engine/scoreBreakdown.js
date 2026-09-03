// ─── 스코어 5단계 분해 (기획서 §4-1) ───────────────────────────────────────────
//
// 홀손실       = 스코어 - PAR
// 퍼팅손실     = 퍼팅수 - 2                      (1퍼트면 -1, 음수 허용)
// 그린도달초과 = 홀손실 - 퍼팅손실                (항등식, 항상 성립)
// 페널티손실   = min(그린도달초과, (OB+해저드)*2)  ※ OB/해저드 1회 = 페널티 1타+재샷 1타
// 잔여         = 그린도달초과 - 페널티손실
//
// 잔여의 첫 1타: 티샷 랜딩 L/R → 티샷 / 티샷 랜딩 C/G → 어프로치
// 잔여의 2타째~: 숏게임
//
// 다섯 카테고리(penalty·putting·tee·approach·shortGame)의 합은 항상 홀손실과
// 정확히 일치한다. 이 항등식이 깨지면 진단 카드의 숫자가 실제 스코어와 어긋난다.

export function toBreakdownInput(hole, player) {
  const s = hole.scores?.[player] ?? {};
  return {
    holeNumber: hole.holeNumber,
    par: hole.par,
    score: s.strokes ?? hole.par,
    putts: s.putts ?? 2,
    ob: s.ob ?? 0,
    hazard: s.hazard ?? 0,
    teeGIR: s.teeGIR ?? false,
    fairwayHit: s.fairwayHit ?? null, // 'L' | 'C' | 'R' | null (par>3)
    gir: s.gir ?? null,
    onGreenLanding: s.onGreenLanding ?? null, // 1~12시, par3 포함 전체 홀
  };
}

// 티샷이 남긴 랜딩존: 'L' | 'C' | 'R' | 'G'
// par>3: 페어웨이 랜딩 칩(L/C/R) 또는 1온(G) 그대로 사용.
// par3: 티샷이 곧 온그린 시도이므로 온그린 랜딩(12시계) 좌/우만 L/R로, 그 외(롱/숏/센터)는 C로 묶는다.
function getLandingZone(input) {
  if (input.par > 3) {
    if (input.teeGIR === true) return 'G';
    if (input.fairwayHit === 'L') return 'L';
    if (input.fairwayHit === 'R') return 'R';
    return 'C';
  }
  if (input.gir === true) return 'G';
  const clock = input.onGreenLanding;
  if (clock != null) {
    if (clock >= 8 && clock <= 10) return 'L';
    if (clock >= 2 && clock <= 4) return 'R';
  }
  return 'C';
}

export function buildHoleBreakdown(input) {
  const holeLoss = input.score - input.par;
  const puttLoss = input.putts - 2;
  const overGreenExcess = holeLoss - puttLoss;
  const penaltyStrokes = (input.ob + input.hazard) * 2;
  const penaltyLoss = Math.min(Math.max(0, overGreenExcess), penaltyStrokes);
  const remaining = overGreenExcess - penaltyLoss;

  const teeOrApproachLoss = Math.min(remaining, 1);
  const shortGameLoss = remaining - teeOrApproachLoss;

  const zone = getLandingZone(input);
  const teeApproachCategory = (zone === 'L' || zone === 'R') ? 'tee' : 'approach';

  const categories = {
    penalty: penaltyLoss,
    putting: puttLoss,
    tee: teeApproachCategory === 'tee' ? teeOrApproachLoss : 0,
    approach: teeApproachCategory === 'approach' ? teeOrApproachLoss : 0,
    shortGame: shortGameLoss,
  };

  let primaryCause = null;
  if (holeLoss > 0) {
    primaryCause = Object.entries(categories).reduce(
      (best, [k, v]) => (v > (categories[best] ?? -Infinity)) ? k : best,
      Object.keys(categories)[0]
    );
  }

  return { holeNumber: input.holeNumber, par: input.par, score: input.score, holeLoss, categories, primaryCause, zone };
}

const CATEGORY_LABEL = {
  penalty:   'OB·해저드',
  putting:   '퍼팅',
  tee:       '티샷',
  approach:  '어프로치',
  shortGame: '숏게임',
};
export { CATEGORY_LABEL };

export function buildRoundBreakdown(inputs) {
  const holes = inputs.map(buildHoleBreakdown);

  const totals = { penalty: 0, putting: 0, tee: 0, approach: 0, shortGame: 0 };
  const holeCounts = { penalty: 0, putting: 0, tee: 0, approach: 0, shortGame: 0 };
  holes.forEach(h => {
    Object.keys(totals).forEach(k => {
      const v = h.categories[k];
      if (v > 0) { totals[k] += v; holeCounts[k] += 1; }
    });
  });

  const totalLoss = Object.values(totals).reduce((a, b) => a + b, 0);
  const ranked = Object.entries(totals)
    .map(([category, strokes]) => ({
      category,
      label: CATEGORY_LABEL[category],
      strokes,
      holeCount: holeCounts[category],
      pct: totalLoss > 0 ? (strokes / totalLoss) * 100 : 0,
    }))
    .filter(r => r.strokes > 0)
    .sort((a, b) => b.strokes - a.strokes);

  return { holes, totals, totalLoss, ranked, topCause: ranked[0] ?? null };
}
