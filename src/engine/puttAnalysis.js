// ─── 퍼팅 분석 (퍼트 거리 기반) ──────────────────────────────────────────────────
//
// 3퍼트 이상이 났을 때 '거리감 때문인지 · 숏퍼트를 놓친 건지'를 퍼트 거리로 구분한다.
// 거리가 기록되어 있지 않으면 어느 쪽이라고 결론내리지 않고 '원인 판단 보류'로 둔다 —
// 거리 기록 없이 거리감 탓으로 단정하지 않는다.
//
// 원인(cause)
//   lag     거리감      — 롱 퍼트(6m+)를 시작했고 2m 이상 남겼다
//   short   숏퍼트 미스 — 1.5m 이내 퍼트를 놓쳤다 (마지막 퍼트 전에 있었다)
//   both    둘 다       — 롱 퍼트를 크게 남겼고, 그 뒤 숏퍼트도 놓쳤다
//   mid     중거리      — 3~6m에서 시작했거나, 롱 퍼트를 잘 붙인 뒤 1.5~2m를 놓쳤다 (라인·속도)
//   close   가까운 거리 — 3m 이내에서 시작한 3퍼트 (거리감보다 속도·라인)
//   unknown 판단 보류   — 퍼트 거리 기록이 없다
//
// confidence
//   measured  거리 기록으로 확인한 원인
//   inferred  첫 퍼트가 롱 퍼트였다는 사실만 있다 (남은 거리 미기록) — '가능성'으로만 말한다
//   none      원인을 판단하지 않음

export const PUTT_THRESHOLD = {
  shortM: 1.5,      // 이 이하에서 놓치면 숏퍼트 미스
  midM: 3,          // 3m 미만 = 가까운 거리
  longM: 6,         // 6m 이상 = 롱 퍼트
  leaveM: 2,        // 롱 퍼트 뒤 이 이상 남기면 거리감 문제
  longMadeM: 8,     // 8m 이상 퍼트를 넣으면 '롱 퍼트 성공'
  lagGreatM: 1.0,   // 롱 퍼트(8m+) 뒤 이 이하로 남기면 '거리 컨트롤 훌륭'
  farGirM: 12,      // 그린은 잡았지만 핀이 12m 이상 멀다
  closeGirM: 3,     // 첫 퍼트 3m 이내 = 어프로치 근접
};

export const PUTT_CAUSE_LABEL = {
  lag: '거리감 (롱 퍼트)',
  short: '숏퍼트 미스',
  both: '거리감 + 숏퍼트 미스',
  mid: '중거리 퍼트',
  close: '가까운 거리 3퍼트',
  unknown: '원인 판단 보류',
};
export const PUTT_CAUSE_ORDER = ['lag', 'short', 'both', 'mid', 'close', 'unknown'];

const fm = (d) => `${Number.isInteger(d) ? d : d.toFixed(1)}m`;

// 퍼트 순서열 — 퍼트 수(putts)가 기준이고, 거리는 puttDetails에서 가져온다.
// 마지막 퍼트가 홀에 들어간 퍼트다.
export function puttSequence(score) {
  const details = Array.isArray(score?.puttDetails) ? score.puttDetails : [];
  const count = Number.isFinite(score?.putts) ? score.putts : details.length;
  const seq = [];
  for (let i = 0; i < count; i++) {
    const d = details[i] || {};
    const distance = typeof d.distance === 'number' && d.distance > 0 ? d.distance : null;
    const aim = typeof d.aimDistance === 'number' && d.aimDistance > 0 ? d.aimDistance : null;
    seq.push({ no: i + 1, distance, aim, made: i === count - 1 });
  }
  return seq;
}

// 한 줄 표기 — "12m → 2.5m → 0.4m"  (기록 없는 퍼트는 '?')
export function puttsLine(seq) {
  if (!seq || seq.length === 0) return '';
  return seq.map(p => (p.distance != null ? fm(p.distance) : '?')).join(' → ');
}

