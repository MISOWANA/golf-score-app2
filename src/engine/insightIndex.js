// ─── 인사이트 색인 · 라운드 복기 · 리포트 ────────────────────────────────────────
// 같은 분석 결과(analyzeRound)를 세 가지 모양으로 보여주기 위한 데이터 모델.
//   buildRoundReplay    라운드 복기 — 홀 순서대로 무슨 일이 있었는지
//   buildInsightIndex   검색 — 모든 라운드·홀·누적 인사이트를 한 목록으로
//   buildInsightReport  리포트 — 강점/개선점/다음 라운드 포커스
// 세 화면의 숫자는 모두 같은 원천(analyzeRound·buildRoundBreakdown)에서 나오므로 서로 일치한다.

import { toHoleInput, analyzeRound } from './engine.js';
import { HOLE_RULES } from './rules/holeRules.js';
import { ROUND_RULES } from './rules/roundRules.js';
import { INSIGHT_CATEGORY_LABEL } from './rules/category.js';
import { analyzePutts, summarizePuttCauses, PUTT_CAUSE_LABEL } from './puttAnalysis.js';
import { toBreakdownInput, buildRoundBreakdown, CATEGORY_LABEL } from './scoreBreakdown.js';
import { buildCareerInsights, roundStats } from './careerInsights.js';
import { penaltyCount } from './penalties.js';
import { totalPar } from './players.js';
import { isBackHole } from './nines.js';
import { hasHoleMap } from './geo.js';
import { greenSpeedRoundInsights, buildGreenSpeedReport, GREEN_SPEED_TIPS } from './greenSpeed.js';

export const SEVERITY_ORDER = { critical: 0, warning: 1, neutral: 2, positive: 3 };
export const SEVERITY_LABEL = { critical: '심각', warning: '주의', neutral: '참고', positive: '좋은 점' };

// 심각도 순. 같은 심각도 안에서는 나쁜 쪽(심각·주의)은 큰 사건(priority 큰 것)이 먼저,
// 좋은 쪽은 드문 기록(priority 작은 것: 홀인원·이글·버디)이 먼저 나온다.
export const sortInsights = (list) =>
  [...list].sort((a, b) => {
    const s = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    if (s !== 0) return s;
    const bad = a.severity === 'critical' || a.severity === 'warning';
    return bad ? (b.priority ?? 0) - (a.priority ?? 0) : (a.priority ?? 0) - (b.priority ?? 0);
  });

// 매일 나오는 평범한 좋은 소식 — 복기에서는 보이지만 리포트의 '잘한 점'에서는 뺀다
const ROUTINE_POSITIVE = new Set(['fairway_hit', 'gir_success', 'textbook_par', 'par3_gir']);

// 홀 배지의 점수·±가 이미 말하는 내용을 문장으로 되풀이하는 카드 — 복기·리포트에서는 숨기고 검색에서만 찾을 수 있게 둔다
const RESTATES_SCORE = new Set(['bogey_clean', 'double_no_penalty']);

