// ─── 누적(여러 라운드) 인사이트 ──────────────────────────────────────────────────
// 한 라운드 룰로는 보이지 않는 '추세'와 '반복'을 만든다.
// rounds[0] = 최신 라운드. 1인 라운드만 들어온다고 가정한다.

import { analyzePutts, summarizePuttCauses } from './puttAnalysis.js';
import { penaltyCount } from './penalties.js';

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const std = (a) => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };
const fmt = (n, d = 1) => Number(n).toFixed(d);

function roundStats(r) {
  const p = r.players[0];
  const holes = r.holes;
  const score = holes.reduce((s, h) => s + (h.scores[p]?.strokes || 0), 0);
  const par = r.pars.reduce((a, b) => a + b, 0);
  const putts = holes.reduce((s, h) => s + (h.scores[p]?.putts ?? 2), 0);
  const gir = holes.filter(h => h.scores[p]?.gir === true).length;
  const pen = holes.reduce((s, h) => s + (h.scores[p] ? penaltyCount(h.scores[p]) : 0), 0);
  const three = holes.filter(h => (h.scores[p]?.putts ?? 2) >= 3).length;
  return { id: r.id, course: r.courseName, score, par, diff: score - par, putts, gir, pen, three, holeCount: holes.length };
}

const mk = (id, severity, category, insightType, title, summary, recommendation, tags) => ({
  id, scope: 'career', holeNumber: null, insightType, severity, category, title, summary, recommendation, tags,
});