export function analyzePutts(score) {
  const T = PUTT_THRESHOLD;
  const seq = puttSequence(score);
  const count = seq.length;
  const dists = seq.map(p => p.distance);
  const recordedCount = dists.filter(d => d != null).length;
  const first = dists[0] ?? null;
  const second = dists[1] ?? null;

  const out = {
    count, seq, recordedCount,
    hasDistance: recordedCount > 0,
    firstDistance: first,
    leaveDistance: second,
    line: puttsLine(seq),
    isThreePutt: count >= 3,
    cause: null, causeLabel: null, confidence: null,
    detail: null, advice: null,
    shortMissDistance: null,
    longMade: count === 1 && first != null && first >= T.longMadeM,
    lagGreat: count === 2 && first != null && first >= T.longMadeM && second != null && second <= T.lagGreatM,
  };
  if (count < 3) return out;

  const missed = seq.slice(0, -1);
  const shortMisses = missed.filter(p => p.distance != null && p.distance <= T.shortM);
  const longStart = first != null && first >= T.longM;
  const bigLeave = second != null && second >= T.leaveM;
  const lagKnown = longStart && bigLeave;
  const lagLikely = longStart && second == null;
  const worstShort = shortMisses.length > 0 ? shortMisses[shortMisses.length - 1] : null;

  const set = (cause, confidence, detail, advice) => {
    out.cause = cause;
    out.causeLabel = PUTT_CAUSE_LABEL[cause];
    out.confidence = confidence;
    out.detail = detail;
    out.advice = advice;
  };

  if (lagKnown && worstShort) {
    out.shortMissDistance = worstShort.distance;
    set('both', 'measured',
      `첫 퍼트 ${fm(first)}에서 ${fm(second)}가 남았고, ${worstShort.no}번째 퍼트 ${fm(worstShort.distance)}(숏퍼트)도 놓쳤습니다 — 거리감과 숏퍼트 마무리가 함께 문제였습니다.`,
      '롱 퍼트는 홀보다 1m 원 안에 세우는 데 집중하고, 1.5m 이내 퍼트는 루틴을 지켜 끝까지 마무리하세요.');
    return out;
  }
  if (worstShort) {
    out.shortMissDistance = worstShort.distance;
    const lead = first != null && first >= T.midM && second != null && second <= T.shortM
      ? ` 첫 퍼트는 ${fm(first)}에서 ${fm(second)}까지 잘 붙였습니다(거리감은 양호).`
      : '';
    set('short', 'measured',
      `${worstShort.no}번째 퍼트 ${fm(worstShort.distance)}(숏퍼트)를 놓쳐 3퍼트가 됐습니다 — 거리감이 아니라 숏퍼트 마무리 문제입니다.${lead}`,
      '1.5m 이내는 속도보다 라인과 스트로크 정확도입니다. 같은 루틴으로 짧은 퍼트를 끝까지 지켜보는 연습을 하세요.');
    return out;
  }
  if (lagKnown) {
    set('lag', 'measured',
      `첫 퍼트 ${fm(first)}에서 ${fm(second)}가 남았습니다 — 롱 퍼트 거리감(거리 컨트롤) 문제입니다.`,
      '롱 퍼트는 홀을 노리기보다 1m 원 안에 세우는 데 집중하세요. 6m 이상에서 남는 거리를 1.5m 이내로 줄이는 드릴이 효과적입니다.');
    return out;
  }
  if (lagLikely) {
    set('lag', 'inferred',
      `첫 퍼트가 ${fm(first)}의 롱 퍼트였습니다. 남은 거리가 기록되지 않아 거리감 때문일 가능성은 있지만 확정할 수 없습니다.`,
      '두 번째 퍼트 거리까지 기록하면 거리감 문제인지 숏퍼트 미스인지 구분됩니다.');
    return out;
  }
  if (first != null && first < T.midM) {
    set('close', 'measured',
      `${fm(first)}의 가까운 거리에서 시작한 3퍼트입니다${second != null ? ` (첫 퍼트 뒤 ${fm(second)} 남음)` : ''} — 거리감보다 속도(너무 강하게 침)나 라인 읽기 문제로 보입니다.`,
      '가까운 거리 첫 퍼트는 홀 뒤 30cm를 넘기지 않는 속도로, 라인을 먼저 확정한 뒤 치세요.');
    return out;
  }
  if (first != null && first < T.longM) {
    set('mid', 'measured',
      `중거리(${fm(first)})에서 시작해 ${second != null ? `${fm(second)}를 남기고 ` : ''}한 번 더 놓쳤습니다 — 거리감이나 숏퍼트 미스로 단정하기 어렵고 라인·속도 읽기를 점검할 구간입니다.`,
      '3~6m 구간은 홀 주변 60cm 원 안에 세우는 속도를 우선하고, 라인은 한 번만 확정하세요.');
    return out;
  }
  if (first != null && first >= T.longM && second != null) {
    set('mid', 'measured',
      `롱 퍼트(${fm(first)})는 ${fm(second)}까지 잘 붙였지만 다음 퍼트를 놓쳤습니다 — 거리감 문제는 아니었습니다.`,
      '잘 붙인 뒤의 1.5~2m 퍼트는 라인 확인과 스트로크 리듬에 집중하세요.');
    return out;
  }
  // 첫 퍼트 거리를 모른다
  set('unknown', 'none',
    second != null
      ? `첫 퍼트 거리가 기록되지 않았고 두 번째 퍼트는 ${fm(second)}였습니다 — 거리감인지 숏퍼트 미스인지 확정할 수 없습니다.`
      : '퍼트 거리 기록이 없어 거리감인지 숏퍼트 미스인지 구분할 수 없습니다.',
    '퍼트 거리(m)를 입력하면 3퍼트 원인을 거리감 / 숏퍼트 미스로 구분해 드립니다.');
  return out;
}

// 여러 홀의 분석을 원인별로 집계한다.
export function summarizePuttCauses(analyses) {
  const counts = { lag: 0, short: 0, both: 0, mid: 0, close: 0, unknown: 0 };
  let total = 0;
  analyses.forEach(a => {
    if (!a || !a.isThreePutt || !a.cause) return;
    counts[a.cause]++;
    total++;
  });
  const known = total - counts.unknown;
  const lagTotal = counts.lag + counts.both;
  const shortTotal = counts.short + counts.both;
  // 가장 많은 원인 (판단 보류 제외). 동률이면 앞선 순서 우선.
  let dominant = null;
  PUTT_CAUSE_ORDER.filter(c => c !== 'unknown').forEach(c => {
    if (counts[c] > 0 && (dominant == null || counts[c] > counts[dominant])) dominant = c;
  });
  return { total, counts, known, lagTotal, shortTotal, dominant };
}

// 퍼트 거리 기록률 — 퍼트가 1개 이상인 홀 중 첫 퍼트 거리가 기록된 비율
export function puttDistanceCoverage(scores) {
  let holes = 0, withDistance = 0;
  scores.forEach(s => {
    if (!s || !(s.putts >= 1)) return;
    holes++;
    if (puttSequence(s).some(p => p.distance != null)) withDistance++;
  });
  return { holes, withDistance, rate: holes > 0 ? withDistance / holes : null };
}
