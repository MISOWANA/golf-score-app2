// 엔진 견고성 테스트 — 불완전·예전 형식의 라운드를 대량 생성해 모든 분석 함수에 넣어 본다.
// 확인하는 것: 예외 없음 · NaN/Infinity 없음 · 문구에 undefined/미치환 {키}/[object] 없음 (거리 단위를 야드로 바꿔도 같다) · 점수 분해 항등식.
import { describe, it, expect } from 'vitest';
import { toHoleInput, analyzeRound } from './engine.js';
import { buildDerivedHoleMetrics, buildRoundMetrics } from './metrics.js';
import { toBreakdownInput, buildRoundBreakdown } from './scoreBreakdown.js';
import { aggregateSG } from './strokesGained.js';
import { buildClubDistanceStats } from './clubDistance.js';
import { buildStatsReport } from './statsReport.js';
import { buildCareerInsights } from './careerInsights.js';
import { buildRoundReplay, buildInsightIndex, buildInsightReport } from './insightIndex.js';
import { buildRoundDiagnosis } from './diagnosis.js';
import { buildHoleReview } from './holeReview.js';
import { buildGreenSpeedReport, greenSpeedRoundInsights, greenSpeedCareerInsights } from './greenSpeed.js';
import { shotTitle } from './penalties.js';
import { landingCounts } from './landing.js';
import { buildPuttingDetail } from './puttingDetail.js';
import { HOLE_RULES } from './rules/holeRules.js';
import { ROUND_RULES } from './rules/roundRules.js';
import { createRng, makeMessyRound, makeFullRound, makeHalfRound, makeNineRound } from '../test/fixtures.js';
import { localizeDeep } from './units.js';

const ME = '테스터';
const BAD_TEXT = /NaN|undefined|Infinity|\{\w+\}|\[object/;

// 결과 안의 숫자·문자열을 훑어 문제를 모은다. 그린 스피드 구간의 max: Infinity 는 설계상 값이다.
function scan(label, value, path, out) {
  if (value == null) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) && !path.endsWith('.band.max')) out.push(`NON_FINITE ${label}${path}=${value}`);
  } else if (typeof value === 'string') {
    const m = value.match(BAD_TEXT);
    if (m) out.push(`BAD_TEXT(${m[0]}) ${label}${path.replace(/\[\d+\]/g, '[]')}: ${value.slice(0, 80)}`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => scan(label, v, `${path}[${i}]`, out));
  } else if (typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => scan(label, v, `${path}.${k}`, out));
  }
}

function scenarios(seed, count) {
  const rng = createRng(seed);
  const list = [];
  for (let n = 0; n < count; n++) {
    const kind = n % 7;
    const rounds = Array.from({ length: rng.int(1, 6) }, (_, i) => {
      let r;
      if (kind === 0) r = makeMessyRound(rng, n * 10 + i);
      else if (kind === 1) r = makeHalfRound(n * 10 + i);                  // 전반만 입력
      else if (kind === 2) { r = makeFullRound(n * 10 + i); r.holes.forEach((h, idx) => { if (idx >= rng.int(0, 17)) h.scores[ME] = { ...h.scores[ME], touched: false }; }); }
      else if (kind === 3) { r = makeMessyRound(rng, n * 10 + i); r.holes.forEach((h) => { delete h.scores[ME].touched; delete h.scores[ME].confirmed; }); }   // touched 표시가 없는 예전 기록
      else if (kind === 4) { r = makeMessyRound(rng, n * 10 + i); delete r.pars; }                                                                   // pars 가 없는 예전 백업
      else if (kind === 5) r = makeNineRound(n * 10 + i, rng.chance(0.5) ? 'out' : 'in');                                                           // 9홀 라운드 (18홀과 섞여 들어온다)
      else r = makeFullRound(n * 10 + i);
      r.date = new Date(2026, 5, 1 + n * 7 + i).toISOString();
      return r;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
    list.push({ kind, rounds });
  }
  return list;
}

describe('엔진 견고성 (퍼징)', () => {
  it('모든 분석 함수가 불완전한 데이터에서도 예외·NaN·깨진 문구 없이 동작한다', () => {
    const problems = new Map();
    const run = (label, fn) => {
      try {
        const out = fn();
        const found = [];
        scan(label, out, '', found);
        scan(`${label}(야드)`, localizeDeep(out, 'yd'), '', found);   // 거리 단위가 야드여도 문구가 깨지지 않는다
        found.forEach((f) => problems.set(f, (problems.get(f) || 0) + 1));
        return out;
      } catch (e) {
        const key = `THROW ${label}: ${String(e.message).split('\n')[0]}`;
        problems.set(key, (problems.get(key) || 0) + 1);
        return null;
      }
    };

    for (const { rounds } of scenarios(20260601, 120)) {
      const r0 = rounds[0];
      const inputs = r0.holes.map((h) => toHoleInput(h, ME));
      run('holeMetrics', () => inputs.map((h) => buildDerivedHoleMetrics(h)));
      run('roundMetrics', () => buildRoundMetrics(inputs));
      run('analyzeRound', () => analyzeRound(inputs, HOLE_RULES, ROUND_RULES));
      run('breakdown', () => {
        const b = buildRoundBreakdown(r0.holes.map((h) => toBreakdownInput(h, ME)));
        // 항등식: 다섯 카테고리의 합은 항상 홀 손실과 같다
        b.holes.forEach((h) => {
          const sum = Object.values(h.categories).reduce((a, c) => a + c, 0);
          if (sum !== h.holeLoss) throw new Error(`breakdown identity: ${JSON.stringify(h)}`);
        });
        return b;
      });
      run('strokesGained', () => aggregateSG(rounds));
      run('clubDistance', () => buildClubDistanceStats(rounds));
      run('statsReport', () => buildStatsReport(rounds));
      run('careerInsights', () => buildCareerInsights(rounds));
      run('roundReplay', () => buildRoundReplay(r0));
      run('insightIndex', () => buildInsightIndex(rounds));
      run('insightReport.round', () => buildInsightReport(rounds, 'round'));
      run('insightReport.career', () => buildInsightReport(rounds, 'career'));
      run('diagnosis', () => buildRoundDiagnosis(r0, ME));
      run('holeReview', () => r0.holes.map((h, i) => buildHoleReview(h, ME, i)));
      run('greenSpeed', () => buildGreenSpeedReport(rounds, 'round'));
      run('greenSpeed.career', () => buildGreenSpeedReport(rounds, 'career'));
      run('greenSpeedInsights', () => rounds.flatMap((r) => greenSpeedRoundInsights(r)));
      run('greenSpeedCareer', () => greenSpeedCareerInsights(rounds));
      run('shotTitle', () => r0.holes.flatMap((h) => [0, 1, 2, 3].map((k) => shotTitle(h.scores[ME], k))));
      run('landing', () => landingCounts(rounds));
      run('puttingDetail', () => buildPuttingDetail(rounds));
    }

    const report = [...problems.entries()].map(([k, n]) => `${n}x ${k}`);
    expect(report).toEqual([]);
  }, 60_000);   // 혼자 돌리면 2~3초지만, 배포 서버(2코어)에서 다른 테스트와 함께 돌면 기본 5초를 넘긴다
});