export function buildCareerInsights(rounds) {
  const out = [];
  if (!rounds || rounds.length < 2) return out;
  const st = rounds.map(roundStats);
  const n = rounds.length;

  // ── 스코어 추세 (최근 3 vs 그 이전)
  if (n >= 4) {
    const recent = st.slice(0, 3);
    const before = st.slice(3, 6);
    const d = mean(before.map(s => s.diff)) - mean(recent.map(s => s.diff));   // +면 좋아짐
    if (d >= 2) out.push(mk('C001', 'positive', 'score', 'score_trend_improving',
      '스코어가 좋아지는 추세',
      `최근 3라운드 평균이 그 이전 ${before.length}라운드보다 ${fmt(d)}타 낮아졌습니다.`,
      '좋아진 구간의 공통점(티샷·퍼팅·페널티)을 확인해 연습 방향을 이어가세요.',
      ['score', 'trend', 'positive']));
    else if (d <= -2) out.push(mk('C002', 'warning', 'score', 'score_trend_worsening',
      '최근 스코어가 나빠지는 추세',
      `최근 3라운드 평균이 그 이전 ${before.length}라운드보다 ${fmt(-d)}타 높아졌습니다.`,
      '손실이 어느 카테고리(퍼팅·티샷·페널티)에서 늘었는지 라운드 복기에서 확인하세요.',
      ['score', 'trend']));
  }

  // ── 베스트 라운드
  if (n >= 3) {
    const best = st.reduce((a, b) => (b.score < a.score ? b : a));
    out.push(mk('C003', 'neutral', 'score', 'best_round',
      '베스트 라운드',
      `${best.course || '라운드'} ${best.score}타 (${best.diff >= 0 ? '+' : ''}${best.diff}) — ${n}라운드 중 최저 스코어입니다.`,
      '베스트 라운드의 퍼트 수·GIR·페널티를 기준으로 삼아 다른 라운드와 비교해 보세요.',
      ['score', 'best']));
  }

  // ── 편차
  if (n >= 3) {
    const sd = std(st.map(s => s.score));
    if (sd >= 5) out.push(mk('C004', 'neutral', 'pace', 'inconsistency',
      '라운드마다 편차가 큼',
      `최근 ${n}라운드 스코어 편차 ±${fmt(sd)}타 — 컨디션과 큰 실수 유무에 따라 스코어가 크게 달라집니다.`,
      '편차의 대부분은 더블 이상·페널티에서 옵니다. 큰 실수를 줄이는 전략 규칙부터 정해 보세요.',
      ['pace', 'consistency']));
  }

  // ── 퍼트 수 추세
  if (n >= 4) {
    const recent = mean(st.slice(0, 3).map(s => s.putts));
    const before = mean(st.slice(3, 6).map(s => s.putts));
    const d = before - recent;
    if (d >= 1.5) out.push(mk('C005', 'positive', 'putting', 'putts_trend_improving',
      '퍼트 수가 줄고 있음',
      `최근 3라운드 평균 ${fmt(recent)}퍼트 — 이전 ${fmt(before)}퍼트보다 ${fmt(d)}개 줄었습니다.`,
      '퍼트 거리 기록을 유지하면 어떤 구간이 좋아졌는지 확인할 수 있습니다.',
      ['putting', 'trend', 'positive']));
    else if (d <= -1.5) out.push(mk('C006', 'warning', 'putting', 'putts_trend_worsening',
      '퍼트 수가 늘고 있음',
      `최근 3라운드 평균 ${fmt(recent)}퍼트 — 이전 ${fmt(before)}퍼트보다 ${fmt(-d)}개 늘었습니다.`,
      '3퍼트 원인(거리감 / 숏퍼트)을 나눠 보고 늘어난 쪽을 먼저 연습하세요.',
      ['putting', 'trend']));
  }

  // ── 3퍼트 원인 누적
  const analyses = [];
  rounds.forEach(r => {
    const p = r.players[0];
    r.holes.forEach(h => {
      const s = h.scores[p];
      if (!s || s.touched === false) return;
      const a = analyzePutts(s);
      if (a.isThreePutt) analyses.push(a);
    });
  });
  const cs = summarizePuttCauses(analyses);
  if (cs.total >= 3 && cs.known >= 3) {
    const lag = cs.lagTotal, sh = cs.shortTotal;
    const top = Math.max(lag, sh, cs.counts.mid, cs.counts.close);
    if (top / cs.known >= 0.5) {
      const which = lag === top ? '거리감(롱 퍼트)' : sh === top ? '숏퍼트 미스' : cs.counts.mid === top ? '중거리 퍼트' : '가까운 거리 퍼트';
      const advice = lag === top
        ? '롱 퍼트는 홀이 아니라 1m 원에 세우는 거리 컨트롤 드릴을 우선하세요.'
        : sh === top
          ? '1.5m 이내 마무리 루틴(게이트·원형 드릴)을 우선하세요.'
          : '3~6m 구간의 라인 확정과 속도(홀 뒤 60cm)를 우선하세요.';
      out.push(mk('C007', 'warning', 'putting', 'three_putt_cause_dominant',
        `누적 3퍼트의 주원인: ${which}`,
        `${n}라운드 동안 3퍼트 ${cs.total}회 중 원인이 구분된 ${cs.known}회에서 ${which}이 ${top}회(${Math.round((top / cs.known) * 100)}%)였습니다.${cs.counts.unknown ? ` (판단 보류 ${cs.counts.unknown}회)` : ''}`,
        advice,
        ['putting', 'three_putt', 'pattern', 'trend']));
    }
  }
  if (cs.total >= 3 && cs.counts.unknown / cs.total >= 0.5) {
    out.push(mk('C008', 'neutral', 'data', 'three_putt_data_gap',
      '3퍼트 원인 판단 보류가 많음',
      `누적 3퍼트 ${cs.total}회 중 ${cs.counts.unknown}회는 퍼트 거리가 없어 거리감인지 숏퍼트 미스인지 구분하지 못했습니다.`,
      '퍼트마다 거리(m)를 입력하면 누적 원인 분석이 정확해집니다.',
      ['putting', 'three_putt', 'data']));
  }

  // ── 페널티 추세
  if (n >= 4) {
    const recent = mean(st.slice(0, 3).map(s => s.pen));
    const before = mean(st.slice(3, 6).map(s => s.pen));
    if (before - recent >= 1.5) out.push(mk('C009', 'positive', 'penalty', 'penalty_trend_improving',
      '페널티가 줄고 있음',
      `최근 3라운드 평균 페널티 ${fmt(recent)}회 — 이전 ${fmt(before)}회보다 줄었습니다.`,
      '위험 지역 회피 전략이 효과를 보고 있습니다. 계속 유지하세요.',
      ['penalty', 'trend', 'positive']));
    else if (recent - before >= 1.5) out.push(mk('C010', 'warning', 'penalty', 'penalty_trend_worsening',
      '페널티가 늘고 있음',
      `최근 3라운드 평균 페널티 ${fmt(recent)}회 — 이전 ${fmt(before)}회보다 늘었습니다.`,
      '페널티가 난 홀의 티샷 클럽과 위험 지역 위치를 복기해 안전한 루트를 정해 두세요.',
      ['penalty', 'trend']));
  }

  // ── 같은 코스·같은 홀 반복 손실
  const holeMap = new Map();
  rounds.forEach(r => {
    const p = r.players[0];
    if (!r.courseName) return;
    r.holes.forEach(h => {
      const s = h.scores[p];
      if (!s || s.touched === false) return;
      const key = `${r.courseName}|${h.holeNumber}`;
      const e = holeMap.get(key) ?? { course: r.courseName, hole: h.holeNumber, par: h.par, diffs: [] };
      e.diffs.push((s.strokes ?? h.par) - h.par);
      holeMap.set(key, e);
    });
  });
  const repeat = [...holeMap.values()].filter(e => e.diffs.length >= 2 && mean(e.diffs) >= 1.5)
    .sort((a, b) => mean(b.diffs) - mean(a.diffs))[0];
  if (repeat) {
    out.push(mk('C011', 'warning', 'score', 'repeat_hole_loss',
      `${repeat.course} ${repeat.hole}번 홀 반복 손실`,
      `${repeat.course} ${repeat.hole}번 홀(파${repeat.par})에서 ${repeat.diffs.length}라운드 평균 +${fmt(mean(repeat.diffs))}타를 잃었습니다.`,
      '같은 홀에서 반복되는 손실은 공략 전략을 바꿔야 하는 신호입니다. 티샷 클럽·목표 지점을 한 번 정해 두세요.',
      ['score', 'repeat', 'course']));
  }

  return out;
}

// 라운드 요약 지표 (리포트·검색 카드 맥락 표시용)
export { roundStats };