// 같은 홀의 카드는 가장 구체적인(정렬상 앞선) 1장만 남긴다
const onePerHole = (list) => {
  const seen = new Set();
  return list.filter(i => {
    if (i.scope !== 'hole' || i.grouped || i.holeNumber == null) return true;
    const k = `${i.roundId}:${i.holeNumber}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// ─── 라운드 복기 ───────────────────────────────────────────────────────────────
export function buildRoundReplay(round) {
  const player = round.players[0];
  const inputs = round.holes.map(h => toHoleInput(h, player));
  const { holeInsights, roundInsights } = analyzeRound(inputs, HOLE_RULES, ROUND_RULES);
  const breakdown = buildRoundBreakdown(round.holes.map(h => toBreakdownInput(h, player)));

  const holes = round.holes.map((h, i) => {
    const s = h.scores[player] ?? {};
    const pa = analyzePutts(s);
    const strokes = s.strokes ?? h.par;
    return {
      idx: i,                                   // round.holes 안의 위치 — 지도 복기(HoleReview)가 이 번호로 연다
      hasMap: hasHoleMap(s),                    // 저장된 지도 기록이 있는 홀
      holeNumber: h.holeNumber,
      par: h.par,
      strokes,
      diff: strokes - h.par,
      putts: s.putts ?? null,
      gir: s.gir ?? null,
      fairway: s.fairway ?? null,
      touched: s.touched !== false,
      penalty: penaltyCount(s),
      teeClub: s.teeClub ?? null,
      puttLine: pa.hasDistance ? pa.line : '',
      puttCause: pa.cause,
      puttCauseLabel: pa.causeLabel,
      memo: s.memo || '',
      insights: sortInsights(holeInsights[i] || []),          // 검색 색인용 (전체)
      shown: sortInsights((holeInsights[i] || []).filter(x => !RESTATES_SCORE.has(x.insightType))),   // 복기 화면용
    };
  });

  const score = holes.reduce((a, h) => a + h.strokes, 0);
  // 파는 홀에서 구한다 — round.pars 가 없는 예전 백업도 계산된다
  const par = totalPar(round);
  // 전반(1~9번)·후반(10~18번)은 홀 번호로 가른다 — 9홀 라운드는 한쪽만 있다
  const backAt = (i) => isBackHole(round.holes[i], i);
  const frontHoles = holes.filter((_, i) => !backAt(i));
  const backHoles = holes.filter((_, i) => backAt(i));
  const front = frontHoles.reduce((a, h) => a + h.strokes, 0);
  const back = backHoles.reduce((a, h) => a + h.strokes, 0);
  const sumPar = (list) => list.reduce((a, h) => a + (h.par || 0), 0);
  const frontPar = sumPar(frontHoles);
  const backPar = sumPar(backHoles);
  const touchedHoles = holes.filter(h => h.touched);
  const analyses = round.holes.map(h => analyzePutts(h.scores[player]));
  const causes = summarizePuttCauses(round.holes.map((h, i) => (holes[i].touched ? analyses[i] : null)));
  const penalties = holes.reduce((a, h) => a + h.penalty, 0);
  const threePutts = holes.filter(h => h.touched && (h.putts ?? 0) >= 3).length;

  // 분기점 — 손실이 가장 컸던 홀과 가장 잘 풀린 홀
  const ranked = touchedHoles.filter(h => h.diff > 0).sort((a, b) => b.diff - a.diff || a.holeNumber - b.holeNumber);
  const best = touchedHoles.filter(h => h.diff < 0).sort((a, b) => a.diff - b.diff || a.holeNumber - b.holeNumber);
  const worstHoles = ranked.slice(0, 3);
  const bestHoles = best.slice(0, 3);

  // 그날의 그린 스피드를 설정했으면 퍼팅 인사이트(빠른·느린 그린)를 더한다 — 리포트·검색도 이 복기를 쓴다
  const sortedRound = sortInsights([...roundInsights, ...greenSpeedRoundInsights(round)]);
  // 후반 − 전반 (9홀 환산) — 입력한 홀만 본다. 입력하지 않은 후반(파로 저장됨)을 '후반이 적음'으로 읽지 않게,
  // 양쪽 모두 3홀 이상 입력했을 때만 비교한다 (metrics.buildRoundMetrics 의 backFade 와 같은 기준).
  const MIN_HALF_HOLES = 3;
  const frontPlayed = frontHoles.filter(h => h.touched);
  const backPlayed = backHoles.filter(h => h.touched);
  const avgDiff = (list) => list.reduce((a, h) => a + h.diff, 0) / list.length;
  const fade = frontPlayed.length >= MIN_HALF_HOLES && backPlayed.length >= MIN_HALF_HOLES
    ? Math.round((avgDiff(backPlayed) - avgDiff(frontPlayed)) * 9)
    : 0;
  const headline = buildHeadline({ score, par, fade, breakdown, causes, penalties, threePutts });

  return {
    roundId: round.id, date: round.date, courseName: round.courseName, player, greenSpeed: round.greenSpeed ?? null,
    score, par, diff: score - par, front, back, frontPar, backPar,
    hasFront: frontHoles.length > 0, hasBack: backHoles.length > 0,   // 9홀 라운드는 한쪽만 보여 준다
    holes, roundInsights: sortedRound,
    breakdown, causes, penalties, threePutts,
    worstHoles, bestHoles,
    headline,
    mapHoles: holes.filter(h => h.hasMap).length,
    enteredHoles: touchedHoles.length,
    defaultHoles: holes.length - touchedHoles.length,
  };
}

function buildHeadline({ score, par, fade, breakdown, causes, penalties, threePutts }) {
  const diff = score - par;
  const sign = diff > 0 ? `+${diff}` : diff === 0 ? 'E' : `${diff}`;
  const top = breakdown.topCause;
  const bits = [];
  if (top && top.strokes > 0) bits.push(`${top.label}에서 ${top.strokes}타 손실`);
  if (threePutts > 0) {
    const detail = [];
    if (causes.counts.lag > 0) detail.push(`거리감 ${causes.counts.lag}`);
    if (causes.counts.short > 0) detail.push(`숏퍼트 미스 ${causes.counts.short}`);
    if (causes.counts.both > 0) detail.push(`둘 다 ${causes.counts.both}`);
    if (causes.counts.mid + causes.counts.close > 0) detail.push(`중거리·근거리 ${causes.counts.mid + causes.counts.close}`);
    if (causes.counts.unknown > 0) detail.push(`판단 보류 ${causes.counts.unknown}`);
    bits.push(`3퍼트 ${threePutts}회${detail.length ? `(${detail.join(' · ')})` : ''}`);
  }
  if (penalties > 0) bits.push(`페널티 ${penalties}회`);
  if (fade >= 4) bits.push(`후반이 전반보다 ${fade}타 많음`);
  else if (fade <= -3) bits.push(`후반이 전반보다 ${-fade}타 적음`);
  const tail = bits.length ? ` — ${bits.join(', ')}` : ' — 큰 손실 없이 마무리';
  return `${score}타 (${sign})${tail}`;
}

// ─── 검색 색인 ─────────────────────────────────────────────────────────────────
export function buildInsightIndex(rounds) {
  const items = [];
  const solo = rounds.filter(r => r.players.length === 1);
  solo.forEach(round => {
    const replay = buildRoundReplay(round);
    const base = { roundId: replay.roundId, roundDate: replay.date, courseName: replay.courseName };
    replay.holes.forEach(h => {
      h.insights.forEach(ins => {
        items.push({
          ...base, ...ins,
          key: `${replay.roundId}:H${h.holeNumber}:${ins.id}`,
          strokes: h.strokes, diff: h.diff, putts: h.putts, puttLine: h.puttLine,
        });
      });
    });
    replay.roundInsights.forEach(ins => {
      items.push({ ...base, ...ins, key: `${replay.roundId}:R:${ins.id}`, holeNumber: null });
    });
  });
  buildCareerInsights(solo).forEach(ins => {
    items.push({ ...ins, key: `career:${ins.id}`, roundId: null, roundDate: null, courseName: null });
  });
  return items.map(it => ({ ...it, categoryLabel: INSIGHT_CATEGORY_LABEL[it.category] ?? '', blob: blobOf(it) }));
}

// 한국어 검색에서 자주 쓰는 말 → 인사이트에 실제로 들어 있는 말
const SYNONYMS = {
  '3퍼트': ['3퍼트', 'three_putt', '쓰리퍼트', '4퍼트'],
  '쓰리퍼트': ['3퍼트', 'three_putt'],
  '숏퍼트': ['숏퍼트', 'short_putt', '1.5m'],
  '거리감': ['거리감', 'lag', 'distance_control', '거리 컨트롤'],
  '롱퍼트': ['롱 퍼트', '롱퍼트', 'long_putt', 'lag'],
  'ob': ['ob', '오비'],
  '오비': ['ob'],
  '해저드': ['해저드', 'hazard', '페널티구역'],
  '언플': ['언플레이어블', 'unplayable'],
  '드라이버': ['드라이버', 'driver'],
  '티샷': ['티샷', 'tee_shot', '페어웨이'],
  '어프로치': ['어프로치', 'approach', 'gir', '그린'],
  '그린': ['그린', 'gir', 'green'],
  '그린스피드': ['그린 스피드', '스팀프', 'green_speed'],
  '스팀프': ['스팀프', '그린 스피드', 'green_speed'],
  '퍼팅': ['퍼팅', '퍼트', 'putting'],
  '퍼트': ['퍼트', '퍼팅', 'putting'],
  '벌타': ['페널티', '벌타', 'penalty'],
  '페널티': ['페널티', 'penalty', '벌타'],
  '칩샷': ['칩', '숏게임', 'short_game'],
  '숏게임': ['숏게임', 'short_game', 'scramble', '칩'],
  '슬라이스': ['슬라이스', 'slice'],
  '훅': ['훅', 'hook'],
  '버디': ['버디', 'birdie'],
  '이글': ['이글', 'eagle'],
  '보기': ['보기', 'bogey'],
  '더블': ['더블', 'double'],
  '후반': ['후반', 'back_nine', '체력'],
  '전반': ['전반', '초반'],
};

function blobOf(it) {
  return [
    it.title, it.summary, it.recommendation, ...(it.tags || []), it.insightType,
    INSIGHT_CATEGORY_LABEL[it.category] ?? '', it.courseName ?? '',
    it.holeNumber != null ? `${it.holeNumber}번 홀 hole${it.holeNumber} 파${it.par}` : '',
    SEVERITY_LABEL[it.severity] ?? '',
    it.scope === 'career' ? '누적 추세 career' : it.scope === 'round' ? '라운드 요약' : '홀',
  ].filter(Boolean).join(' ').toLowerCase();
}

const norm = (s) => String(s ?? '').toLowerCase().trim();

function tokenMatches(blob, token) {
  // '7번' '7번홀' 같은 홀 번호 질의 — 그 홀의 인사이트만 (17번 홀이나 본문 속 '7번'은 제외)
  const m = token.match(/^(\d{1,2})번(?:홀)?$/);
  if (m) return new RegExp('\\bhole' + m[1] + '\\b').test(blob);
  if (blob.includes(token)) return true;
  const syn = SYNONYMS[token];
  if (syn) return syn.some(x => blob.includes(norm(x)));
  return false;
}

// filters: { query, severities: string[], categories: string[], scope: 'all'|'hole'|'round'|'career', roundId, par }
export function searchInsights(index, filters = {}) {
  const tokens = norm(filters.query).split(/\s+/).filter(Boolean);
  const sevs = filters.severities?.length ? new Set(filters.severities) : null;
  const cats = filters.categories?.length ? new Set(filters.categories) : null;
  const scope = filters.scope && filters.scope !== 'all' ? filters.scope : null;
  const hits = [];
  index.forEach(it => {
    if (sevs && !sevs.has(it.severity)) return;
    if (cats && !cats.has(it.category)) return;
    if (scope && it.scope !== scope) return;
    if (filters.roundId && it.roundId !== filters.roundId) return;
    if (filters.par != null && it.par !== filters.par) return;
    let score = 0;
    for (const t of tokens) {
      if (!tokenMatches(it.blob, t)) return;
      const title = norm(it.title);
      score += title.includes(t) ? 3 : norm(it.summary).includes(t) ? 2 : 1;
    }
    hits.push({ it, score });
  });
  hits.sort((a, b) =>
    b.score - a.score
    || (SEVERITY_ORDER[a.it.severity] ?? 9) - (SEVERITY_ORDER[b.it.severity] ?? 9)
    || String(b.it.roundDate ?? '').localeCompare(String(a.it.roundDate ?? ''))
    || (a.it.holeNumber ?? 99) - (b.it.holeNumber ?? 99));
  return hits.map(h => h.it);
}

// 칩으로 보여 줄 분류별 개수
export function countByCategory(items) {
  const c = {};
  items.forEach(it => { c[it.category] = (c[it.category] || 0) + 1; });
  return c;
}

// ─── 리포트 ────────────────────────────────────────────────────────────────────
// mode: 'round' = 최신 라운드, 'career' = 모든 라운드 합산
export function buildInsightReport(rounds, mode = 'round') {
  const solo = rounds.filter(r => r.players.length === 1);
  if (solo.length === 0) return null;
  const target = mode === 'career' ? solo : [solo[0]];
  const replays = target.map(buildRoundReplay);

  const holeInsights = replays.flatMap(r => r.holes.flatMap(h => h.shown.map(i => ({ ...i, roundId: r.roundId }))));
  const hasHoleFourPutt = holeInsights.some(i => i.insightType === 'four_putt');
  const roundInsights = replays.flatMap(r => r.roundInsights.map(i => ({ ...i, roundId: r.roundId })))
    // '4퍼트 이상 발생'은 홀 카드(퍼트 거리열 포함)가 같은 말을 하므로 라운드 요약은 생략한다
    .filter(i => !(hasHoleFourPutt && i.insightType === 'four_putt_round'));
  const careerInsights = mode === 'career' ? buildCareerInsights(solo) : [];

  // 같은 종류는 한 번만 — 누적에서는 횟수를 센다
  const group = (list) => {
    const m = new Map();
    list.forEach(i => {
      const g = m.get(i.insightType) ?? { ...i, count: 0, holes: [], roundIds: new Set() };
      g.count++;
      if (i.holeNumber != null) g.holes.push(i.holeNumber);
      if (i.roundId != null) g.roundIds.add(i.roundId);
      m.set(i.insightType, g);
    });
    return [...m.values()].map(g => {
      if (g.scope !== 'hole' || g.count <= 1) return g;
      // 같은 종류가 여러 홀에서 났으면 첫 홀의 문장 대신 어느 홀들인지 보여준다
      const holes = [...new Set(g.holes)].sort((a, b) => a - b);
      const where = g.roundIds.size > 1 ? `${g.roundIds.size}라운드에서 ` : '';
      return { ...g, holeNumber: null, par: null, grouped: true,
        summary: `${where}${g.count}개 홀 — ${holes.slice(0, 8).join(', ')}번 홀${holes.length > 8 ? ' 외' : ''}` };
    });
  };
  const all = group([...roundInsights, ...careerInsights, ...holeInsights]);

  const scopeRank = (i) => (i.scope === 'hole' ? 1 : 0);   // 라운드·누적 요약이 홀 단위보다 먼저
  const strengths = onePerHole(all.filter(i => i.severity === 'positive' && !ROUTINE_POSITIVE.has(i.insightType))
    .sort((a, b) => scopeRank(a) - scopeRank(b) || (a.priority ?? 0) - (b.priority ?? 0) || b.count - a.count)).slice(0, 4);
  const issues = onePerHole(all.filter(i => i.severity === 'critical' || i.severity === 'warning')
    .sort((a, b) => (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) || scopeRank(a) - scopeRank(b)
      || b.count - a.count || (b.priority ?? 0) - (a.priority ?? 0))).slice(0, 5);

  // 다음 라운드 포커스: 가장 큰 손실 카테고리 + 3퍼트 원인 조언 + 기록 보완
  const totals = { penalty: 0, putting: 0, tee: 0, approach: 0, shortGame: 0 };
  replays.forEach(r => Object.keys(totals).forEach(k => { totals[k] += r.breakdown.totals[k]; }));
  const ranked = Object.entries(totals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const focus = [];
  if (ranked.length) {
    const [cat, strokes] = ranked[0];
    const FOCUS_TEXT = {
      penalty: '위험 지역이 있는 홀의 공략 루트를 미리 정하고, 티샷 클럽을 한 단계 낮춰 안전한 방향으로',
      putting: '롱 퍼트는 1m 원에 세우고, 1.5m 이내는 루틴을 지켜 마무리하기',
      tee: '거리보다 페어웨이 확보 — 미스가 나는 쪽의 반대쪽으로 목표선 이동',
      approach: '핀보다 그린 중앙을 목표로 하고 남은 거리에 맞는 클럽을 한 번 더 확인',
      shortGame: '그린 주변에서 첫 퍼트를 2m 안에 남기는 샷 선택',
    };
    focus.push({ category: cat, text: `${CATEGORY_LABEL[cat]} 손실이 가장 큼 (${strokes}타) → ${FOCUS_TEXT[cat]}` });
  }
  const causeSum = summarizePuttCauses(replays.flatMap(r => r.holes.map(h => (h.touched && h.puttCause ? { isThreePutt: true, cause: h.puttCause } : null))));
  if (causeSum.total > 0) {
    if (causeSum.known === 0) {
      focus.push({ category: 'data', text: `3퍼트 ${causeSum.total}회의 원인을 구분할 수 없음 → 퍼트 거리(m)를 기록하기` });
    } else {
      const parts = [];
      if (causeSum.counts.lag) parts.push(`거리감 ${causeSum.counts.lag}회`);
      if (causeSum.counts.short) parts.push(`숏퍼트 미스 ${causeSum.counts.short}회`);
      if (causeSum.counts.both) parts.push(`둘 다 ${causeSum.counts.both}회`);
      if (causeSum.counts.mid) parts.push(`중거리 ${causeSum.counts.mid}회`);
      if (causeSum.counts.close) parts.push(`가까운 거리 ${causeSum.counts.close}회`);
      focus.push({ category: 'putting', text: `3퍼트 원인: ${parts.join(' · ')}${causeSum.counts.unknown ? ` (판단 보류 ${causeSum.counts.unknown}회)` : ''}` });
    }
  }
  // 그린 스피드: 이번 라운드(또는 누적)의 속도별 퍼팅 요약. 최근 라운드가 빠르거나 느린 그린이었고 3퍼트가 났으면 포커스에 요령을 넣는다
  const greenSpeed = buildGreenSpeedReport(solo, mode);
  if (mode === 'round' && greenSpeed?.latest?.band && greenSpeed.latest.three >= 1) {
    const tip = GREEN_SPEED_TIPS[greenSpeed.latest.band.id];
    if (tip) focus.push({ category: 'putting', text: `${greenSpeed.latest.band.label} 그린(스팀프 ${greenSpeed.latest.speed.toFixed(1)}) — ${tip}` });
  }
  const dataGap = replays.reduce((a, r) => a + r.defaultHoles, 0);
  if (dataGap > 0) focus.push({ category: 'data', text: `입력하지 않은 홀 ${dataGap}개 — 홀 단위 분석에서 제외됨(점수는 파로 저장)` });

  const sum = (f) => replays.reduce((a, r) => a + f(r), 0);
  const stats = {
    rounds: replays.length,
    score: sum(r => r.score), par: sum(r => r.par),
    avgScore: sum(r => r.score) / replays.length,
    threePutts: sum(r => r.threePutts),
    penalties: sum(r => r.penalties),
    holes: sum(r => r.holes.length),
  };
  return { mode, replays, strengths, issues, focus, stats, causes: causeSum, totals, ranked, greenSpeed };
}

export { PUTT_CAUSE_LABEL, roundStats };
